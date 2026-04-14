import React, { useState } from "react";
import "./index.css";
import HeroScreen from "./screens/HeroScreen";
import VoiceSetupScreen from "./screens/VoiceSetupScreen";
import ArcBuilderScreen from "./screens/ArcBuilderScreen";
import ConversationScreen from "./screens/ConversationScreen";
import ReviewScreen from "./screens/ReviewScreen";
import GenerationScreen from "./screens/GenerationScreen";
import OutputScreen from "./screens/OutputScreen";
import DashboardScreen from "./screens/DashboardScreen";

const SCREENS = {
  HERO: "HERO",
  VOICE_SETUP: "VOICE_SETUP",
  ARC_BUILDER: "ARC_BUILDER",
  CONVERSATION: "CONVERSATION",
  REVIEW: "REVIEW",
  GENERATION: "GENERATION",
  OUTPUT: "OUTPUT",
  DASHBOARD: "DASHBOARD",
};

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Screens where the floating Dashboard nav button appears
const DASHBOARD_NAV_SCREENS = [
  SCREENS.HERO,
  SCREENS.VOICE_SETUP,
  SCREENS.ARC_BUILDER,
  SCREENS.REVIEW,
  SCREENS.OUTPUT,
];

function App() {
  const [screen, setScreen] = useState(SCREENS.HERO);
  const [userPrefs, setUserPrefs] = useState(null);
  const [conversationData, setConversationData] = useState(null);
  const [episodeData, setEpisodeData] = useState(null);

  // UUID v4 user_id — persisted in localStorage for lightweight auth
  const [userId] = useState(() => {
    let id = localStorage.getItem("podcastme_user_id");
    if (!id) {
      id = generateUUID();
      localStorage.setItem("podcastme_user_id", id);
    }
    return id;
  });

  const handleSetupComplete = (prefs) => {
    setUserPrefs({ ...prefs, user_id: userId });
    setScreen(SCREENS.ARC_BUILDER);
  };

  const handleArcComplete = (arcData) => {
    setUserPrefs((prev) => ({ ...prev, arc: arcData }));
    setScreen(SCREENS.CONVERSATION);
  };

  const handleArcSkip = () => {
    setScreen(SCREENS.CONVERSATION);
  };

  const handleConversationComplete = (answers) => {
    setConversationData(answers);
    setScreen(SCREENS.REVIEW);
  };

  const handleReviewComplete = (editedAnswers) => {
    setConversationData(editedAnswers);
    setScreen(SCREENS.GENERATION);
  };

  const handleEpisodeGenerated = (episode) => {
    setEpisodeData(episode);
    setScreen(SCREENS.OUTPUT);
  };

  const handleRestart = () => {
    setScreen(SCREENS.HERO);
    setUserPrefs(null);
    setConversationData(null);
    setEpisodeData(null);
  };

  const handleLoadEpisode = (episodeRecord) => {
    setEpisodeData(episodeRecord.episode || episodeRecord.full_output || episodeRecord);
    setUserPrefs(episodeRecord.user_prefs || { user_id: userId });
    setScreen(SCREENS.OUTPUT);
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#0A0A0A", minHeight: "100vh" }}>
      {screen === SCREENS.HERO && (
        <HeroScreen
          onStart={() => setScreen(SCREENS.VOICE_SETUP)}
          onLoadEpisode={handleLoadEpisode}
          onDashboard={() => setScreen(SCREENS.DASHBOARD)}
        />
      )}
      {screen === SCREENS.VOICE_SETUP && (
        <VoiceSetupScreen onNext={handleSetupComplete} onBack={() => setScreen(SCREENS.HERO)} />
      )}
      {screen === SCREENS.ARC_BUILDER && (
        <ArcBuilderScreen
          userPrefs={userPrefs}
          onComplete={handleArcComplete}
          onSkip={handleArcSkip}
        />
      )}
      {screen === SCREENS.CONVERSATION && (
        <ConversationScreen userPrefs={userPrefs} onComplete={handleConversationComplete} />
      )}
      {screen === SCREENS.REVIEW && (
        <ReviewScreen
          conversationData={conversationData}
          userPrefs={userPrefs}
          onConfirm={handleReviewComplete}
          onBack={() => setScreen(SCREENS.CONVERSATION)}
        />
      )}
      {screen === SCREENS.GENERATION && (
        <GenerationScreen
          userPrefs={userPrefs}
          conversationData={conversationData}
          onComplete={handleEpisodeGenerated}
          onBack={() => setScreen(SCREENS.REVIEW)}
        />
      )}
      {screen === SCREENS.OUTPUT && (
        <OutputScreen
          episode={episodeData}
          userPrefs={userPrefs}
          onRestart={handleRestart}
          onDashboard={() => setScreen(SCREENS.DASHBOARD)}
        />
      )}
      {screen === SCREENS.DASHBOARD && (
        <DashboardScreen
          userId={userId}
          onBack={() => setScreen(SCREENS.HERO)}
          onLoadEpisode={handleLoadEpisode}
        />
      )}

      {/* Floating Dashboard access — visible on non-immersive screens */}
      {DASHBOARD_NAV_SCREENS.includes(screen) && (
        <button
          data-testid="global-dashboard-btn"
          onClick={() => setScreen(SCREENS.DASHBOARD)}
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 100,
            padding: "9px 16px",
            borderRadius: "999px",
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.3)",
            color: "#8B5CF6",
            fontSize: "0.7rem",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.06em",
            backdropFilter: "blur(12px)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(139,92,246,0.22)";
            e.currentTarget.style.borderColor = "rgba(139,92,246,0.55)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(139,92,246,0.12)";
            e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)";
          }}
        >
          ↗ Dashboard
        </button>
      )}
    </div>
  );
}

export default App;
