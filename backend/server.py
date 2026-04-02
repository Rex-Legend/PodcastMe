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
from typing import List
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

EPISODE_SYSTEM_PROMPT = """You are a world-class podcast producer and content strategist.
Generate a complete, publish-ready podcast episode package based on the host's interview transcript.

Return ONLY valid JSON (no markdown, no triple backticks) with these exact keys:
{
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


class LiveKitTokenRequest(BaseModel):
    participant_name: str = "Podcast Host"
    user_prefs: dict = {}


class EpisodeAnswer(BaseModel):
    question: str
    answer: str


class GenerateEpisodeRequest(BaseModel):
    user_prefs: dict = {}
    answers: List[EpisodeAnswer]


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

        response = await genai_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=context,
            config=types.GenerateContentConfig(
                system_instruction=EPISODE_SYSTEM_PROMPT,
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
