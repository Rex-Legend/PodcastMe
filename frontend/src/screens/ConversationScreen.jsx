import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { Room, RoomEvent, Track } from "livekit-client";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FALLBACK_QUESTIONS = [
  "What's the main topic or focus of this specific episode you want to record?",
  "Who is your ideal listener — describe your dream audience member in one or two sentences?",
  "What's the most controversial opinion you hold in your niche that you haven't fully shared publicly?",
  "Tell me a personal story from your own life that changed how you see this topic.",
  "What's the number one mistake you see people making in your space right now?",
  "What do you want your listener to do, feel, or think differently about after this episode?",
  "Are there any big names or thought leaders in your space whose ideas you want to challenge or build on?",
  "Give me your one-line mega takeaway — the headline insight this episode should be remembered for.",
];

function Waveform({ isActive, color1 = "#8B5CF6", color2 = "#EC4899", bars = 18 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px", height: "48px" }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={isActive ? "wave-bar active" : "wave-bar"}
          style={{
            width: "3px",
            height: "40px",
            background: `linear-gradient(to top, ${color1}, ${color2})`,
            animationDelay: `${i * 55}ms`,
            opacity: isActive ? 1 : 0.25,
            transition: "opacity 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

export default function ConversationScreen({ userPrefs, onComplete }) {
  const [roomState, setRoomState] = useState("connecting");
  const [agentStatus, setAgentStatus] = useState("waiting");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackQIndex, setFallbackQIndex] = useState(0);
  const [fallbackInput, setFallbackInput] = useState("");
  const [fallbackAnswers, setFallbackAnswers] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [roomName, setRoomName] = useState("");
  const roomRef = useRef(null);
  const audioContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  // ── Web Speech API fallback ──
  const startSpeechRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (ev) => {
      const text = Array.from(ev.results)
        .map((res) => res[0].transcript)
        .join("");
      setFallbackInput(text);
    };
    r.onend = () => setIsRecording(false);
    recognitionRef.current = r;
    r.start();
    setIsRecording(true);
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const submitFallbackAnswer = useCallback(() => {
    const answer = fallbackInput.trim();
    if (!answer) return;
    const updated = [...fallbackAnswers, { question: FALLBACK_QUESTIONS[fallbackQIndex], answer }];
    setFallbackAnswers(updated);
    setFallbackInput("");
    stopSpeechRecognition();
    if (fallbackQIndex + 1 >= FALLBACK_QUESTIONS.length) {
      onComplete(updated);
    } else {
      setFallbackQIndex((i) => i + 1);
    }
  }, [fallbackInput, fallbackAnswers, fallbackQIndex, onComplete, stopSpeechRecognition]);

  // ── LiveKit connection ──
  const connectToRoom = useCallback(async () => {
    try {
      const res = await axios.post(`${API}/livekit-token`, {
        participant_name: userPrefs?.name || "Podcast Host",
        user_prefs: userPrefs || {},
      });
      const { server_url, participant_token, room_name } = res.data;
      setRoomName(room_name);

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        setRoomState("connected");
        // Cancel fallback timer — we connected
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
        }
        // Set a secondary timer to switch fallback if agent doesn't join
        fallbackTimerRef.current = setTimeout(() => {
          setIsFallback(true);
          setRoomState("fallback");
        }, 20000);
      });

      room.on(RoomEvent.Disconnected, () => setRoomState("disconnected"));

      room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.autoplay = true;
          if (audioContainerRef.current) audioContainerRef.current.appendChild(el);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const localId = room.localParticipant?.identity;
        const agentSpeaking = speakers.some((s) => s.identity !== localId && speakers.length > 0);
        setAgentStatus(agentSpeaking ? "speaking" : "listening");
        if (speakers.length === 0) setAgentStatus("thinking");
      });

      room.on(RoomEvent.DataReceived, (payload) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data.type === "CONVERSATION_COMPLETE") {
            // Cancel the fallback timer
            if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
            if (roomRef.current) roomRef.current.disconnect();
            onComplete(data.answers);
          } else if (data.type === "TRANSCRIPT") {
            setTranscript(data.text || "");
            setQuestionIndex((data.count || 0));
            // Agent answered — reset secondary fallback timer
            if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
          }
        } catch (e) {
          console.error("Data parse error:", e);
        }
      });

      await room.connect(server_url, participant_token);
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (err) {
      console.error("LiveKit connection failed:", err);
      setRoomState("error");
      setIsFallback(true);
    }
  }, [userPrefs, onComplete]);

  useEffect(() => {
    // Primary fallback: if not connected after 12 seconds
    fallbackTimerRef.current = setTimeout(() => {
      if (roomState === "connecting") {
        setIsFallback(true);
        setRoomState("fallback");
      }
    }, 12000);

    connectToRoom();

    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (roomRef.current) roomRef.current.disconnect();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []); // eslint-disable-line

  const name = userPrefs?.name || "Host";
  const showName = userPrefs?.show_name || "The Podcast";

  // ── Fallback UI ──
  if (isFallback) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    return (
      <div
        data-testid="conversation-fallback"
        style={{
          minHeight: "100vh",
          background: "#0A0A0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "640px" }}>
          <div
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: "0.5rem",
              padding: "10px 16px",
              fontSize: "0.78rem",
              color: "#F59E0B",
              marginBottom: "2rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚡</span> Fallback mode — Jordan couldn't connect. Answering questions directly.
          </div>

          {/* Progress */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
            }}
          >
            <span style={{ fontSize: "0.7rem", color: "#6B7280", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Question
            </span>
            <span
              style={{ fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.05em", color: "#F9FAFB" }}
            >
              {fallbackQIndex + 1}
              <span style={{ color: "#4B5563", fontSize: "1.2rem" }}> / 8</span>
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ background: "#1E1E1E", borderRadius: "999px", height: "4px", marginBottom: "2.5rem" }}>
            <div
              style={{
                height: "100%",
                borderRadius: "999px",
                background: "linear-gradient(90deg,#8B5CF6,#EC4899)",
                width: `${((fallbackQIndex) / 8) * 100}%`,
                transition: "width 0.4s ease",
              }}
            />
          </div>

          {/* Question */}
          <div
            className="card fade-in-up"
            style={{ marginBottom: "1.5rem", padding: "1.5rem" }}
          >
            <p style={{ fontSize: "0.7rem", color: "#8B5CF6", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Jordan asks
            </p>
            <p style={{ fontSize: "1.15rem", color: "#F9FAFB", lineHeight: 1.6, fontWeight: 500 }}>
              {FALLBACK_QUESTIONS[fallbackQIndex]}
            </p>
          </div>

          {/* Recording control */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
            {SR && (
              <button
                data-testid="fallback-mic-btn"
                onClick={isRecording ? stopSpeechRecognition : startSpeechRecognition}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "0.5rem",
                  border: `1px solid ${isRecording ? "#10B981" : "#2D2D2D"}`,
                  background: isRecording ? "rgba(16,185,129,0.12)" : "#1E1E1E",
                  color: isRecording ? "#10B981" : "#6B7280",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  transition: "all 0.3s ease",
                }}
              >
                {isRecording ? "⏹ Stop" : "🎙 Record"}
              </button>
            )}
          </div>

          {/* Answer input */}
          <textarea
            data-testid="fallback-answer-input"
            value={fallbackInput}
            onChange={(e) => setFallbackInput(e.target.value)}
            placeholder="Your answer will appear here — or type directly..."
            rows={4}
            style={{
              width: "100%",
              background: "#1E1E1E",
              border: "1px solid #2D2D2D",
              borderRadius: "0.5rem",
              color: "#F9FAFB",
              padding: "1rem",
              fontSize: "0.95rem",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              marginBottom: "1rem",
              boxSizing: "border-box",
            }}
          />
          <button
            data-testid="fallback-next-btn"
            onClick={submitFallbackAnswer}
            disabled={!fallbackInput.trim()}
            className="btn-primary"
            style={{ width: "100%", padding: "0.9rem", fontSize: "0.95rem" }}
          >
            {fallbackQIndex + 1 < 8 ? "Next Question →" : "Generate My Episode →"}
          </button>
        </div>
      </div>
    );
  }

  // ── LiveKit UI ──
  const statusColors = {
    waiting: "#6B7280",
    speaking: "#8B5CF6",
    listening: "#10B981",
    thinking: "#F59E0B",
  };
  const statusLabels = {
    waiting: "Waiting for Jordan...",
    speaking: "Jordan is speaking",
    listening: "Listening to you",
    thinking: "Processing...",
  };

  return (
    <div
      data-testid="conversation-screen"
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        position: "relative",
      }}
    >
      {/* Hidden audio container */}
      <div ref={audioContainerRef} style={{ display: "none" }} />

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: "2rem",
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "0.7rem",
              color: "#6B7280",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            {showName}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            className="pulse-dot"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: statusColors[agentStatus],
            }}
          />
          <span style={{ fontSize: "0.8rem", color: statusColors[agentStatus] }}>
            {statusLabels[agentStatus]}
          </span>
        </div>
        <div
          data-testid="question-progress"
          style={{
            fontSize: "0.7rem",
            color: "#6B7280",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Q <span style={{ color: "#F9FAFB", fontWeight: 700, fontSize: "1.1rem" }}>{Math.min(questionIndex + 1, 8)}</span> / 8
        </div>
      </div>

      {/* Main content */}
      <div style={{ width: "100%", maxWidth: "680px", textAlign: "center" }}>
        {/* Jordan avatar */}
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
              margin: "0 auto 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              boxShadow: agentStatus === "speaking" ? "0 0 30px rgba(139,92,246,0.5)" : "none",
              transition: "box-shadow 0.3s ease",
            }}
          >
            J
          </div>
          <p
            style={{
              fontSize: "0.9rem",
              fontWeight: 700,
              color: "#F9FAFB",
              letterSpacing: "0.05em",
            }}
          >
            Jordan
          </p>
          <p style={{ fontSize: "0.75rem", color: "#6B7280" }}>AI Podcast Producer</p>
        </div>

        {/* Waveform */}
        <div style={{ marginBottom: "2.5rem" }}>
          <Waveform isActive={agentStatus === "speaking" || agentStatus === "listening"} bars={22} />
        </div>

        {/* Progress bar */}
        <div style={{ background: "#1E1E1E", borderRadius: "999px", height: "3px", marginBottom: "2rem" }}>
          <div
            style={{
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg,#8B5CF6,#EC4899)",
              width: `${(questionIndex / 8) * 100}%`,
              transition: "width 0.5s ease",
            }}
          />
        </div>

        {/* Transcript */}
        {transcript && (
          <div
            data-testid="transcript-display"
            className="card fade-in-up"
            style={{
              textAlign: "left",
              padding: "1.25rem 1.5rem",
              minHeight: "60px",
              marginBottom: "1rem",
            }}
          >
            <p style={{ fontSize: "0.7rem", color: "#8B5CF6", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Your last answer
            </p>
            <p style={{ color: "#F9FAFB", fontSize: "0.95rem", lineHeight: 1.6 }}>{transcript}</p>
          </div>
        )}

        {/* Connection status */}
        {roomState === "connecting" && (
          <div style={{ color: "#6B7280", fontSize: "0.85rem", marginTop: "1rem" }}>
            <div
              style={{
                width: 24,
                height: 24,
                border: "2px solid #2D2D2D",
                borderTopColor: "#8B5CF6",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 0.75rem",
              }}
            />
            Connecting to the studio...
          </div>
        )}

        {roomState === "connected" && agentStatus === "waiting" && (
          <p style={{ color: "#6B7280", fontSize: "0.85rem", marginTop: "1rem" }}>
            Jordan is joining the room — microphone is live...
          </p>
        )}

        {/* Fallback switch */}
        <button
          data-testid="switch-to-fallback-btn"
          onClick={() => {
            if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
            setIsFallback(true);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#4B5563",
            fontSize: "0.75rem",
            cursor: "pointer",
            marginTop: "2rem",
            fontFamily: "inherit",
            textDecoration: "underline",
          }}
        >
          Having trouble? Switch to text mode
        </button>
      </div>
    </div>
  );
}
