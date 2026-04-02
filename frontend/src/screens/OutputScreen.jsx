import React, { useState, useRef, useCallback } from "react";

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };
  return (
    <button
      onClick={copy}
      data-testid={`copy-btn-${label.toLowerCase().replace(/\s/g, "-")}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "5px 12px",
        borderRadius: "0.4rem",
        border: `1px solid ${copied ? "#10B981" : "#2D2D2D"}`,
        background: copied ? "rgba(16,185,129,0.1)" : "transparent",
        color: copied ? "#10B981" : "#6B7280",
        fontSize: "0.72rem",
        fontWeight: 600,
        cursor: "pointer",
        letterSpacing: "0.05em",
        transition: "all 0.3s ease",
        fontFamily: "inherit",
      }}
    >
      {copied ? "✓ Copied" : `⎘ ${label}`}
    </button>
  );
}

function PlaybackWaveform({ isPlaying, bars = 20 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "28px" }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={isPlaying ? "wave-bar active" : "wave-bar"}
          style={{
            width: "2px",
            height: "22px",
            background: isPlaying
              ? `linear-gradient(to top, #8B5CF6, #EC4899)`
              : "#2D2D2D",
            animationDelay: `${i * 50}ms`,
            transition: "background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

function OutputCard({ title, children, testId }) {
  return (
    <div
      data-testid={testId}
      className="card fade-in-up"
      style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <p
        style={{
          fontSize: "0.65rem",
          color: "#6B7280",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

export default function OutputScreen({ episode, userPrefs, onRestart }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef(null);

  const toggleTTS = useCallback(() => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    if (!episode?.script) return;
    const text = `${episode.title}. ${episode.hook} ${episode.script}`;
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92;
    utt.pitch = 1;
    utt.onstart = () => setIsPlaying(true);
    utt.onend = () => setIsPlaying(false);
    utt.onerror = () => setIsPlaying(false);
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
    setIsPlaying(true);
  }, [isPlaying, episode]);

  if (!episode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0A0A0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6B7280",
        }}
      >
        No episode data
      </div>
    );
  }

  const tags = Array.isArray(episode.tags) ? episode.tags : [];
  const tweets = Array.isArray(episode.tweet_copy) ? episode.tweet_copy : [];

  return (
    <div
      data-testid="output-screen"
      style={{ minHeight: "100vh", background: "#0A0A0A", paddingBottom: "4rem" }}
    >
      {/* ── Sticky TTS Bar ── */}
      <div
        data-testid="tts-playback-bar"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #2D2D2D",
          padding: "0.9rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            data-testid="tts-play-btn"
            onClick={toggleTTS}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: isPlaying
                ? "rgba(139,92,246,0.2)"
                : "linear-gradient(135deg,#8B5CF6,#EC4899)",
              border: isPlaying ? "1px solid #8B5CF6" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              flexShrink: 0,
            }}
          >
            {isPlaying ? (
              <span style={{ color: "#8B5CF6", fontSize: "1rem" }}>⏸</span>
            ) : (
              <span style={{ color: "white", fontSize: "1.1rem" }}>▶</span>
            )}
          </button>
          <PlaybackWaveform isPlaying={isPlaying} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#F9FAFB",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {episode.title}
          </p>
          <p style={{ fontSize: "0.72rem", color: "#6B7280" }}>
            {isPlaying ? "Playing via browser TTS..." : "Click play to listen to your script"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <CopyButton text={`${episode.title}\n\n${episode.hook}\n\n${episode.script}`} label="Full Script" />
          <button
            data-testid="restart-btn"
            onClick={onRestart}
            className="btn-secondary"
            style={{ padding: "8px 16px", fontSize: "0.8rem", fontWeight: 600 }}
          >
            New Episode
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <span
            style={{
              fontSize: "0.7rem",
              color: "#8B5CF6",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Episode Package — {userPrefs?.show_name}
          </span>
          <h1
            data-testid="episode-title"
            style={{
              fontSize: "clamp(1.8rem, 4vw, 3rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#F9FAFB",
              marginTop: "0.5rem",
              lineHeight: 1.1,
            }}
          >
            {episode.title}
          </h1>
        </div>

        {/* Bento Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "1rem",
          }}
        >
          {/* Hook — spans 8 cols */}
          <div style={{ gridColumn: "span 8" }}>
            <OutputCard title="Opening Hook" testId="output-hook">
              <p
                data-testid="episode-hook"
                style={{
                  color: "#F9FAFB",
                  fontSize: "1.05rem",
                  lineHeight: 1.7,
                  fontStyle: "italic",
                  borderLeft: "3px solid #8B5CF6",
                  paddingLeft: "1rem",
                }}
              >
                {episode.hook}
              </p>
              <div style={{ marginTop: "auto" }}>
                <CopyButton text={episode.hook} label="Hook" />
              </div>
            </OutputCard>
          </div>

          {/* Listener Persona — spans 4 cols */}
          <div style={{ gridColumn: "span 4" }}>
            <OutputCard title="Listener Persona" testId="output-persona">
              <p style={{ color: "#D1D5DB", fontSize: "0.88rem", lineHeight: 1.7, flex: 1 }}>
                {episode.listener_persona}
              </p>
              <CopyButton text={episode.listener_persona} label="Persona" />
            </OutputCard>
          </div>

          {/* Full Script — spans 12 cols */}
          <div style={{ gridColumn: "span 12" }}>
            <OutputCard title="Full Episode Script" testId="output-script">
              <div
                style={{
                  maxHeight: "480px",
                  overflowY: "auto",
                  paddingRight: "0.5rem",
                }}
              >
                <p
                  data-testid="episode-script"
                  style={{
                    color: "#E5E7EB",
                    fontSize: "0.92rem",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {episode.script}
                </p>
              </div>
              <div style={{ borderTop: "1px solid #2D2D2D", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                <CopyButton text={episode.script} label="Script" />
              </div>
            </OutputCard>
          </div>

          {/* Show Notes — spans 5 cols */}
          <div style={{ gridColumn: "span 5" }}>
            <OutputCard title="Show Notes" testId="output-show-notes">
              <p style={{ color: "#D1D5DB", fontSize: "0.88rem", lineHeight: 1.7, flex: 1 }}>
                {episode.show_notes}
              </p>
              <CopyButton text={episode.show_notes} label="Notes" />
            </OutputCard>
          </div>

          {/* Audiogram — spans 4 cols */}
          <div style={{ gridColumn: "span 4" }}>
            <OutputCard title="Audiogram Script (30s)" testId="output-audiogram">
              <p
                style={{
                  color: "#F9FAFB",
                  fontSize: "0.92rem",
                  lineHeight: 1.7,
                  flex: 1,
                  fontWeight: 500,
                }}
              >
                {episode.audiogram_script}
              </p>
              <CopyButton text={episode.audiogram_script} label="Audiogram" />
            </OutputCard>
          </div>

          {/* CTA — spans 3 cols */}
          <div style={{ gridColumn: "span 3" }}>
            <OutputCard title="Call to Action" testId="output-cta">
              <p
                style={{
                  color: "#F9FAFB",
                  fontSize: "0.92rem",
                  lineHeight: 1.7,
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                {episode.cta}
              </p>
              <CopyButton text={episode.cta} label="CTA" />
            </OutputCard>
          </div>

          {/* Tags — spans 4 cols */}
          <div style={{ gridColumn: "span 4" }}>
            <OutputCard title="Tags" testId="output-tags">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", flex: 1 }}>
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      background: "rgba(139,92,246,0.1)",
                      border: "1px solid rgba(139,92,246,0.25)",
                      color: "#8B5CF6",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <CopyButton text={tags.map((t) => `#${t}`).join(" ")} label="Tags" />
            </OutputCard>
          </div>

          {/* Tweets — spans 8 cols */}
          <div style={{ gridColumn: "span 8" }}>
            <OutputCard title="Tweet Drafts (5 variations)" testId="output-tweets">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
                {tweets.map((tweet, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#1E1E1E",
                      border: "1px solid #2D2D2D",
                      borderRadius: "0.5rem",
                      padding: "0.75rem 1rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    <p style={{ color: "#E5E7EB", fontSize: "0.85rem", lineHeight: 1.6, flex: 1 }}>
                      {tweet}
                    </p>
                    <CopyButton text={tweet} label={`Tweet ${i + 1}`} />
                  </div>
                ))}
              </div>
            </OutputCard>
          </div>
        </div>
      </div>
    </div>
  );
}
