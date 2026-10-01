import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import { GoogleGenerativeAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-3.8-live'; // Native audio WebSocket
const VOICE = process.env.GEMINI_VOICE || 'Aoede';

if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY in .env');
  process.exit(1);
}

const SYSTEM_PROMPT = `You are Lily, the friendly voice receptionist for Glow Med Spa.
Speak warmly and concisely, like a real front-desk person on the phone. Keep answers to one to three short sentences.

You can help callers with:
- Our services: Botox and fillers, HydraFacials, chemical peels, laser hair removal, microneedling, and IV hydration.
- Booking, rescheduling, or cancelling appointments. Collect the caller's name, phone number, service, and preferred day and time, then read the details back to confirm. Always ask the caller to spell their last name, and read it back letter by letter.
- Hours: Monday to Friday 9am to 7pm, Saturday 10am to 4pm, closed Sunday.
- General questions about what to expect before and after a treatment.

Rules:
- Never give medical advice or diagnoses. For medical questions, offer a free consultation with one of our licensed providers.
- Do not quote exact prices; say pricing depends on the treatment plan and is covered in the free consultation.
- If you don't know something, say you'll have a team member follow up.`;

const app = express();
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index-3.8-live.html')));
app.get('/health', (_req, res) => res.json({ ok: true, model: MODEL }));

// Gemini 3.8 Live WebSocket handler
wss.on('connection', async (browserWs) => {
  console.log(`🤖 Browser connected`);
  
  const ai = new GoogleGenerativeAI({ apiKey: API_KEY });
  const model = ai.getGenerativeModel({ model: MODEL });
  
  let geminiWs = null;
  let callStartTime = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    // Use Gemini Live API with system prompt
    geminiWs = await model.startSession({
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.9,
        topP: 1,
        topK: 40,
      },
    });

    console.log('✅ Connected to Gemini 3.8 Live');

    // Send initial greeting from Lily
    browserWs.send(JSON.stringify({
      type: 'transcript',
      speaker: 'bot',
      text: 'Good afternoon. This is Lily from Glow Med Spa. How can I help you today?',
    }));

    // Relay audio from browser → Gemini
    browserWs.on('message', async (data) => {
      if (data instanceof ArrayBuffer) {
        // Audio chunk from browser (PCM)
        try {
          const response = await geminiWs.sendMessage({
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/pcm',
                  data: Buffer.from(data).toString('base64'),
                },
              },
            ],
          });

          // Extract audio output from response
          const content = response.candidates?.[0]?.content;
          if (content) {
            for (const part of content.parts || []) {
              // Audio output from Gemini
              if (part.inlineData?.data) {
                browserWs.send(JSON.stringify({
                  type: 'audio',
                  data: part.inlineData.data,
                }));
              }
              // Text transcript
              if (part.text) {
                browserWs.send(JSON.stringify({
                  type: 'transcript',
                  speaker: 'bot',
                  text: part.text,
                }));
              }
            }
          }

          // Track token usage
          if (response.usageMetadata) {
            inputTokens += response.usageMetadata.promptTokenCount || 0;
            outputTokens += response.usageMetadata.candidatesTokenCount || 0;
          }
        } catch (err) {
          console.error('Error processing audio:', err);
          browserWs.send(JSON.stringify({
            type: 'error',
            message: 'Error processing audio',
          }));
        }
      }
    });

  } catch (err) {
    console.error('🔴 Gemini 3.8 Live connection error:', err.message);
    browserWs.send(JSON.stringify({
      type: 'error',
      message: `Failed to connect to Gemini: ${err.message}`,
    }));
    browserWs.close();
  }

  browserWs.on('close', () => {
    console.log('📱 Browser disconnected');

    // Calculate costs
    const durationSeconds = (Date.now() - callStartTime) / 1000;
    const inputCost = (inputTokens / 1_000_000) * 3.00; // $3.00/M input tokens
    const outputCost = (outputTokens / 1_000_000) * 12.00; // $12.00/M output tokens
    const totalCost = inputCost + outputCost;

    console.log(`📊 Call Summary:`);
    console.log(`  Duration: ${Math.round(durationSeconds)}s`);
    console.log(`  Input tokens: ${inputTokens} ($${inputCost.toFixed(4)})`);
    console.log(`  Output tokens: ${outputTokens} ($${outputCost.toFixed(4)})`);
    console.log(`  Total cost: $${totalCost.toFixed(4)}`);
  });
});

server.listen(PORT, () => {
  console.log(`🎤 Lily (Gemini 3.8 Live) listening at http://localhost:${PORT}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Pricing: $3.00/M input tokens, $12.00/M output tokens (~$1.38/hr blended)`);
});
