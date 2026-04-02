"""
Jordan - AI Podcast Producer
LiveKit voice agent that conducts structured 8-question podcast interviews.
Run with: python agent.py dev
"""
import asyncio
import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
)
from livekit.plugins import deepgram, silero
from livekit.plugins import google as lk_google

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("jordan_agent")

PODCAST_QUESTIONS = [
    "What's the main topic or focus of this specific episode you want to record?",
    "Who is your ideal listener — describe your dream audience member in one or two sentences?",
    "What's the most controversial opinion you hold in your niche that you haven't fully shared publicly?",
    "Tell me a personal story from your own life that changed how you see this topic.",
    "What's the number one mistake you see people making in your space right now?",
    "What do you want your listener to do, feel, or think differently about after this episode?",
    "Are there any big names or thought leaders in your space whose ideas you want to challenge or build on?",
    "Give me your one-line mega takeaway — the headline insight this episode should be remembered for.",
]


class PodcastProducer(Agent):
    def __init__(self, user_prefs: dict, room):
        self.user_prefs = user_prefs
        self.room_ref = room
        self.answers: list = []
        self.question_count: int = 0

        name = user_prefs.get("name", "there")
        show_name = user_prefs.get("show_name", "your show")
        archetype = user_prefs.get("archetype", "Thought Leader")
        energy = user_prefs.get("energy_word", "inspire")
        controversy = user_prefs.get("controversy_level", 5)

        questions_script = "\n".join(
            [f"Question {i+1}: {q}" for i, q in enumerate(PODCAST_QUESTIONS)]
        )

        super().__init__(
            instructions=f"""You are Jordan, a world-class AI podcast producer conducting a structured interview.
You are interviewing {name} for their show "{show_name}".
Host archetype: {archetype} | Energy word: {energy} | Controversy level: {controversy}/10

YOUR EXACT SCRIPT:
{questions_script}

STRICT RULES — follow word for word:
1. OPENING (say this exactly): "Hey {name}, I'm Jordan — your AI podcast producer. Let's build your best episode yet. First question:"
2. Then immediately ask Question 1 verbatim
3. After EACH user answer: say ONE of: "Got it." / "Perfect." / "Love that." / "Brilliant." — then IMMEDIATELY ask the next question verbatim
4. After user answers Question 8, say EXACTLY: "Brilliant. That's everything I need to build your episode. Generating it now — stand by!"
5. NEVER ask follow-up questions or deviate from the script
6. Each response is ONE acknowledgment word + next question. Max 30 words total."""
        )

    async def on_user_turn_completed(self, turn_ctx, new_message) -> None:
        if not (new_message and new_message.text_content):
            return

        answer_text = new_message.text_content
        q_index = min(self.question_count, len(PODCAST_QUESTIONS) - 1)

        self.answers.append({"question": PODCAST_QUESTIONS[q_index], "answer": answer_text})
        self.question_count += 1

        logger.info(f"Answer {self.question_count}/{len(PODCAST_QUESTIONS)}: {answer_text[:60]}")

        # Publish transcript for real-time display on frontend
        asyncio.create_task(
            self._publish(
                {
                    "type": "TRANSCRIPT",
                    "text": answer_text,
                    "question_index": q_index,
                    "count": self.question_count,
                }
            )
        )

        if self.question_count >= len(PODCAST_QUESTIONS):
            asyncio.create_task(self._send_completion())

    async def _publish(self, data: dict):
        try:
            payload = json.dumps(data).encode()
            await self.room_ref.local_participant.publish_data(
                payload=payload, reliable=True, topic="podcast"
            )
        except Exception as e:
            logger.error(f"Data publish error: {e}")

    async def _send_completion(self):
        await asyncio.sleep(5)  # Wait for final TTS to finish speaking
        await self._publish({"type": "CONVERSATION_COMPLETE", "answers": self.answers})
        logger.info(f"Completion signal sent with {len(self.answers)} answers")


async def entrypoint(ctx: JobContext):
    logger.info(f"Jordan entering room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Get user preferences from participant metadata
    user_prefs = {}

    for p in ctx.room.remote_participants.values():
        if p.metadata:
            try:
                user_prefs = json.loads(p.metadata)
                logger.info(f"Loaded prefs from existing participant: {list(user_prefs.keys())}")
                break
            except Exception:
                pass

    if not user_prefs:
        prefs_event = asyncio.Event()

        @ctx.room.on("participant_connected")
        def on_join(participant):
            nonlocal user_prefs
            if participant.metadata and not prefs_event.is_set():
                try:
                    user_prefs = json.loads(participant.metadata)
                    prefs_event.set()
                    logger.info(f"Prefs loaded from new participant: {list(user_prefs.keys())}")
                except Exception:
                    pass

        try:
            await asyncio.wait_for(prefs_event.wait(), timeout=30.0)
        except asyncio.TimeoutError:
            logger.warning("Timed out waiting for participant metadata — using defaults")

    deepgram_key = os.environ.get("DEEPGRAM_API_KEY", "")
    google_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY", "")

    agent = PodcastProducer(user_prefs, ctx.room)

    try:
        vad = silero.VAD.load()
    except Exception as e:
        logger.warning(f"Silero VAD load failed: {e}. Continuing without VAD.")
        vad = None

    session_kwargs = dict(
        stt=deepgram.STT(model="nova-3", api_key=deepgram_key),
        llm=lk_google.LLM(model="gemini-2.0-flash", api_key=google_key),
        tts=deepgram.TTS(model="aura-orion-en", api_key=deepgram_key),
    )
    if vad is not None:
        session_kwargs["vad"] = vad

    session = AgentSession(**session_kwargs)

    await session.start(room=ctx.room, agent=agent)
    logger.info("Jordan session started — interview in progress")

    await asyncio.sleep(3600)  # Keep alive for up to 1 hour


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(entrypoint_fnc=entrypoint, agent_name="jordan-podcast-producer")
    )
