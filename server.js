import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-live';
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

const ai = new GoogleGenAI({ apiKey: API_KEY });

const app = express();
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (_req, res) => res.json({ ok: true, model: MODEL }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/live' });

// Each browser connection gets its own Gemini Live session.
// Browser -> server: binary frames of 16 kHz mono PCM16, or JSON control messages.
// Server -> browser: JSON messages (audio is base64 24 kHz mono PCM16).
wss.on('connection', async (client) => {
  const send = (msg) => {
    if (client.readyState === client.OPEN) client.send(JSON.stringify(msg));
  };

  let session;
  try {
    session = await ai.live.connect({
      model: MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: SYSTEM_PROMPT,
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => send({ type: 'ready' }),
        onmessage: (msg) => {
          const content = msg.serverContent;
          if (!content) return;

          for (const part of content.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) send({ type: 'audio', data: part.inlineData.data });
          }
          if (content.inputTranscription?.text) {
            send({ type: 'transcript', role: 'user', text: content.inputTranscription.text });
          }
          if (content.outputTranscription?.text) {
            send({ type: 'transcript', role: 'lily', text: content.outputTranscription.text });
          }
          if (content.interrupted) send({ type: 'interrupted' });
          if (content.turnComplete) send({ type: 'turnComplete' });
        },
        onerror: (e) => {
          console.error('Gemini error:', e.message);
          send({ type: 'error', message: e.message });
        },
        onclose: (e) => {
          console.log('Gemini session closed:', e.reason || e.code);
          send({ type: 'closed', reason: e.reason });
          client.close();
        },
      },
    });
  } catch (err) {
    console.error('Failed to connect to Gemini Live:', err.message);
    send({ type: 'error', message: `Could not connect to Gemini: ${err.message}` });
    client.close();
    return;
  }

  client.on('message', (data, isBinary) => {
    if (isBinary) {
      session.sendRealtimeInput({
        audio: { data: Buffer.from(data).toString('base64'), mimeType: 'audio/pcm;rate=16000' },
      });
      return;
    }
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (msg.type === 'audioStreamEnd') session.sendRealtimeInput({ audioStreamEnd: true });
    if (msg.type === 'text' && msg.text) session.sendRealtimeInput({ text: msg.text });
  });

  client.on('close', () => session.close());
});

// Fail loudly at startup if the key or model is wrong, instead of a 404 on the first call.
async function checkModel() {
  try {
    await ai.models.get({ model: MODEL });
    console.log(`Gemini model OK: ${MODEL}`);
  } catch (err) {
    console.error(`Gemini rejected model "${MODEL}": ${err.message}`);
    try {
      const live = [];
      for await (const m of await ai.models.list()) {
        if (m.supportedActions?.includes('bidiGenerateContent')) live.push(m.name.replace('models/', ''));
      }
      console.error(`Live-capable models for this key: ${live.join(', ') || '(none)'}`);
      console.error('Set GEMINI_MODEL in .env to one of these and restart.');
    } catch (listErr) {
      console.error(`Could not list models (check GEMINI_API_KEY): ${listErr.message}`);
    }
  }
}

server.listen(PORT, () => {
  console.log(`Lily is listening at http://localhost:${PORT} (model: ${MODEL})`);
  checkModel();
});
