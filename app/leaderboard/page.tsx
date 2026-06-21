"use client";

import { useEffect, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type CreatorMonthlyStat = {
  id: string;
  creator_id: string;
  username: string | null;
  diamonds: number | null;
  live_duration_hours: number | null;
  matches: number | null;
  month_key: string;
};

function cleanUsername(username: string | null | undefined) {
  return String(username || "").replace("@", "").trim();
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function currentMonthKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

async function fetchTikTokAvatar(username: string) {
  if (!username) return "";

  try {
    const res = await fetch("/api/tiktok-avatar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    const json = await res.json();
    return json.avatar || "";
  } catch {
    return "";
  }
}

function CreatorAvatar({ username }: { username: string }) {
  const fallbackSrc = "/creators/default.jpg";
  const localSrc = `/creators/${encodeURIComponent(username)}.jpg`;
  const [src, setSrc] = useState(fallbackSrc);

  useEffect(() => {
    let cancelled = false;

    async function loadAvatar() {
      const localImg = new window.Image();
      localImg.src = localSrc;

      localImg.onload = () => {
        if (!cancelled) setSrc(localSrc);
      };

      localImg.onerror = async () => {
        const scrapedAvatar = await fetchTikTokAvatar(username);

        if (!cancelled) {
          setSrc(scrapedAvatar || fallbackSrc);
        }
      };
    }

    loadAvatar();

    return () => {
      cancelled = true;
    };
  }, [username, localSrc]);

  return <img src={src} alt={username} className="avatar" />;
}

export default function LeaderboardPage() {
  const [creators, setCreators] = useState<CreatorMonthlyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCreators() {
      setLoading(true);

      const { data } = await submissionsSupabase
        .from("creator_monthly_stats")
        .select("*")
        .eq("month_key", currentMonthKey())
        .order("diamonds", { ascending: false });

      setCreators((data || []) as CreatorMonthlyStat[]);
      setLoading(false);
    }

    loadCreators();
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <div className="kicker">AQUA CREATOR NETWORK</div>
        <h1 className="title">CREATOR LEADERBOARD</h1>
        <p className="subtitle">
          Monthly performance rankings across the Aqua creator roster.
        </p>
      </section>

      {loading ? (
        <div className="loading">Loading leaderboard...</div>
      ) : (
        <section className="list">
          {creators.map((creator, index) => {
            const rank = index + 1;
            const username = cleanUsername(creator.username);
            const usernameKey = normalizeUsername(username);

            return (
              <div
                key={creator.creator_id}
                className={`row ${
                  rank === 1
                    ? "rankOne"
                    : rank === 2
                    ? "rankTwo"
                    : rank === 3
                    ? "rankThree"
                    : ""
                }`}
              >
                <div className="mainInfo">
                  <div
                    className={`rank ${
                      rank === 1
                        ? "gold"
                        : rank === 2
                        ? "silver"
                        : rank === 3
                        ? "bronze"
                        : ""
                    }`}
                  >
                    #{rank}
                  </div>

                  <CreatorAvatar username={username} />

                  <div className="info">
                    <div className="username">{username}</div>

                    <div className="badgeWrap">
                      {usernameKey === "alfie.harnett" && (
                        <span className="badge yellow animatedBadge">
                          Aqua Ascension Winner
                        </span>
                      )}

                      {usernameKey === "dylanjinks" && (
                        <span className="badge blue animatedBadge">
                          2x Box Battle Winner
                        </span>
                      )}

                      {usernameKey === "mavismim" && (
                        <span className="badge purple animatedBadge">
                          February Finale Winner
                        </span>
                      )}

                      {usernameKey === "xomarky" && (
                        <>
                          <span className="badge cyan animatedBadge">
                            Deep Dive Winner
                          </span>
                          <span className="badge green animatedBadge">
                            Aqua Trials Winner
                          </span>
                          <span className="badge pink animatedBadge">
                            Box Battle Winner
                          </span>
                        </>
                      )}

                      {usernameKey === "lucylou449" && (
                        <>
                          <span className="badge pink animatedBadge">
                            Box Battle Winner
                          </span>
                          <span className="badge roseGold animatedBadge">
                            Affluent April 128 👤 Tournament Winner
                          </span>
                        </>
                      )}

                      {usernameKey === "elliex035" && (
                        <>
                          <span className="badge pink animatedBadge">
                            Beat The Boss Champion
                          </span>
                          <span className="badge blue animatedBadge">
                            World Cup Campaign Winner - Team England
                          </span>
                        </>
                      )}

                      {usernameKey === "libbyamberxoxo" && (
                        <span className="badge blue animatedBadge">
                          World Cup Campaign Winner - Team England
                        </span>
                      )}

                      {usernameKey === "adam_gym234" && (
                        <span className="badge blue animatedBadge">
                          World Cup Campaign Winner - Team England
                        </span>
                      )}

                      {usernameKey === "callum.072" && (
                        <span className="badge cyan animatedBadge">
                          May Aqua Hours Winner
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="metrics">
                  <div className="metricBox">
                    <div className="metricValue">
                      {Number(creator.diamonds || 0).toLocaleString()}
                    </div>
                    <div className="metricLabel">Monthly</div>
                  </div>

                  <div className="metricBox">
                    <div className="metricValue small">
                      {Number(creator.live_duration_hours || 0).toFixed(1)}h
                    </div>
                    <div className="metricLabel">Hours</div>
                  </div>

                  <div className="metricBox">
                    <div className="metricValue small">
                      {Number(creator.matches || 0).toLocaleString()}
                    </div>
                    <div className="metricLabel">Matches</div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 24px 12px 60px;
          background:
            radial-gradient(circle at top, rgba(0, 180, 255, 0.16), transparent 34%),
            linear-gradient(180deg, #020617 0%, #030712 55%, #000 100%);
          color: white;
          font-family: Arial, sans-serif;
        }

        .hero {
          text-align: center;
          margin-bottom: 20px;
        }

        .kicker {
          font-size: 11px;
          color: #2de0ff;
          font-weight: 800;
          letter-spacing: 0.2em;
          margin-bottom: 10px;
        }

        .title {
          margin: 0;
          font-size: clamp(28px, 8vw, 64px);
          line-height: 1;
          font-weight: 900;
          text-shadow: 0 0 18px rgba(45, 224, 255, 0.55);
        }

        .subtitle,
        .loading {
          margin-top: 12px;
          text-align: center;
          color: rgba(255, 255, 255, 0.65);
          font-size: 14px;
        }

        .list {
          display: grid;
          gap: 12px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .row {
          position: relative;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: center;
          padding: 14px;
          border-radius: 22px;
          background: rgba(8, 18, 35, 0.95);
          border: 1px solid rgba(45, 224, 255, 0.18);
          overflow: hidden;
        }

        .rankOne {
          border-color: rgba(255, 215, 106, 0.7);
          animation: goldPulse 2.6s ease-in-out infinite;
        }

        .rankTwo {
          border-color: rgba(219, 234, 254, 0.65);
          animation: silverPulse 2.8s ease-in-out infinite;
        }

        .rankThree {
          border-color: rgba(251, 146, 60, 0.65);
          animation: bronzePulse 3s ease-in-out infinite;
        }

        .rankOne::before,
        .rankTwo::before,
        .rankThree::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 24px;
          pointer-events: none;
          opacity: 0.35;
          background: linear-gradient(
            120deg,
            transparent,
            rgba(124, 246, 255, 0.35),
            transparent
          );
          animation: waterSweep 3.8s linear infinite;
        }

        .mainInfo {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .rank {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 900;
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          flex-shrink: 0;
        }

        .gold {
          color: #ffd76a;
          box-shadow: 0 0 18px rgba(255, 215, 106, 0.35);
        }

        .silver {
          color: #dbeafe;
          box-shadow: 0 0 18px rgba(219, 234, 254, 0.25);
        }

        .bronze {
          color: #fb923c;
          box-shadow: 0 0 18px rgba(251, 146, 60, 0.25);
        }

        :global(.avatar) {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid rgba(45, 224, 255, 0.3);
          background: rgba(255, 255, 255, 0.05);
        }

        .info {
          min-width: 0;
          flex: 1;
        }

        .username {
          font-size: 18px;
          font-weight: 900;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .badgeWrap {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }

        .badge {
          position: relative;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          line-height: 1.15;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .animatedBadge {
          animation: badgePulse 2.4s ease-in-out infinite;
        }

        .animatedBadge::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-110%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.28),
            transparent
          );
          animation: badgeShimmer 3.2s ease-in-out infinite;
        }

        .yellow {
          color: #ffd76a;
          background: rgba(255, 215, 106, 0.08);
          border-color: rgba(255, 215, 106, 0.35);
        }

        .blue {
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.08);
          border-color: rgba(96, 165, 250, 0.35);
        }

        .purple {
          color: #c084fc;
          background: rgba(192, 132, 252, 0.08);
          border-color: rgba(192, 132, 252, 0.35);
        }

        .cyan {
          color: #7cf6ff;
          background: rgba(124, 246, 255, 0.08);
          border-color: rgba(124, 246, 255, 0.35);
        }

        .green {
          color: #4ade80;
          background: rgba(74, 222, 128, 0.08);
          border-color: rgba(74, 222, 128, 0.35);
        }

        .pink {
          color: #fff;
          background: rgba(255, 47, 168, 0.18);
          border-color: rgba(255, 47, 168, 0.45);
          box-shadow: 0 0 14px rgba(255, 47, 168, 0.25);
        }

        .roseGold {
          color: #ffd1ea;
          background: rgba(255, 134, 196, 0.12);
          border-color: rgba(255, 134, 196, 0.35);
          box-shadow: 0 0 14px rgba(255, 134, 196, 0.18);
        }

        .metrics {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 10px;
        }

        .metricBox {
          min-width: 105px;
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.04);
          text-align: right;
        }

        .metricValue {
          font-size: 18px;
          font-weight: 900;
        }

        .metricValue.small {
          color: #7cf6ff;
          font-size: 16px;
        }

        .metricLabel {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
        }

        @keyframes badgePulse {
          0%,
          100% {
            filter: brightness(1);
            box-shadow: 0 0 10px currentColor;
          }
          50% {
            filter: brightness(1.22);
            box-shadow: 0 0 18px currentColor;
          }
        }

        @keyframes badgeShimmer {
          0% {
            transform: translateX(-110%);
          }
          45% {
            transform: translateX(120%);
          }
          100% {
            transform: translateX(120%);
          }
        }

        @keyframes waterSweep {
          0% {
            transform: translateX(-80%);
          }
          100% {
            transform: translateX(80%);
          }
        }

        @keyframes goldPulse {
          0%,
          100% {
            box-shadow: 0 0 16px rgba(255, 215, 106, 0.22);
          }
          50% {
            box-shadow: 0 0 30px rgba(255, 215, 106, 0.45);
          }
        }

        @keyframes silverPulse {
          0%,
          100% {
            box-shadow: 0 0 16px rgba(219, 234, 254, 0.18);
          }
          50% {
            box-shadow: 0 0 28px rgba(219, 234, 254, 0.36);
          }
        }

        @keyframes bronzePulse {
          0%,
          100% {
            box-shadow: 0 0 16px rgba(251, 146, 60, 0.18);
          }
          50% {
            box-shadow: 0 0 28px rgba(251, 146, 60, 0.36);
          }
        }

        @media (max-width: 700px) {
          .row {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .mainInfo {
            display: grid;
            grid-template-columns: 42px 50px 1fr;
            gap: 10px;
            align-items: start;
          }

          .rank {
            width: 42px;
            height: 42px;
            font-size: 12px;
            border-radius: 12px;
          }

          :global(.avatar) {
            width: 50px;
            height: 50px;
            border-radius: 14px;
          }

          .username {
            font-size: 14px;
            white-space: normal;
            line-height: 1.2;
            word-break: break-word;
          }

          .badgeWrap {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
          }

          .badge {
            font-size: 8px;
            max-width: 100%;
          }

          .metrics {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            width: 100%;
          }

          .metricBox {
            min-width: 0;
            width: 100%;
            text-align: left;
            padding: 10px;
          }

          .metricValue {
            font-size: 15px;
          }

          .metricValue.small {
            font-size: 14px;
          }

          .metricLabel {
            font-size: 8px;
          }
        }
      `}</style>
    </main>
  );
}
