"use client";

import { useEffect, useState } from "react";
import { creators } from "@/data/creators";

function CreatorAvatar({ username }: { username: string }) {
  const originalSrc = `/creators/${encodeURIComponent(username)}.jpg`;
  const fallbackSrc = "/creators/default.jpg";
  const [src, setSrc] = useState(fallbackSrc);

  useEffect(() => {
    const img = new window.Image();
    img.src = originalSrc;
    img.onload = () => setSrc(originalSrc);
    img.onerror = () => setSrc(fallbackSrc);
  }, [originalSrc]);

  return <img src={src} alt={`${username} avatar`} style={styles.avatar} />;
}

export default function LeaderboardPage() {
  const sorted = [...creators].sort((a, b) => b.lifetime - a.lifetime);

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.kicker}>AQUA CREATOR NETWORK</div>

        <h1 style={styles.title}>CREATOR LEADERBOARD</h1>

        <p style={styles.subtitle}>
          Monthly performance rankings across the Aqua creator roster.
        </p>
      </section>

      <section style={styles.list}>
        {sorted.map((creator, index) => {
          const rank = index + 1;
          const topThree = rank <= 3;

          return (
            <div
              key={creator.username}
              style={{
                ...styles.row,
                ...(topThree ? styles.topRow : {}),
              }}
            >
              <div style={styles.left}>
                <div
                  style={{
                    ...styles.rank,
                    ...(rank === 1
                      ? styles.rankOne
                      : rank === 2
                      ? styles.rankTwo
                      : rank === 3
                      ? styles.rankThree
                      : {}),
                  }}
                >
                  #{rank}
                </div>

                <CreatorAvatar username={creator.username} />

                <div style={styles.info}>
                  <div style={styles.username}>{creator.username}</div>

                  <div style={styles.badgeWrap}>
                    {creator.username === "alfie.harnett" && (
                      <span style={styles.campaignBadge}>
                        Aqua Ascension Campaign Winner
                      </span>
                    )}

                    {creator.username === "dylanjinks" && (
                      <span style={styles.blueBadge}>2x Box Battle Winner</span>
                    )}

                    {creator.username === "mavismim" && (
                      <span style={styles.purpleBadge}>
                        February Finale H2H Winner
                      </span>
                    )}

                    {creator.username === "browniefamboi" && (
                      <>
                        <span style={styles.cyanBadge}>
                          The Deep Dive Campaign Winner
                        </span>

                        <span style={styles.greenBadge}>
                          Aqua Trials Tournament Winner
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.right}>
                <div style={styles.metricBox}>
                  <div style={styles.metricValue}>
                    {creator.lifetime.toLocaleString()}
                  </div>
                  <div style={styles.metricLabel}>Monthly</div>
                </div>

                <div style={styles.metricBox}>
                  <div style={styles.metricValueSmall}>
                    {creator.daily.toLocaleString()}
                  </div>
                  <div style={styles.metricLabel}>Yesterday</div>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "34px 14px 80px",
    background:
      "radial-gradient(circle at top, rgba(0,180,255,0.16), transparent 34%), linear-gradient(180deg, #020617 0%, #030712 55%, #000 100%)",
    color: "#fff",
    fontFamily: "'Orbitron', 'Rajdhani', system-ui, sans-serif",
  },

  hero: {
    maxWidth: 1100,
    margin: "0 auto 26px",
    textAlign: "center",
    padding: "30px 12px 20px",
  },

  kicker: {
    color: "#2de0ff",
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: "0.42em",
    textTransform: "uppercase",
    textShadow: "0 0 12px rgba(45,224,255,0.65)",
    marginBottom: 14,
  },

  title: {
    margin: 0,
    fontSize: "clamp(34px, 7vw, 76px)",
    fontWeight: 900,
    lineHeight: 0.95,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#fff",
    textShadow:
      "0 0 8px rgba(45,224,255,0.9), 0 0 28px rgba(45,224,255,0.55)",
  },

  subtitle: {
    margin: "18px auto 0",
    maxWidth: 620,
    color: "rgba(255,255,255,0.62)",
    fontSize: 15,
    lineHeight: 1.6,
  },

  list: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "grid",
    gap: 12,
  },

  row: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 16,
    alignItems: "center",
    padding: 16,
    borderRadius: 24,
    background:
      "linear-gradient(180deg, rgba(7,17,31,0.92), rgba(3,7,18,0.96))",
    border: "1px solid rgba(45,224,255,0.18)",
    boxShadow:
      "inset 0 0 24px rgba(45,224,255,0.035), 0 0 24px rgba(0,180,255,0.08)",
  },

  topRow: {
    border: "1px solid rgba(45,224,255,0.34)",
    boxShadow:
      "inset 0 0 26px rgba(45,224,255,0.06), 0 0 32px rgba(0,180,255,0.16)",
  },

  left: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minWidth: 0,
  },

  rank: {
    width: 58,
    height: 58,
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: 16,
    fontWeight: 900,
    color: "#9ca3af",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  rankOne: {
    color: "#FFD76A",
    border: "1px solid rgba(255,215,106,0.45)",
    background: "rgba(255,215,106,0.08)",
    boxShadow: "0 0 20px rgba(255,215,106,0.18)",
  },

  rankTwo: {
    color: "#dbeafe",
    border: "1px solid rgba(219,234,254,0.35)",
    background: "rgba(219,234,254,0.06)",
  },

  rankThree: {
    color: "#fb923c",
    border: "1px solid rgba(251,146,60,0.38)",
    background: "rgba(251,146,60,0.08)",
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    objectFit: "cover",
    flexShrink: 0,
    border: "1px solid rgba(45,224,255,0.38)",
    boxShadow: "0 0 18px rgba(45,224,255,0.16)",
  },

  info: {
    minWidth: 0,
  },

  username: {
    fontSize: 20,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textShadow: "0 0 10px rgba(45,224,255,0.45)",
  },

  badgeWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 7,
  },

  campaignBadge: {
    padding: "5px 8px",
    borderRadius: 999,
    color: "#FFD76A",
    background: "rgba(255,215,106,0.08)",
    border: "1px solid rgba(255,215,106,0.32)",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  blueBadge: {
    padding: "5px 8px",
    borderRadius: 999,
    color: "#60a5fa",
    background: "rgba(96,165,250,0.08)",
    border: "1px solid rgba(96,165,250,0.32)",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  purpleBadge: {
    padding: "5px 8px",
    borderRadius: 999,
    color: "#c084fc",
    background: "rgba(192,132,252,0.08)",
    border: "1px solid rgba(192,132,252,0.32)",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  cyanBadge: {
    padding: "5px 8px",
    borderRadius: 999,
    color: "#7cf6ff",
    background: "rgba(124,246,255,0.08)",
    border: "1px solid rgba(124,246,255,0.32)",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  greenBadge: {
    padding: "5px 8px",
    borderRadius: 999,
    color: "#4ade80",
    background: "rgba(74,222,128,0.08)",
    border: "1px solid rgba(74,222,128,0.32)",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  metricBox: {
    minWidth: 122,
    padding: "12px 14px",
    borderRadius: 18,
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.09)",
    textAlign: "right",
  },

  metricValue: {
    fontSize: 20,
    fontWeight: 900,
    color: "#fff",
  },

  metricValueSmall: {
    fontSize: 17,
    fontWeight: 900,
    color: "#7cf6ff",
  },

  metricLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: 900,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  },
};