# PodcastMe

Turn an 8-question voice conversation into a complete, publish-ready podcast episode — powered by LiveKit, Deepgram, and Gemini.

## User Flow

```
HERO → VOICE_SETUP → CONVERSATION → GENERATION → OUTPUT
```

1. **HERO** — Land on the app, click "Start My Episode"
2. **VOICE_SETUP** — Enter your name, show name, archetype, controversy level, and energy word
3. **CONVERSATION** — Live voice chat with Jordan (AI podcast producer) via LiveKit. Jordan asks exactly 8 structured questions. You answer by speaking.
4. **GENERATION** — Gemini generates your complete episode package
5. **OUTPUT** — View, copy, and listen to: title, hook, full script, show notes, tags, CTA, listener persona, audiogram script, 5 tweet drafts

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Tailwind CSS |
| Backend API | FastAPI (Python) |
| Voice Agent | livekit-agents (Python) |
| Real-time Voice | LiveKit |
| Speech-to-Text | Deepgram Nova-3 |
| Agent Voice | Deepgram Aura TTS (orion) |
| Episode Generation | Google Gemini 2.5 Flash |

## Project Structure

```
/app/
├── backend/
│   ├── server.py       # FastAPI — /api/livekit-token, /api/generate-episode
│   ├── agent.py        # LiveKit voice agent (Jordan)
│   ├── requirements.txt
│   └── .env
├── frontend/
│   └── src/
│       ├── App.js
│       ├── index.css   # Design system + CSS variables
│       └── screens/
│           ├── HeroScreen.jsx
│           ├── VoiceSetupScreen.jsx
│           ├── ConversationScreen.jsx
│           ├── GenerationScreen.jsx
│           └── OutputScreen.jsx
├── .env.example
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/ | Health check |
| POST | /api/livekit-token | Generate LiveKit room token |
| POST | /api/generate-episode | Generate full episode via Gemini |

## Running the Agent

```bash
# Start the LiveKit voice agent (Jordan)
cd /app/backend
python agent.py dev
```

The agent connects to LiveKit as a worker. When a user joins a podcast room, Jordan auto-dispatches and conducts the 8-question interview.

## Environment Variables

See `.env.example` for all required variables.

## Design System

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-primary` | `#0A0A0A` | Main background |
| `--bg-card` | `#141414` | Card backgrounds |
| `--bg-input` | `#1E1E1E` | Input fields |
| `--accent-purple` | `#8B5CF6` | Primary accent |
| `--accent-pink` | `#EC4899` | Secondary accent |
| `--success` | `#10B981` | Success states |
| `--warning` | `#F59E0B` | Warning states |
| `--text-primary` | `#F9FAFB` | Main text |
| `--text-muted` | `#6B7280` | Secondary text |
| `--border` | `#2D2D2D` | Borders |
