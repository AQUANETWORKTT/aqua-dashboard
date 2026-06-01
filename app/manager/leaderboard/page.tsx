"use client";

import { useEffect, useMemo, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const POINTS_PER_RECRUIT = 3;

type ManagerRow = {
  name: string;
  recruitPoints: number;
  submissionPoints: number;
  additionalPoints: number;
};

type ManagerPointsDbRow = {
  name: string;
  recruit_points: number | null;
  submission_points: number | null;
  additional_points: number | null;
};

const defaultManagers: ManagerRow[] = [
  { name: "james", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "alfie", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "dylan", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "jay", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "chris", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },

  { name: "ellie", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "ellie1", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },

  { name: "jade", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "teddie", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "millie", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "lewis", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "vitali", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "harry", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "joechloe", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
];

const managerTargets: Record<string, number> = {
  james: 50,
  alfie: 50,
  dylan: 35,
  jay: 40,
  chris: 40,

  ellie: 35,
  ellie1: 35,

  jade: 30,
  teddie: 30,
  millie: 30,
  lewis: 25,
  vitali: 50,
  harry: 35,
  joechloe: 40,
};

function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function roundToNearest5(value: number) {
  return Math.round(value / 5) * 5;
}

function getTarget(name: string) {
  return managerTargets[name] ?? 35;
}

function getBonusPoints(target: number) {
  if (target <= 35) return 50;
  if (target >= 50) return 75;

  const scaled = 50 + ((target - 35) / 15) * 25;
  return Math.max(50, roundToNearest5(scaled));
}

function getDoubleBonusPoints(target: number) {
  if (target <= 30) return 70;
  if (target === 35) return 75;
  if (target >= 50) return 100;

  const scaled = 75 + ((target - 35) / 15) * 25;
  return Math.max(70, roundToNearest5(scaled));
}

function getRecruitScore(row: ManagerRow) {
  return toNumber(row.recruitPoints) * POINTS_PER_RECRUIT;
}

function getCurrentPoints(row: ManagerRow) {
  return (
    getRecruitScore(row) +
    toNumber(row.submissionPoints) +
    toNumber(row.additionalPoints)
  );
}

function getBonusStatus(points: number, target: number) {
  const bonusPoints = getBonusPoints(target);
  const doubleBonusPoints = getDoubleBonusPoints(target);

  if (points >= doubleBonusPoints) return "double";
  if (points >= bonusPoints) return "bonus";
  if (points >= target) return "target";
  return "behind";
}

function getBonusLabel(points: number, target: number) {
  const bonusPoints = getBonusPoints(target);
  const doubleBonusPoints = getDoubleBonusPoints(target);

  if (points >= doubleBonusPoints) return "Double Bonus";
  if (points >= bonusPoints) return "Bonus Unlocked";
  if (points >= target) return "Target Hit";
  return `${Math.max(target - points, 0)} Points To Target`;
}

function getDisplayName(name: string) {
  if (name === "ellie1") return "Ellie B";
  if (name === "joechloe") return "Joe & Chloe";
  return name;
}

function getImageNames(name: string) {
  if (name === "joechloe") return ["joe", "chloe"];

  if (name === "jade") return ["jade-new"];
  if (name === "ellie1") return ["ellieb-new"];
  if (name === "teddie") return ["teddie-new"];

  return [name];
}

function getRankClass(index: number) {
  if (index === 0) return "gold";
  if (index === 1) return "silver";
  if (index === 2) return "bronze";
  return "red";
}

function ManagerImageFade({ name }: { name: string }) {
  const imageNames = getImageNames(name);

  return (
    <div className={`manager-image-wrap ${imageNames.length > 1 ? "dual" : ""}`}>
      {imageNames.map((imageName) => (
        <SingleManagerImage key={imageName} name={imageName} />
      ))}
    </div>
  );
}

function SingleManagerImage({ name }: { name: string }) {
  const jpgSrc = `/creators/${encodeURIComponent(name)}.jpg`;
  const pngSrc = `/creators/${encodeURIComponent(name)}.png`;
  const [src, setSrc] = useState(jpgSrc);

  return (
    <img
      src={src}
      alt={name}
      onError={() => {
        if (src === jpgSrc) setSrc(pngSrc);
        else setSrc("/creators/default.jpg");
      }}
      className="manager-image-real"
    />
  );
}

export default function ManagerLeaderboardPage() {
  const [rows, setRows] = useState<ManagerRow[]>(defaultManagers);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPoints();
  }, []);

  const loadPoints = async () => {
    const { data } = await submissionsSupabase.from("manager_points").select("*");
    const dbRows = (data || []) as ManagerPointsDbRow[];

    const merged = defaultManagers.map((manager) => {
      if (manager.name === "joechloe") {
        const joe = dbRows.find((item) => item.name === "joe");
        const chloe = dbRows.find((item) => item.name === "chloe");

        return {
          name: "joechloe",
          recruitPoints: (joe?.recruit_points ?? 0) + (chloe?.recruit_points ?? 0),
          submissionPoints:
            (joe?.submission_points ?? 0) + (chloe?.submission_points ?? 0),
          additionalPoints:
            (joe?.additional_points ?? 0) + (chloe?.additional_points ?? 0),
        };
      }

      const existing = dbRows.find((item) => item.name === manager.name);

      return {
        name: manager.name,
        recruitPoints: existing?.recruit_points ?? 0,
        submissionPoints: existing?.submission_points ?? 0,
        additionalPoints: existing?.additional_points ?? 0,
      };
    });

    setRows(merged);
    setLoading(false);
  };

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => getCurrentPoints(b) - getCurrentPoints(a));
  }, [rows]);

  return (
    <section className="manager-page">
      <style>{`
        .manager-page {
          min-height: 100vh;
          padding: 34px 18px;
          background:
            radial-gradient(circle at top left, rgba(255, 80, 120, 0.3), transparent 34%),
            radial-gradient(circle at top right, rgba(255, 0, 60, 0.22), transparent 32%),
            linear-gradient(135deg, #16050a 0%, #26060e 45%, #07070a 100%);
          color: white;
        }

        .manager-shell {
          max-width: 1120px;
          margin: 0 auto;
        }

        .manager-hero {
          text-align: center;
          margin-bottom: 22px;
        }

        .manager-pill {
          display: inline-flex;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.16);
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #ffd6df;
          margin-bottom: 12px;
        }

        .manager-title {
          font-size: clamp(38px, 7vw, 78px);
          line-height: 0.95;
          margin: 0;
          font-weight: 950;
          letter-spacing: -0.06em;
          text-transform: uppercase;
        }

        .bonus-info {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin: 22px 0 26px;
        }

        .bonus-info-pill {
          padding: 12px 18px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.16);
        }

        .manager-list {
          display: grid;
          gap: 12px;
        }

        .manager-row {
          position: relative;
          overflow: hidden;
          min-height: 177px;
          display: grid;
          grid-template-columns: 1fr 190px;
          align-items: center;
          gap: 16px;
          padding: 18px;
          border-radius: 24px;
          background: rgba(255,255,255,0.08);
        }

        .manager-image-wrap {
          position: absolute;
          width: 177px;
          height: 177px;
          left: 0;
          top: 0;
          bottom: 0;
          overflow: hidden;
          z-index: 0;
          display: flex;
          mask-image: linear-gradient(90deg, black 0%, black 82%, rgba(0,0,0,0.5) 92%, transparent 100%);
          -webkit-mask-image: linear-gradient(90deg, black 0%, black 82%, rgba(0,0,0,0.5) 92%, transparent 100%);
        }

        .manager-image-real {
          width: 177px;
          height: 177px;
          object-fit: cover;
          opacity: 0.95;
        }

        .card-shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(0,0,0,0.08), rgba(0,0,0,0.34));
          z-index: 1;
        }

        .row-content,
        .row-stats {
          position: relative;
          z-index: 3;
        }

        .row-content {
          text-align: center;
          padding-left: 180px;
        }

        .row-name {
          font-size: 23px;
          font-weight: 950;
          text-transform: capitalize;
        }

        .row-bonus {
          margin-top: 6px;
          display: inline-flex;
          padding: 7px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .row-bonus.double {
          color: #2a1700;
          background: linear-gradient(135deg, #ffd86b, #ffae00, #fff2a8);
          box-shadow: 0 0 22px rgba(255, 190, 35, 0.7);
          animation: strongPulse 0.95s infinite;
        }

        .row-bonus.bonus {
          color: #111;
          background: linear-gradient(135deg, #f4f4f4, #aeb7c2, #ffffff);
          box-shadow: 0 0 14px rgba(220, 230, 240, 0.45);
          animation: softPulse 1.6s infinite;
        }

        .row-bonus.target {
          color: #001f0c;
          background: linear-gradient(135deg, #55ff95, #00c853);
          box-shadow: 0 0 14px rgba(0, 255, 120, 0.35);
        }

        .row-bonus.behind {
          color: #241a00;
          background: linear-gradient(135deg, #fff176, #ffc400);
          box-shadow: 0 0 12px rgba(255, 220, 50, 0.28);
        }

        @keyframes strongPulse {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.08);
            filter: brightness(1.35);
          }
        }

        @keyframes softPulse {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.035);
            filter: brightness(1.14);
          }
        }

        .row-stats {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          align-items: center;
        }

        .stat-slash {
          min-width: 82px;
          border-radius: 14px;
          padding: 11px 10px;
          text-align: center;
        }

        .stat-slash.red {
          background: linear-gradient(135deg, rgba(255,49,88,0.94), rgba(100,8,26,0.9));
        }

        .stat-slash.gold {
          color: #2a1700;
          background: linear-gradient(135deg, #ffe58a, #ffb300, #fff1b5);
          box-shadow: 0 0 18px rgba(255, 190, 35, 0.35);
        }

        .stat-slash.silver {
          color: #101820;
          background: linear-gradient(135deg, #f5f7fa, #aab4c0, #ffffff);
          box-shadow: 0 0 16px rgba(220, 230, 240, 0.26);
        }

        .stat-slash.bronze {
          color: #2b1200;
          background: linear-gradient(135deg, #d88a42, #9a4f18, #f3b06c);
          box-shadow: 0 0 16px rgba(210, 120, 50, 0.28);
        }

        .stat-number {
          display: block;
          font-size: 25px;
          font-weight: 950;
        }

        .stat-label {
          display: block;
          margin-top: 4px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        @media (max-width: 780px) {
          .manager-page {
            padding: 24px 12px;
          }

          .manager-row {
            min-height: 150px;
            grid-template-columns: 1fr 118px;
            gap: 10px;
            padding: 14px;
          }

          .manager-image-wrap {
            width: 150px;
            height: 150px;
          }

          .manager-image-real {
            width: 150px;
            height: 150px;
          }

          .row-content {
            padding-left: 150px;
          }

          .row-name {
            font-size: 19px;
          }

          .row-stats {
            flex-direction: column;
            gap: 7px;
          }

          .stat-slash {
            min-width: 88px;
            padding: 8px;
          }

          .stat-number {
            font-size: 20px;
          }
        }
      `}</style>

      <div className="manager-shell">
        <div className="manager-hero">
          <div className="manager-pill">Aqua Manager Leaderboard</div>
          <h1 className="manager-title">Manager Points</h1>

          <div className="bonus-info">
            <div className="bonus-info-pill">Bonus: target based</div>
            <div className="bonus-info-pill">Double Bonus: target based</div>
          </div>
        </div>

        {!loading && (
          <div className="manager-list">
            {sortedRows.map((row, index) => {
              const points = getCurrentPoints(row);
              const target = getTarget(row.name);
              const status = getBonusStatus(points, target);
              const rankClass = getRankClass(index);

              return (
                <div key={row.name} className="manager-row">
                  <ManagerImageFade name={row.name} />

                  <div className="card-shade" />

                  <div className="row-content">
                    <div className="row-name">
                      #{index + 1} • {getDisplayName(row.name)}
                    </div>

                    <div className={`row-bonus ${status}`}>
                      {getBonusLabel(points, target)}
                    </div>
                  </div>

                  <div className="row-stats">
                    <div className={`stat-slash ${rankClass}`}>
                      <span className="stat-number">{row.recruitPoints}</span>
                      <span className="stat-label">Recruits</span>
                    </div>

                    <div className={`stat-slash ${rankClass}`}>
                      <span className="stat-number">{points}</span>
                      <span className="stat-label">Points</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}