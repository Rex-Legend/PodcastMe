# PodcastMe — Product Requirements Document

## Original Problem Statement
Create a full-stack app called PodcastMe with a 5-screen flow (HERO → VOICE_SETUP → CONVERSATION → GENERATION → OUTPUT) where a user sets up podcast preferences, talks to an AI producer (Jordan), and gets a fully generated podcast episode package via Gemini.

**Stack:** React + Tailwind CSS frontend | Python FastAPI backend | MongoDB | Gemini GenAI | LiveKit (voice, ARM64 fallback to Web Speech API)

**Design:** Dark mode only — #0A0A0A bg, #141414 cards, #8B5CF6 purple, #EC4899 pink

---

## Architecture

```
/app/
├── backend/
│   ├── agent.py            # LiveKit Agent (fallback state - ARM64 incompatible)
│   ├── server.py           # FastAPI — all endpoints
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HeroScreen.jsx           # Landing + episode history
│   │   │   ├── VoiceSetupScreen.jsx     # Show prefs form
│   │   │   ├── ConversationScreen.jsx   # 8-question Q&A with Jordan
│   │   │   ├── ReviewScreen.jsx         # Edit answers before generation
│   │   │   ├── GenerationScreen.jsx     # Loading screen + Gemini call
│   │   │   └── OutputScreen.jsx         # 9-card bento output + TTS
│   │   ├── App.js          # 6-screen router
│   │   └── index.css
│   └── .env
└── README.md
```

**Screen flow:** HERO → VOICE_SETUP → CONVERSATION → REVIEW → GENERATION → OUTPUT

---

## Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/ | Health check |
| POST | /api/livekit-token | LiveKit JWT token |
| POST | /api/generate-episode | Full Gemini generation (9 sections) |
| GET | /api/episodes | Episode history (last 5, MongoDB) |
| POST | /api/regenerate-section | Regenerate one section of an episode |

---

## DB Schema (MongoDB `episodes` collection)

```json
{
  "id": "uuid",
  "user_prefs": { "name", "show_name", "archetype", "energy_word", "controversy_level" },
  "episode": { "title", "hook", "script", "show_notes", "tags", "cta", "listener_persona", "audiogram_script", "tweet_copy" },
  "created_at": "ISO timestamp"
}
```

---

## What's Been Implemented

### Phase 1 — Core MVP (Feb 2026)
- 5-screen flow with complete routing
- Voice setup form (show name, archetype, energy word, controversy slider)
- Conversation screen with 8 Jordan questions
- Gemini 2.5-flash generation of 9 episode sections
- Output screen with bento grid of all content
- MongoDB persistence of episodes

### Phase 2 — P0 UI Fixes (Feb 2026)
- Text fallback for voice (LiveKit ARM64 incompatible on preview env)
- Demo Mode button auto-fills all 8 questions  
- OutputScreen mobile responsiveness
- Prominent TTS playback UI with sentence highlighting

### Phase 3 — 10 Fixes Upgrade (Apr 2026)
- **Fix 1:** Question arrays unified (ConversationScreen.jsx + agent.py word-for-word match)
- **Fix 2:** Controversy level → hard behavioral rules in Gemini system prompt (not context string)
- **Fix 3:** Archetype → hard behavioral rules in Gemini system prompt (6 archetypes with specific writing instructions)
- **Fix 4:** TTS preprocessor strips `[STAGE DIRECTIONS]`, converts `...` → 500ms pause, `— wait —` → 1200ms pause via sequential SpeechSynthesisUtterance objects
- **Fix 5:** sessionStorage persists answers before API call; error state has "Try Again" (retryCount++) and "← Edit Answers" (onBack) buttons
- **Fix 6:** 3 demo topic pills (AI Ethics / Mental Health / Future of Work) inline with Run Demo button; selected pill has purple border
- **Fix 7:** ReviewScreen between CONVERSATION and GENERATION — localAnswers state, auto-resize textareas, edit without mutating parent until "Generate Episode →"
- **Fix 8:** Jordan speaks each question via speechSynthesis on qIndex change; mute toggle near avatar (default unmuted)
- **Fix 9:** POST /api/regenerate-section endpoint + Regenerate button on each OutputCard; updates in localEpisode state without affecting other cards
- **Polish for Audio:** POST /api/polish-script-for-audio + Polish for Audio button (pink) on the Script card — transforms raw script to production-ready audio script with markers ([PAUSE], [EMPHASIS], [ENERGY UP], [BEAT], [SLOWER]); user-triggered, non-destructive
- **Fix 10:** GET /api/episodes endpoint + episode history on HeroScreen; silent fail if empty

---

## Known Issues / Blocked

- **LiveKit ARM64:** `liblivekit_ffi.so: undefined symbol: __arm_tpidr2_save` — blocked by hardware. Mitigated by Web Speech API fallback in frontend.
- **Transient Gemini 500:** Occasional cold-start error on gemini-2.5-flash (not consistently reproducible). Self-resolves on retry.

---

## Prioritized Backlog

### P1 (Next Sprint)
- Add data-testid to VoiceSetupScreen inputs (show-name-input, energy-word-input, archetype-select)
- Mobile viewport testing and fixes for ConversationScreen top bar overflow

### P2
- Social sharing (Open Graph meta tags for episode)
- PDF/ZIP export of full episode package
- User accounts / saved episode library

### P3 / Future
- Spotify publishing integration
- LiveKit fix when x86 environment available
- Episode templates / pre-set topics
- Analytics dashboard (listen count, copy count)
