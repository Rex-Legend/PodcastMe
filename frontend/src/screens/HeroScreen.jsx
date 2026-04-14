import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1648237409808-aa4649c07ec8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwcG9kY2FzdCUyMG1pY3JvcGhvbmUlMjBuZW9ufGVufDB8fHx8MTc3NTE1MTUyOXww&ixlib=rb-4.1.0&q=85";

const PARTICLES = [
  { x: "12%",  y: "22%", size: 4, color: "#8B5CF6", duration: "7s",  delay: "0s" },
  { x: "82%",  y: "18%", size: 3, color: "#EC4899", duration: "9s",  delay: "1.2s" },
  { x: "28%",  y: "72%", size: 5, color: "#8B5CF6", duration: "6s",  delay: "2.5s" },
  { x: "72%",  y: "68%", size: 3, color: "#EC4899", duration: "8s",  delay: "0.8s" },
  { x: "48%",  y: "12%", size: 4, color: "#8B5CF6", duration: "10s", delay: "3.2s" },
  { x: "88%",  y: "78%", size: 3, color: "#EC4899", duration: "7s",  delay: "1.8s" },
  { x: "8%",   y: "58%", size: 5, color: "#8B5CF6", duration: "8s",  delay: "4.1s" },
  { x: "62%",  y: "88%", size: 3, color: "#EC4899", duration: "6s",  delay: "2.9s" },
  { x: "38%",  y: "42%", size: 4, color: "#8B5CF6", duration: "9s",  delay: "1.5s" },
  { x: "77%",  y: "35%", size: 3, color: "#EC4899", duration: "7s",  delay: "3.7s" },
];

export default function HeroScreen({ onStart, onLoadEpisode, onDashboard }) {
  const containerRef = useRef(null);
  const [recentEpisodes, setRecentEpisodes] = useState([]);

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

  // Fetch recent episodes silently on mount (Fix 10)
  useEffect(() => {
    axios
      .get(`${API}/episodes?limit=5`)
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setRecentEpisodes(res.data);
        }
      })
      .catch(() => {});
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
          opacity: 0.15,
        }}
      />

      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, #0A0A0A 0%, rgba(10,10,10,0.55) 40%, rgba(10,10,10,0.85) 70%, #0A0A0A 100%)",
        }}
      />

      {/* Purple glow orb — pulsing via CSS class */}
      <div
        className="hero-orb"
        style={{
          position: "absolute",
          top: "18%",
          left: "50%",
          marginLeft: "-300px",
          width: "600px",
          height: "300px",
          background:
            "radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Floating particles */}
      <div
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}
      >
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              background: p.color,
              boxShadow: `0 0 ${p.size * 2.5}px ${p.color}`,
              animationDuration: p.duration,
              animationDelay: p.delay,
              opacity: 0.45,
            }}
          />
        ))}
      </div>

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
            background: "rgba(139,92,246,0.1)",
            border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: "999px",
            padding: "6px 16px",
            marginBottom: "2rem",
            animationDelay: "0.1s",
            opacity: 0,
          }}
        >
          <div
            style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981" }}
            className="pulse-dot"
          />
          <span
            style={{
              fontSize: "0.72rem",
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
            fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
            color: "#6B7280",
            maxWidth: "540px",
            margin: "0 auto 3rem",
            lineHeight: 1.7,
            animationDelay: "0.35s",
            opacity: 0,
          }}
        >
          Have a live voice conversation with Jordan, your AI producer. Walk away with a title,
          full script, show notes, tags, tweet copy, and more.
        </p>

        {/* CTA */}
        <div className="fade-in-up" style={{ animationDelay: "0.5s", opacity: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <button
            data-testid="start-episode-button"
            onClick={onStart}
            className="btn-primary"
            style={{ padding: "1.1rem 3rem", fontSize: "1.1rem", letterSpacing: "0.02em" }}
          >
            Start My Episode
          </button>
          {onDashboard && (
            <button
              data-testid="hero-dashboard-btn"
              onClick={onDashboard}
              style={{ background: "transparent", border: "none", color: "#6B7280", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em", textDecoration: "underline", textDecorationColor: "rgba(107,114,128,0.4)" }}
            >
              View Podcast Dashboard →
            </button>
          )}
        </div>

        {/* Stats */}
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
            { value: "~2 min", label: "Start to Script" },
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
                  fontSize: "0.72rem",
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

      {/* Recent Episodes (Fix 10) — only shown if episodes exist */}
      {recentEpisodes.length > 0 && (
        <div
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: "680px",
            padding: "0 2rem 4rem",
          }}
        >
          <p
            style={{
              fontSize: "0.62rem",
              color: "#4B5563",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: "0.875rem",
              textAlign: "center",
            }}
          >
            Recent Episodes
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recentEpisodes.map((ep) => (
              <button
                key={ep.id}
                data-testid={`recent-episode-${ep.id}`}
                onClick={() => onLoadEpisode && onLoadEpisode(ep)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  padding: "0.875rem 1.25rem",
                  background: "rgba(20,20,20,0.85)",
                  border: "1px solid #1E1E1E",
                  borderRadius: "0.625rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s ease, background 0.2s ease",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)";
                  e.currentTarget.style.background = "rgba(30,20,50,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1E1E1E";
                  e.currentTarget.style.background = "rgba(20,20,20,0.85)";
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      color: "#F9FAFB",
                      fontSize: "0.88rem",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ep.episode?.title || "Untitled Episode"}
                  </p>
                  <p style={{ color: "#4B5563", fontSize: "0.7rem", marginTop: "2px" }}>
                    {ep.user_prefs?.show_name || "Podcast"} &middot;{" "}
                    {new Date(ep.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span style={{ color: "#4B5563", fontSize: "0.75rem", flexShrink: 0 }}>
                  Load →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
