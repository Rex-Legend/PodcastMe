import React, { useState } from "react";

const EMOTIONS = ["Curious", "Confrontational", "Inspiring", "Analytical", "Humorous", "Personal", "Urgent"];

const EMOTION_HEX = {
  Curious: "#8B5CF6",
  Confrontational: "#EC4899",
  Inspiring: "#10B981",
  Analytical: "#3B82F6",
  Humorous: "#F59E0B",
  Personal: "#EC4899",
  Urgent: "#EF4444",
};

const DEFAULT_ACTS = [
  { act: 1, label: "The Setup", emotion: "Curious", energy: 5 },
  { act: 2, label: "The Tension", emotion: "Confrontational", energy: 7 },
  { act: 3, label: "The Payoff", emotion: "Inspiring", energy: 8 },
];

const ACT_ACCENT = ["#8B5CF6", "#EC4899", "#10B981"];

export default function ArcBuilderScreen({ userPrefs, onComplete, onSkip }) {
  const [acts, setActs] = useState(DEFAULT_ACTS);

  const updateAct = (idx, field, value) => {
    setActs((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  };

  const topic = userPrefs?.topic || "your episode";

  return (
    <div
      data-testid="arc-builder-screen"
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2.5rem 1.5rem 5rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "680px" }}>
        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <span
            style={{
              fontSize: "0.65rem",
              color: "#8B5CF6",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Optional — Step 2.5
          </span>
          <h2
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#F9FAFB",
              marginTop: "0.5rem",
              lineHeight: 1.1,
            }}
          >
            Build Your Episode Arc
          </h2>
          <p style={{ color: "#6B7280", marginTop: "0.6rem", fontSize: "0.92rem", lineHeight: 1.6 }}>
            Define the 3-act emotional journey for{" "}
            <span style={{ color: "#8B5CF6", fontWeight: 600 }}>{topic}</span>. Jordan shapes
            your script around this structure. Or skip — Gemini auto-generates.
          </p>
        </div>

        {/* Acts */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2.5rem" }}>
          {acts.map((act, idx) => {
            const accent = ACT_ACCENT[idx];
            const emotionColor = EMOTION_HEX[act.emotion] || accent;
            return (
              <div
                key={idx}
                data-testid={`arc-act-card-${idx}`}
                className="card fade-in-up"
                style={{
                  padding: "1.5rem",
                  borderLeft: `3px solid ${accent}`,
                  animationDelay: `${idx * 0.08}s`,
                }}
              >
                {/* Act header */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1.25rem" }}>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: `${accent}20`,
                      border: `1.5px solid ${accent}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.78rem",
                      fontWeight: 900,
                      color: accent,
                      flexShrink: 0,
                    }}
                  >
                    {act.act}
                  </span>
                  <input
                    data-testid={`arc-act-${idx}-label`}
                    value={act.label}
                    onChange={(e) => updateAct(idx, "label", e.target.value)}
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#F9FAFB",
                      fontSize: "1rem",
                      fontWeight: 700,
                      fontFamily: "inherit",
                    }}
                  />
                  <span style={{ fontSize: "0.65rem", color: "#4B5563" }}>edit name</span>
                </div>

                {/* Emotion Pills */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <p
                    style={{
                      fontSize: "0.6rem",
                      color: "#6B7280",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      marginBottom: "0.625rem",
                    }}
                  >
                    Dominant Emotion
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {EMOTIONS.map((emotion) => {
                      const isSelected = act.emotion === emotion;
                      const eColor = EMOTION_HEX[emotion] || "#8B5CF6";
                      return (
                        <button
                          key={emotion}
                          data-testid={`arc-act-${idx}-emotion-${emotion.toLowerCase()}`}
                          onClick={() => updateAct(idx, "emotion", emotion)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            transition: "all 0.2s ease",
                            border: `1px solid ${isSelected ? eColor : "#2D2D2D"}`,
                            background: isSelected ? `${eColor}18` : "transparent",
                            color: isSelected ? eColor : "#6B7280",
                          }}
                        >
                          {emotion}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Energy Slider */}
                <div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}
                  >
                    <p
                      style={{
                        fontSize: "0.6rem",
                        color: "#6B7280",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      Energy Level
                    </p>
                    <span style={{ fontSize: "0.78rem", color: emotionColor, fontWeight: 700 }}>
                      {act.energy}/10
                    </span>
                  </div>
                  <input
                    data-testid={`arc-act-${idx}-energy`}
                    type="range"
                    min="1"
                    max="10"
                    value={act.energy}
                    onChange={(e) => updateAct(idx, "energy", parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: emotionColor, height: "4px", cursor: "pointer" }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.65rem",
                      color: "#4B5563",
                      marginTop: "4px",
                    }}
                  >
                    <span>Calm</span>
                    <span>High Energy</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button
            data-testid="arc-skip-btn"
            onClick={onSkip}
            style={{
              padding: "0.875rem 1.75rem",
              borderRadius: "0.5rem",
              border: "1px solid #2D2D2D",
              background: "transparent",
              color: "#6B7280",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#4B5563";
              e.currentTarget.style.color = "#F9FAFB";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2D2D2D";
              e.currentTarget.style.color = "#6B7280";
            }}
          >
            Skip Arc →
          </button>
          <button
            data-testid="arc-complete-btn"
            onClick={() => onComplete(acts)}
            className="btn-primary"
            style={{ padding: "0.875rem 2.25rem", fontSize: "0.95rem", fontWeight: 700, flex: 1 }}
          >
            Lock in Arc →
          </button>
        </div>

        <p style={{ textAlign: "center", color: "#4B5563", fontSize: "0.7rem", marginTop: "1.25rem" }}>
          This arc is passed to Gemini as structural guidance — a suggestion, not a hard rule
        </p>
      </div>
    </div>
  );
}
