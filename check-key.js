// Tests GEMINI_API_KEY from .env without starting the server: `npm run check-key`.
// Lists the models the key can reach, marking the ones that support the Live (voice) API.
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const key = (process.env.GEMINI_API_KEY || '').trim();
if (!key) {
  console.log('GEMINI_API_KEY is empty in .env');
  process.exit(1);
}
console.log(`Key starts with "${key.slice(0, 4)}", length ${key.length}`);

const ai = new GoogleGenAI({ apiKey: key });
try {
  const live = [];
  let total = 0;
  for await (const m of await ai.models.list()) {
    total++;
    if (m.supportedActions?.includes('bidiGenerateContent')) live.push(m.name.replace('models/', ''));
  }
  console.log(`Key WORKS: ${total} models available.`);
  console.log(`Live (voice) models: ${live.join(', ') || '(none)'}`);
  console.log(`GEMINI_MODEL in .env: ${process.env.GEMINI_MODEL || '(not set, server uses its default)'}`);
} catch (err) {
  console.log(`Key failed: ${err.status ?? ''} ${String(err.message).slice(0, 200)}`);
  console.log('Create a new key at https://aistudio.google.com/apikey');
}
