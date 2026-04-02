import React, { useState } from "react";

const ARCHETYPES = [
  "The Contrarian",
  "The Expert",
  "The Storyteller",
  "The Challenger",
  "The Visionary",
  "The Practitioner",
];

export default function VoiceSetupScreen({ onNext, onBack }) {
  const [form, setForm] = useState({
    name: "",
    archetype: "",
    controversy_level: 5,
    show_name: "",
    energy_word: "",
  });
  const [errors, setErrors] = useState({});

  const update = (field, val) => {
    setForm((p) => ({ ...p, [field]: val }));
    setErrors((p) => ({ ...p, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.archetype) e.archetype = "Pick one";
    if (!form.show_name.trim()) e.show_name = "Required";
    if (!form.energy_word.trim()) e.energy_word = "Required";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) {
      setErrors(e2);
      return;
    }
    onNext(form);
  };

  return (
    <div
      data-testid="voice-setup-screen"
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "560px" }}>
        {/* Back */}
        <button
          onClick={onBack}
          data-testid="setup-back-button"
          className="btn-secondary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            fontSize: "0.85rem",
            marginBottom: "2rem",
          }}
        >
          ← Back
        </button>

        <div className="fade-in-up" style={{ animationDelay: "0s" }}>
          <span
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8B5CF6",
              fontWeight: 600,
            }}
          >
            Step 1 of 2
          </span>
          <h2
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#F9FAFB",
              margin: "0.5rem 0 0.5rem",
              lineHeight: 1.1,
            }}
          >
            Set the Stage
          </h2>
          <p style={{ color: "#6B7280", marginBottom: "2.5rem", fontSize: "0.95rem" }}>
            Tell Jordan who you are before stepping into the studio.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Name */}
          <div className="fade-in-up" style={{ animationDelay: "0.1s" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#6B7280",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Your Name
            </label>
            <input
              data-testid="input-name"
              className="input-field"
              type="text"
              placeholder="e.g. Alex Rivera"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
            {errors.name && (
              <p style={{ color: "#EC4899", fontSize: "0.8rem", marginTop: "4px" }}>{errors.name}</p>
            )}
          </div>

          {/* Show Name */}
          <div className="fade-in-up" style={{ animationDelay: "0.15s" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#6B7280",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Show Name
            </label>
            <input
              data-testid="input-show-name"
              className="input-field"
              type="text"
              placeholder="e.g. Unfiltered Founders"
              value={form.show_name}
              onChange={(e) => update("show_name", e.target.value)}
            />
            {errors.show_name && (
              <p style={{ color: "#EC4899", fontSize: "0.8rem", marginTop: "4px" }}>{errors.show_name}</p>
            )}
          </div>

          {/* Archetype */}
          <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#6B7280",
                fontWeight: 600,
                marginBottom: "0.75rem",
              }}
            >
              Host Archetype
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
              {ARCHETYPES.map((a) => (
                <button
                  key={a}
                  type="button"
                  data-testid={`archetype-${a.toLowerCase().replace(/\s/g, "-")}`}
                  onClick={() => update("archetype", a)}
                  style={{
                    padding: "0.6rem 0.5rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    borderRadius: "0.5rem",
                    border: `1px solid ${form.archetype === a ? "#8B5CF6" : "#2D2D2D"}`,
                    background: form.archetype === a ? "rgba(139,92,246,0.15)" : "#1E1E1E",
                    color: form.archetype === a ? "#8B5CF6" : "#6B7280",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    fontFamily: "inherit",
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
            {errors.archetype && (
              <p style={{ color: "#EC4899", fontSize: "0.8rem", marginTop: "6px" }}>{errors.archetype}</p>
            )}
          </div>

          {/* Controversy Level */}
          <div className="fade-in-up" style={{ animationDelay: "0.25s" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#6B7280",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Controversy Level —{" "}
              <span style={{ color: "#F59E0B" }}>{form.controversy_level}/10</span>
            </label>
            <input
              data-testid="input-controversy"
              type="range"
              min="1"
              max="10"
              value={form.controversy_level}
              onChange={(e) => update("controversy_level", parseInt(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#8B5CF6",
                height: "4px",
                cursor: "pointer",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.72rem",
                color: "#4B5563",
                marginTop: "4px",
              }}
            >
              <span>Safe & Sensible</span>
              <span>Raw & Polarizing</span>
            </div>
          </div>

          {/* Energy Word */}
          <div className="fade-in-up" style={{ animationDelay: "0.3s" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#6B7280",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Energy Word
            </label>
            <input
              data-testid="input-energy-word"
              className="input-field"
              type="text"
              placeholder="e.g. Ignite, Disrupt, Elevate, Build"
              value={form.energy_word}
              onChange={(e) => update("energy_word", e.target.value)}
            />
            {errors.energy_word && (
              <p style={{ color: "#EC4899", fontSize: "0.8rem", marginTop: "4px" }}>{errors.energy_word}</p>
            )}
            <p style={{ color: "#4B5563", fontSize: "0.78rem", marginTop: "6px" }}>
              One word that defines your show's energy
            </p>
          </div>

          {/* Submit */}
          <div className="fade-in-up" style={{ animationDelay: "0.35s", paddingTop: "0.5rem" }}>
            <button
              data-testid="setup-next-button"
              type="submit"
              className="btn-primary"
              style={{ width: "100%", padding: "1rem", fontSize: "1rem" }}
            >
              Enter the Studio →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
