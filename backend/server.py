from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
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
  "tweet_copy": ["tweet1 (under 280 chars)", "tweet2", "tweet3", "tweet4", "tweet5"]
}"""


def build_episode_system_prompt(controversy_level: int, archetype: str) -> str:
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

    return f"""You are a world-class podcast producer and content strategist.
Generate a complete, publish-ready podcast episode package based on the host's interview transcript.

{controversy_rule}

{archetype_rule}

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

INTERVIEW TRANSCRIPT:
{answers_text}

Generate the full podcast episode package based on this content. Be specific to their actual answers — no generic filler."""

        genai_client = genai.Client(api_key=GEMINI_API_KEY)
        system_prompt = build_episode_system_prompt(
            controversy_level=int(prefs.get("controversy_level", 5)),
            archetype=str(prefs.get("archetype", "Thought Leader")),
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

        # Store in MongoDB
        await db.episodes.insert_one(
            {
                "id": str(uuid.uuid4()),
                "user_prefs": prefs,
                "episode": episode_data,
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
