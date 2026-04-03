import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ── CopyButton ──
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
        display: "inline-flex",
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
        letterSpacing: "0.04em",
        transition: "all 0.3s ease",
        fontFamily: "inherit",
        flexShrink: 0,
      }}
    >
      {copied ? "✓ Copied" : `⎘ ${label}`}
    </button>
  );
}

// ── Waveform ──
function Waveform({ isActive, bars = 32 }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        height: "52px",
      }}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={isActive ? "wave-bar active" : "wave-bar idle"}
          style={{
            width: "3px",
            height: "44px",
            background: isActive
              ? `linear-gradient(to top, #8B5CF6, #EC4899)`
              : `linear-gradient(to top, rgba(139,92,246,0.2), rgba(236,72,153,0.15))`,
            borderRadius: "999px",
            animationDelay: `${i * 45}ms`,
            transition: "background 0.4s ease",
          }}
        />
      ))}
    </div>
  );
}

// ── RegenerateButton ──
function RegenerateButton({ onClick, isLoading, testId }) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      disabled={isLoading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 9px",
        borderRadius: "0.375rem",
        border: "1px solid rgba(139,92,246,0.28)",
        background: isLoading ? "rgba(139,92,246,0.05)" : "transparent",
        color: isLoading ? "#4B5563" : "#8B5CF6",
        fontSize: "0.68rem",
        fontWeight: 600,
        cursor: isLoading ? "not-allowed" : "pointer",
        letterSpacing: "0.04em",
        transition: "all 0.25s ease",
        fontFamily: "inherit",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!isLoading) e.currentTarget.style.background = "rgba(139,92,246,0.1)";
      }}
      onMouseLeave={(e) => {
        if (!isLoading) e.currentTarget.style.background = "transparent";
      }}
    >
      {isLoading ? "Regenerating..." : "↻ Regenerate"}
    </button>
  );
}

// ── OutputCard ──
function OutputCard({ title, children, testId, onRegenerate, isRegenerating }) {
  return (
    <div
      data-testid={testId}
      className="card"
      style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.875rem" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <p
          style={{
            fontSize: "0.62rem",
            color: "#6B7280",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {title}
        </p>
        {onRegenerate && (
          <RegenerateButton
            onClick={onRegenerate}
            isLoading={isRegenerating}
            testId={`regen-${testId}`}
          />
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main Component ──
export default function OutputScreen({ episode, userPrefs, onRestart }) {
  const [localEpisode, setLocalEpisode] = useState(episode);
  const [ttsState, setTtsState] = useState("idle"); // "idle" | "playing" | "paused"
  const [ttsProgress, setTtsProgress] = useState(0);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(-1);
  const [regeneratingSection, setRegeneratingSection] = useState(null);

  const ttsEngineRef = useRef({ active: false, timeoutId: null });
  const sentenceOffsetsRef = useRef([]);

  useEffect(() => {
    setLocalEpisode(episode);
  }, [episode]);

  // ── Script Processing (Fix 4: strip stage directions + pause markers) ──
  const scriptSegments = useMemo(() => {
    if (!localEpisode?.script) return [];

    // Strip [SQUARE BRACKET STAGE DIRECTIONS] like [TANGENT], [CORRECTION], [NOTE], etc.
    let raw = localEpisode.script
      .replace(/\[[^\]]+\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const segments = [];

    // Split on "— wait —" (long pause: 1200ms), then on "..." (short pause: 500ms)
    const longParts = raw.split(/—\s*wait\s*—/gi);
    longParts.forEach((part, longIdx) => {
      const shortParts = part.split("...");
      shortParts.forEach((chunk, shortIdx) => {
        const text = chunk.trim();
        if (text) segments.push({ type: "speech", text });
        if (shortIdx < shortParts.length - 1) {
          segments.push({ type: "pause", duration: 500 });
        }
      });
      if (longIdx < longParts.length - 1) {
        segments.push({ type: "pause", duration: 1200 });
      }
    });

    return segments;
  }, [localEpisode?.script]);

  // Clean joined text for sentence-level display/highlighting
  const cleanScript = useMemo(
    () =>
      scriptSegments
        .filter((s) => s.type === "speech")
        .map((s) => s.text)
        .join(" "),
    [scriptSegments]
  );

  const scriptSentences = useMemo(() => {
    if (!cleanScript) return [];
    const marked = cleanScript.replace(/([.!?])\s+/g, "$1§");
    return marked.split("§").filter((s) => s.trim().length > 0);
  }, [cleanScript]);

  const sentenceOffsets = useMemo(() => {
    if (!cleanScript || !scriptSentences.length) return [];
    const offsets = [];
    let searchFrom = 0;
    for (const sentence of scriptSentences) {
      const idx = cleanScript.indexOf(sentence, searchFrom);
      if (idx !== -1) {
        offsets.push(idx);
        searchFrom = idx + sentence.length;
      } else {
        offsets.push(searchFrom);
        searchFrom += sentence.length;
      }
    }
    return offsets;
  }, [cleanScript, scriptSentences]);

  useEffect(() => {
    sentenceOffsetsRef.current = sentenceOffsets;
  }, [sentenceOffsets]);

  // ── TTS Engine: sequential utterances with timed pauses (Fix 4) ──
  const startTTS = useCallback(() => {
    if (!scriptSegments.length) return;
    window.speechSynthesis.cancel();
    if (ttsEngineRef.current.timeoutId) clearTimeout(ttsEngineRef.current.timeoutId);

    const speechSegs = scriptSegments.filter((s) => s.type === "speech");
    const totalChars = speechSegs.reduce((sum, s) => sum + s.text.length, 0) || 1;
    let spokenChars = 0;
    let segIdx = 0;

    const engine = { active: true, timeoutId: null };
    ttsEngineRef.current = engine;

    function speakNext() {
      if (!engine.active) return;
      if (segIdx >= scriptSegments.length) {
        setTtsState("idle");
        setCurrentSentenceIdx(-1);
        setTtsProgress(100);
        return;
      }

      const seg = scriptSegments[segIdx++];

      if (seg.type === "pause") {
        engine.timeoutId = setTimeout(speakNext, seg.duration);
        return;
      }

      const segStartChars = spokenChars;
      const utt = new SpeechSynthesisUtterance(seg.text);
      utt.rate = 0.92;
      utt.pitch = 1;

      utt.onboundary = (e) => {
        const globalIdx = segStartChars + e.charIndex;
        setTtsProgress(Math.min(99, (globalIdx / totalChars) * 100));
        const offsets = sentenceOffsetsRef.current;
        let found = 0;
        for (let i = offsets.length - 1; i >= 0; i--) {
          if (globalIdx >= offsets[i]) {
            found = i;
            break;
          }
        }
        setCurrentSentenceIdx(found);
      };

      utt.onend = () => {
        if (!engine.active) return;
        spokenChars += seg.text.length + 1; // +1 for join space
        speakNext();
      };

      utt.onerror = () => {
        if (engine.active) speakNext();
      };

      window.speechSynthesis.speak(utt);
    }

    setTtsState("playing");
    setTtsProgress(0);
    speakNext();
  }, [scriptSegments]);

  const handlePlayPause = useCallback(() => {
    if (ttsState === "idle") {
      startTTS();
    } else if (ttsState === "playing") {
      if (ttsEngineRef.current.timeoutId) {
        clearTimeout(ttsEngineRef.current.timeoutId);
        ttsEngineRef.current.timeoutId = null;
      }
      window.speechSynthesis.pause();
      setTtsState("paused");
    } else if (ttsState === "paused") {
      window.speechSynthesis.resume();
      setTtsState("playing");
    }
  }, [ttsState, startTTS]);

  const stopTTS = useCallback(() => {
    ttsEngineRef.current.active = false;
    if (ttsEngineRef.current.timeoutId) clearTimeout(ttsEngineRef.current.timeoutId);
    window.speechSynthesis.cancel();
    setTtsState("idle");
    setCurrentSentenceIdx(-1);
    setTtsProgress(0);
  }, []);

  // ── Section Regeneration (Fix 9) ──
  const handleRegenerate = useCallback(
    async (section, currentContent) => {
      if (regeneratingSection) return;
      setRegeneratingSection(section);
      try {
        const response = await axios.post(`${API}/regenerate-section`, {
          section,
          current_content: Array.isArray(currentContent)
            ? JSON.stringify(currentContent)
            : String(currentContent),
          user_prefs: userPrefs || {},
          episode_title: localEpisode?.title || "",
          episode_context: localEpisode?.hook || "",
        });
        setLocalEpisode((prev) => ({ ...prev, [section]: response.data.content }));
      } catch (e) {
        console.error("Regeneration failed:", e);
      } finally {
        setRegeneratingSection(null);
      }
    },
    [regeneratingSection, userPrefs, localEpisode]
  );

  if (!localEpisode) {
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

  const tags = Array.isArray(localEpisode.tags) ? localEpisode.tags : [];
  const tweets = Array.isArray(localEpisode.tweet_copy) ? localEpisode.tweet_copy : [];
  const isPlaying = ttsState === "playing";

  const playBtnLabel =
    ttsState === "idle"
      ? "▶ Listen to Your Episode"
      : ttsState === "playing"
      ? "⏸ Pause"
      : "▶ Resume";

  // Helper: pass regenerate props to each card
  const mkRegen = (section) => ({
    onRegenerate: () => handleRegenerate(section, localEpisode[section]),
    isRegenerating: regeneratingSection === section,
  });

  return (
    <div
      data-testid="output-screen"
      style={{ minHeight: "100vh", background: "#0A0A0A", paddingBottom: "5rem" }}
    >
      {/* ── Sticky Minimal Bar ── */}
      <div
        data-testid="tts-playback-bar"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(10,10,10,0.94)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid #1A1A1A",
          padding: "0.75rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            minWidth: 0,
            flex: 1,
          }}
        >
          <button
            data-testid="tts-play-btn"
            onClick={handlePlayPause}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: isPlaying
                ? "rgba(139,92,246,0.2)"
                : "linear-gradient(135deg,#8B5CF6,#EC4899)",
              border: isPlaying ? "1px solid #8B5CF6" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.3s ease",
            }}
          >
            <span style={{ color: isPlaying ? "#8B5CF6" : "white", fontSize: "0.82rem" }}>
              {ttsState === "playing" ? "⏸" : "▶"}
            </span>
          </button>
          <p
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "#F9FAFB",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {localEpisode.title}
          </p>
        </div>

        <div
          className="tts-bar-actions"
          style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}
        >
          <CopyButton
            text={`${localEpisode.title}\n\n${localEpisode.hook}\n\n${localEpisode.script}`}
            label="Full Script"
          />
          <button
            data-testid="restart-btn"
            onClick={onRestart}
            className="btn-secondary"
            style={{ padding: "7px 14px", fontSize: "0.78rem", fontWeight: 600 }}
          >
            New Episode
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* Episode header */}
        <div style={{ marginBottom: "2rem" }}>
          <span
            style={{
              fontSize: "0.65rem",
              color: "#8B5CF6",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Episode Package — {userPrefs?.show_name}
          </span>
          <h1
            data-testid="episode-title"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.8rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#F9FAFB",
              marginTop: "0.5rem",
              lineHeight: 1.1,
            }}
          >
            {localEpisode.title}
          </h1>
        </div>

        {/* ── TTS Hero Section ── */}
        <div
          data-testid="tts-hero-section"
          style={{
            background: "#141414",
            border: "1px solid #2D2D2D",
            borderRadius: "1rem",
            padding: "2rem 2rem 1.75rem",
            marginBottom: "2rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.62rem",
              color: "#6B7280",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: "1.25rem",
            }}
          >
            Listen to Your Episode
          </p>

          <div style={{ marginBottom: "1.5rem" }}>
            <Waveform isActive={isPlaying} bars={32} />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.875rem",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <button
              data-testid="tts-hero-play-btn"
              onClick={handlePlayPause}
              className="btn-primary"
              style={{ padding: "0.9rem 2.25rem", fontSize: "1rem", fontWeight: 700 }}
            >
              {playBtnLabel}
            </button>
            {ttsState !== "idle" && (
              <button
                data-testid="tts-stop-btn"
                onClick={stopTTS}
                className="btn-secondary"
                style={{ padding: "0.9rem 1.5rem", fontSize: "0.9rem" }}
              >
                ⏹ Stop
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div
            style={{
              background: "#1E1E1E",
              borderRadius: "999px",
              height: "4px",
              overflow: "hidden",
              maxWidth: "500px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: "999px",
                background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
                width: `${ttsState !== "idle" ? ttsProgress : 0}%`,
                transition: "width 0.4s ease",
                boxShadow: "0 0 8px rgba(139,92,246,0.5)",
              }}
            />
          </div>
          {ttsState !== "idle" && (
            <p style={{ fontSize: "0.7rem", color: "#4B5563", marginTop: "0.6rem" }}>
              {isPlaying ? "Playing..." : "Paused"} &middot; {Math.round(ttsProgress)}% complete
            </p>
          )}
        </div>

        {/* ── Bento Grid ── */}
        <div className="output-bento-grid">
          {/* Opening Hook — 8 cols */}
          <div className="bento-col-8">
            <OutputCard title="Opening Hook" testId="output-hook" {...mkRegen("hook")}>
              <p
                data-testid="episode-hook"
                style={{
                  color: "#F9FAFB",
                  fontSize: "1.05rem",
                  lineHeight: 1.72,
                  fontStyle: "italic",
                  borderLeft: "3px solid #8B5CF6",
                  paddingLeft: "1rem",
                  flex: 1,
                }}
              >
                {localEpisode.hook}
              </p>
              <CopyButton text={localEpisode.hook} label="Hook" />
            </OutputCard>
          </div>

          {/* Listener Persona — 4 cols */}
          <div className="bento-col-4">
            <OutputCard title="Listener Persona" testId="output-persona" {...mkRegen("listener_persona")}>
              <p style={{ color: "#D1D5DB", fontSize: "0.88rem", lineHeight: 1.72, flex: 1 }}>
                {localEpisode.listener_persona}
              </p>
              <CopyButton text={localEpisode.listener_persona} label="Persona" />
            </OutputCard>
          </div>

          {/* Full Script — 12 cols with sentence highlighting */}
          <div className="bento-col-12">
            <OutputCard title="Full Episode Script" testId="output-script" {...mkRegen("script")}>
              <div style={{ maxHeight: "500px", overflowY: "auto", paddingRight: "0.5rem" }}>
                {scriptSentences.length > 0 ? (
                  <p
                    data-testid="episode-script"
                    style={{ fontSize: "0.92rem", lineHeight: 1.82, color: "#E5E7EB" }}
                  >
                    {scriptSentences.map((sentence, i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor:
                            i === currentSentenceIdx
                              ? "rgba(139,92,246,0.18)"
                              : "transparent",
                          color: i === currentSentenceIdx ? "#F9FAFB" : "#E5E7EB",
                          borderRadius: "4px",
                          padding: i === currentSentenceIdx ? "1px 3px" : "0",
                          transition: "background-color 0.25s ease, color 0.25s ease",
                        }}
                      >
                        {sentence}{" "}
                      </span>
                    ))}
                  </p>
                ) : (
                  <p
                    data-testid="episode-script"
                    style={{
                      color: "#E5E7EB",
                      fontSize: "0.92rem",
                      lineHeight: 1.82,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {localEpisode.script}
                  </p>
                )}
              </div>
              <div
                style={{
                  borderTop: "1px solid #2D2D2D",
                  paddingTop: "0.875rem",
                  marginTop: "0.25rem",
                }}
              >
                <CopyButton text={localEpisode.script} label="Script" />
              </div>
            </OutputCard>
          </div>

          {/* Show Notes — 5 cols */}
          <div className="bento-col-5">
            <OutputCard title="Show Notes" testId="output-show-notes" {...mkRegen("show_notes")}>
              <p style={{ color: "#D1D5DB", fontSize: "0.88rem", lineHeight: 1.72, flex: 1 }}>
                {localEpisode.show_notes}
              </p>
              <CopyButton text={localEpisode.show_notes} label="Notes" />
            </OutputCard>
          </div>

          {/* Audiogram — 4 cols */}
          <div className="bento-col-4">
            <OutputCard title="Audiogram Script (30s)" testId="output-audiogram" {...mkRegen("audiogram_script")}>
              <p
                style={{
                  color: "#F9FAFB",
                  fontSize: "0.92rem",
                  lineHeight: 1.72,
                  fontWeight: 500,
                  flex: 1,
                }}
              >
                {localEpisode.audiogram_script}
              </p>
              <CopyButton text={localEpisode.audiogram_script} label="Audiogram" />
            </OutputCard>
          </div>

          {/* CTA — 3 cols */}
          <div className="bento-col-3">
            <OutputCard title="Call to Action" testId="output-cta" {...mkRegen("cta")}>
              <p
                style={{
                  color: "#F9FAFB",
                  fontSize: "0.92rem",
                  lineHeight: 1.72,
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                {localEpisode.cta}
              </p>
              <CopyButton text={localEpisode.cta} label="CTA" />
            </OutputCard>
          </div>

          {/* Tags — 4 cols */}
          <div className="bento-col-4">
            <OutputCard title="Tags" testId="output-tags" {...mkRegen("tags")}>
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

          {/* Tweets — 8 cols */}
          <div className="bento-col-8">
            <OutputCard title="Tweet Drafts (5 variations)" testId="output-tweets" {...mkRegen("tweet_copy")}>
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
