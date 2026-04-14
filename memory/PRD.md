# PodcastMe — PRD (Product Requirements Document)

## Original Problem Statement
Create a full-stack project called PodcastMe. The app features a 7-screen flow where a user sets up podcast preferences, interacts with an AI producer (Jordan), and gets a fully generated podcast episode package via Gemini.

## Product Requirements
- React + Tailwind CSS (dark mode only)
- Python FastAPI backend
- Integrations: Gemini 2.5 Flash (episode generation), Deepgram (TTS/STT), LiveKit (voice, falls back to text gracefully)
- Lightweight auth via UUID v4 in localStorage

## User Personas
- Podcast hosts who want AI-assisted episode production
- Content creators who want to publish faster
- Solo founders/thought leaders building personal brands

## Tech Stack
- Frontend: React, Tailwind CSS, Web Speech API, Recharts
- Backend: Python FastAPI, Motor (async MongoDB), Gemini GenAI, Deepgram
- DB: MongoDB (Motor async driver)
- Auth: UUID v4 in localStorage (`podcastme_user_id`)

## Architecture
```
/app/
├── backend/
│   ├── server.py    # FastAPI app (all routes)
│   └── .env         # GEMINI_API_KEY, DEEPGRAM_API_KEY, LIVEKIT_*
├── frontend/
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HeroScreen.jsx           ✅ Complete
│   │   │   ├── VoiceSetupScreen.jsx     ✅ Complete (w/ new fields)
│   │   │   ├── ArcBuilderScreen.jsx     ✅ NEW - 3-act optional arc builder
│   │   │   ├── ConversationScreen.jsx   ✅ Complete (dynamic Qs + follow-up)
│   │   │   ├── ReviewScreen.jsx         ✅ Complete (devil's advocate)
│   │   │   ├── GenerationScreen.jsx     ✅ Complete
│   │   │   ├── OutputScreen.jsx         ✅ Complete (hook variants, social pack, emotional arc, MP3, readability, fact-check, DA)
│   │   │   └── DashboardScreen.jsx      ✅ NEW - Recharts dashboard
│   │   ├── App.js                       ✅ UUID, 8-screen routing, floating Dashboard btn
│   │   └── index.css
│   └── .env
```

## Screen Flow
`HERO → VOICE_SETUP → ARC_BUILDER → CONVERSATION → REVIEW → GENERATION → OUTPUT`  
Dashboard accessible from floating button on most screens.

## Implemented Features (as of Feb 2026)

### Phase 1 — Core App (Session 1-3)
- ✅ 5-screen flow with Jordan AI producer
- ✅ Web Speech API voice recording + text fallback
- ✅ Gemini 2.5 Flash episode generation (9 fields: title, hook, script, show_notes, tags, cta, listener_persona, audiogram_script, tweet_copy)
- ✅ MongoDB episode storage + history
- ✅ All 10 P0 Fixes (scroll sync, demo mode, regeneration, etc.)
- ✅ "Polish for Audio" + TTS Marker Engine (`[PAUSE]`, `[EMPHASIS]`, `[ENERGY UP]`, `[SLOWER]`, `[BEAT]`)
- ✅ Custom TTS Engine with sentence-level highlighting
- ✅ Section regeneration

### Phase 2 — 25-Feature Mega Upgrade (Session 4, Feb 2026)
- ✅ UUID v4 `user_id` in localStorage (passed to all backend calls)
- ✅ ArcBuilderScreen — optional 3-act emotional arc builder (always with "Skip →")
- ✅ DashboardScreen — Recharts bar chart, episode stats, history list
- ✅ VoiceSetupScreen expanded: topic (required), output language (EN/ES/FR/PT), guest mode toggle, sponsor toggle, listener persona hint, competitor URL
- ✅ ConversationScreen: dynamic questions from `/api/generate-questions` based on topic, follow-up logic (< 40 words triggers follow-up via `/api/followup-question`)
- ✅ ReviewScreen: Devil's Advocate button per answer card
- ✅ OutputScreen: Hook Variants card (3 tabs), Social Pack card (LinkedIn/Newsletter/Quote/etc.), Emotional Arc chart (Recharts), MP3 Download (Deepgram TTS), Live Readability Score (Flesch-Kincaid), Fact-Check warning badges, Challenge Script button, Confidence score badges
- ✅ Updated MongoDB schema: user_id, topic, key_positions, tags, controversy_level, output_language, archetype, full_output, controversy_confirmed, has_guest, guest_name, has_sponsor, sponsor_name
- ✅ Updated generate-episode prompt: +hook_variants, +section_confidence, +social_pack (12 fields total)
- ✅ 11 new API endpoints: generate-questions, followup-question, devils-advocate, emotional-arc, generate-audio, controversy-preview, simulate-answers, analyze-competitor, series-plan, simulate-audience, episode-history
- ✅ Gemini retry logic with exponential backoff (for 503 errors)
- ✅ HeroScreen "View Podcast Dashboard →" link + floating global dashboard button

## API Endpoints
- `POST /api/generate-episode` — main generation (12 fields)
- `POST /api/polish-script-for-audio` — adds TTS markers
- `POST /api/regenerate-section` — regenerate single field
- `POST /api/generate-questions` — topic-specific interview questions
- `POST /api/followup-question` — follow-up if answer < 40 words
- `POST /api/devils-advocate` — counterpoint for paragraph/answer
- `POST /api/emotional-arc` — emotional arc data for Recharts
- `POST /api/generate-audio` — Deepgram TTS → MP3 download
- `POST /api/controversy-preview` — preview controversial angle
- `POST /api/simulate-answers` — simulate demo answers
- `POST /api/analyze-competitor` — competitor URL analysis
- `POST /api/series-plan` — 6-episode series planner
- `POST /api/simulate-audience` — simulate audience reactions
- `GET /api/episode-history` — filtered by user_id

## MongoDB Schema (`episodes` collection)
```json
{
  "id": "uuid",
  "user_id": "uuid-from-localstorage",
  "topic": "string",
  "title": "string",
  "key_positions": [],
  "tags": [],
  "controversy_level": 5,
  "output_language": "en",
  "archetype": "string",
  "full_output": {},
  "controversy_confirmed": false,
  "has_guest": false,
  "guest_name": "string",
  "has_sponsor": false,
  "sponsor_name": "string",
  "created_at": "ISO datetime",
  "user_prefs": {},
  "episode": {}
}
```

## Known Issues / Constraints
- LiveKit ARM64 crash on backend (expected). App works fully in text/Web Speech fallback mode.
- Gemini free tier: 20 req/day for `gemini-2.5-flash`. Paid tier has no functional impact on code.
- Auth is lightweight UUID in localStorage (no real auth system).

## Prioritized Backlog

### P0 (Critical)
- None currently. All P0 features from the 25-feature upgrade are implemented.

### P1 (High Value)
- Live controversy score indicator in ConversationScreen (show running controversy score as user answers)
- Competitor analysis UI in VoiceSetupScreen (show gaps/opportunities)
- Series Planner UI (show 6-episode plan on Dashboard)
- Audience Simulation UI in OutputScreen (show 4 personas reacting)

### P2 (Nice to Have)
- Real auth (JWT or Google OAuth)
- Episode sharing (public URL)
- Episode editing UI (edit script directly in OutputScreen)
- Transcript export (PDF/DOCX)
- Podcast RSS feed generation
- Multi-language UI (not just multi-language output)

## Test Credentials
No auth required. App uses UUID v4 in localStorage.
Backend requires: GEMINI_API_KEY, DEEPGRAM_API_KEY (both in /app/backend/.env)
