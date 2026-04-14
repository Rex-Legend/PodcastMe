import React, { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATIC_QUESTIONS = [
  "What's the main topic or focus of this specific episode you want to record?",
  "Who is your ideal listener — describe your dream audience member in one or two sentences?",
  "What's the most controversial opinion you hold in your niche that you haven't fully shared publicly?",
  "Tell me a personal story from your own life that changed how you see this topic.",
  "What's the number one mistake you see people making in your space right now?",
  "What do you want your listener to do, feel, or think differently about after this episode?",
  "Are there any big names or thought leaders in your space whose ideas you want to challenge or build on?",
  "Give me your one-line mega takeaway — the headline insight this episode should be remembered for.",
];

const DEMO_TOPICS = [
  {
    id: "ai-ethics",
    label: "AI Ethics",
    answers: [
      { question: STATIC_QUESTIONS[0], answer: "The Future of AI Ethics — specifically how tech founders can build trustworthy AI products before regulators force them to." },
      { question: STATIC_QUESTIONS[1], answer: "Tech founders and product managers, 28–45, building AI-powered products and quietly worried about the ethical landmines they might be stepping on." },
      { question: STATIC_QUESTIONS[2], answer: "Most AI ethics frameworks are performative theater. Companies adopt them to avoid bad PR, not to prevent harm. Real ethical AI starts with individual engineers having the moral courage to say no." },
      { question: STATIC_QUESTIONS[3], answer: "I was at a major tech company when we shipped a recommendation algorithm we knew from internal testing was amplifying extremist content. The pressure to hit engagement numbers was immense. I stayed silent. That silence still haunts me." },
      { question: STATIC_QUESTIONS[4], answer: "Building AI systems with zero mechanism for those harmed by them to seek recourse. Every AI product needs a 'human in the loop' escalation path — but 90% of teams skip it because it slows the roadmap." },
      { question: STATIC_QUESTIONS[5], answer: "I want them to feel that ethics isn't a tax on innovation — it's the moat. The companies that build genuinely trustworthy AI will dominate the next decade." },
      { question: STATIC_QUESTIONS[6], answer: "I want to challenge Andrew Ng's view that regulation stifles AI innovation. And I want to build on Geoffrey Hinton's warnings by going further: giving founders a concrete, practical playbook they can use today." },
      { question: STATIC_QUESTIONS[7], answer: "The companies that profit most from AI in the long run won't be the fastest — they'll be the most trusted." },
    ],
  },
  {
    id: "mental-health",
    label: "Mental Health",
    answers: [
      { question: STATIC_QUESTIONS[0], answer: "The silent burnout epidemic inside high-performance workplaces — why the best performers are the most at-risk, and what leaders can actually do before they lose their best people." },
      { question: STATIC_QUESTIONS[1], answer: "High-achieving professionals aged 28–45 who pride themselves on 'always being on' and secretly fear that slowing down means falling behind." },
      { question: STATIC_QUESTIONS[2], answer: "The wellness industry has monetized suffering and repackaged it as self-optimization. Real mental health is not about being a better worker — it's about being a full human." },
      { question: STATIC_QUESTIONS[3], answer: "I had a full panic attack during a board meeting and still finished the presentation. That was the moment I realized I had completely disconnected from my body. The recovery took two years." },
      { question: STATIC_QUESTIONS[4], answer: "Treating burnout as a personal failure rather than a systemic design problem. Organizations optimize people like software — constantly shipping new features, never pausing for maintenance." },
      { question: STATIC_QUESTIONS[5], answer: "I want them to feel permission. Permission to draw a line. Real sustainability is a competitive advantage, not weakness." },
      { question: STATIC_QUESTIONS[6], answer: "I want to challenge the positive psychology movement and build on Brené Brown's vulnerability work but push it into organizational structures." },
      { question: STATIC_QUESTIONS[7], answer: "You cannot optimize your way out of a broken system. Change the environment, not just the person." },
    ],
  },
  {
    id: "future-of-work",
    label: "Future of Work",
    answers: [
      { question: STATIC_QUESTIONS[0], answer: "Why remote work didn't fail — why middle management failed, and what high-performance distributed teams actually look like in 2026." },
      { question: STATIC_QUESTIONS[1], answer: "Knowledge workers aged 25–45 navigating hybrid chaos: frustrated with theater-management, craving autonomy, trying to build careers in a world where the rules change every quarter." },
      { question: STATIC_QUESTIONS[2], answer: "Most companies claiming to be 'remote-first' are lying. They're office-first in disguise — every key decision still happens in the room, every promotion still goes to the visible person." },
      { question: STATIC_QUESTIONS[3], answer: "I ran a fully distributed team of 23 people across 11 countries. We shipped faster than our co-located competitors. Then I joined a 'hybrid' company and watched remote employees become second-class citizens within 90 days." },
      { question: STATIC_QUESTIONS[4], answer: "Measuring productivity by visibility — hours online, response time, who speaks first in meetings. The moment you measure outputs instead of presence, everything changes." },
      { question: STATIC_QUESTIONS[5], answer: "I want them to feel equipped to have the conversation they've been avoiding with their manager. I want them to leave with a framework for redesigning how their team actually works." },
      { question: STATIC_QUESTIONS[6], answer: "I want to challenge RTO mandates pushed by leaders like Jamie Dimon. I'll build on Nicholas Bloom's Stanford research but take it further." },
      { question: STATIC_QUESTIONS[7], answer: "The future of work is not remote or in-office. It is built on trust — and most companies are not yet brave enough to build it." },
    ],
  },
];

function Waveform({ mode = "idle" }) {
  const bars = 24;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", height: "54px" }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`wave-bar ${mode === "active" ? "active" : "idle"}`}
          style={{
            width: "3px",
            height: "42px",
            background:
              mode === "active"
                ? "linear-gradient(to top, #8B5CF6, #EC4899)"
                : "linear-gradient(to top, rgba(139,92,246,0.35), rgba(236,72,153,0.25))",
            borderRadius: "999px",
            animationDelay: `${i * 60}ms`,
            transition: "background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

export default function ConversationScreen({ userPrefs, onComplete }) {
  const [questions, setQuestions] = useState(STATIC_QUESTIONS);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("ai-ethics");

  // Follow-up state
  const [pendingFollowUp, setPendingFollowUp] = useState(null); // { originalAnswer, followupQuestion }
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);

  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  const showName = userPrefs?.show_name || "Your Podcast";
  const topic = userPrefs?.topic || "";

  // Fetch dynamic questions on mount if topic is provided
  useEffect(() => {
    if (!topic) return;
    setIsLoadingQuestions(true);
    axios
      .post(`${API}/generate-questions`, {
        topic: topic,
        archetype: userPrefs?.archetype || "Thought Leader",
        controversy_level: userPrefs?.controversy_level || 5,
        has_guest: userPrefs?.has_guest || false,
        guest_name: userPrefs?.guest_name || "",
      })
      .then((res) => {
        if (res.data.questions && res.data.questions.length >= 8) {
          setQuestions(res.data.questions.slice(0, 8));
        }
      })
      .catch((e) => {
        console.warn("Dynamic questions failed, using static fallback:", e.message);
      })
      .finally(() => {
        setIsLoadingQuestions(false);
      });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, [qIndex, isFollowUp]);

  // Jordan reads each question aloud (Fix 8)
  useEffect(() => {
    if (isMuted || isLoadingQuestions) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const q = isFollowUp && pendingFollowUp ? pendingFollowUp.followupQuestion : questions[qIndex];
    if (!q) return;
    const utt = new SpeechSynthesisUtterance(q);
    utt.rate = 0.95;
    utt.pitch = 1.05;
    synth.speak(utt);
    return () => synth.cancel();
  }, [qIndex, isMuted, isFollowUp, isLoadingQuestions]); // eslint-disable-line

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) { stopRecording(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Web Speech API is not supported in this browser. Please type your answer.");
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join("");
      setInputText(transcript);
    };
    recognition.onerror = (e) => { console.error("Speech recognition error:", e.error); setIsRecording(false); };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, stopRecording]);

  const submitAnswer = useCallback(async () => {
    const answer = inputText.trim();
    if (!answer) return;
    stopRecording();

    const wordCount = answer.split(/\s+/).filter((w) => w.length > 0).length;

    // Follow-up logic: if answer < 40 words and not already a follow-up
    if (wordCount < 40 && !isFollowUp && topic && !isGeneratingFollowUp) {
      setIsGeneratingFollowUp(true);
      try {
        const res = await axios.post(`${API}/followup-question`, {
          question: questions[qIndex],
          short_answer: answer,
          topic: topic,
        });
        if (res.data.followup) {
          setPendingFollowUp({
            originalAnswer: answer,
            followupQuestion: res.data.followup,
          });
          setIsFollowUp(true);
          setInputText("");
          setAnimKey((k) => k + 1);
          setIsGeneratingFollowUp(false);
          return;
        }
      } catch (e) {
        console.warn("Follow-up question failed, proceeding normally:", e.message);
      }
      setIsGeneratingFollowUp(false);
    }

    // Build final answer (combine if follow-up)
    let finalAnswer = answer;
    if (isFollowUp && pendingFollowUp) {
      finalAnswer = `${pendingFollowUp.originalAnswer} ${answer}`.trim();
      setIsFollowUp(false);
      setPendingFollowUp(null);
    }

    const newAnswers = [...answers, { question: questions[qIndex], answer: finalAnswer }];
    setAnswers(newAnswers);
    setInputText("");
    setAnimKey((k) => k + 1);
    if (qIndex + 1 >= questions.length) {
      onComplete(newAnswers);
    } else {
      setQIndex((i) => i + 1);
    }
  }, [inputText, answers, qIndex, stopRecording, onComplete, isFollowUp, pendingFollowUp, questions, topic, isGeneratingFollowUp]); // eslint-disable-line

  const runDemo = useCallback(() => {
    stopRecording();
    const demoTopic = DEMO_TOPICS.find((t) => t.id === selectedTopic) || DEMO_TOPICS[0];
    onComplete(demoTopic.answers);
  }, [stopRecording, onComplete, selectedTopic]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitAnswer(); }
    },
    [submitAnswer]
  );

  const progressPct = (qIndex / questions.length) * 100;
  const displayQuestion =
    isFollowUp && pendingFollowUp ? pendingFollowUp.followupQuestion : questions[qIndex];

  return (
    <div
      data-testid="conversation-screen"
      style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}
    >
      {/* ── Top Bar ── */}
      <div
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.75rem", borderBottom: "1px solid #181818", position: "sticky",
          top: 0, zIndex: 20, background: "rgba(10,10,10,0.95)", backdropFilter: "blur(12px)",
        }}
      >
        <span style={{ fontSize: "0.68rem", color: "#6B7280", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
          {showName}
        </span>
        <div data-testid="question-progress" style={{ fontSize: "0.82rem", color: "#6B7280", fontWeight: 600 }}>
          {isFollowUp ? (
            <span style={{ color: "#F59E0B", fontSize: "0.78rem", fontWeight: 700 }}>↩ Follow-up</span>
          ) : (
            <>
              Question{" "}
              <span style={{ color: "#F9FAFB", fontSize: "1rem", fontWeight: 900 }}>{qIndex + 1}</span>
              {" "}/ {questions.length}
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
          {DEMO_TOPICS.map((t) => (
            <button
              key={t.id}
              data-testid={`demo-topic-${t.id}`}
              onClick={() => setSelectedTopic(t.id)}
              style={{
                padding: "5px 9px", borderRadius: "999px",
                border: `1px solid ${selectedTopic === t.id ? "#8B5CF6" : "rgba(139,92,246,0.18)"}`,
                background: selectedTopic === t.id ? "rgba(139,92,246,0.14)" : "transparent",
                color: selectedTopic === t.id ? "#8B5CF6" : "#6B7280",
                fontSize: "0.65rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s ease", whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
          <button
            data-testid="demo-mode-btn"
            onClick={runDemo}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px",
              borderRadius: "0.5rem", border: "1px solid rgba(139,92,246,0.3)",
              background: "rgba(139,92,246,0.08)", color: "#8B5CF6", fontSize: "0.75rem",
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(139,92,246,0.18)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(139,92,246,0.08)"; e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)"; }}
          >
            Run Demo
          </button>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div style={{ width: "100%", height: "2px", background: "#151515" }}>
        <div style={{ height: "100%", background: "linear-gradient(90deg, #8B5CF6, #EC4899)", width: `${progressPct}%`, transition: "width 0.5s ease", boxShadow: "0 0 10px rgba(139,92,246,0.6)" }} />
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "660px", padding: "2rem 1.5rem 3rem", gap: "1.5rem" }}>
        {/* Loading questions badge */}
        {isLoadingQuestions && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "999px", padding: "5px 14px", fontSize: "0.7rem", color: "#8B5CF6", fontWeight: 600 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", border: "1.5px solid #8B5CF6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
            Generating topic-specific questions…
          </div>
        )}
        {!isLoadingQuestions && topic && questions !== STATIC_QUESTIONS && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "999px", padding: "5px 14px", fontSize: "0.7rem", color: "#10B981", fontWeight: 600 }}>
            ✓ Topic-specific questions generated
          </div>
        )}
        {!topic && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "999px", padding: "5px 14px", fontSize: "0.7rem", color: "#F59E0B", fontWeight: 600 }}>
            🎙️ Voice mode coming soon — text fallback active
          </div>
        )}

        {/* Jordan avatar + waveform */}
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg, #8B5CF6, #EC4899)", margin: "0 auto 0.6rem", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", fontWeight: 900, color: "white", boxShadow: "0 0 28px rgba(139,92,246,0.4)" }}>
            J
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "2px" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F9FAFB", letterSpacing: "0.03em" }}>Jordan</p>
            <button
              data-testid="mute-toggle-btn"
              onClick={() => { if (!isMuted) window.speechSynthesis?.cancel(); setIsMuted((m) => !m); }}
              title={isMuted ? "Unmute Jordan" : "Mute Jordan"}
              style={{ padding: "3px 8px", borderRadius: "999px", border: `1px solid ${isMuted ? "#2D2D2D" : "rgba(139,92,246,0.25)"}`, background: isMuted ? "transparent" : "rgba(139,92,246,0.07)", color: isMuted ? "#4B5563" : "#8B5CF6", fontSize: "0.6rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s ease" }}
            >
              {isMuted ? "🔇 Muted" : "🔊 Audio"}
            </button>
          </div>
          <p style={{ fontSize: "0.68rem", color: "#6B7280", marginBottom: "0.875rem" }}>AI Podcast Producer</p>
          <Waveform mode={isRecording ? "active" : "idle"} />
        </div>

        {/* Question card */}
        <div key={`q-${animKey}`} className="card fade-in-up" style={{ width: "100%", padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.875rem" }}>
            <p style={{ fontSize: "0.62rem", color: isFollowUp ? "#F59E0B" : "#8B5CF6", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>
              {isFollowUp ? "↩ Follow-up" : "Jordan asks"}
            </p>
            {isGeneratingFollowUp && (
              <span style={{ fontSize: "0.62rem", color: "#6B7280" }}>Thinking…</span>
            )}
          </div>
          <p style={{ fontSize: "1.08rem", color: "#F9FAFB", lineHeight: 1.65, fontWeight: 500 }}>
            {isLoadingQuestions ? (
              <span style={{ color: "#4B5563" }}>Loading question…</span>
            ) : (
              displayQuestion
            )}
          </p>
          {isFollowUp && (
            <p style={{ fontSize: "0.76rem", color: "#6B7280", marginTop: "0.75rem" }}>
              Your previous answer was brief — expand on it for a richer episode
            </p>
          )}
        </div>

        {/* Answer area */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            data-testid="mic-toggle-btn"
            onClick={toggleRecording}
            style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: "8px", padding: "9px 16px", borderRadius: "0.5rem", border: `1px solid ${isRecording ? "#10B981" : "#2D2D2D"}`, background: isRecording ? "rgba(16,185,129,0.1)" : "#1E1E1E", color: isRecording ? "#10B981" : "#6B7280", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s ease" }}
          >
            {isRecording ? (
              <><span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block", flexShrink: 0 }} />Stop Recording</>
            ) : <>🎙 Speak Answer</>}
          </button>

          <textarea
            ref={textareaRef}
            data-testid="answer-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening... speak your answer clearly" : "Type your answer here — or use the mic above\n(Ctrl+Enter to submit)"}
            rows={4}
            style={{ width: "100%", background: "#1E1E1E", border: `1px solid ${isRecording ? "rgba(16,185,129,0.4)" : "#2D2D2D"}`, borderRadius: "0.625rem", color: "#F9FAFB", padding: "1rem 1.125rem", fontSize: "0.95rem", fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6, transition: "border-color 0.3s ease" }}
            onFocus={(e) => { e.target.style.borderColor = isRecording ? "rgba(16,185,129,0.5)" : "rgba(139,92,246,0.5)"; }}
            onBlur={(e) => { e.target.style.borderColor = isRecording ? "rgba(16,185,129,0.4)" : "#2D2D2D"; }}
          />

          <button
            data-testid="submit-answer-btn"
            onClick={submitAnswer}
            disabled={!inputText.trim() || isGeneratingFollowUp}
            className="btn-primary"
            style={{ width: "100%", padding: "1rem", fontSize: "0.95rem", fontWeight: 700, opacity: (!inputText.trim() || isGeneratingFollowUp) ? 0.5 : 1 }}
          >
            {isGeneratingFollowUp
              ? "Thinking of a follow-up…"
              : isFollowUp
              ? "Submit Follow-up →"
              : qIndex + 1 < questions.length
              ? "Next Question →"
              : "Generate My Episode →"}
          </button>
        </div>

        {/* Dot progress indicators */}
        <div style={{ display: "flex", gap: "5px", alignItems: "center", paddingTop: "0.25rem" }}>
          {questions.map((_, i) => (
            <div
              key={i}
              style={{ width: i === qIndex ? 18 : 6, height: 6, borderRadius: "999px", background: i < qIndex ? "#10B981" : i === qIndex ? "#8B5CF6" : "#2D2D2D", transition: "all 0.35s ease" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
