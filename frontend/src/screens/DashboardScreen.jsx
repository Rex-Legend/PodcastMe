import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  defs,
  linearGradient,
} from "recharts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DashboardScreen({ userId, onBack, onLoadEpisode }) {
  const [episodes, setEpisodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API}/episode-history`, {
          params: { user_id: userId || "", limit: 30 },
        });
        setEpisodes(Array.isArray(response.data) ? response.data : []);
      } catch (e) {
        console.error("Failed to fetch episode history:", e);
        // Fallback: try old episodes endpoint
        try {
          const res2 = await axios.get(`${API}/episodes?limit=30`);
          setEpisodes(Array.isArray(res2.data) ? res2.data : []);
        } catch (_) {}
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  const totalEpisodes = episodes.length;
  const avgControversy =
    episodes.length > 0
      ? (
          episodes.reduce(
            (sum, ep) =>
              sum + (ep.controversy_level || ep.user_prefs?.controversy_level || 5),
            0
          ) / episodes.length
        ).toFixed(1)
      : "—";

  const archetypeCounts = episodes.reduce((acc, ep) => {
    const a = ep.archetype || ep.user_prefs?.archetype || "Unknown";
    acc[a] = (acc[a] || 0) + 1;
    return acc;
  }, {});
  const topArchetype =
    Object.entries(archetypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const topicCounts = episodes.reduce((acc, ep) => {
    const t = ep.topic || ep.user_prefs?.topic || "";
    if (t) acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const topTopic =
    Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const controversyData = Array.from({ length: 10 }, (_, i) => ({
    level: `${i + 1}`,
    count: episodes.filter(
      (ep) =>
        Math.round(ep.controversy_level || ep.user_prefs?.controversy_level || 5) === i + 1
    ).length,
  }));

  const stats = [
    { label: "Total Episodes", value: totalEpisodes || "0", color: "#8B5CF6" },
    { label: "Avg Controversy", value: `${avgControversy}/10`, color: "#EC4899" },
    { label: "Top Archetype", value: topArchetype, color: "#10B981" },
    { label: "Fav Topic", value: topTopic.length > 18 ? topTopic.slice(0, 18) + "…" : topTopic, color: "#F59E0B" },
  ];

  return (
    <div
      data-testid="dashboard-screen"
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
          data-testid="dashboard-back-btn"
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
            e.currentTarget.style.color = "#F9FAFB";
            e.currentTarget.style.borderColor = "#4B5563";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#6B7280";
            e.currentTarget.style.borderColor = "#2D2D2D";
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
          Podcast Health Dashboard
        </span>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* Title */}
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
            Analytics
          </span>
          <h2
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#F9FAFB",
              marginTop: "0.4rem",
              lineHeight: 1.1,
            }}
          >
            Your Podcast Health
          </h2>
          <p style={{ color: "#6B7280", marginTop: "0.5rem", fontSize: "0.92rem" }}>
            {totalEpisodes > 0
              ? `${totalEpisodes} episode${totalEpisodes !== 1 ? "s" : ""} generated`
              : "No episodes yet — create your first!"}
          </p>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", color: "#6B7280", padding: "5rem 0" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "3px solid #1E1E1E",
                borderTopColor: "#8B5CF6",
                animation: "spin 1s linear infinite",
                margin: "0 auto 1.25rem",
              }}
            />
            Loading your stats...
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
                marginBottom: "2.5rem",
              }}
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="card"
                  style={{ padding: "1.5rem" }}
                >
                  <p
                    style={{
                      fontSize: "0.6rem",
                      color: "#6B7280",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      marginBottom: "0.75rem",
                    }}
                  >
                    {stat.label}
                  </p>
                  <p
                    style={{
                      fontSize: "1.6rem",
                      fontWeight: 900,
                      color: stat.color,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Controversy Chart */}
            {episodes.length > 0 && (
              <div
                className="card"
                style={{ padding: "1.75rem", marginBottom: "2.5rem" }}
              >
                <p
                  style={{
                    fontSize: "0.62rem",
                    color: "#6B7280",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    marginBottom: "1.5rem",
                  }}
                >
                  Controversy Level Distribution
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={controversyData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                    <XAxis
                      dataKey="level"
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "Controversy Level (1–10)",
                        position: "insideBottom",
                        offset: -10,
                        fill: "#4B5563",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#141414",
                        border: "1px solid #2D2D2D",
                        borderRadius: "0.5rem",
                        color: "#F9FAFB",
                        fontSize: "0.78rem",
                      }}
                      formatter={(v) => [`${v} episode${v !== 1 ? "s" : ""}`, "Count"]}
                    />
                    <Bar dataKey="count" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Episode History List */}
            <div>
              <p
                style={{
                  fontSize: "0.62rem",
                  color: "#6B7280",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  marginBottom: "1.25rem",
                }}
              >
                Episode History
              </p>
              {episodes.length === 0 ? (
                <div
                  className="card"
                  style={{ padding: "3rem", textAlign: "center" }}
                >
                  <p style={{ color: "#6B7280", fontSize: "0.95rem" }}>
                    No episodes yet. Generate your first episode to see stats here.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {episodes.map((ep, idx) => {
                    const title = ep.title || ep.episode?.title || "Untitled Episode";
                    const topic = ep.topic || ep.user_prefs?.topic || "General";
                    const archetype = ep.archetype || ep.user_prefs?.archetype || "—";
                    const controversy =
                      ep.controversy_level || ep.user_prefs?.controversy_level || 5;
                    const date = ep.created_at
                      ? new Date(ep.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "";
                    return (
                      <div
                        key={ep.id || idx}
                        data-testid={`dashboard-episode-${idx}`}
                        className="card"
                        style={{
                          padding: "1.25rem 1.5rem",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onClick={() => onLoadEpisode && onLoadEpisode(ep)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)";
                          e.currentTarget.style.background = "#1A1A1A";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#2D2D2D";
                          e.currentTarget.style.background = "#141414";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "1rem",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                color: "#F9FAFB",
                                fontWeight: 700,
                                fontSize: "0.92rem",
                                marginBottom: "0.25rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {title}
                            </p>
                            <p style={{ color: "#6B7280", fontSize: "0.76rem" }}>
                              {topic} · {archetype}
                            </p>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: "999px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                background: "rgba(139,92,246,0.12)",
                                border: "1px solid rgba(139,92,246,0.25)",
                                color: "#8B5CF6",
                              }}
                            >
                              ⚡ {controversy}/10
                            </span>
                            <p style={{ color: "#4B5563", fontSize: "0.68rem", marginTop: "4px" }}>
                              {date}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
