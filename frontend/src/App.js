import React, { useState } from "react";
import "./index.css";
import HeroScreen from "./screens/HeroScreen";
import VoiceSetupScreen from "./screens/VoiceSetupScreen";
import ConversationScreen from "./screens/ConversationScreen";
import ReviewScreen from "./screens/ReviewScreen";
import GenerationScreen from "./screens/GenerationScreen";
import OutputScreen from "./screens/OutputScreen";

const SCREENS = {
  HERO: "HERO",
  VOICE_SETUP: "VOICE_SETUP",
  CONVERSATION: "CONVERSATION",
  REVIEW: "REVIEW",
  GENERATION: "GENERATION",
  OUTPUT: "OUTPUT",
};

function App() {
  const [screen, setScreen] = useState(SCREENS.HERO);
  const [userPrefs, setUserPrefs] = useState(null);
  const [conversationData, setConversationData] = useState(null);
  const [episodeData, setEpisodeData] = useState(null);

  const handleSetupComplete = (prefs) => {
    setUserPrefs(prefs);
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
    setEpisodeData(episodeRecord.episode);
    setUserPrefs(episodeRecord.user_prefs);
    setScreen(SCREENS.OUTPUT);
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#0A0A0A", minHeight: "100vh" }}>
      {screen === SCREENS.HERO && (
        <HeroScreen onStart={() => setScreen(SCREENS.VOICE_SETUP)} onLoadEpisode={handleLoadEpisode} />
      )}
      {screen === SCREENS.VOICE_SETUP && (
        <VoiceSetupScreen onNext={handleSetupComplete} onBack={() => setScreen(SCREENS.HERO)} />
      )}
      {screen === SCREENS.CONVERSATION && (
        <ConversationScreen
          userPrefs={userPrefs}
          onComplete={handleConversationComplete}
        />
      )}
      {screen === SCREENS.REVIEW && (
        <ReviewScreen
          conversationData={conversationData}
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
        />
      )}
    </div>
  );
}

export default App;
