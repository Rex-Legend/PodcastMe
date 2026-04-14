"""Backend API tests for PodcastMe new endpoints (25-feature upgrade)"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestNewEndpoints:
    """Tests for new endpoints: generate-questions, followup-question, devils-advocate, emotional-arc, controversy-preview, episode-history"""

    def test_generate_questions_success(self):
        payload = {
            "topic": "Remote work productivity",
            "archetype": "Thought Leader",
            "controversy_level": 5,
            "has_guest": False,
            "guest_name": ""
        }
        response = requests.post(f"{BASE_URL}/api/generate-questions", json=payload, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "questions" in data
        assert isinstance(data["questions"], list)
        assert len(data["questions"]) == 8
        print(f"Questions generated OK: {data['questions'][0][:60]}")

    def test_generate_questions_missing_topic(self):
        payload = {"archetype": "Educator", "controversy_level": 5}
        response = requests.post(f"{BASE_URL}/api/generate-questions", json=payload, timeout=10)
        assert response.status_code == 422
        print(f"Validation error for missing topic: {response.status_code}")

    def test_followup_question(self):
        payload = {
            "question": "What's the biggest challenge with remote work?",
            "short_answer": "It's hard to stay focused.",
            "topic": "Remote work productivity"
        }
        response = requests.post(f"{BASE_URL}/api/followup-question", json=payload, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "followup" in data
        assert isinstance(data["followup"], str)
        assert len(data["followup"]) > 5
        print(f"Follow-up question: {data['followup']}")

    def test_devils_advocate(self):
        payload = {
            "paragraph": "Remote work is the future of work. Every company should go fully remote. It improves productivity and employee satisfaction.",
            "topic": "Remote work",
            "controversy_level": 7
        }
        response = requests.post(f"{BASE_URL}/api/devils-advocate", json=payload, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "counterpoint" in data
        assert isinstance(data["counterpoint"], str)
        assert len(data["counterpoint"]) > 10
        print(f"Counterpoint: {data['counterpoint'][:100]}")

    def test_emotional_arc(self):
        payload = {
            "script": "Welcome to the podcast. Today we explore remote work. " * 50,
            "topic": "Remote work"
        }
        response = requests.post(f"{BASE_URL}/api/emotional-arc", json=payload, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "arc" in data
        assert isinstance(data["arc"], list)
        assert len(data["arc"]) >= 5
        arc_item = data["arc"][0]
        assert "segment" in arc_item
        assert "energy" in arc_item
        assert "emotion" in arc_item
        print(f"Arc segments: {len(data['arc'])}, first: {arc_item}")

    def test_controversy_preview(self):
        payload = {
            "topic": "AI replacing jobs",
            "controversy_level": 8,
            "archetype": "Disruptor"
        }
        response = requests.post(f"{BASE_URL}/api/controversy-preview", json=payload, timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "preview" in data
        assert isinstance(data["preview"], str)
        print(f"Controversy preview: {data['preview'][:100]}")

    def test_episode_history_returns_array(self):
        response = requests.get(f"{BASE_URL}/api/episode-history", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Episode history count: {len(data)}")

    def test_generate_audio_basic(self):
        """Test audio endpoint - may take time with Deepgram"""
        payload = {
            "script": "Welcome to PodcastMe. This is a test of the audio generation feature.",
            "voice": "aura-asteria-en"
        }
        response = requests.post(f"{BASE_URL}/api/generate-audio", json=payload, timeout=60)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        assert response.headers.get("content-type", "").startswith("audio/")
        assert len(response.content) > 1000
        print(f"Audio generated: {len(response.content)} bytes")
