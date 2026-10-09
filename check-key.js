// Tests GEMINI_API_KEY from .env without starting the server: `npm run check-key`.
// Tries it as a Gemini API (AI Studio) key, then as a Vertex AI express-mode key.
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const key = (process.env.GEMINI_API_KEY || '').trim();
if (!key) {
  console.log('GEMINI_API_KEY is empty in .env');
  process.exit(1);
}
console.log(`Key starts with "${key.slice(0, 4)}", length ${key.length}`);

async function tryKey(label, ai) {
  try {
    const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'Say OK' });
    console.log(`${label}: WORKS (reply: ${res.text?.trim()})`);
    return true;
  } catch (err) {
    console.log(`${label}: failed (${err.status ?? ''} ${String(err.message).slice(0, 160)})`);
    return false;
  }
}

const studio = await tryKey('Gemini API (AI Studio) key', new GoogleGenAI({ apiKey: key }));
const vertex = await tryKey('Vertex AI express key', new GoogleGenAI({ vertexai: true, apiKey: key }));

if (studio) console.log('\nThis key works with the app as is.');
else if (vertex) console.log('\nThis is a Vertex AI key. The app needs a Gemini API key from https://aistudio.google.com/apikey');
else console.log('\nThe key did not work either way. Create a new one at https://aistudio.google.com/apikey');
