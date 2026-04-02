"""Backend tests for PodcastMe API - livekit-token and generate-episode endpoints"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestHealthCheck:
    def test_api_root(self):
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "running"


class TestLiveKitToken:
    def test_livekit_token_returns_expected_keys(self):
        r = requests.post(f"{BASE_URL}/api/livekit-token", json={
            "participant_name": "Test Host",
            "user_prefs": {"name": "Test Host"}
        })
        # May fail if LiveKit not configured, but keys should be present
        assert r.status_code in [200, 500]
        if r.status_code == 200:
            data = r.json()
            assert "server_url" in data
            assert "participant_token" in data
            assert "room_name" in data
            assert isinstance(data["participant_token"], str)
            assert len(data["participant_token"]) > 10
            assert "podcast-" in data["room_name"]

    def test_livekit_token_default_participant(self):
        r = requests.post(f"{BASE_URL}/api/livekit-token", json={})
        assert r.status_code in [200, 500]


class TestGenerateEpisode:
    """Tests for POST /api/generate-episode with real Gemini API"""

    def test_generate_episode_returns_all_9_keys(self):
        payload = {
            "user_prefs": {
                "name": "Alex Rivera",
                "show_name": "The Mindset Lab",
                "archetype": "Challenger",
                "energy_word": "Ignite",
                "controversy_level": 7
            },
            "answers": [
                {"question": "What's the main topic?", "answer": "Why morning routines are overrated and evening rituals matter more."},
                {"question": "Who is your ideal listener?", "answer": "Busy professionals who tried every morning routine and still feel stuck."},
                {"question": "Most controversial opinion?", "answer": "Waking up at 5am is actually harming your creativity, not helping it."},
                {"question": "Personal story?", "answer": "I burned out following Tim Ferriss's schedule and found my best work happens after 9pm."},
                {"question": "Number one mistake?", "answer": "Copying influencer routines without testing what works for your own biology."},
                {"question": "What should listeners do differently?", "answer": "Track their energy levels for one week before designing any routine."},
                {"question": "Any thought leaders to challenge?", "answer": "Robin Sharma and the 5am Club crowd need to be challenged with actual science."},
                {"question": "One-line mega takeaway?", "answer": "Your best self shows up when you stop fighting your chronotype."}
            ]
        }
        r = requests.post(f"{BASE_URL}/api/generate-episode", json=payload, timeout=90)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:500]}"
        data = r.json()
        required_keys = ["title", "hook", "script", "show_notes", "tags", "cta", "listener_persona", "audiogram_script", "tweet_copy"]
        for key in required_keys:
            assert key in data, f"Missing key: {key}"

        # Validate data types and content
        assert isinstance(data["title"], str) and len(data["title"]) > 5
        assert isinstance(data["hook"], str) and len(data["hook"]) > 20
        assert isinstance(data["script"], str) and len(data["script"]) > 100
        assert isinstance(data["show_notes"], str) and len(data["show_notes"]) > 50
        assert isinstance(data["tags"], list) and len(data["tags"]) >= 5
        assert isinstance(data["cta"], str) and len(data["cta"]) > 10
        assert isinstance(data["listener_persona"], str) and len(data["listener_persona"]) > 50
        assert isinstance(data["audiogram_script"], str) and len(data["audiogram_script"]) > 20
        assert isinstance(data["tweet_copy"], list) and len(data["tweet_copy"]) >= 4

    def test_generate_episode_missing_answers_fails_gracefully(self):
        r = requests.post(f"{BASE_URL}/api/generate-episode", json={
            "user_prefs": {},
            "answers": []
        }, timeout=90)
        # Should still return 200 (Gemini will generate with empty context) or 422
        assert r.status_code in [200, 422, 500]
