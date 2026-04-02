import React, { useEffect, useRef } from "react";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1648237409808-aa4649c07ec8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwcG9kY2FzdCUyMG1pY3JvcGhvbmUlMjBuZW9ufGVufDB8fHx8MTc3NTE1MTUyOXww&ixlib=rb-4.1.0&q=85";

export default function HeroScreen({ onStart }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.style.opacity = "0";
      requestAnimationFrame(() => {
        el.style.transition = "opacity 0.8s ease";
        el.style.opacity = "1";
      });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="hero-screen"
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url('${HERO_IMAGE}')`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
          opacity: 0.18,
        }}
      />
      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, #0A0A0A 0%, rgba(10,10,10,0.65) 40%, rgba(10,10,10,0.85) 70%, #0A0A0A 100%)",
        }}
      />
      {/* Purple glow orb */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "300px",
          background: "radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          maxWidth: "860px",
          padding: "0 2rem",
        }}
      >
        {/* Badge */}
        <div
          data-testid="hero-badge"
          className="fade-in-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: "999px",
            padding: "6px 16px",
            marginBottom: "2rem",
            animationDelay: "0.1s",
            opacity: 0,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10B981",
            }}
            className="pulse-dot"
          />
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#8B5CF6",
            }}
          >
            AI Podcast Studio — Powered by Jordan
          </span>
        </div>

        {/* H1 */}
        <h1
          className="fade-in-up"
          style={{
            fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.0,
            color: "#F9FAFB",
            marginBottom: "1.5rem",
            animationDelay: "0.2s",
            opacity: 0,
          }}
        >
          Turn 8 Questions
          <br />
          Into a{" "}
          <span className="gradient-text">Publish-Ready</span>
          <br />
          Episode
        </h1>

        {/* Subtitle */}
        <p
          className="fade-in-up"
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
            color: "#6B7280",
            maxWidth: "560px",
            margin: "0 auto 3rem",
            lineHeight: 1.65,
            animationDelay: "0.35s",
            opacity: 0,
          }}
        >
          Have a live voice conversation with Jordan, your AI producer. Walk away with a title, full script,
          show notes, tags, tweet copy, and more.
        </p>

        {/* CTA */}
        <div
          className="fade-in-up"
          style={{ animationDelay: "0.5s", opacity: 0 }}
        >
          <button
            data-testid="start-episode-button"
            onClick={onStart}
            className="btn-primary"
            style={{
              padding: "1.1rem 3rem",
              fontSize: "1.1rem",
              letterSpacing: "0.02em",
            }}
          >
            Start My Episode
          </button>
        </div>

        {/* Stats row */}
        <div
          className="fade-in-up"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "3rem",
            marginTop: "4rem",
            animationDelay: "0.65s",
            opacity: 0,
          }}
        >
          {[
            { value: "8", label: "Live Questions" },
            { value: "9", label: "Content Sections" },
            { value: "~5 min", label: "Start to Script" },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  color: "#F9FAFB",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6B7280",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
