# PodcastMe

**Turn 8 questions into a publish-ready podcast episode in under 2 minutes.**

PodcastMe is an AI-powered podcast production studio. A voice AI producer named **Jordan** interviews you with 8 structured questions, then Gemini 2.5 Flash generates a complete episode package: title, full script, show notes, tags, CTA, listener persona, audiogram script, and 5 tweet drafts.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB (local or Atlas)
- Gemini API Key ([Get one free](https://aistudio.google.com/apikey))
- LiveKit account ([Sign up](https://livekit.io/)) — *optional, app works without it*

### 1. Install Dependencies

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
yarn install
```

### 2. Configure Environment Variables

**`backend/.env`:**
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="podcastme_db"
CORS_ORIGINS="*"
LIVEKIT_URL=wss://your-server.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
DEEPGRAM_API_KEY=your_deepgram_key
GEMINI_API_KEY=your_gemini_key
GOOGLE_API_KEY=your_gemini_key
```

**`frontend/.env`:**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 3. Run

**Backend (terminal 1):**
```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend (terminal 2):**
```bash
cd frontend
yarn start
```

Open [http://localhost:3000](http://localhost:3000)

---

## App Flow

```
HERO → VOICE_SETUP → CONVERSATION → GENERATION → OUTPUT
```

| Screen | Description |
|--------|-------------|
| **Hero** | Landing page — "Start My Episode" CTA |
| **Voice Setup** | Name, show name, host archetype, controversy level (1–10), energy word |
| **Conversation** | 8-question interview — type answers or use mic via Web Speech API |
| **Generation** | Gemini 2.5 Flash generates the episode (~15–30s) |
| **Output** | Full episode package with copy buttons + TTS playback with sentence highlighting |

> **Demo tip:** On the Conversation screen, click `📊 Run Demo` to auto-fill all 8 questions with sample answers about AI ethics and skip straight to generation.

---

## Architecture

```
/app/
├── backend/
│   ├── server.py           # FastAPI: /api/livekit-token, /api/generate-episode
│   ├── agent.py            # LiveKit Voice Agent (Jordan — requires x86_64)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.js               # State manager & screen router
        ├── index.css            # Design system (CSS variables, animations)
        └── screens/
            ├── HeroScreen.jsx
            ├── VoiceSetupScreen.jsx
            ├── ConversationScreen.jsx   # Text + Web Speech API fallback
            ├── GenerationScreen.jsx     # Gemini generation with live progress
            └── OutputScreen.jsx         # Bento grid + TTS playback
```

---

## API Reference

### `GET /api/`
Health check.

### `POST /api/livekit-token`

Generates a LiveKit room access token.

```json
{
  "participant_name": "Alex Rivera",
  "user_prefs": {
    "name": "Alex Rivera",
    "show_name": "Founders Unfiltered"
  }
}
```

### `POST /api/generate-episode`

Generates a complete episode package via Gemini.

**Request:**
```json
{
  "user_prefs": {
    "name": "Alex Rivera",
    "show_name": "Founders Unfiltered",
    "archetype": "The Visionary",
    "energy_word": "Ignite",
    "controversy_level": 7
  },
  "answers": [
    { "question": "What's the main topic?", "answer": "The Future of AI Ethics" },
    { "question": "Who is your ideal listener?", "answer": "Tech founders..." }
  ]
}
```

**Response (9 content sections):**
```json
{
  "title": "Why Most AI Ethics Is Theater",
  "hook": "...",
  "script": "...",
  "show_notes": "...",
  "tags": ["ai", "ethics", "tech", "founders", "startup", "llm", "trust", "regulation"],
  "cta": "...",
  "listener_persona": "...",
  "audiogram_script": "...",
  "tweet_copy": ["...", "...", "...", "...", "..."]
}
```

---

## LiveKit Voice Agent

Run Jordan as a standalone LiveKit Agents worker:

```bash
cd backend
python agent.py dev
```

Jordan uses:
- **Deepgram Nova-3** for speech-to-text
- **Gemini 2.0 Flash** as the LLM backbone
- **Deepgram Aura** for text-to-speech

> **Important:** The LiveKit Python SDK uses a native C library (`liblivekit_ffi.so`) that is incompatible with ARM64 systems (e.g., cloud preview containers). The frontend automatically uses text-input + Web Speech API fallback in these environments. The voice agent is fully functional on **x86_64** systems.

---

## Known Limitations

| Issue | Status | Workaround |
|-------|--------|------------|
| LiveKit Python SDK on ARM64 | Known native lib incompatibility | Frontend text fallback (fully functional) |
| Web Speech API TTS | Browser-dependent quality | Works best in Chrome |
| Gemini response time | 15–30s for full episode | Loading UI with progress stages |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | Yes | MongoDB connection string |
| `DB_NAME` | Yes | MongoDB database name |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GOOGLE_API_KEY` | Yes | Same as GEMINI_API_KEY (agent compat) |
| `LIVEKIT_URL` | Optional | LiveKit server WebSocket URL |
| `LIVEKIT_API_KEY` | Optional | LiveKit API key |
| `LIVEKIT_API_SECRET` | Optional | LiveKit API secret |
| `DEEPGRAM_API_KEY` | Optional | Deepgram STT/TTS key |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `*`) |

---

## Design System

Dark mode only. Core colors:

```css
--bg-primary:    #0A0A0A  /* Main background */
--bg-card:       #141414  /* Card surfaces */
--bg-input:      #1E1E1E  /* Input fields */
--accent-purple: #8B5CF6  /* Primary accent */
--accent-pink:   #EC4899  /* Secondary accent */
--success:       #10B981  /* Confirmation states */
--warning:       #F59E0B  /* Alert states */
```

Font: **Inter** (system fallback: system-ui, -apple-system, sans-serif)
