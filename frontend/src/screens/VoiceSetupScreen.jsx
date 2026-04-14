import React, { useState } from "react";

const ARCHETYPES = [
  "The Contrarian",
  "The Expert",
  "The Storyteller",
  "The Challenger",
  "The Visionary",
  "The Practitioner",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
];

const LABEL_STYLE = {
  display: "block",
  fontSize: "0.7rem",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#6B7280",
  fontWeight: 600,
  marginBottom: "0.5rem",
};

const OPTIONAL_LABEL = { ...LABEL_STYLE, marginBottom: "0" };

export default function VoiceSetupScreen({ onNext, onBack }) {
  const [form, setForm] = useState({
    name: "",
    archetype: "",
    controversy_level: 5,
    show_name: "",
    energy_word: "",
    topic: "",
    output_language: "en",
    has_guest: false,
    guest_name: "",
    has_sponsor: false,
    sponsor_name: "",
    listener_persona_hint: "",
    competitor_url: "",
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
    if (!form.topic.trim()) e.topic = "Required — used to generate relevant interview questions";
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

  const inputStyle = {
    width: "100%",
    background: "#1E1E1E",
    border: "1px solid #2D2D2D",
    borderRadius: "0.625rem",
    color: "#F9FAFB",
    padding: "0.875rem 1rem",
    fontSize: "0.95rem",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease",
  };

  const dividerStyle = {
    borderTop: "1px solid #1E1E1E",
    paddingTop: "1.75rem",
  };

  return (
    <div
      data-testid="voice-setup-screen"
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "2rem 1.5rem 5rem",
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
            Step 1 of 3
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
            Tell Jordan who you are and what you're recording today.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Episode Topic — NEW, REQUIRED */}
          <div className="fade-in-up" style={{ animationDelay: "0.05s" }}>
            <label style={LABEL_STYLE}>
              Episode Topic <span style={{ color: "#EC4899" }}>*</span>
            </label>
            <input
              data-testid="input-topic"
              className="input-field"
              type="text"
              placeholder="e.g. Why most AI ethics frameworks are performative theater"
              value={form.topic}
              onChange={(e) => update("topic", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "#2D2D2D")}
            />
            {errors.topic && (
              <p style={{ color: "#EC4899", fontSize: "0.8rem", marginTop: "4px" }}>{errors.topic}</p>
            )}
            <p style={{ color: "#4B5563", fontSize: "0.76rem", marginTop: "5px" }}>
              Used to generate specific, topic-relevant interview questions
            </p>
          </div>

          {/* Name */}
          <div className="fade-in-up" style={{ animationDelay: "0.1s" }}>
            <label style={LABEL_STYLE}>Your Name</label>
            <input
              data-testid="input-name"
              className="input-field"
              type="text"
              placeholder="e.g. Alex Rivera"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "#2D2D2D")}
            />
            {errors.name && (
              <p style={{ color: "#EC4899", fontSize: "0.8rem", marginTop: "4px" }}>{errors.name}</p>
            )}
          </div>

          {/* Show Name */}
          <div className="fade-in-up" style={{ animationDelay: "0.15s" }}>
            <label style={LABEL_STYLE}>Show Name</label>
            <input
              data-testid="input-show-name"
              className="input-field"
              type="text"
              placeholder="e.g. Unfiltered Founders"
              value={form.show_name}
              onChange={(e) => update("show_name", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "#2D2D2D")}
            />
            {errors.show_name && (
              <p style={{ color: "#EC4899", fontSize: "0.8rem", marginTop: "4px" }}>{errors.show_name}</p>
            )}
          </div>

          {/* Archetype */}
          <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
            <label style={{ ...LABEL_STYLE, marginBottom: "0.75rem" }}>Host Archetype</label>
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
            <label style={LABEL_STYLE}>
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
              style={{ width: "100%", accentColor: "#8B5CF6", height: "4px", cursor: "pointer" }}
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
            <label style={LABEL_STYLE}>Energy Word</label>
            <input
              data-testid="input-energy-word"
              className="input-field"
              type="text"
              placeholder="e.g. Ignite, Disrupt, Elevate, Build"
              value={form.energy_word}
              onChange={(e) => update("energy_word", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "#2D2D2D")}
            />
            {errors.energy_word && (
              <p style={{ color: "#EC4899", fontSize: "0.8rem", marginTop: "4px" }}>{errors.energy_word}</p>
            )}
            <p style={{ color: "#4B5563", fontSize: "0.78rem", marginTop: "6px" }}>
              One word that defines your show's energy
            </p>
          </div>

          {/* ── Output Language ── */}
          <div className="fade-in-up" style={{ animationDelay: "0.33s", ...dividerStyle }}>
            <label style={{ ...LABEL_STYLE, marginBottom: "0.75rem" }}>Output Language</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  data-testid={`lang-${lang.code}`}
                  onClick={() => update("output_language", lang.code)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.2s ease",
                    border: `1px solid ${form.output_language === lang.code ? "#8B5CF6" : "#2D2D2D"}`,
                    background:
                      form.output_language === lang.code
                        ? "rgba(139,92,246,0.15)"
                        : "transparent",
                    color: form.output_language === lang.code ? "#8B5CF6" : "#6B7280",
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Guest Episode Toggle ── */}
          <div className="fade-in-up" style={{ animationDelay: "0.36s" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <label style={OPTIONAL_LABEL}>Guest Episode</label>
                <p style={{ color: "#4B5563", fontSize: "0.74rem", marginTop: "2px" }}>
                  Feature a special guest in this episode
                </p>
              </div>
              <button
                type="button"
                data-testid="toggle-guest"
                onClick={() => update("has_guest", !form.has_guest)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: "999px",
                  border: "none",
                  background: form.has_guest
                    ? "linear-gradient(135deg, #8B5CF6, #EC4899)"
                    : "#2D2D2D",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.3s ease",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: form.has_guest ? "22px" : "3px",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.3s ease",
                  }}
                />
              </button>
            </div>
            {form.has_guest && (
              <div style={{ marginTop: "0.75rem" }}>
                <input
                  data-testid="input-guest-name"
                  type="text"
                  placeholder="Guest's full name"
                  value={form.guest_name}
                  onChange={(e) => update("guest_name", e.target.value)}
                  style={{ ...inputStyle, marginTop: "0.5rem" }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
                  onBlur={(e) => (e.target.style.borderColor = "#2D2D2D")}
                />
              </div>
            )}
          </div>

          {/* ── Sponsor Toggle ── */}
          <div className="fade-in-up" style={{ animationDelay: "0.38s" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <label style={OPTIONAL_LABEL}>Sponsored Episode</label>
                <p style={{ color: "#4B5563", fontSize: "0.74rem", marginTop: "2px" }}>
                  Include a natural sponsor mention in the script
                </p>
              </div>
              <button
                type="button"
                data-testid="toggle-sponsor"
                onClick={() => update("has_sponsor", !form.has_sponsor)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: "999px",
                  border: "none",
                  background: form.has_sponsor
                    ? "linear-gradient(135deg, #8B5CF6, #EC4899)"
                    : "#2D2D2D",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.3s ease",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: form.has_sponsor ? "22px" : "3px",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.3s ease",
                  }}
                />
              </button>
            </div>
            {form.has_sponsor && (
              <div style={{ marginTop: "0.75rem" }}>
                <input
                  data-testid="input-sponsor-name"
                  type="text"
                  placeholder="Sponsor's name or product"
                  value={form.sponsor_name}
                  onChange={(e) => update("sponsor_name", e.target.value)}
                  style={{ ...inputStyle, marginTop: "0.5rem" }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
                  onBlur={(e) => (e.target.style.borderColor = "#2D2D2D")}
                />
              </div>
            )}
          </div>

          {/* ── Optional: Listener Persona Hint ── */}
          <div className="fade-in-up" style={{ animationDelay: "0.4s", ...dividerStyle }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <label style={OPTIONAL_LABEL}>Listener Persona Hint</label>
              <span
                style={{
                  fontSize: "0.6rem",
                  color: "#4B5563",
                  background: "#1E1E1E",
                  padding: "2px 7px",
                  borderRadius: "999px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                }}
              >
                OPTIONAL
              </span>
            </div>
            <input
              data-testid="input-persona-hint"
              type="text"
              placeholder="e.g. Tech founders, 28–45, building AI products"
              value={form.listener_persona_hint}
              onChange={(e) => update("listener_persona_hint", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "#2D2D2D")}
            />
          </div>

          {/* ── Optional: Competitor URL ── */}
          <div className="fade-in-up" style={{ animationDelay: "0.42s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <label style={OPTIONAL_LABEL}>Competitor / Inspiration URL</label>
              <span
                style={{
                  fontSize: "0.6rem",
                  color: "#4B5563",
                  background: "#1E1E1E",
                  padding: "2px 7px",
                  borderRadius: "999px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                }}
              >
                OPTIONAL
              </span>
            </div>
            <input
              data-testid="input-competitor-url"
              type="url"
              placeholder="https://competitor-podcast.com"
              value={form.competitor_url}
              onChange={(e) => update("competitor_url", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "#2D2D2D")}
            />
            <p style={{ color: "#4B5563", fontSize: "0.76rem", marginTop: "5px" }}>
              Jordan analyzes this for content gaps and angles
            </p>
          </div>

          {/* Submit */}
          <div className="fade-in-up" style={{ animationDelay: "0.45s", paddingTop: "0.5rem" }}>
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
