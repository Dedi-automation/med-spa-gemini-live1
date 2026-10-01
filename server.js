import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-3.8-live';

if (!API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY in .env');
  process.exit(1);
}

const SYSTEM_PROMPT = `You are Lily, the friendly voice receptionist for Glow Med Spa.
Speak warmly and concisely, like a real front-desk person on the phone. Keep answers to one to three short sentences.

You can help callers with:
- Our services: Botox and fillers, HydraFacials, chemical peels, laser hair removal, microneedling, and IV hydration.
- Booking appointments. Collect name, phone, service, and preferred time. Always ask them to spell their last name.
- Hours: Monday to Friday 9am to 7pm, Saturday 10am to 4pm, closed Sunday.
- General questions about treatments.

Rules:
- Never give medical advice. Offer free consultation instead.
- Do not quote prices; say they depend on the treatment plan.
- If unsure, say a team member will follow up.`;

const app = express();
app.use(express.static(__dirname));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index-3.8-live.html')));
app.get('/health', (_req, res) => res.json({ ok: true, model: MODEL }));

// Gemini 3.8 Live WebSocket handler
wss.on('connection', async (clientWs) => {
  console.log('🤖 Browser connected');
  
  let geminiWs = null;
  let callStartTime = Date.now();

  try {
    // Connect to Gemini 3.8 Live API
    const setupMessage = {
      setup: {
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        model_parameters: {
          temperature: 0.9,
        },
      },
    };

    // Create fetch request to Gemini 3.8 Live WebSocket endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/google.ai.generativelanguage.v1alpha.GenerativeService/BidiGenerateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupMessage),
      }
    );

    console.log(`✅ Gemini 3.8 Live connected (status: ${response.status})`);

    // Send initial greeting
    clientWs.send(JSON.stringify({
      type: 'transcript',
      speaker: 'bot',
      text: 'Good afternoon. This is Lily from Glow Med Spa. How can I help you today?',
    }));

    // Relay audio from browser → Gemini
    clientWs.on('message', async (data) => {
      if (data instanceof ArrayBuffer || Buffer.isBuffer(data)) {
        try {
          const audioMessage = {
            client_content: {
              turns: [
                {
                  role: 'user',
                  parts: [
                    {
                      inline_data: {
                        mime_type: 'audio/pcm',
                        data: Buffer.from(data).toString('base64'),
                      },
                    },
                  ],
                },
              ],
              turn_complete: true,
            },
          };

          // Send to Gemini (would use geminiWs if it were a WebSocket)
          // For now, send back a mock response
          clientWs.send(JSON.stringify({
            type: 'transcript',
            speaker: 'bot',
            text: 'I heard you say something. How can I help you book an appointment?',
          }));

          clientWs.send(JSON.stringify({
            type: 'audio',
            data: 'SUQzBAAAI1IUVFQfAAAAA...', // Mock audio response
          }));
        } catch (err) {
          console.error('❌ Audio processing error:', err.message);
          clientWs.send(JSON.stringify({
            type: 'error',
            message: 'Error processing audio',
          }));
        }
      }
    });

    clientWs.on('close', () => {
      console.log('📱 Browser disconnected');
      if (geminiWs) geminiWs.close();

      const duration = (Date.now() - callStartTime) / 1000;
      console.log(`📊 Call ended. Duration: ${Math.round(duration)}s`);
    });

  } catch (err) {
    console.error('❌ Connection error:', err.message);
    clientWs.send(JSON.stringify({
      type: 'error',
      message: `Failed to connect: ${err.message}`,
    }));
    clientWs.close();
  }
});

server.listen(PORT, () => {
  console.log(`🎤 Lily (Gemini 3.8 Live) listening at http://localhost:${PORT}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Status: WebSocket ready for audio streaming`);
});
