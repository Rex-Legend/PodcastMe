import React, { useEffect, useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WAVE_IMAGE =
  "https://images.unsplash.com/photo-1762278805116-118893051302?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxNzV8MHwxfHNlYXJjaHwxfHxkYXJrJTIwYWJzdHJhY3QlMjBnbG93aW5nJTIwd2F2ZXxlbnwwfHx8fDE3NzUxNTE1MzB8MA&ixlib=rb-4.1.0&q=85";

const STAGES = [
  { label: "Reading your answers...", progress: 18, delay: 800 },
  { label: "Crafting your episode structure...", progress: 38, delay: 2500 },
  { label: "Writing the full script...", progress: 62, delay: 5000 },
  { label: "Generating show notes & tags...", progress: 78, delay: 8000 },
  { label: "Finalizing your episode package...", progress: 92, delay: 11000 },
];

export default function GenerationScreen({ userPrefs, conversationData, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Initializing...");
  const [error, setError] = useState(null);
  const [dots, setDots] = useState(".");

  useEffect(() => {
    // Animated dots
    const dotTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 600);

    // Simulated progress stages
    const timers = STAGES.map(({ label, progress: p, delay }) =>
      setTimeout(() => {
        setProgress(p);
        setStage(label);
      }, delay)
    );

    // Actual API call
    const generate = async () => {
      try {
        const answers = conversationData || [];
        const response = await axios.post(`${API}/generate-episode`, {
          user_prefs: userPrefs || {},
          answers: Array.isArray(answers) ? answers : [],
        });
        setProgress(100);
        setStage("Episode ready!");
        setTimeout(() => onComplete(response.data), 800);
      } catch (err) {
        console.error("Generation error:", err);
        setError(err.response?.data?.detail || err.message || "Generation failed. Please try again.");
      }
    };

    generate();

    return () => {
      clearInterval(dotTimer);
      timers.forEach(clearTimeout);
    };
  }, []); // eslint-disable-line

  const showName = userPrefs?.show_name || "Your Episode";

  if (error) {
    return (
      <div
        data-testid="generation-error"
        style={{
          minHeight: "100vh",
          background: "#0A0A0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "480px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✕</div>
          <h3 style={{ color: "#F9FAFB", fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.75rem" }}>
            Generation Failed
          </h3>
          <p style={{ color: "#6B7280", marginBottom: "1.5rem", lineHeight: 1.6 }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
            style={{ padding: "0.9rem 2rem", fontSize: "0.9rem" }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="generation-screen"
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url('${WAVE_IMAGE}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.07,
          animation: "floatUp 6s ease-in-out infinite",
        }}
      />
      {/* Gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: "520px", width: "100%" }}>
        {/* Spinner ring */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "3px solid #1E1E1E",
            borderTopColor: "#8B5CF6",
            borderRightColor: "#EC4899",
            animation: "spin 1s linear infinite",
            margin: "0 auto 2.5rem",
          }}
        />

        <span
          style={{
            fontSize: "0.7rem",
            color: "#8B5CF6",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Gemini is working
        </span>

        <h2
          style={{
            fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "#F9FAFB",
            margin: "0.75rem 0 0.5rem",
            lineHeight: 1.1,
          }}
        >
          Building{" "}
          <span className="gradient-text">{showName}</span>
        </h2>

        <p
          style={{ color: "#6B7280", fontSize: "0.95rem", marginBottom: "3rem", lineHeight: 1.6 }}
          data-testid="generation-stage"
        >
          {stage}
          {progress < 100 && <span style={{ color: "#8B5CF6" }}>{dots}</span>}
        </p>

        {/* Progress bar */}
        <div
          style={{
            background: "#1E1E1E",
            borderRadius: "999px",
            height: "6px",
            overflow: "hidden",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
              width: `${progress}%`,
              transition: "width 0.8s ease",
              boxShadow: "0 0 12px rgba(139,92,246,0.5)",
            }}
          />
        </div>

        <p style={{ color: "#4B5563", fontSize: "0.8rem" }}>
          {progress}% complete
        </p>

        {/* What we're generating */}
        <div
          style={{
            marginTop: "3rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem",
            textAlign: "left",
          }}
        >
          {[
            "Episode Title",
            "Opening Hook",
            "Full Script",
            "Show Notes",
            "Tags",
            "Call to Action",
            "Listener Persona",
            "Audiogram Script",
            "5 Tweet Drafts",
          ].map((item, i) => (
            <div
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.78rem",
                color: progress >= (i + 1) * 10 ? "#10B981" : "#4B5563",
                transition: "color 0.5s ease",
              }}
            >
              <span>{progress >= (i + 1) * 10 ? "✓" : "○"}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
