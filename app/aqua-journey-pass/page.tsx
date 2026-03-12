"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Coins, Crown, Sparkles } from "lucide-react";
import { journeyLevels } from "@/data/journey-levels";

type HistoryEntry = {
  date: string;
  daily: number;
  hours?: number;
  matches?: number;
  lifetime?: number;
  lifetimeHours?: number;
};

type HistoryFile = {
  username: string;
  entries: HistoryEntry[];
};

function getCurrentMonthEntries(entries: HistoryEntry[]) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return entries.filter((entry) => {
    const d = new Date(entry.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function calculateStats(entries: HistoryEntry[]) {
  const monthlyDiamonds = entries.reduce((sum, e) => sum + (e.daily || 0), 0);
  const monthlyHoursRaw = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const validDays = entries.filter((e) => (e.hours || 0) >= 1).length;

  return {
    monthlyDiamonds,
    monthlyHours: round1(monthlyHoursRaw),
    validDays,
  };
}

function getCurrentLevel(stats: {
  monthlyDiamonds: number;
  monthlyHours: number;
  validDays: number;
}) {
  let current = journeyLevels[0];

  for (const level of journeyLevels) {
    const unlocked =
      stats.monthlyDiamonds >= level.diamonds &&
      stats.validDays >= level.validDays &&
      stats.monthlyHours >= level.hours;

    if (unlocked) {
      current = level;
    } else {
      break;
    }
  }

  return current;
}

function formatCash(value: number) {
  if (Number.isInteger(value)) return `£${value}`;
  return `£${value.toFixed(2).replace(/\.00$/, "")}`;
}

function formatDisplayName(value: string) {
  return value.replace(/^@+/, "").trim();
}

export default function AquaJourneyPassPage() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username");

  const [history, setHistory] = useState<HistoryFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setHistory(null);
      setError(null);
      setLoading(false);
      return;
    }

    const safeUsername: string = username;
    let cancelled = false;

    async function loadCreator() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/history/${encodeURIComponent(safeUsername)}.json`,
          {
            cache: "no-store",
          }
        );

        if (!res.ok) {
          throw new Error(`Could not load creator history for "${safeUsername}"`);
        }

        const json: HistoryFile = await res.json();

        if (!cancelled) {
          setHistory(json);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load creator history.";
          setError(message);
          setHistory(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCreator();

    return () => {
      cancelled = true;
    };
  }, [username]);

  const monthEntries = useMemo(() => {
    if (!history) return [];
    return getCurrentMonthEntries(history.entries || []);
  }, [history]);

  const stats = useMemo(() => calculateStats(monthEntries), [monthEntries]);

  const currentLevel = useMemo(() => getCurrentLevel(stats), [stats]);

  const nextLevel = useMemo(() => {
    return journeyLevels.find((l) => l.level === currentLevel.level + 1) || null;
  }, [currentLevel]);

  const incentiveUnlocked = stats.validDays >= 15 && stats.monthlyHours >= 40;

  const currentReward =
    currentLevel.rewardCoins > 0
      ? `${currentLevel.rewardCoins.toLocaleString()} coins or ${formatCash(
          currentLevel.rewardCash
        )}`
      : "First reward at Level 15";

  const nextReward = nextLevel
    ? nextLevel.rewardCoins > 0
      ? `${nextLevel.rewardCoins.toLocaleString()} coins`
      : "First reward at Level 15"
    : "Max level reached";

  const displayName = formatDisplayName(history?.username || username || "Creator");

  if (!username) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#020611",
          color: "#effcff",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 10 }}>Creator Level</h1>
          <p>Add a creator username to the URL.</p>
          <p style={{ opacity: 0.75, marginTop: 8 }}>
            <code>/aqua-journey-pass?username=ellie</code>
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#020611",
          color: "#effcff",
        }}
      >
        Loading creator journey...
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#020611",
          color: "#effcff",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 10 }}>Creator Level</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="journey-cinematic-page">
      <div className="journey-scenic-bg">
        <div className="aurora aurora-1" />
        <div className="aurora aurora-2" />
        <div className="glow glow-1" />
        <div className="glow glow-2" />
        <div className="water-haze" />
        <div className="mountain mountain-1" />
        <div className="mountain mountain-2" />
        <div className="mountain mountain-3" />
        <div className="floor-glow" />
        <div className="stars" />
      </div>

      <section className="journey-wrap">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="journey-nav-shell"
        >
          <div className="journey-top-left">
            <div className="journey-user-chip">
              <span className="journey-user-dot" />
              <span>{displayName}</span>
            </div>
          </div>

          <div className="journey-nav-actions">
            <Link href="/dashboard" className="journey-nav-btn muted">
              Back
            </Link>
          </div>
        </motion.div>

        <div className="journey-stage">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="journey-stage-inner"
          >
            <motion.div
              className="ring ring-a"
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="ring ring-b"
              animate={{ rotate: -360 }}
              transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="ring ring-c"
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            />

            <motion.div
              className="level-core"
              animate={{ y: [0, -8, 0], rotateX: [0, 2, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="level-core-top">
                <Sparkles size={16} />
                <span>Creator Level</span>
              </div>

              <div className="level-number">{currentLevel.level}</div>
              <div className="level-label">CURRENT LEVEL</div>

              <div className="level-metrics">
                <div className="metric-pill">
                  <Coins size={15} />
                  <span>{stats.monthlyDiamonds.toLocaleString()} diamonds</span>
                </div>

                <div className="metric-pill reward-pill">
                  <Crown size={15} />
                  <span>{currentReward}</span>
                </div>
              </div>

              {nextLevel && (
                <div className="next-level-inline">
                  <span className="next-level-kicker">Next level</span>
                  <span className="next-level-value">Level {nextLevel.level}</span>
                  <span className="next-level-reward">{nextReward}</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        {nextLevel && (
          <div className="clean-section">
            <div className="section-title">Level {nextLevel.level} Requirements</div>

            <div className="small-stat-row">
              <span>Diamonds</span>
              <strong>
                {stats.monthlyDiamonds.toLocaleString()} /{" "}
                {nextLevel.diamonds.toLocaleString()}
              </strong>
            </div>

            <div className="small-stat-row">
              <span>Valid Days</span>
              <strong>
                {stats.validDays} / {nextLevel.validDays}
              </strong>
            </div>

            <div className="small-stat-row">
              <span>Hours</span>
              <strong>
                {stats.monthlyHours.toFixed(1)} / {nextLevel.hours.toFixed(1)}
              </strong>
            </div>
          </div>
        )}

        <div className="clean-section smaller">
          <div className="section-title">
            {incentiveUnlocked ? "Incentives Unlocked" : "Incentives Unlock At"}
          </div>

          <div className="small-stat-row">
            <span>Valid Days</span>
            <strong>{stats.validDays} / 15</strong>
          </div>

          <div className="small-stat-row">
            <span>Hours</span>
            <strong>{stats.monthlyHours.toFixed(1)} / 40.0</strong>
          </div>
        </div>
      </section>

      <style jsx>{`
        .journey-cinematic-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          color: #dff7ff;
          background: #020611;
        }

        .journey-scenic-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 12%, rgba(68, 214, 255, 0.18), transparent 18%),
            linear-gradient(180deg, #031120 0%, #04111c 22%, #03101b 48%, #02050c 100%);
        }

        .aurora,
        .glow,
        .water-haze,
        .mountain,
        .floor-glow,
        .stars {
          position: absolute;
          pointer-events: none;
        }

        .aurora {
          filter: blur(50px);
          opacity: 0.9;
          mix-blend-mode: screen;
        }

        .aurora-1 {
          top: 5%;
          left: 8%;
          width: 46vw;
          height: 22vh;
          background: radial-gradient(circle, rgba(45, 224, 255, 0.28), transparent 70%);
          transform: rotate(-8deg);
          animation: driftA 14s ease-in-out infinite;
        }

        .aurora-2 {
          top: 10%;
          right: 6%;
          width: 40vw;
          height: 20vh;
          background: radial-gradient(circle, rgba(123, 244, 255, 0.22), transparent 70%);
          transform: rotate(7deg);
          animation: driftB 18s ease-in-out infinite;
        }

        .glow-1 {
          top: -8%;
          left: -10%;
          width: 34vw;
          height: 34vw;
          border-radius: 50%;
          filter: blur(90px);
          background: rgba(45, 224, 255, 0.12);
          animation: pulseGlow 10s ease-in-out infinite;
        }

        .glow-2 {
          right: -10%;
          top: 8%;
          width: 30vw;
          height: 30vw;
          border-radius: 50%;
          filter: blur(100px);
          background: rgba(81, 160, 255, 0.14);
          animation: pulseGlow 13s ease-in-out infinite;
        }

        .stars {
          inset: 0;
          background-image:
            radial-gradient(circle at 15% 20%, rgba(255,255,255,0.45) 0 1px, transparent 1.5px),
            radial-gradient(circle at 75% 14%, rgba(255,255,255,0.35) 0 1px, transparent 1.5px),
            radial-gradient(circle at 62% 28%, rgba(255,255,255,0.25) 0 1px, transparent 1.5px);
          opacity: 0.8;
        }

        .mountain {
          bottom: 20%;
          background: linear-gradient(180deg, rgba(8, 25, 39, 0.3), rgba(2, 7, 15, 0.95));
          clip-path: polygon(0 100%, 15% 55%, 30% 72%, 46% 28%, 60% 58%, 75% 36%, 100% 100%);
        }

        .mountain-1 {
          left: -10%;
          width: 58%;
          height: 32%;
          opacity: 0.78;
        }

        .mountain-2 {
          right: -6%;
          width: 54%;
          height: 36%;
          opacity: 0.7;
        }

        .mountain-3 {
          left: 18%;
          width: 46%;
          height: 24%;
          bottom: 18%;
          opacity: 0.48;
        }

        .water-haze {
          left: -5%;
          right: -5%;
          bottom: 0;
          height: 34%;
          background:
            linear-gradient(
              180deg,
              rgba(23, 86, 118, 0.02),
              rgba(23, 125, 168, 0.08) 35%,
              rgba(7, 30, 42, 0.8)
            );
          filter: blur(1px);
        }

        .floor-glow {
          left: 50%;
          transform: translateX(-50%);
          bottom: 12%;
          width: 520px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(45, 224, 255, 0.22), transparent 68%);
          filter: blur(18px);
        }

        .journey-wrap {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          padding: 10px 20px 24px;
          display: flex;
          flex-direction: column;
        }

        .journey-nav-shell {
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          gap: 16px;
          padding: 2px 0;
          min-height: 52px;
        }

        .journey-top-left {
          position: absolute;
          left: 24px;
          top: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          text-align: left;
        }

        .journey-user-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          width: fit-content;
          min-height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          color: #a9eeff;
          font-size: 14px;
          font-weight: 700;
        }

        .journey-user-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2de0ff;
          box-shadow: 0 0 12px rgba(124, 246, 255, 0.8);
        }

        .journey-nav-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .journey-nav-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
        }

        .journey-nav-btn.muted {
          color: #b8ecff;
          background: rgba(255, 255, 255, 0.04);
        }

        .journey-stage {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          perspective: 1400px;
          margin-top: 2px;
        }

        .journey-stage-inner {
          position: relative;
          width: min(1180px, 100%);
          min-height: 340px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          transform-style: preserve-3d;
        }

        .ring {
          position: absolute;
          left: 50%;
          top: 50%;
          border-radius: 50%;
          transform-style: preserve-3d;
          border: 1px solid rgba(45, 224, 255, 0.1);
          box-shadow: 0 0 20px rgba(45, 224, 255, 0.05);
        }

        .ring-a {
          width: 510px;
          height: 510px;
          margin-left: -255px;
          margin-top: -255px;
          transform: rotateX(73deg);
        }

        .ring-b {
          width: 640px;
          height: 640px;
          margin-left: -320px;
          margin-top: -320px;
          transform: rotateX(73deg) rotateZ(20deg);
        }

        .ring-c {
          width: 770px;
          height: 770px;
          margin-left: -385px;
          margin-top: -385px;
          transform: rotateX(73deg) rotateZ(-12deg);
          opacity: 0.55;
        }

        .level-core {
          position: relative;
          z-index: 4;
          width: min(620px, 92vw);
          padding: 18px 30px 6px;
          text-align: center;
          transform-style: preserve-3d;
          transform: rotateX(10deg);
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .level-core-top {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(45, 224, 255, 0.08);
          color: #9aefff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          text-align: center;
        }

        .level-number {
          margin-top: 10px;
          font-size: clamp(96px, 18vw, 180px);
          line-height: 0.9;
          font-weight: 900;
          letter-spacing: -0.06em;
          text-align: center;
          background: linear-gradient(180deg, #bff6ff 0%, #69e7ff 40%, #1dcfff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .level-label {
          margin-top: 4px;
          font-size: 12px;
          letter-spacing: 0.3em;
          font-weight: 800;
          color: #7dcde7;
          text-align: center;
        }

        .level-metrics {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .metric-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 0 16px;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 700;
          color: #b9efff;
          background: rgba(45, 224, 255, 0.06);
        }

        .metric-pill :global(svg) {
          color: #2de0ff;
        }

        .reward-pill {
          color: #9ee9ff;
          background: rgba(45, 224, 255, 0.1);
        }

        .reward-pill :global(svg) {
          color: #7bf4ff;
        }

        .next-level-inline {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          color: #7fdfff;
        }

        .next-level-kicker {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          color: #66bfdc;
          font-weight: 800;
        }

        .next-level-value {
          font-size: 20px;
          font-weight: 900;
          color: #bdf5ff;
        }

        .next-level-reward {
          font-size: 13px;
          color: #7dcde7;
        }

        .clean-section {
          max-width: 700px;
          width: 100%;
          margin: 20px auto 0;
          padding-top: 0;
          position: relative;
          z-index: 5;
        }

        .clean-section.smaller {
          margin-top: 18px;
          max-width: 520px;
        }

        .section-title {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: #66bfdc;
          font-weight: 800;
          margin-bottom: 6px;
          text-align: center;
        }

        .small-stat-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 9px 0;
          border-bottom: 1px solid rgba(45, 224, 255, 0.08);
          color: #8adcf2;
          font-size: 14px;
        }

        .small-stat-row strong {
          color: #dff9ff;
          font-weight: 800;
        }

        @keyframes driftA {
          0%, 100% { transform: rotate(-8deg) translateY(0px); }
          50% { transform: rotate(-4deg) translateY(12px); }
        }

        @keyframes driftB {
          0%, 100% { transform: rotate(7deg) translateY(0px); }
          50% { transform: rotate(10deg) translateY(-10px); }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }

        @media (max-width: 980px) {
          .journey-wrap {
            padding: 8px 14px 18px;
          }

          .journey-top-left {
            left: 14px;
          }

          .journey-nav-shell {
            justify-content: flex-end;
            min-height: 58px;
          }

          .journey-stage-inner {
            min-height: 280px;
          }

          .ring-a {
            width: 380px;
            height: 380px;
            margin-left: -190px;
            margin-top: -190px;
          }

          .ring-b {
            width: 500px;
            height: 500px;
            margin-left: -250px;
            margin-top: -250px;
          }

          .ring-c {
            width: 620px;
            height: 620px;
            margin-left: -310px;
            margin-top: -310px;
          }

          .level-core {
            width: min(92vw, 560px);
            padding: 16px 18px 4px;
          }

          .clean-section {
            margin: 20px auto 0;
          }

          .clean-section.smaller {
            margin-top: 14px;
          }

          .floor-glow {
            width: 360px;
          }
        }

        @media (max-width: 560px) {
          .journey-nav-btn {
            min-height: 32px;
            padding: 0 12px;
          }

          .journey-user-chip {
            font-size: 13px;
          }

          .level-label {
            letter-spacing: 0.24em;
            font-size: 11px;
          }

          .level-number {
            font-size: clamp(84px, 22vw, 130px);
          }

          .metric-pill {
            width: 100%;
            justify-content: center;
          }

          .next-level-inline {
            flex-direction: column;
            gap: 2px;
          }

          .small-stat-row {
            font-size: 13px;
          }

          .journey-stage-inner {
            min-height: 235px;
          }

          .clean-section {
            margin: 22px auto 0;
          }

          .clean-section.smaller {
            margin-top: 12px;
          }
        }
      `}</style>
    </main>
  );
}