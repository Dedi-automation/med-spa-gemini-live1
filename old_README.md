# med-spa-gemini-live1

Gemini Live voice bot demo for a med spa. Callers talk to **Lily**, a voice receptionist for Glow Med Spa, straight from the browser.

## Quick start

Requires Node.js 18 or newer and a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
npm install
cp .env.example .env      # then paste your key into GEMINI_API_KEY
npm start
```

Open http://localhost:3000, tap the mic, allow microphone access, and start talking. Tap again to hang up.

Use `npm run dev` to restart the server automatically when you edit `server.js`.

## Configuration (`.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | (required) | Your Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash-native-audio-preview-09-2025` | Live API model |
| `GEMINI_VOICE` | `Aoede` | Prebuilt voice for Lily |
| `PORT` | `3000` | Local server port |

## How it works

- `index.html` captures the mic with an AudioWorklet, converts it to 16 kHz PCM, and streams it over a WebSocket to `/live`. It plays Lily's 24 kHz audio replies and shows a live transcript.
- `server.js` serves the page and, for each browser connection, opens a Gemini Live session with the `@google/genai` SDK. It forwards audio both ways, so the API key never reaches the browser.
- Lily's personality, services, hours, and rules live in `SYSTEM_PROMPT` at the top of `server.js`.

## Troubleshooting

- **No mic prompt:** browsers only allow the mic on `localhost` or HTTPS.
- **"Could not connect to Gemini":** check your API key and that `GEMINI_MODEL` is a Live API model available to your key.
- **Health check:** http://localhost:3000/health returns the model in use.
