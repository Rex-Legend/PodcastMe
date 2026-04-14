import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import axios from "axios";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ── Fact-check claim detection patterns ──
const CLAIM_PATTERNS = [
  /\d+\s*%/,
  /\d+\s*percent/i,
  /studies?\s+(show|suggest|found|indicate|reveal)/i,
  /research\s+(shows?|says|found|indicates?|suggests?)/i,
  /according\s+to/i,
  /experts?\s+(say|claim|believe|agree)/i,
  /proven\s+to/i,
  /scientifically\s+(proven|shown)/i,
  /data\s+(shows?|indicates?|confirms?|reveals?)/i,
  /statistics\s+(show|reveal)/i,
];
const hasFactCheckWarning = (sentence) => CLAIM_PATTERNS.some((p) => p.test(sentence));

// ── Flesch-Kincaid readability ──
function calcFleschKincaid(text) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 2);
  const words = text.match(/\b[a-zA-Z]+\b/g) || [];
  if (!sentences.length || !words.length) return null;
  const syllables = words.reduce((total, word) => {
    const vowelGroups = word.toLowerCase().match(/[aeiou]+/g) || [];
    return total + Math.max(1, vowelGroups.length);
  }, 0);
  const score =
    206.835 -
    1.015 * (words.length / sentences.length) -
    84.6 * (syllables / words.length);
  return Math.max(0, Math.min(100, Math.round(score)));
}
function readabilityLabel(score) {
  if (score >= 80) return { label: "Very Easy", color: "#10B981" };
  if (score >= 60) return { label: "Easy", color: "#10B981" };
  if (score >= 50) return { label: "Moderate", color: "#F59E0B" };
  if (score >= 30) return { label: "Difficult", color: "#F59E0B" };
  return { label: "Hard", color: "#EF4444" };
}

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
      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "0.4rem", border: `1px solid ${copied ? "#10B981" : "#2D2D2D"}`, background: copied ? "rgba(16,185,129,0.1)" : "transparent", color: copied ? "#10B981" : "#6B7280", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.3s ease", fontFamily: "inherit", flexShrink: 0 }}
    >
      {copied ? "✓ Copied" : `⎘ ${label}`}
    </button>
  );
}

// ── ConfidenceBadge ──
function ConfidenceBadge({ score, reason }) {
  if (!score) return null;
  const color = score >= 8 ? "#10B981" : score >= 5 ? "#F59E0B" : "#EF4444";
  return (
    <span
      title={reason || ""}
      style={{ padding: "2px 7px", borderRadius: "999px", fontSize: "0.62rem", fontWeight: 700, border: `1px solid ${color}40`, color, background: `${color}14`, letterSpacing: "0.04em", flexShrink: 0 }}
    >
      {score}/10
    </span>
  );
}

// ── Waveform ──
function Waveform({ isActive, bars = 32 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px", height: "52px" }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={isActive ? "wave-bar active" : "wave-bar idle"}
          style={{ width: "3px", height: "44px", background: isActive ? `linear-gradient(to top, #8B5CF6, #EC4899)` : `linear-gradient(to top, rgba(139,92,246,0.2), rgba(236,72,153,0.15))`, borderRadius: "999px", animationDelay: `${i * 45}ms`, transition: "background 0.4s ease" }}
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
      style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 9px", borderRadius: "0.375rem", border: "1px solid rgba(139,92,246,0.28)", background: isLoading ? "rgba(139,92,246,0.05)" : "transparent", color: isLoading ? "#4B5563" : "#8B5CF6", fontSize: "0.68rem", fontWeight: 600, cursor: isLoading ? "not-allowed" : "pointer", letterSpacing: "0.04em", transition: "all 0.25s ease", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap" }}
      onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = "rgba(139,92,246,0.1)"; }}
      onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.background = "transparent"; }}
    >
      {isLoading ? "Regenerating..." : "↻ Regenerate"}
    </button>
  );
}

// ── OutputCard ──
function OutputCard({ title, children, testId, onRegenerate, isRegenerating, confidenceScore, confidenceReason }) {
  return (
    <div data-testid={testId} className="card" style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
          <p style={{ fontSize: "0.62rem", color: "#6B7280", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
            {title}
          </p>
          <ConfidenceBadge score={confidenceScore} reason={confidenceReason} />
        </div>
        {onRegenerate && <RegenerateButton onClick={onRegenerate} isLoading={isRegenerating} testId={`regen-${testId}`} />}
      </div>
      {children}
    </div>
  );
}

// ── HookVariantsCard ──
function HookVariantsCard({ variants }) {
  const [active, setActive] = useState("emotional");
  const tabs = [
    { key: "emotional", label: "Emotional" },
    { key: "data_driven", label: "Data-Driven" },
    { key: "contrarian", label: "Contrarian" },
  ];
  return (
    <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "0.62rem", color: "#6B7280", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
          Hook Variants (3)
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            data-testid={`hook-variant-${t.key}`}
            onClick={() => setActive(t.key)}
            style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease", border: `1px solid ${active === t.key ? "#8B5CF6" : "#2D2D2D"}`, background: active === t.key ? "rgba(139,92,246,0.15)" : "transparent", color: active === t.key ? "#8B5CF6" : "#6B7280" }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p style={{ color: "#F9FAFB", fontSize: "1rem", lineHeight: 1.72, fontStyle: "italic", borderLeft: "3px solid #8B5CF6", paddingLeft: "1rem", flex: 1 }}>
        {variants[active] || "No variant available"}
      </p>
      <CopyButton text={variants[active] || ""} label="Hook" />
    </div>
  );
}

// ── SocialPackCard ──
function SocialPackCard({ socialPack }) {
  const [active, setActive] = useState("linkedin_post");
  const TABS = [
    { key: "linkedin_post", label: "LinkedIn" },
    { key: "newsletter_snippet", label: "Newsletter" },
    { key: "quote_card", label: "Quote Card" },
    { key: "contrarian_take", label: "Contrarian" },
    { key: "cta_post", label: "CTA Post" },
  ];
  const content = socialPack[active] || "";
  return (
    <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      <p style={{ fontSize: "0.62rem", color: "#6B7280", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
        Social Pack
      </p>
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            data-testid={`social-tab-${t.key}`}
            onClick={() => setActive(t.key)}
            style={{ padding: "3px 9px", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease", border: `1px solid ${active === t.key ? "#EC4899" : "#2D2D2D"}`, background: active === t.key ? "rgba(236,72,153,0.12)" : "transparent", color: active === t.key ? "#EC4899" : "#6B7280" }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p style={{ color: "#D1D5DB", fontSize: "0.88rem", lineHeight: 1.75, flex: 1, whiteSpace: "pre-wrap" }}>
        {content}
      </p>
      {active === "thread" && Array.isArray(socialPack.thread) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
          {socialPack.thread.map((tweet, i) => (
            <div key={i} style={{ background: "#1E1E1E", border: "1px solid #2D2D2D", borderRadius: "0.4rem", padding: "0.625rem 0.75rem", display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              <p style={{ color: "#E5E7EB", fontSize: "0.82rem", lineHeight: 1.55, flex: 1 }}>{tweet}</p>
              <CopyButton text={tweet} label={`T${i + 1}`} />
            </div>
          ))}
        </div>
      )}
      {active !== "thread" && <CopyButton text={content} label={TABS.find((t) => t.key === active)?.label || "Copy"} />}
    </div>
  );
}

// ── Main Component ──
export default function OutputScreen({ episode, userPrefs, onRestart, onDashboard }) {
  const [localEpisode, setLocalEpisode] = useState(episode);
  const [ttsState, setTtsState] = useState("idle");
  const [ttsProgress, setTtsProgress] = useState(0);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(-1);
  const [isPolishingScript, setIsPolishingScript] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState(null);

  // New state
  const [emotionalArcData, setEmotionalArcData] = useState(null);
  const [isLoadingArc, setIsLoadingArc] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [scriptDAText, setScriptDAText] = useState(null);
  const [isLoadingScriptDA, setIsLoadingScriptDA] = useState(false);

  const ttsEngineRef = useRef({ active: false, timeoutId: null });
  const sentenceOffsetsRef = useRef([]);

  useEffect(() => {
    setLocalEpisode(episode);
    setEmotionalArcData(null);
    setScriptDAText(null);
  }, [episode]);

  // Fetch emotional arc on mount
  useEffect(() => {
    if (!localEpisode?.script || emotionalArcData || isLoadingArc) return;
    setIsLoadingArc(true);
    axios
      .post(`${API}/emotional-arc`, {
        script: localEpisode.script,
        topic: userPrefs?.topic || "",
      })
      .then((res) => {
        if (res.data.arc && Array.isArray(res.data.arc)) {
          setEmotionalArcData(res.data.arc);
        }
      })
      .catch((e) => console.warn("Emotional arc fetch failed:", e.message))
      .finally(() => setIsLoadingArc(false));
  }, [localEpisode?.script]); // eslint-disable-line

  // ── Script Processing ──
  const cleanScript = useMemo(() => {
    if (!localEpisode?.script) return "";
    return localEpisode.script
      .replace(/\[([A-Z\s]+(?:\s\d+)?)\]/g, "")
      .replace(/—\s*wait\s*—/gi, "")
      .replace(/\.\.\./g, "")
      .replace(/[ \t]+/g, " ")
      .trim();
  }, [localEpisode?.script]);

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
      if (idx !== -1) { offsets.push(idx); searchFrom = idx + sentence.length; }
      else { offsets.push(searchFrom); searchFrom += sentence.length; }
    }
    return offsets;
  }, [cleanScript, scriptSentences]);

  useEffect(() => { sentenceOffsetsRef.current = sentenceOffsets; }, [sentenceOffsets]);

  // Readability score (computed once)
  const readabilityScore = useMemo(() => calcFleschKincaid(cleanScript), [cleanScript]);

  // ── TTS Engine with Marker Support ──
  const startTTS = useCallback(() => {
    const rawScript = localEpisode?.script;
    if (!rawScript) return;
    window.speechSynthesis.cancel();
    if (ttsEngineRef.current.timeoutId) clearTimeout(ttsEngineRef.current.timeoutId);

    const parseMarkersFromScript = (script) => {
      const segments = [];
      const markerRegex = /\[([A-Z][A-Z\s]*(?:\s\d+)?)\]/g;
      let lastIndex = 0;
      let pendingEmphasis = false;
      let pendingEnergy = null;
      let pendingSlower = false;

      const pushTextChunk = (raw, emphasis, energy, slower) => {
        const longParts = raw.split(/—\s*wait\s*—/gi);
        longParts.forEach((part, li) => {
          const shortParts = part.split("...");
          shortParts.forEach((chunk, si) => {
            const t = chunk.trim();
            if (t) segments.push({ type: "speech", text: t, emphasis, energy, slower });
            if (si < shortParts.length - 1) segments.push({ type: "pause", duration: 500 });
          });
          if (li < longParts.length - 1) segments.push({ type: "pause", duration: 1200 });
        });
      };

      let match;
      while ((match = markerRegex.exec(script)) !== null) {
        if (match.index > lastIndex) {
          const text = script.slice(lastIndex, match.index);
          if (text.trim()) {
            pushTextChunk(text, pendingEmphasis, pendingEnergy, pendingSlower);
            pendingEmphasis = false; pendingEnergy = null; pendingSlower = false;
          }
        }
        const markerContent = match[1].trim();
        if (markerContent.startsWith("PAUSE")) {
          const seconds = markerContent.match(/PAUSE\s+(\d+)/);
          segments.push({ type: "pause", duration: seconds ? parseInt(seconds[1]) * 1000 : 2000 });
        } else if (markerContent === "BEAT") {
          segments.push({ type: "pause", duration: 800 });
        } else if (markerContent === "EMPHASIS") {
          pendingEmphasis = true;
        } else if (markerContent === "ENERGY UP") {
          pendingEnergy = "high";
        } else if (markerContent === "SLOWER") {
          pendingSlower = true;
        } else if (markerContent === "OUTRO BEAT") {
          segments.push({ type: "pause", duration: 1000 });
        }
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < script.length) {
        const tail = script.slice(lastIndex);
        if (tail.trim()) pushTextChunk(tail, pendingEmphasis, pendingEnergy, pendingSlower);
      }
      return segments;
    };

    const parsedSegments = parseMarkersFromScript(rawScript);
    const speechSegs = parsedSegments.filter((s) => s.type === "speech");
    const totalChars = speechSegs.reduce((sum, s) => sum + (s.text || "").length, 0) || 1;
    let spokenChars = 0;
    let segIdx = 0;
    const engine = { active: true, timeoutId: null };
    ttsEngineRef.current = engine;

    function speakNext() {
      if (!engine.active) return;
      if (segIdx >= parsedSegments.length) {
        setTtsState("idle"); setCurrentSentenceIdx(-1); setTtsProgress(100);
        return;
      }
      const seg = parsedSegments[segIdx++];
      if (seg.type === "pause") { engine.timeoutId = setTimeout(speakNext, seg.duration); return; }
      if (seg.type !== "speech" || !seg.text) { speakNext(); return; }
      const segStartChars = spokenChars;
      const utt = new SpeechSynthesisUtterance(seg.text);
      if (seg.slower) { utt.rate = 0.75; utt.pitch = 1.0; utt.volume = 0.85; }
      else if (seg.energy === "high") { utt.rate = 0.92; utt.pitch = 1.25; utt.volume = 1.0; }
      else if (seg.emphasis) { utt.rate = 0.92; utt.pitch = 1.15; utt.volume = 1.0; }
      else { utt.rate = 0.92; utt.pitch = 1.0; utt.volume = 0.85; }
      utt.onboundary = (e) => {
        const globalIdx = segStartChars + e.charIndex;
        setTtsProgress(Math.min(99, (globalIdx / totalChars) * 100));
        const offsets = sentenceOffsetsRef.current;
        let found = 0;
        for (let i = offsets.length - 1; i >= 0; i--) {
          if (globalIdx >= offsets[i]) { found = i; break; }
        }
        setCurrentSentenceIdx(found);
      };
      utt.onend = () => { if (!engine.active) return; spokenChars += seg.text.length + 1; speakNext(); };
      utt.onerror = (e) => { console.warn(`Speech error: ${e.error}`); if (engine.active) speakNext(); };
      window.speechSynthesis.speak(utt);
    }

    setTtsState("playing"); setTtsProgress(0); setCurrentSentenceIdx(-1);
    speakNext();
  }, [localEpisode?.script, sentenceOffsets]);

  const handlePlayPause = useCallback(() => {
    if (ttsState === "idle") startTTS();
    else if (ttsState === "playing") {
      if (ttsEngineRef.current.timeoutId) { clearTimeout(ttsEngineRef.current.timeoutId); ttsEngineRef.current.timeoutId = null; }
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
    setTtsState("idle"); setCurrentSentenceIdx(-1); setTtsProgress(0);
  }, []);

  // ── Polish for Audio ──
  const handlePolishForAudio = useCallback(async () => {
    if (isPolishingScript) return;
    setIsPolishingScript(true);
    try {
      const response = await axios.post(`${API}/polish-script-for-audio`, {
        script: localEpisode.script,
        user_prefs: userPrefs || {},
        episode_title: localEpisode.title || "",
      });
      if (!response.data.polished_script) throw new Error("No polished script returned");
      setLocalEpisode((prev) => ({ ...prev, script: response.data.polished_script }));
    } catch (error) {
      console.error("Polish failed:", error);
      alert(`Polish failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsPolishingScript(false);
    }
  }, [isPolishingScript, localEpisode, userPrefs]);

  // ── Section Regeneration ──
  const handleRegenerate = useCallback(async (section, currentContent) => {
    if (regeneratingSection) return;
    setRegeneratingSection(section);
    try {
      const response = await axios.post(`${API}/regenerate-section`, {
        section,
        current_content: Array.isArray(currentContent) ? JSON.stringify(currentContent) : String(currentContent),
        user_prefs: userPrefs || {},
        episode_title: localEpisode?.title || "",
        episode_context: localEpisode?.hook || "",
      });
      setLocalEpisode((prev) => ({ ...prev, [section]: response.data.content }));
    } catch (e) { console.error("Regeneration failed:", e); }
    finally { setRegeneratingSection(null); }
  }, [regeneratingSection, userPrefs, localEpisode]);

  // ── MP3 Download ──
  const handleDownloadMP3 = useCallback(async () => {
    if (isGeneratingAudio) return;
    setIsGeneratingAudio(true);
    setAudioProgress(10);
    try {
      // Use audiogram script for a focused, podcast-ready clip (~30s audio)
      const textToConvert =
        localEpisode.audiogram_script ||
        (localEpisode.script || "").replace(/\[.*?\]/g, " ").slice(0, 2000).trim();

      setAudioProgress(30);
      const response = await axios.post(
        `${API}/generate-audio`,
        { script: textToConvert, voice: "aura-asteria-en" },
        { responseType: "blob" }
      );
      setAudioProgress(90);
      const url = URL.createObjectURL(new Blob([response.data], { type: "audio/mpeg" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(localEpisode.title || "podcast-episode")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "_")
        .toLowerCase()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setAudioProgress(100);
      setTimeout(() => setAudioProgress(0), 2000);
    } catch (e) {
      console.error("Audio generation failed:", e);
      alert("Audio generation failed. Please try again.");
      setAudioProgress(0);
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [isGeneratingAudio, localEpisode]);

  // ── Devil's Advocate for script ──
  const handleScriptDA = useCallback(async () => {
    if (isLoadingScriptDA) return;
    setIsLoadingScriptDA(true);
    setScriptDAText(null);
    try {
      const snippet = cleanScript.slice(0, 800);
      const res = await axios.post(`${API}/devils-advocate`, {
        paragraph: snippet,
        topic: userPrefs?.topic || "",
        controversy_level: userPrefs?.controversy_level || 5,
      });
      setScriptDAText(res.data.counterpoint);
    } catch (e) {
      setScriptDAText("Failed to generate counterpoint. Try again.");
    } finally {
      setIsLoadingScriptDA(false);
    }
  }, [isLoadingScriptDA, cleanScript, userPrefs]);

  if (!localEpisode) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
        No episode data
      </div>
    );
  }

  const tags = Array.isArray(localEpisode.tags) ? localEpisode.tags : [];
  const tweets = Array.isArray(localEpisode.tweet_copy) ? localEpisode.tweet_copy : [];
  const isPlaying = ttsState === "playing";
  const playBtnLabel = ttsState === "idle" ? "▶ Listen to Your Episode" : ttsState === "playing" ? "⏸ Pause" : "▶ Resume";

  const sc = localEpisode.section_confidence || {};
  const mkRegen = (section) => ({
    onRegenerate: () => handleRegenerate(section, localEpisode[section]),
    isRegenerating: regeneratingSection === section,
    confidenceScore: sc[section]?.score,
    confidenceReason: sc[section]?.reason,
  });

  const hookVariants = localEpisode.hook_variants;
  const socialPack = localEpisode.social_pack;

  return (
    <div data-testid="output-screen" style={{ minHeight: "100vh", background: "#0A0A0A", paddingBottom: "5rem" }}>
      {/* ── Sticky Bar ── */}
      <div
        data-testid="tts-playback-bar"
        style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(10,10,10,0.94)", backdropFilter: "blur(14px)", borderBottom: "1px solid #1A1A1A", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
          <button
            data-testid="tts-play-btn"
            onClick={handlePlayPause}
            style={{ width: 34, height: 34, borderRadius: "50%", background: isPlaying ? "rgba(139,92,246,0.2)" : "linear-gradient(135deg,#8B5CF6,#EC4899)", border: isPlaying ? "1px solid #8B5CF6" : "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.3s ease" }}
          >
            <span style={{ color: isPlaying ? "#8B5CF6" : "white", fontSize: "0.82rem" }}>
              {ttsState === "playing" ? "⏸" : "▶"}
            </span>
          </button>
          <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F9FAFB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {localEpisode.title}
          </p>
        </div>
        <div className="tts-bar-actions" style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <CopyButton text={`${localEpisode.title}\n\n${localEpisode.hook}\n\n${localEpisode.script}`} label="Full Script" />
          {onDashboard && (
            <button
              data-testid="output-dashboard-btn"
              onClick={onDashboard}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "0.5rem", border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.08)", color: "#8B5CF6", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(139,92,246,0.16)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(139,92,246,0.08)"; }}
            >
              ↗ Dashboard
            </button>
          )}
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
          <span style={{ fontSize: "0.65rem", color: "#8B5CF6", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 }}>
            Episode Package — {userPrefs?.show_name}
          </span>
          <h1
            data-testid="episode-title"
            style={{ fontSize: "clamp(1.75rem, 4vw, 2.8rem)", fontWeight: 900, letterSpacing: "-0.04em", color: "#F9FAFB", marginTop: "0.5rem", lineHeight: 1.1 }}
          >
            {localEpisode.title}
          </h1>
        </div>

        {/* ── TTS Hero Section ── */}
        <div
          data-testid="tts-hero-section"
          style={{ background: "#141414", border: "1px solid #2D2D2D", borderRadius: "1rem", padding: "2rem 2rem 1.75rem", marginBottom: "2rem", textAlign: "center" }}
        >
          <p style={{ fontSize: "0.62rem", color: "#6B7280", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600, marginBottom: "1.25rem" }}>
            Listen to Your Episode
          </p>

          <div style={{ marginBottom: "1.5rem" }}>
            <Waveform isActive={isPlaying} bars={32} />
            {isPlaying && localEpisode?.script?.match(/\[(PAUSE|EMPHASIS|ENERGY UP|SLOWER|BEAT)/) && (
              <p style={{ fontSize: "0.68rem", color: "#8B5CF6", marginTop: "0.625rem", letterSpacing: "0.04em" }}>
                ✨ Playing with production markers
              </p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.875rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <button
              data-testid="tts-hero-play-btn"
              onClick={handlePlayPause}
              className="btn-primary"
              style={{ padding: "0.9rem 2.25rem", fontSize: "1rem", fontWeight: 700 }}
            >
              {playBtnLabel}
            </button>
            {ttsState !== "idle" && (
              <button data-testid="tts-stop-btn" onClick={stopTTS} className="btn-secondary" style={{ padding: "0.9rem 1.5rem", fontSize: "0.9rem" }}>
                ⏹ Stop
              </button>
            )}

            {/* MP3 Download */}
            <button
              data-testid="download-mp3-btn"
              onClick={handleDownloadMP3}
              disabled={isGeneratingAudio}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.9rem 1.5rem",
                borderRadius: "0.5rem", border: "1px solid rgba(16,185,129,0.3)",
                background: isGeneratingAudio ? "rgba(16,185,129,0.05)" : "rgba(16,185,129,0.08)",
                color: isGeneratingAudio ? "#4B5563" : "#10B981", fontSize: "0.88rem", fontWeight: 600,
                cursor: isGeneratingAudio ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => { if (!isGeneratingAudio) e.currentTarget.style.background = "rgba(16,185,129,0.15)"; }}
              onMouseLeave={(e) => { if (!isGeneratingAudio) e.currentTarget.style.background = "rgba(16,185,129,0.08)"; }}
            >
              {isGeneratingAudio
                ? `🎙️ Generating... ${audioProgress}%`
                : "⬇ Download MP3"}
            </button>
          </div>

          {/* MP3 progress bar */}
          {isGeneratingAudio && (
            <div style={{ background: "#1E1E1E", borderRadius: "999px", height: "3px", overflow: "hidden", maxWidth: "300px", margin: "0 auto 1rem" }}>
              <div style={{ height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, #10B981, #8B5CF6)", width: `${audioProgress}%`, transition: "width 0.4s ease" }} />
            </div>
          )}

          {/* TTS Progress bar */}
          <div style={{ background: "#1E1E1E", borderRadius: "999px", height: "4px", overflow: "hidden", maxWidth: "500px", margin: "0 auto" }}>
            <div style={{ height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, #8B5CF6, #EC4899)", width: `${ttsState !== "idle" ? ttsProgress : 0}%`, transition: "width 0.4s ease", boxShadow: "0 0 8px rgba(139,92,246,0.5)" }} />
          </div>
          {ttsState !== "idle" && (
            <p style={{ fontSize: "0.7rem", color: "#4B5563", marginTop: "0.6rem" }}>
              {isPlaying ? "Playing..." : "Paused"} · {Math.round(ttsProgress)}% complete
            </p>
          )}
        </div>

        {/* ── Emotional Arc Chart ── */}
        {(emotionalArcData || isLoadingArc) && (
          <div
            className="card"
            style={{ marginBottom: "2rem", padding: "1.75rem" }}
          >
            <p style={{ fontSize: "0.62rem", color: "#6B7280", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600, marginBottom: "1.25rem" }}>
              Emotional Arc
            </p>
            {isLoadingArc ? (
              <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "#4B5563", fontSize: "0.82rem" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #1E1E1E", borderTopColor: "#8B5CF6", animation: "spin 0.8s linear infinite", marginRight: "0.625rem" }} />
                Analyzing emotional arc...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={emotionalArcData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="arcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                  <XAxis dataKey="label" tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: "1px solid #2D2D2D", borderRadius: "0.5rem", color: "#F9FAFB", fontSize: "0.75rem" }}
                    formatter={(v, _n, props) => [`${v}/10 — ${props.payload.emotion || ""}`, "Energy"]}
                  />
                  <Area type="monotone" dataKey="energy" stroke="#8B5CF6" fill="url(#arcGrad)" strokeWidth={2} dot={{ fill: "#8B5CF6", r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ── Bento Grid ── */}
        <div className="output-bento-grid">
          {/* Opening Hook — 8 cols */}
          <div className="bento-col-8">
            <OutputCard title="Opening Hook" testId="output-hook" {...mkRegen("hook")}>
              <p data-testid="episode-hook" style={{ color: "#F9FAFB", fontSize: "1.05rem", lineHeight: 1.72, fontStyle: "italic", borderLeft: "3px solid #8B5CF6", paddingLeft: "1rem", flex: 1 }}>
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

          {/* Hook Variants — 6 cols (only if new data) */}
          {hookVariants && (
            <div className="bento-col-6">
              <HookVariantsCard variants={hookVariants} />
            </div>
          )}

          {/* Social Pack — 6 cols (only if new data) */}
          {socialPack && (
            <div className={hookVariants ? "bento-col-6" : "bento-col-12"}>
              <SocialPackCard socialPack={socialPack} />
            </div>
          )}

          {/* Full Script — 12 cols */}
          <div className="bento-col-12">
            <OutputCard title="Full Episode Script" testId="output-script" {...mkRegen("script")}>
              {/* Script card header buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                <button
                  data-testid="polish-script-btn"
                  onClick={handlePolishForAudio}
                  disabled={isPolishingScript || regeneratingSection === "script"}
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "0.4rem", border: `1px solid ${isPolishingScript ? "#4B5563" : "rgba(236,72,153,0.28)"}`, background: isPolishingScript ? "rgba(236,72,153,0.05)" : "transparent", color: isPolishingScript ? "#4B5563" : "#EC4899", fontSize: "0.72rem", fontWeight: 600, cursor: isPolishingScript ? "not-allowed" : "pointer", letterSpacing: "0.04em", transition: "all 0.3s ease", fontFamily: "inherit", flexShrink: 0 }}
                  onMouseEnter={(e) => { if (!isPolishingScript) { e.currentTarget.style.background = "rgba(236,72,153,0.1)"; e.currentTarget.style.borderColor = "rgba(236,72,153,0.5)"; } }}
                  onMouseLeave={(e) => { if (!isPolishingScript) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(236,72,153,0.28)"; } }}
                >
                  {isPolishingScript ? "✨ Polishing..." : "✨ Polish for Audio"}
                </button>

                {/* Devil's Advocate for script */}
                <button
                  data-testid="script-da-btn"
                  onClick={handleScriptDA}
                  disabled={isLoadingScriptDA}
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "0.4rem", border: "1px solid rgba(245,158,11,0.3)", background: isLoadingScriptDA ? "rgba(245,158,11,0.05)" : "transparent", color: isLoadingScriptDA ? "#4B5563" : "#F59E0B", fontSize: "0.72rem", fontWeight: 600, cursor: isLoadingScriptDA ? "not-allowed" : "pointer", transition: "all 0.3s ease", fontFamily: "inherit", flexShrink: 0 }}
                  onMouseEnter={(e) => { if (!isLoadingScriptDA) e.currentTarget.style.background = "rgba(245,158,11,0.1)"; }}
                  onMouseLeave={(e) => { if (!isLoadingScriptDA) e.currentTarget.style.background = "transparent"; }}
                >
                  {isLoadingScriptDA ? "Challenging..." : "🔥 Challenge Script"}
                </button>

                {/* Readability score */}
                {readabilityScore !== null && (() => {
                  const r = readabilityLabel(readabilityScore);
                  return (
                    <span title={`Flesch-Kincaid readability: ${readabilityScore}/100. Podcast scripts aim for 60–80.`} style={{ padding: "4px 9px", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 700, border: `1px solid ${r.color}40`, color: r.color, background: `${r.color}12`, cursor: "help" }}>
                      {r.label} ({readabilityScore})
                    </span>
                  );
                })()}
              </div>

              {/* Devil's Advocate result */}
              {scriptDAText && (
                <div data-testid="script-da-result" style={{ padding: "0.875rem 1rem", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "0.5rem", borderLeft: "3px solid #F59E0B" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <p style={{ fontSize: "0.62rem", color: "#F59E0B", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>Counterpoint</p>
                    <button onClick={() => setScriptDAText(null)} style={{ background: "transparent", border: "none", color: "#4B5563", cursor: "pointer", fontSize: "0.72rem", fontFamily: "inherit" }}>✕</button>
                  </div>
                  <p style={{ color: "#D1D5DB", fontSize: "0.88rem", lineHeight: 1.65 }}>{scriptDAText}</p>
                </div>
              )}

              {/* Script display with sentence highlighting + fact-check badges */}
              <div style={{ maxHeight: "500px", overflowY: "auto", paddingRight: "0.5rem", marginTop: "0.5rem" }}>
                {scriptSentences.length > 0 ? (
                  <p data-testid="episode-script" style={{ fontSize: "0.92rem", lineHeight: 1.82, color: "#E5E7EB", whiteSpace: "pre-wrap" }}>
                    {scriptSentences.map((sentence, i) => {
                      const isHighlighted = i === currentSentenceIdx;
                      const isClaim = hasFactCheckWarning(sentence);
                      return (
                        <span key={i} style={{ backgroundColor: isHighlighted ? "rgba(139,92,246,0.18)" : "transparent", color: isHighlighted ? "#F9FAFB" : "#E5E7EB", borderRadius: "4px", padding: isHighlighted ? "1px 3px" : "0", transition: "background-color 0.25s ease, color 0.25s ease" }}>
                          {sentence}{" "}
                          {isClaim && (
                            <span
                              title="This sentence contains a claim — consider fact-checking before publishing"
                              style={{ display: "inline-block", marginLeft: "2px", padding: "1px 5px", borderRadius: "999px", fontSize: "0.58rem", fontWeight: 700, background: "rgba(245,158,11,0.14)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B", letterSpacing: "0.04em", cursor: "help", verticalAlign: "middle" }}
                            >
                              ⚠ verify
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </p>
                ) : (
                  <p data-testid="episode-script" style={{ color: "#E5E7EB", fontSize: "0.92rem", lineHeight: 1.82, whiteSpace: "pre-wrap" }}>
                    {localEpisode.script}
                  </p>
                )}
              </div>

              <div style={{ borderTop: "1px solid #2D2D2D", paddingTop: "0.875rem", marginTop: "0.875rem" }}>
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
              <p style={{ color: "#F9FAFB", fontSize: "0.92rem", lineHeight: 1.72, fontWeight: 500, flex: 1 }}>
                {localEpisode.audiogram_script}
              </p>
              <CopyButton text={localEpisode.audiogram_script} label="Audiogram" />
            </OutputCard>
          </div>

          {/* CTA — 3 cols */}
          <div className="bento-col-3">
            <OutputCard title="Call to Action" testId="output-cta" {...mkRegen("cta")}>
              <p style={{ color: "#F9FAFB", fontSize: "0.92rem", lineHeight: 1.72, fontWeight: 600, flex: 1 }}>
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
                  <span key={i} style={{ padding: "4px 10px", borderRadius: "999px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "#8B5CF6", fontSize: "0.75rem", fontWeight: 600 }}>
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
                  <div key={i} style={{ background: "#1E1E1E", border: "1px solid #2D2D2D", borderRadius: "0.5rem", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                    <p style={{ color: "#E5E7EB", fontSize: "0.85rem", lineHeight: 1.6, flex: 1 }}>{tweet}</p>
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
