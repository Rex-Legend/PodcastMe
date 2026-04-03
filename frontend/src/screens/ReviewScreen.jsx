import React, { useState, useRef, useEffect, useCallback } from "react";

export default function ReviewScreen({ conversationData, onConfirm, onBack }) {
  const [localAnswers, setLocalAnswers] = useState(
    () => (conversationData || []).map((item) => ({ ...item }))
  );
  const textareaRefs = useRef([]);

  // Auto-resize all textareas on initial render
  useEffect(() => {
    textareaRefs.current.forEach((ta) => {
      if (ta) {
        ta.style.height = "auto";
        ta.style.height = ta.scrollHeight + "px";
      }
    });
  }, []);

  const handleAnswerChange = useCallback((idx, e) => {
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
    setLocalAnswers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], answer: e.target.value };
      return next;
    });
  }, []);

  return (
    <div
      data-testid="review-screen"
      style={{ minHeight: "100vh", background: "#0A0A0A", paddingBottom: "5rem" }}
    >
      {/* Sticky Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #181818",
          padding: "1rem 1.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          data-testid="review-back-btn"
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "transparent",
            border: "1px solid #2D2D2D",
            borderRadius: "0.5rem",
            color: "#6B7280",
            fontSize: "0.82rem",
            fontWeight: 600,
            padding: "7px 14px",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.2s ease",
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
          ← Back
        </button>

        <span
          style={{
            fontSize: "0.68rem",
            color: "#6B7280",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Review Answers
        </span>

        <button
          data-testid="confirm-generate-btn"
          onClick={() => onConfirm(localAnswers)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 18px",
            borderRadius: "0.5rem",
            background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
            border: "none",
            color: "white",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          Generate Episode →
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", height: "2px", background: "#151515" }}>
        <div
          style={{
            height: "100%",
            background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
            width: "100%",
            boxShadow: "0 0 10px rgba(139,92,246,0.6)",
          }}
        />
      </div>

      {/* Content */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
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
            Step 3 of 4
          </span>
          <h2
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "#F9FAFB",
              marginTop: "0.4rem",
              lineHeight: 1.1,
            }}
          >
            Review Your Answers
          </h2>
          <p style={{ color: "#6B7280", fontSize: "0.92rem", marginTop: "0.6rem", lineHeight: 1.6 }}>
            Edit anything before Jordan builds your episode. These answers shape every word of your script.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {localAnswers.map((item, idx) => (
            <div
              key={idx}
              data-testid={`review-item-${idx}`}
              className="card"
              style={{ padding: "1.5rem" }}
            >
              <p
                style={{
                  fontSize: "0.6rem",
                  color: "#8B5CF6",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                Q{idx + 1} of {localAnswers.length}
              </p>
              <p
                style={{
                  color: "#D1D5DB",
                  fontSize: "0.88rem",
                  fontWeight: 500,
                  marginBottom: "1rem",
                  lineHeight: 1.55,
                }}
              >
                {item.question}
              </p>
              <textarea
                ref={(el) => { textareaRefs.current[idx] = el; }}
                value={item.answer}
                onChange={(e) => handleAnswerChange(idx, e)}
                data-testid={`review-answer-${idx}`}
                style={{
                  width: "100%",
                  background: "#1E1E1E",
                  border: "1px solid #2D2D2D",
                  borderRadius: "0.5rem",
                  color: "#F9FAFB",
                  padding: "0.875rem 1rem",
                  fontSize: "0.92rem",
                  fontFamily: "inherit",
                  resize: "none",
                  overflow: "hidden",
                  minHeight: "72px",
                  lineHeight: 1.65,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(139,92,246,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#2D2D2D"; }}
              />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "2rem",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={onBack}
            className="btn-secondary"
            style={{ padding: "0.9rem 1.5rem", fontSize: "0.9rem" }}
          >
            ← Back to Questions
          </button>
          <button
            data-testid="confirm-generate-btn-bottom"
            onClick={() => onConfirm(localAnswers)}
            className="btn-primary"
            style={{ padding: "0.9rem 2.25rem", fontSize: "1rem", fontWeight: 700 }}
          >
            Generate My Episode →
          </button>
        </div>
      </div>
    </div>
  );
}
