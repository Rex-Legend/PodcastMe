# PodcastMe — Product Requirements Document

## Original Problem Statement

Create a full-stack app called **PodcastMe** with a 5-screen flow:
`HERO → VOICE_SETUP → CONVERSATION → GENERATION → OUTPUT`

A user sets up their podcast preferences, has a conversation with an AI producer (Jordan) to answer 8 questions, then gets a fully generated podcast episode package via Gemini.

### Core Requirements
- React + Tailwind CSS (no external UI libraries)
- FastAPI Python backend
- Integrations: LiveKit (real-time voice), Deepgram (STT), Gemini (generation)
- Dark mode only: `#0A0A0A` bg, `#141414` cards, `#8B5CF6` purple, `#EC4899` pink

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS, Web Speech API |
| Backend | FastAPI, Motor (MongoDB async) |
| AI Generation | Google Gemini 2.5 Flash |
| Voice (full deployment) | LiveKit + Deepgram Nova-3 |
| Database | MongoDB |
| Preview fallback | Text input + Web Speech API (ARM64 constraint) |

---

## Screen Specifications

### Screen 1: Hero
- Animated background with microphone image (opacity 0.15)
- Pulsing radial gradient orb (hero-orb CSS animation)
- 10 floating particle dots (particle CSS animation)
- Badge: "AI Podcast Studio — Powered by Jordan"
- H1: "Turn 8 Questions Into a Publish-Ready Episode"
- Gradient text on "Publish-Ready"
- Stats row: 8 Questions, 9 Sections, ~2 min
- CTA: "Start My Episode"

### Screen 2: Voice Setup
- Form: Name, Show Name, Archetype (6-option grid), Controversy Level (slider 1-10), Energy Word
- Validation on required fields
- "Enter the Studio →" submit button

### Screen 3: Conversation
- Immediate text mode (no LiveKit wait)
- "Voice mode coming soon" amber badge
- Jordan avatar (gradient circle "J") + idle waveform animation
- Question card with "Jordan asks" label
- Web Speech API mic button + textarea for input
- "Run Demo" button (top-right) — auto-fills 8 AI Ethics answers
- Progress dots (8 steps)
- Ctrl+Enter keyboard shortcut to submit

### Screen 4: Generation
- Abstract wave background + spinner
- 5 staggered progress stages (Reading answers → Crafting structure → Writing script → Generating notes → Finalizing)
- Gemini 2.5 Flash API call
- Progress bar + percentage
- Checklist of 9 items being generated

### Screen 5: Output
- Sticky minimal nav bar: play button + title + "New Episode" button
- **TTS Hero Section** (primary CTA): "Listen to Your Episode" + waveform visualizer + large Play/Pause button + Stop button + progress bar
- **Sentence highlighting**: script card highlights current sentence during TTS playback
- Bento grid (12-column, responsive to single column on mobile ≤768px):
  - Hook (8 cols), Listener Persona (4 cols)
  - Full Script (12 cols) — with sentence highlighting
  - Show Notes (5 cols), Audiogram (4 cols), CTA (3 cols)
  - Tags (4 cols), Tweet Drafts (8 cols)
- Copy buttons on every card

---

## Demo Mode

**Trigger:** "📊 Run Demo" button on ConversationScreen (top-right)
**Behavior:** Immediately calls `onComplete(DEMO_ANSWERS)` with 8 pre-filled answers about "The Future of AI Ethics" podcast
**Topic:** AI ethics for tech founders, challenges Andrew Ng + Geoffrey Hinton
**Purpose:** 90-second investor demo flow

---

## Backend API

### `POST /api/livekit-token`
Generates LiveKit room access token. Returns `{server_url, participant_token, room_name}`.

### `POST /api/generate-episode`
**Input:** `{user_prefs, answers: [{question, answer}]}`
**Output (9 sections):** `{title, hook, script, show_notes, tags, cta, listener_persona, audiogram_script, tweet_copy}`
**Model:** Gemini 2.5 Flash with JSON response mode
**Storage:** Each episode stored in MongoDB `episodes` collection

---

## Design System

```css
--bg-primary:    #0A0A0A
--bg-card:       #141414
--bg-input:      #1E1E1E
--accent-purple: #8B5CF6
--accent-pink:   #EC4899
--success:       #10B981
--warning:       #F59E0B
--text-primary:  #F9FAFB
--text-muted:    #6B7280
--border:        #2D2D2D
```

Key CSS classes: `.btn-primary`, `.btn-secondary`, `.card`, `.input-field`, `.fade-in-up`, `.wave-bar.active`, `.wave-bar.idle`, `.gradient-text`, `.pulse-dot`, `.particle`, `.hero-orb`, `.output-bento-grid`, `.bento-col-{3,4,5,8,12}`

---

## Known Constraints

- **LiveKit Python SDK**: Native `liblivekit_ffi.so` incompatible with ARM64 (preview env). Frontend fallback (text + Web Speech) is fully functional.
- **agent.py**: Runs only on x86_64. Not started in preview.
- **No user authentication** — stateless per session.

---

## What Has Been Implemented (as of 2026-02-XX)

### V1 Scaffold (Session 1)
- All 5 screens with basic functionality
- FastAPI backend with LiveKit token + Gemini generation
- LiveKit + Web Speech fallback in ConversationScreen
- Design system (CSS variables, animations)
- MongoDB episode storage

### V2 P0 Upgrades (Session 2 — Current)
- **ConversationScreen**: Complete rewrite — immediate text mode, "Voice mode coming soon" badge, Run Demo button, idle waveform, progress dots, Ctrl+Enter shortcut
- **OutputScreen**: TTS hero section (large play button, waveform, progress bar, sentence highlighting), mobile-responsive bento grid (CSS classes + media queries)
- **HeroScreen**: 10 floating particles, pulsing gradient orb animation
- **index.css**: Added `waveBarIdle`, `particleFloat`, `orbPulse` animations; `.output-bento-grid` + `.bento-col-X` responsive classes
- **DEMO_SCRIPT.md**: Investor demo guide (90-second flow)
- **README.md**: Complete setup + API reference

---

## Prioritized Backlog

### P0 (Done)
- [x] Immediate text mode on ConversationScreen
- [x] Demo Mode button with AI Ethics pre-fills
- [x] OutputScreen mobile responsiveness
- [x] Prominent TTS playback section
- [x] Sentence highlighting in script

### P1 (Next)
- [ ] Manual answer flow: test full 8-question manual walk-through (type each answer)
- [ ] Mobile viewport testing (iPhone 12 portrait)
- [ ] TTS playback: test pause/resume behavior in production Chrome

### P2 (Future)
- [ ] LiveKit voice agent on x86_64 deployment
- [ ] Episode history / replay from MongoDB
- [ ] Social sharing (direct tweet from tweet drafts)
- [ ] Download episode package as PDF/ZIP
- [ ] User accounts + episode library
- [ ] Spotify/podcast platform publishing integration
