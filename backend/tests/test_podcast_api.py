"""Backend API tests for PodcastMe app"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestHealthAndEpisodes:
    """Basic health and episodes endpoint tests"""

    def test_api_root(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"API root OK: {data}")

    def test_get_episodes_returns_array(self):
        response = requests.get(f"{BASE_URL}/api/episodes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Episodes count: {len(data)}")

    def test_get_episodes_limit(self):
        response = requests.get(f"{BASE_URL}/api/episodes?limit=3")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 3
        print(f"Episodes with limit=3: {len(data)}")

    def test_episodes_structure_if_present(self):
        response = requests.get(f"{BASE_URL}/api/episodes")
        assert response.status_code == 200
        data = response.json()
        if data:
            ep = data[0]
            assert "id" in ep
            assert "episode" in ep
            assert "created_at" in ep
            print(f"First episode title: {ep['episode'].get('title', 'N/A')}")
        else:
            print("No episodes in DB yet — structure test skipped")


class TestRegenerateSection:
    """Tests for /api/regenerate-section endpoint"""

    def test_regenerate_hook(self):
        payload = {
            "section": "hook",
            "current_content": "This is an existing hook about AI ethics.",
            "user_prefs": {"show_name": "Test Show", "archetype": "Educator", "controversy_level": 5},
            "episode_title": "The Future of AI Ethics",
            "episode_context": "An episode about building trustworthy AI products.",
        }
        response = requests.post(f"{BASE_URL}/api/regenerate-section", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "section" in data
        assert "content" in data
        assert data["section"] == "hook"
        assert isinstance(data["content"], str)
        assert len(data["content"]) > 10
        print(f"Regenerated hook (first 100 chars): {str(data['content'])[:100]}")

    def test_regenerate_cta(self):
        payload = {
            "section": "cta",
            "current_content": "Subscribe and share this episode.",
            "user_prefs": {"show_name": "Test Show", "archetype": "Coach", "controversy_level": 5},
            "episode_title": "Mental Health at Work",
            "episode_context": "Episode about burnout.",
        }
        response = requests.post(f"{BASE_URL}/api/regenerate-section", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["section"] == "cta"
        assert isinstance(data["content"], str)
        print(f"Regenerated CTA: {str(data['content'])[:100]}")

    def test_regenerate_invalid_missing_section(self):
        payload = {
            "current_content": "Some content",
            "user_prefs": {},
            "episode_title": "Test",
            "episode_context": "Test",
        }
        response = requests.post(f"{BASE_URL}/api/regenerate-section", json=payload)
        # Should fail with 422 (missing required field)
        assert response.status_code == 422
        print(f"Validation error as expected: {response.status_code}")
