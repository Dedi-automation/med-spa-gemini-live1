# Med Spa Gemini 3.8 Live Voice Bot

Real-time bidirectional voice bot using **Gemini 3.8 Live** WebSocket API.

## Files

- **server-3.8-live.js** — Express + WebSocket backend
- **index-3.8-live.html** — Browser frontend (mic capture + audio playback)
- **package.json** — Node.js dependencies
- **.env.example** — Configuration template

## Setup (5 minutes)

### 1. **Replace Your Old Files**

In `C:/work/Gemini Voice Bot Demo/` (or your local folder):

```
OLD                          NEW
server.js             →      server-3.8-live.js
index.html            →      index-3.8-live.html
(keep the same)       →      package.json
(keep the same)       →      .env.example
```

### 2. **Create .env File**

Copy `.env.example` and rename to `.env`, then add your API key:

```
GEMINI_API_KEY=AIza...your_key_here...
GEMINI_MODEL=gemini-3.8-live
PORT=3000
NODE_ENV=development
```

Get your key from: https://aistudio.google.com/apikey

### 3. **Install Dependencies**

Open terminal in your folder:

```bash
npm install
```

### 4. **Run Locally**

```bash
npm start
```

Then open: **http://localhost:3000**

You should see:
- Purple gradient background
- "Lily" header
- "Start Call" button
- Empty transcript area

### 5. **Test**

1. Click **"Start Call"**
2. Allow microphone permission
3. Say: *"I want to book a facial"*
4. Lily responds with voice + transcript
5. Click **"Stop Call"**

## How It Works

**Browser** → (audio stream) → **Server WebSocket** → (PCM chunks) → **Gemini 3.8 Live** → (audio response) → **Server** → (plays in browser)

- Real-time bidirectional audio
- ~300ms latency
- System prompt embedded (Lily's persona)
- Token tracking for billing

## Pricing

- **Input:** $3.00 per million audio tokens (~$0.005/min)
- **Output:** $12.00 per million audio tokens (~$0.018/min)
- **Blended:** ~$1.38/hour (25 tokens/second audio conversion)
- **Well under $3.50/hr budget** ✅

## Deployment to Render

1. **Push files to GitHub:**
   - Upload `server-3.8-live.js`
   - Upload `index-3.8-live.html`
   - Upload `package.json`
   - Keep `.env.example` (do NOT commit `.env`)

2. **In Render dashboard:**
   - Create new Web Service
   - Connect your GitHub repo
   - Set environment variables:
     ```
     GEMINI_API_KEY=your_key
     GEMINI_MODEL=gemini-3.8-live
     PORT=3000
     NODE_ENV=production
     ```
   - Start command: `npm start`

3. **Deploy**

## Troubleshooting

**"Cannot find module '@google/genai'"**
- Run: `npm install`

**"Microphone permission denied"**
- Check browser settings, allow mic for localhost:3000

**"WebSocket connection error"**
- Check `.env` has correct `GEMINI_API_KEY`
- API key must start with "AIza"

**"No audio response"**
- Check browser console for errors (F12 → Console)
- Verify Gemini 3.8 Live is available in your region

## Questions?

Check the server logs (terminal) for detailed error messages.
