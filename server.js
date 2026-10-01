import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import WebSocket, { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-live';
const VOICE = process.env.GEMINI_VOICE || 'Aoede';

if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY. Copy .env.example to .env and add your key.');
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
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (_req, res) => res.json({ ok: true, model: GEMINI_MODEL }));
app.get('/test', (_req, res) => res.sendFile(path.join(__dirname, 'test.html')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/live' });

// Each browser connection gets its own Gemini Live session
wss.on('connection', async (clientWs) => {
  let geminiWs = null;
  let isOpen = true;

  const sendToClient = (msg) => {
    if (clientWs.readyState === clientWs.OPEN) {
      clientWs.send(JSON.stringify(msg));
    }
  };

  try {
    // Connect to Gemini Live WebSocket (v1beta required for stable streaming)
    const geminiUrl = `wss://generativelanguage.googleapis.com/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
    geminiWs = new WebSocket(geminiUrl);

    geminiWs.on('open', () => {
      // Send setup configuration
      const setupMessage = {
        setup: {
          model: `models/${GEMINI_MODEL}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: VOICE
                }
              }
            }
          },
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          }
        }
      };
      geminiWs.send(JSON.stringify(setupMessage));
      sendToClient({ type: 'ready' });
    });

    geminiWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        
        // Extract audio from serverContent
        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            if (part.inlineData?.data) {
              sendToClient({ type: 'audio', data: part.inlineData.data });
            }
          }
        }

        // Extract transcriptions
        if (msg.serverContent?.userTurn?.parts) {
          for (const part of msg.serverContent.userTurn.parts) {
            if (part.text) {
              sendToClient({ type: 'transcript', role: 'user', text: part.text });
            }
          }
        }

        if (msg.serverContent?.modelTurn?.parts) {
          for (const part of msg.serverContent.modelTurn.parts) {
            if (part.text) {
              sendToClient({ type: 'transcript', role: 'lily', text: part.text });
            }
          }
        }

        // Handle turn complete
        if (msg.serverContent?.turnComplete) {
          sendToClient({ type: 'turnComplete' });
        }
      } catch (err) {
        console.error('Error processing Gemini message:', err.message);
      }
    });

    geminiWs.on('error', (err) => {
      console.error('Gemini error:', err.message);
      sendToClient({ type: 'error', message: err.message });
    });

    geminiWs.on('close', () => {
      isOpen = false;
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.close();
      }
    });

  } catch (err) {
    console.error('Failed to connect to Gemini:', err.message);
    sendToClient({ type: 'error', message: `Could not connect to Gemini: ${err.message}` });
    clientWs.close();
    return;
  }

  // Handle messages from client
  clientWs.on('message', (data, isBinary) => {
    if (!geminiWs || geminiWs.readyState !== geminiWs.OPEN) return;

    if (isBinary) {
      // Send audio data to Gemini
      const audioMessage = {
        realtimeInput: {
          mediaChunks: [
            {
              data: Buffer.from(data).toString('base64'),
              mimeType: 'audio/pcm;rate=16000'
            }
          ]
        }
      };
      geminiWs.send(JSON.stringify(audioMessage));
    } else {
      // Handle text input
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'text' && msg.text) {
          const textMessage = {
            clientContent: {
              turns: [
                {
                  role: 'user',
                  parts: [{ text: msg.text }]
                }
              ],
              turnComplete: true
            }
          };
          geminiWs.send(JSON.stringify(textMessage));
        }
      } catch (err) {
        console.error('Error parsing client message:', err.message);
      }
    }
  });

  clientWs.on('close', () => {
    isOpen = false;
    if (geminiWs && geminiWs.readyState === geminiWs.OPEN) {
      geminiWs.close();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Lily is listening at http://localhost:${PORT} (model: ${GEMINI_MODEL})`);
});
