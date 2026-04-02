# PodcastMe — Investor Demo Script

**Total demo time: ~90 seconds**

---

## Pre-Demo Setup

1. Open the app URL in **Chrome** (best Web Speech support)
2. Keep browser tab ready — no login required
3. Confirm the URL loads the Hero screen with the animated gradient

---

## Screen 1: Hero (0:00 – 0:10)

**What to say:**
> "This is PodcastMe. With just 8 questions, our AI podcast producer builds a complete, publish-ready episode package in under 2 minutes — title, full script, show notes, tweets, everything."

**Click:** `Start My Episode`

---

## Screen 2: Voice Setup (0:10 – 0:25)

**What to say:**
> "The host fills in their profile. We use this to personalize Jordan — the AI producer — to their exact show style and controversy level."

**Fill in the form:**
| Field | Value |
|-------|-------|
| Name | `Alex Rivera` |
| Show Name | `Founders Unfiltered` |
| Archetype | Click `The Visionary` |
| Controversy Level | Drag to `7` |
| Energy Word | `Ignite` |

**Click:** `Enter the Studio →`

---

## Screen 3: Conversation (0:25 – 0:40)

**What to say:**
> "Normally, Jordan conducts a live voice interview — 8 structured questions via LiveKit real-time audio. For this demo, I'll use our instant demo mode."

**Click:** The `📊 Run Demo` button (top right corner)

**What happens:**
- 8 pre-filled answers about "The Future of AI Ethics" are submitted instantly
- App advances directly to the Generation screen

---

## Screen 4: Generation (0:40 – 1:10)

**What to say:**
> "Gemini 2.5 Flash is now building the entire episode package. Watch the progress — it's generating 9 distinct content sections simultaneously."

**Point out on screen:**
- The animated progress bar
- The checklist of what's being generated

**Wait:** 15–30 seconds for Gemini to respond.

---

## Screen 5: Output (1:10 – 1:45)

**What to say:**
> "Here's the complete episode package — everything a podcaster needs to publish, promote, and repurpose this content. One click copies each asset."

**Demonstrate these 3 actions:**

1. Click **`▶ Listen to Your Episode`** — let it play for 10–15 seconds. Point out the waveform animation and sentence highlighting in the script card.
2. Click **`⎘ Hook`** to copy the opening hook — "That's ready to paste straight into a show intro."
3. Scroll down and click **`⎘ Tweet 1`** — "And 5 tweet drafts, ready to schedule."

**Closing line:**
> "From zero to a publish-ready podcast episode in under 90 seconds. That's PodcastMe."

---

## Investor Q&A Talking Points

| Question | Answer |
|----------|--------|
| "How does the voice work?" | LiveKit real-time audio + Deepgram STT. Jordan listens, responds, and asks each question in sequence. In the preview environment, text fallback is active (ARM64 native lib constraint). |
| "What does Gemini generate?" | 9 content sections: episode title, opening hook, 2,000-word script, show notes, 8 tags, CTA, listener persona, 30s audiogram script, 5 tweet drafts. |
| "How long does generation take?" | 15–30 seconds with Gemini 2.5 Flash. |
| "Is there a database?" | Yes — MongoDB stores every generated episode for future analytics, replay, and user history features. |
| "How is this different from ChatGPT?" | The structured 8-question interview extracts nuanced, personal content that generic prompts miss. The output format is opinionated and directly publish-ready — no editing required. |
| "What's the go-to-market?" | Direct to indie podcasters (300K+) via communities. $29/mo for 10 episodes/mo. Enterprise tier for podcast networks. |

---

## Key Metrics to Mention

- **9 content assets** generated per episode
- **~2 minutes** end-to-end (setup to output)
- **0 accounts needed** — completely stateless flow
- **1-click copy** on every asset
