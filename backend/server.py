from fastapi import FastAPI, APIRouter, HTTPException, Response
from dotenv import load_dotenv
import httpx
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from google import genai
from google.genai import types
from livekit import api as lk_api
import os
import json
import uuid
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="PodcastMe API")
api_router = APIRouter(prefix="/api")

# MongoDB
mongo_url = os.environ["MONGO_URL"]
db_client = AsyncIOMotorClient(mongo_url)
db = db_client[os.environ["DB_NAME"]]

# LiveKit
LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY", "")

ARCHETYPE_RULES = {
    "Educator": (
        "ARCHETYPE RULE: Write as a clear, structured Educator. Use numbered frameworks, defined steps, and explicit "
        "takeaways. Make complex ideas instantly accessible. Prioritize clarity and structure over entertainment."
    ),
    "Disruptor": (
        "ARCHETYPE RULE: Write as a bold Disruptor. Challenge the status quo at every turn. Use edgy, provocative "
        "language. Name names. Directly confront outdated thinking. Make the audience productively uncomfortable."
    ),
    "Storyteller": (
        "ARCHETYPE RULE: Write as a compelling Storyteller. Weave narrative arcs throughout. Use vivid sensory "
        "examples, emotional moments, and character-driven anecdotes. Make the audience feel something."
    ),
    "Thought Leader": (
        "ARCHETYPE RULE: Write as an authoritative Thought Leader. Project vision and gravitas. Use forward-looking, "
        "big-picture language. Position insights as movements, not just opinions."
    ),
    "Coach": (
        "ARCHETYPE RULE: Write as a motivating Coach. Use energizing, action-oriented language. Focus relentlessly "
        "on transformation and actionable next steps. Speak directly to the listener as 'you'."
    ),
    "Interviewer": (
        "ARCHETYPE RULE: Write as a curious Interviewer. Frame insights as discoveries. Use a conversational, "
        "exploratory tone. Let the host's journey and questions drive the narrative."
    ),
}

_JSON_OUTPUT_SPEC = """{
  "title": "compelling episode title (6-10 words max, specific and intriguing)",
  "hook": "opening hook (3 punchy sentences that grab attention immediately and preview the value)",
  "script": "full episode script (1800-2500 words, conversational tone, structured with natural intro, 3 main content sections, powerful outro — write it as actual speech, not bullet points)",
  "show_notes": "episode show notes (200-250 words, plain text, covering key points, timestamps estimate, and 2-3 resource ideas)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "cta": "powerful listener call-to-action (2 sentences — specific, emotional, action-oriented)",
  "listener_persona": "ideal listener profile (120-160 words covering age, occupation, key struggles, aspirations, and why this episode hits home for them)",
  "audiogram_script": "verbatim 30-second audiogram script (compelling hook + one key insight + strong CTA, written to be spoken aloud)",
  "tweet_copy": ["tweet1 (under 280 chars)", "tweet2", "tweet3", "tweet4", "tweet5"],
  "hook_variants": {
    "emotional": "hook variant opening with raw human emotion or vulnerability (2-3 sentences)",
    "data_driven": "hook variant opening with a surprising statistic or concrete data point (2-3 sentences)",
    "contrarian": "hook variant opening with a bold, counterintuitive claim (2-3 sentences)"
  },
  "section_confidence": {
    "title": {"score": 8, "reason": "brief reason (10 words max)"},
    "hook": {"score": 8, "reason": "brief reason"},
    "script": {"score": 8, "reason": "brief reason"},
    "show_notes": {"score": 8, "reason": "brief reason"},
    "cta": {"score": 8, "reason": "brief reason"},
    "listener_persona": {"score": 8, "reason": "brief reason"},
    "audiogram_script": {"score": 8, "reason": "brief reason"}
  },
  "social_pack": {
    "thread": ["thread tweet 1 (hook)", "thread tweet 2 (insight)", "thread tweet 3 (insight)", "thread tweet 4 (CTA)"],
    "contrarian_take": "one bold contrarian statement for social (under 2 sentences)",
    "quote_card": "most quotable single line from the episode (under 120 chars)",
    "data_point": "one concrete stat or fact from the episode content (invent realistic one if none exists)",
    "cta_post": "short social post driving listeners to episode (under 150 chars)",
    "linkedin_post": "LinkedIn professional post (150-200 words, insight + soft CTA)",
    "newsletter_snippet": "email newsletter teaser (80-100 words, casual and exciting)"
  }
}"""


def build_episode_system_prompt(controversy_level: int, archetype: str, output_language: str = "en") -> str:
    if controversy_level <= 3:
        controversy_rule = (
            "CONTROVERSY RULE: Keep all content safe and balanced. Present multiple perspectives without bias. "
            "Avoid polarizing statements. Focus on widely accepted wisdom and positive, constructive framing."
        )
    elif controversy_level <= 6:
        controversy_rule = (
            "CONTROVERSY RULE: Include moderate opinions with some edge. Mildly challenge conventional wisdom where "
            "relevant. Present the host's clear perspective while acknowledging other viewpoints exist."
        )
    else:
        controversy_rule = (
            "CONTROVERSY RULE: Be bold and deliberately provocative. Challenge conventional wisdom directly — and by "
            "name. Make strong, opinionated, debate-sparking statements. Take clear sides. Name specific thought "
            "leaders or widely-held beliefs to agree with or push back against. Edgy and contrarian is always "
            "better than safe and neutral at this controversy level."
        )

    archetype_rule = ARCHETYPE_RULES.get(
        archetype,
        f"ARCHETYPE RULE: Write in the authentic style of a {archetype}. Match the tone, vocabulary, and structural approach expected of this archetype.",
    )

    language_rule = ""
    if output_language and output_language.lower() not in ("en", "english"):
        lang_map = {"es": "Spanish", "fr": "French", "pt": "Portuguese (Brazil)", "de": "German", "it": "Italian", "ja": "Japanese", "zh": "Chinese (Simplified)"}
        lang_name = lang_map.get(output_language.lower(), output_language)
        language_rule = (
            f"\nLANGUAGE RULE: Generate ALL content in {lang_name}. Every field — title, hook, script, "
            f"show_notes, tags, cta, listener_persona, audiogram_script, tweet_copy, hook_variants, "
            f"and social_pack — must be written entirely in {lang_name}. Do not use English.\n"
        )

    return f"""You are a world-class podcast producer and content strategist.
Generate a complete, publish-ready podcast episode package based on the host's interview transcript.

{controversy_rule}

{archetype_rule}
{language_rule}
HOOK VARIANTS RULE: Write 3 distinct opening hooks:
1. "emotional" — opens with raw vulnerability, human connection, or emotion
2. "data_driven" — opens with a surprising statistic, research finding, or concrete data
3. "contrarian" — opens with a bold, counterintuitive claim that challenges convention

CONFIDENCE SCORING RULE: For section_confidence, honestly score each section 1-10. Score reflects specificity, originality, and alignment with the host's actual content. Below 7 = should be regenerated.

SOCIAL PACK RULE: Create platform-native content:
- "thread": 4 tweets (hook → insight → insight → CTA)
- "contrarian_take": bold 2-sentence contrarian statement
- "quote_card": most quotable single line (under 120 chars)
- "data_point": one concrete stat or fact
- "cta_post": 1-sentence post driving to episode (under 150 chars)
- "linkedin_post": 150-200 word professional post with insight + soft CTA
- "newsletter_snippet": 80-100 word email teaser

Return ONLY valid JSON (no markdown, no triple backticks) with these exact keys:
{_JSON_OUTPUT_SPEC}"""


class LiveKitTokenRequest(BaseModel):
    participant_name: str = "Podcast Host"
    user_prefs: dict = {}


class EpisodeAnswer(BaseModel):
    question: str
    answer: str


class GenerateEpisodeRequest(BaseModel):
    user_prefs: dict = {}
    answers: List[EpisodeAnswer]


class RegenerateSectionRequest(BaseModel):
    section: str
    current_content: str
    user_prefs: dict = {}
    episode_title: str = ""
    episode_context: str = ""


# ── New Models for 25-Feature Upgrade ──
class GenerateQuestionsRequest(BaseModel):
    topic: str
    archetype: str = "Thought Leader"
    controversy_level: int = 5
    has_guest: bool = False
    guest_name: str = ""


class FollowUpRequest(BaseModel):
    question: str
    short_answer: str
    topic: str = ""


class DevilsAdvocateRequest(BaseModel):
    paragraph: str
    topic: str = ""
    controversy_level: int = 5


class EmotionalArcRequest(BaseModel):
    script: str
    topic: str = ""


class GenerateAudioRequest(BaseModel):
    script: str
    voice: str = "aura-asteria-en"


class ControversyPreviewRequest(BaseModel):
    topic: str
    controversy_level: int = 5
    archetype: str = "Thought Leader"


class SimulateAnswersRequest(BaseModel):
    questions: List[str]
    topic: str
    archetype: str = "Thought Leader"


class SeriesPlanRequest(BaseModel):
    topic: str
    num_episodes: int = 6
    archetype: str = "Thought Leader"


class SimulateAudienceRequest(BaseModel):
    script: str
    topic: str = ""


class AnalyzeCompetitorRequest(BaseModel):
    competitor_url: str
    topic: str


@api_router.get("/")
async def root():
    return {"message": "PodcastMe API v1", "status": "running"}


@api_router.post("/livekit-token")
async def get_livekit_token(request: LiveKitTokenRequest):
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise HTTPException(status_code=500, detail="LiveKit credentials not configured")
    try:
        room_name = f"podcast-{str(uuid.uuid4())[:8]}"
        identity = f"user-{str(uuid.uuid4())[:8]}"

        token = lk_api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        token.with_identity(identity)
        token.with_name(request.participant_name)
        token.with_metadata(json.dumps(request.user_prefs))
        token.with_grants(
            lk_api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )
        )

        logger.info(f"Token generated for room: {room_name}, participant: {request.participant_name}")
        return {
            "server_url": LIVEKIT_URL,
            "participant_token": token.to_jwt(),
            "room_name": room_name,
        }
    except Exception as e:
        logger.error(f"Token generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/generate-episode")
async def generate_episode(request: GenerateEpisodeRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    try:
        prefs = request.user_prefs
        answers_text = "\n\n".join(
            [f"Q{i+1}: {ans.question}\nA: {ans.answer}" for i, ans in enumerate(request.answers)]
        )

        context = f"""HOST PROFILE:
- Name: {prefs.get('name', 'The Host')}
- Show: {prefs.get('show_name', 'The Podcast')}
- Archetype: {prefs.get('archetype', 'Expert')}
- Energy Word: {prefs.get('energy_word', 'Transform')}
- Controversy Level: {prefs.get('controversy_level', 5)}/10
- Episode Topic: {prefs.get('topic', 'General')}
- Output Language: {prefs.get('output_language', 'en')}
{f"- Guest: {prefs.get('guest_name', 'Guest')} (guest episode — frame questions toward interviewing them)" if prefs.get('has_guest') else ""}
{f"- Sponsor: {prefs.get('sponsor_name', '')} (include one natural, non-intrusive sponsor mention in the script)" if prefs.get('has_sponsor') else ""}
{f"- Listener Hint: {prefs.get('listener_persona_hint', '')}" if prefs.get('listener_persona_hint') else ""}
{f"- Emotional Arc: {str(prefs.get('arc', []))}" if prefs.get('arc') else ""}

INTERVIEW TRANSCRIPT:
{answers_text}

Generate the full podcast episode package based on this content. Be specific to their actual answers — no generic filler."""

        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        system_prompt = build_episode_system_prompt(
            controversy_level=int(prefs.get("controversy_level", 5)),
            archetype=str(prefs.get("archetype", "Thought Leader")),
            output_language=str(prefs.get("output_language", "en")),
        )

        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=context,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                max_output_tokens=65536,
            ),
        )

        episode_data = json.loads(response.text)

        # Store in MongoDB with enriched schema
        await db.episodes.insert_one(
            {
                "id": str(uuid.uuid4()),
                "user_id": prefs.get("user_id", "anonymous"),
                "user_prefs": prefs,
                "episode": episode_data,
                "topic": prefs.get("topic", ""),
                "title": episode_data.get("title", ""),
                "key_positions": episode_data.get("key_positions", []),
                "tags": episode_data.get("tags", []),
                "controversy_level": int(prefs.get("controversy_level", 5)),
                "output_language": prefs.get("output_language", "en"),
                "archetype": prefs.get("archetype", ""),
                "full_output": episode_data,
                "controversy_confirmed": prefs.get("controversy_confirmed", False),
                "has_guest": prefs.get("has_guest", False),
                "guest_name": prefs.get("guest_name", ""),
                "has_sponsor": prefs.get("has_sponsor", False),
                "sponsor_name": prefs.get("sponsor_name", ""),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        logger.info(f"Episode generated: {episode_data.get('title', 'N/A')}")
        return episode_data

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse Gemini response as JSON")
    except Exception as e:
        logger.error(f"Episode generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/polish-script-for-audio")
async def polish_script_for_audio(request: Dict[str, Any]):
    """
    Transforms raw podcast script into audio-ready production script
    with professional audio direction markers.
    Returns: { polished_script: str }
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    try:
        raw_script = request.get("script", "").strip()
        user_prefs = request.get("user_prefs", {})
        episode_title = request.get("episode_title", "")

        if not raw_script or len(raw_script) < 50:
            raise HTTPException(status_code=400, detail="Script too short to polish")

        polish_system_prompt = """You are a world-class podcast script editor and audio producer. Transform written scripts into production-ready podcast audio that sounds natural, engaging, and professional.

TRANSFORMATION RULES:

1. **Audio-First Writing** — Every word must sound like natural speech, not an essay. Use contractions ("I'm", "don't", "it's"). Short sentences dominate. Fragments are fine if they sound conversational.

2. **Production Markers** — Insert these exactly as shown:
   - [PAUSE 2-3 seconds] — Dramatic beats, transitions, after important points
   - [EMPHASIS] — Before key words/phrases to highlight vocally
   - [SLOWER] — For complex ideas needing clarity
   - [ENERGY UP] — Building intensity or passion
   - [BEAT] — Comedic timing, silence for effect
   - [SFX: description] — Sound effects (sparingly)

3. **Chunk for Listening** — Max 2-3 sentences per idea. Listeners lose focus with dense paragraphs. Use line breaks liberally.

4. **Direct Address** — Speak TO the listener, not AT them. Use "You know what?", "Here's the thing...", "Think about this...", rhetorical questions.

5. **Punchy Transitions** — Replace weak connectors:
   ❌ "Alright, let's talk about..."
   ❌ "In conclusion, we can see that..."
   ✅ "But here's where it gets interesting..."
   ✅ "And this is what everyone gets wrong..."
   ✅ "So here's my point..."

6. **Personality & Humor** — Show the host's voice. Use analogies, unexpected angles, conversational asides. Make listeners want to keep listening.

7. **Rhythm & Pacing** — Vary sentence length:
   - Short. Medium. And occasionally one that's longer to give the ear a moment to breathe and process.

8. **Hook + Payoff** — Open strong (first 10 seconds must grab attention). Close with a memorable takeaway that sticks.

9. **Cut Filler** — Remove:
   - "I'm here to tell you that..."
   - "Fundamentally speaking..."
   - "As mentioned previously..."
   Get. To. The. Point.

10. **Maintain Structure** — Keep the original narrative arc and section breaks, but rewrite every line for audio delivery.

EXAMPLE TRANSFORMATION:
❌ ESSAY: "The fundamental mistake we, as fans, are making right now is clinging to a dangerous, passive hope that frankly, isn't helping anyone."
✅ PODCAST: "Here's what we're doing wrong. We're sitting around hoping. [BEAT] And hope? [EMPHASIS] Hope doesn't win matches."

OUTPUT REQUIREMENTS:
- Return ONLY the polished script (no explanations, no commentary)
- Maintain word count roughly 80-120% of original (tighten if verbose)
- Every line must be speakable in natural human voice
- Markers integrated naturally, not forced
- Add [OUTRO BEAT] before final sign-off"""

        polish_user_prompt = f"""Transform this raw podcast script into audio-ready production quality. The host is {user_prefs.get('name', 'the host')} from show "{user_prefs.get('show_name', 'a podcast')}". Make it sound like them talking directly to a friend.

EPISODE: "{episode_title}"

---
{raw_script}
---

Return ONLY the polished script with audio markers. No preamble."""

        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=polish_user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=polish_system_prompt,
                max_output_tokens=8192,
            ),
        )

        polished_script = response.text.strip()

        if not polished_script:
            raise HTTPException(status_code=500, detail="Gemini returned empty response")

        logger.info(f"Script polished: {episode_title} ({len(polished_script)} chars)")
        return {"polished_script": polished_script}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Polish script error: {e}")
        raise HTTPException(status_code=500, detail=f"Polish failed: {str(e)}")


@api_router.get("/episodes")
async def get_episodes(limit: int = 5):
    episodes = []
    try:
        cursor = db.episodes.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
        async for doc in cursor:
            episodes.append(doc)
    except Exception as e:
        logger.error(f"Episodes fetch error: {e}")
    return episodes


SECTION_DESCRIPTIONS = {
    "hook": "opening hook: 3 punchy sentences that grab attention immediately and preview the episode value",
    "script": "full episode script (1800-2500 words, conversational, natural intro + 3 content sections + strong outro, written as spoken speech not bullet points)",
    "show_notes": "show notes (200-250 words, key points, estimated timestamps, 2-3 resource ideas)",
    "listener_persona": "ideal listener profile (120-160 words: age, occupation, struggles, aspirations, why this episode resonates)",
    "audiogram_script": "30-second audiogram script (spoken hook + key insight + clear CTA, to be read aloud)",
    "cta": "listener call-to-action (2 sentences: specific, emotional, action-oriented)",
    "title": "episode title (6-10 words, specific and intriguing)",
    "tags": "8 highly specific, searchable podcast tags",
    "tweet_copy": "5 distinct tweet variations (each under 280 characters)",
}

ARRAY_SECTIONS = {"tags", "tweet_copy"}


@api_router.post("/regenerate-section")
async def regenerate_section(request: RegenerateSectionRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    try:
        description = SECTION_DESCRIPTIONS.get(request.section, f"the '{request.section}' section")
        is_array = request.section in ARRAY_SECTIONS

        return_format = (
            "a JSON array of strings (no wrapper object)"
            if is_array
            else "a plain text string only — no JSON wrapper, no markdown, no preamble or explanation"
        )

        prompt = f"""You are a world-class podcast producer. Regenerate ONLY the {description} for this episode.

EPISODE: "{request.episode_title}"
SHOW: {request.user_prefs.get('show_name', 'The Podcast')} | Archetype: {request.user_prefs.get('archetype', 'Expert')} | Controversy: {request.user_prefs.get('controversy_level', 5)}/10
CONTEXT: {request.episode_context}

CURRENT VERSION — make this significantly more compelling and specific:
{request.current_content}

Return ONLY {return_format}."""

        genai_client = genai.Client(api_key=GEMINI_API_KEY)

        if is_array:
            response = await genai_client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    max_output_tokens=2048,
                ),
            )
            result = json.loads(response.text)
        else:
            response = await genai_client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(max_output_tokens=8192),
            )
            result = response.text.strip()

        logger.info(f"Section '{request.section}' regenerated for: {request.episode_title}")
        return {"section": request.section, "content": result}

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error in regenerate: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse Gemini response")
    except Exception as e:
        logger.error(f"Regeneration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/generate-questions")
async def generate_questions(request: GenerateQuestionsRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    try:
        guest_context = (
            f"This is a GUEST EPISODE featuring {request.guest_name}. Include 3 questions specifically "
            f"for interviewing {request.guest_name}. Frame them as direct interview questions."
            if request.has_guest and request.guest_name
            else ""
        )
        prompt = f"""Generate exactly 8 highly specific podcast interview questions.

HOST ARCHETYPE: {request.archetype}
CONTROVERSY LEVEL: {request.controversy_level}/10
EPISODE TOPIC: {request.topic}
{guest_context}

Rules:
1. Every question must be SPECIFIC to this exact topic — no generic questions
2. Include one question about the most controversial aspect of this topic
3. Include one question asking for a personal story related to this topic
4. Include one question about the biggest mistake people make in this space
5. Include one question about the ideal listener or who most needs this
6. Questions vary: some provocative, some introspective, some tactical
7. At controversy {request.controversy_level}/10 — {'be safe and balanced' if request.controversy_level <= 3 else 'include bold, pointed questions' if request.controversy_level <= 6 else 'be provocative and confrontational'}
8. Each question should be 15-30 words

Return ONLY a JSON array of exactly 8 strings. No wrapper object.
Example: ["Question 1?", "Question 2?", ...]"""
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=2048,
            ),
        )
        questions = json.loads(response.text)
        if not isinstance(questions, list) or len(questions) < 8:
            raise ValueError("Invalid questions format")
        logger.info(f"Generated questions for topic: {request.topic}")
        return {"questions": questions[:8]}
    except Exception as e:
        logger.error(f"Generate questions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/followup-question")
async def followup_question(request: FollowUpRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    try:
        word_count = len(request.short_answer.split()) if request.short_answer else 0
        prompt = f"""A podcast host gave a short answer ({word_count} words). Generate ONE specific follow-up question.

ORIGINAL QUESTION: {request.question}
SHORT ANSWER: {request.short_answer}
TOPIC: {request.topic}

Rules:
- Dig DEEPER into their specific answer
- Ask for a concrete example, specific story, or key detail they glossed over
- Under 20 words
- Reference something specific from their answer
- Return ONLY the follow-up question string, nothing else"""
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(max_output_tokens=256),
        )
        followup = response.text.strip().strip('"').strip("'")
        return {"followup": followup}
    except Exception as e:
        logger.error(f"Follow-up question error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/devils-advocate")
async def devils_advocate(request: DevilsAdvocateRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    try:
        tone = "mild and balanced" if request.controversy_level <= 3 else "moderately provocative" if request.controversy_level <= 6 else "bold and confrontational"
        prompt = f"""You are a sharp devil's advocate. Write a brief compelling counterpoint.

TOPIC: {request.topic}
CONTROVERSY LEVEL: {request.controversy_level}/10 ({tone})
CONTENT: {request.paragraph[:600]}

Rules:
- Challenge the main claim with a strong specific counterargument
- Be specific — reference exact claims from the content
- 2-3 sentences maximum
- Be {tone}
- Return ONLY the counterpoint text"""
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(max_output_tokens=512),
        )
        return {"counterpoint": response.text.strip()}
    except Exception as e:
        logger.error(f"Devil's advocate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/emotional-arc")
async def emotional_arc(request: EmotionalArcRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    try:
        words = request.script.split()
        n_segments = min(10, max(5, len(words) // 150))
        seg_size = max(1, len(words) // n_segments)
        segments = [" ".join(words[i:i + seg_size]) for i in range(0, len(words), seg_size)][:n_segments]
        prompt = f"""Analyze the emotional arc of this podcast script. Rate each of the {len(segments)} segments.

TOPIC: {request.topic}
SCRIPT SEGMENTS:
{chr(10).join([f"Segment {i+1}: {seg[:200]}..." for i, seg in enumerate(segments)])}

Return a JSON array of exactly {len(segments)} objects:
[{{"segment": 1, "energy": 7, "emotion": "Curious", "label": "The Setup"}}, ...]

energy: 1-10 (1=somber/calm, 10=high energy/excited)
emotion: one word from: Curious, Confrontational, Educational, Emotional, Inspiring, Analytical, Humorous, Urgent
label: 2-3 word arc label
Return ONLY the JSON array."""
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=1024,
            ),
        )
        arc_data = json.loads(response.text)
        return {"arc": arc_data}
    except Exception as e:
        logger.error(f"Emotional arc error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/generate-audio")
async def generate_audio(request: GenerateAudioRequest):
    if not DEEPGRAM_API_KEY:
        raise HTTPException(status_code=500, detail="DEEPGRAM_API_KEY not configured")
    try:
        import re as _re
        clean_text = _re.sub(r'\[[A-Z][A-Z\s]*(?:\s\d+)?\]', ' ', request.script)
        clean_text = _re.sub(r'[ \t]+', ' ', clean_text).strip()
        if len(clean_text) > 2000:
            clean_text = clean_text[:2000]
        async with httpx.AsyncClient(timeout=60.0) as client:
            dg_response = await client.post(
                f"https://api.deepgram.com/v1/speak?model={request.voice}",
                headers={
                    "Authorization": f"Token {DEEPGRAM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"text": clean_text},
            )
        if dg_response.status_code != 200:
            logger.error(f"Deepgram error: {dg_response.status_code}")
            raise HTTPException(status_code=500, detail=f"Deepgram TTS failed: {dg_response.status_code}")
        logger.info(f"Audio generated: {len(dg_response.content)} bytes")
        return Response(
            content=dg_response.content,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=podcast_episode.mp3"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generate audio error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/controversy-preview")
async def controversy_preview(request: ControversyPreviewRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    try:
        prompt = f"""Generate a 2-sentence preview of the most controversial podcast angle.
TOPIC: {request.topic} | ARCHETYPE: {request.archetype} | CONTROVERSY: {request.controversy_level}/10
Make it punchy, specific, and provocative. Return ONLY the 2-sentence preview."""
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(max_output_tokens=256),
        )
        return {"preview": response.text.strip()}
    except Exception as e:
        logger.error(f"Controversy preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/simulate-answers")
async def simulate_answers(request: SimulateAnswersRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    try:
        questions_str = "\n".join([f"{i+1}. {q}" for i, q in enumerate(request.questions)])
        prompt = f"""You are a podcast host with archetype "{request.archetype}" being interviewed about: {request.topic}
Answer these questions as this host would — authentic, opinionated, and specific (50-100 words each):

{questions_str}

Return JSON array: [{{"question": "Q1 text", "answer": "answer text"}}, ...]
Return ONLY the JSON array."""
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=4096,
            ),
        )
        return {"answers": json.loads(response.text)}
    except Exception as e:
        logger.error(f"Simulate answers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/analyze-competitor")
async def analyze_competitor(request: AnalyzeCompetitorRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    try:
        page_content = ""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.get(request.competitor_url, headers={"User-Agent": "Mozilla/5.0"})
                if r.status_code == 200:
                    import re as _re
                    page_content = _re.sub(r'<[^>]+>', ' ', r.text)[:3000]
        except Exception as fetch_err:
            logger.warning(f"Competitor URL fetch failed: {fetch_err}")
            page_content = f"[Could not fetch: {request.competitor_url}]"
        prompt = f"""Analyze competitor content for podcast gaps and opportunities.
YOUR TOPIC: {request.topic} | URL: {request.competitor_url}
CONTENT: {page_content[:2000]}

Return JSON: {{"gaps": ["gap1","gap2","gap3"], "opportunities": ["opp1","opp2","opp3"], "differentiators": ["diff1","diff2"]}}"""
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=1024,
            ),
        )
        return {"analysis": json.loads(response.text)}
    except Exception as e:
        logger.error(f"Analyze competitor error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/series-plan")
async def series_plan(request: SeriesPlanRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    try:
        prompt = f"""Create a {request.num_episodes}-episode podcast series plan.
ARCHETYPE: {request.archetype} | TOPIC: {request.topic}
Return JSON array: [{{"ep_num": 1, "title": "...", "hook": "...", "key_question": "..."}}]
Return ONLY the JSON array."""
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=2048,
            ),
        )
        return {"series": json.loads(response.text)}
    except Exception as e:
        logger.error(f"Series plan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/simulate-audience")
async def simulate_audience(request: SimulateAudienceRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
    try:
        snippet = request.script[:800] if request.script else ""
        prompt = f"""Simulate how 4 different listener personas react to this podcast episode.
TOPIC: {request.topic} | EXCERPT: {snippet}
Return JSON: [{{"persona": "...", "age_role": "...", "reaction": "2-3 sentence reaction", "rating": 8, "would_share": true}}]
Return ONLY the JSON array."""
        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=1024,
            ),
        )
        return {"reactions": json.loads(response.text)}
    except Exception as e:
        logger.error(f"Simulate audience error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/episode-history")
async def episode_history(user_id: str = "", limit: int = 20):
    episodes = []
    try:
        query = {"user_id": user_id} if user_id else {}
        cursor = db.episodes.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
        async for doc in cursor:
            episodes.append(doc)
    except Exception as e:
        logger.error(f"Episode history error: {e}")
    return episodes


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    db_client.close()
