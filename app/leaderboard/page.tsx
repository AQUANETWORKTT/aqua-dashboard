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

  return <img src={src} alt={username} className="avatar" />;
}

export default function LeaderboardPage() {
  const sorted = [...creators].sort((a, b) => b.lifetime - a.lifetime);

  return (
    <main className="page">
      <section className="hero">
        <div className="kicker">AQUA CREATOR NETWORK</div>
        <h1 className="title">CREATOR LEADERBOARD</h1>
        <p className="subtitle">
          Monthly performance rankings across the Aqua creator roster.
        </p>
      </section>

      <section className="list">
        {sorted.map((creator, index) => {
          const rank = index + 1;

          return (
            <div key={creator.username} className="row">
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

                <CreatorAvatar username={creator.username} />

                <div className="info">
                  <div className="username">{creator.username}</div>

                  <div className="badgeWrap">
                    {creator.username === "alfie.harnett" && (
                      <span className="badge yellow">
                        Aqua Ascension Winner
                      </span>
                    )}

                    {creator.username === "dylanjinks" && (
                      <span className="badge blue">
                        2x Box Battle Winner
                      </span>
                    )}

                    {creator.username === "mavismim" && (
                      <span className="badge purple">
                        February Finale Winner
                      </span>
                    )}

                    {creator.username === "browniefamboi" && (
                      <>
                        <span className="badge cyan">
                          Deep Dive Winner
                        </span>

                        <span className="badge green">
                          Aqua Trials Winner
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="metrics">
                <div className="metricBox">
                  <div className="metricValue">
                    {creator.lifetime.toLocaleString()}
                  </div>
                  <div className="metricLabel">Monthly</div>
                </div>

                <div className="metricBox">
                  <div className="metricValue small">
                    {creator.daily.toLocaleString()}
                  </div>
                  <div className="metricLabel">Yesterday</div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

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

        .subtitle {
          margin-top: 12px;
          color: rgba(255, 255, 255, 0.65);
          font-size: 14px;
        }

        .list {
          display: grid;
          gap: 12px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: center;
          padding: 14px;
          border-radius: 22px;
          background: rgba(8, 18, 35, 0.95);
          border: 1px solid rgba(45, 224, 255, 0.18);
        }

        .mainInfo {
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
        }

        .silver {
          color: #dbeafe;
        }

        .bronze {
          color: #fb923c;
        }

        .avatar {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          object-fit: cover;
          flex-shrink: 0;
          border: 1px solid rgba(45, 224, 255, 0.3);
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
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          line-height: 1.15;
        }

        .yellow {
          color: #ffd76a;
          background: rgba(255, 215, 106, 0.08);
        }

        .blue {
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.08);
        }

        .purple {
          color: #c084fc;
          background: rgba(192, 132, 252, 0.08);
        }

        .cyan {
          color: #7cf6ff;
          background: rgba(124, 246, 255, 0.08);
        }

        .green {
          color: #4ade80;
          background: rgba(74, 222, 128, 0.08);
        }

        .metrics {
          display: flex;
          gap: 10px;
        }

        .metricBox {
          min-width: 110px;
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

          .avatar {
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
            grid-template-columns: 1fr 1fr;
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