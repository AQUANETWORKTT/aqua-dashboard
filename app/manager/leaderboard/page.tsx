"use client";

import { useEffect, useMemo, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const POINTS_PER_RECRUIT = 3;

type ManagerRow = {
  name: string;
  recruitPoints: number;
  submissionPoints: number;
  adjustments: number;
};

type ManagerPointsDbRow = {
  name: string;
  recruit_points: number | null;
  submission_points: number | null;
  additional_points: number | null;
};

const defaultManagers: ManagerRow[] = [
  { name: "james", recruitPoints: 0, submissionPoints: 0, adjustments: 0 },
  { name: "alfie", recruitPoints: 0, submissionPoints: 0, adjustments: 0 },
  { name: "dylan", recruitPoints: 0, submissionPoints: 0, adjustments: 0 },
  { name: "mavis", recruitPoints: 0, submissionPoints: 0, adjustments: 0 },
  { name: "chris", recruitPoints: 0, submissionPoints: 0, adjustments: 0 },

  { name: "ellie", recruitPoints: 0, submissionPoints: 0, adjustments: 0 },

  { name: "teddie", recruitPoints: 0, submissionPoints: 0, adjustments: 0 },
  { name: "millie", recruitPoints: 0, submissionPoints: 0, adjustments: 0 },
  { name: "vitali", recruitPoints: 0, submissionPoints: 0, adjustments: 0 },
  { name: "harry", recruitPoints: 0, submissionPoints: 0, adjustments: 0 },
  { name: "joechloe", recruitPoints: 0, submissionPoints: 0, adjustments: 0 },
];

const managerTargets: Record<string, number> = {
  james: 50,
  alfie: 50,
  dylan: 40,
  mavis: 30,
  chris: 40,

  ellie: 35,

  mavis: 15,
  teddie: 30,
  millie: 30,
  vitali: 50,
  harry: 35,
  joechloe: 30,
};

function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatSigned(value: number) {
  const num = toNumber(value);
  if (num > 0) return `+${num}`;
  return `${num}`;
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
    toNumber(row.adjustments)
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
          adjustments:
            (joe?.additional_points ?? 0) + (chloe?.additional_points ?? 0),
        };
      }

      const existing = dbRows.find((item) => item.name === manager.name);

      return {
        name: manager.name,
        recruitPoints: existing?.recruit_points ?? 0,
        submissionPoints: existing?.submission_points ?? 0,
        adjustments: existing?.additional_points ?? 0,
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
          padding: 28px 12px 42px;
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
          margin-bottom: 20px;
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
          font-size: clamp(36px, 9vw, 78px);
          line-height: 0.95;
          margin: 0;
          font-weight: 950;
          letter-spacing: -0.06em;
          text-transform: uppercase;
        }

        .bonus-info {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          margin: 18px 0 24px;
        }

        .bonus-info-pill {
          padding: 11px 15px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.16);
        }

        .manager-list {
          display: grid;
          gap: 14px;
        }

        .manager-row {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: 178px 1fr;
          gap: 18px;
          min-height: 188px;
          padding: 16px 18px 16px 0;
          border-radius: 28px;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04)),
            rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 14px 34px rgba(0,0,0,0.24);
        }

        .rank-rail {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 44px;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 950;
          border-radius: 28px 0 0 28px;
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .rank-rail.gold {
          color: #2a1700;
          background: linear-gradient(180deg, #fff2a8, #ffb300, #ffe58a);
        }

        .rank-rail.silver {
          color: #111820;
          background: linear-gradient(180deg, #ffffff, #aab4c0, #f5f7fa);
        }

        .rank-rail.bronze {
          color: #2b1200;
          background: linear-gradient(180deg, #f3b06c, #9a4f18, #d88a42);
        }

        .rank-rail.red {
          color: white;
          background: linear-gradient(180deg, #ff3158, #74091f);
        }

        .manager-image-wrap {
          position: relative;
          width: 178px;
          height: 178px;
          overflow: hidden;
          z-index: 2;
          display: flex;
          border-radius: 0 24px 24px 0;
          margin-left: 0;
          padding-left: 44px;
          box-sizing: border-box;
        }

        .manager-image-wrap.dual {
          gap: 0;
        }

        .manager-image-real {
          width: 134px;
          height: 178px;
          object-fit: cover;
          opacity: 0.96;
        }

        .manager-image-wrap.dual .manager-image-real {
          width: 67px;
        }

        .card-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.34)),
            radial-gradient(circle at left, rgba(255,255,255,0.08), transparent 35%);
          z-index: 1;
        }

        .row-main {
          position: relative;
          z-index: 4;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }

        .row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 12px;
        }

        .row-name-wrap {
          min-width: 0;
        }

        .row-name {
          font-size: clamp(22px, 3.4vw, 34px);
          font-weight: 950;
          text-transform: capitalize;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .row-bonus {
          margin-top: 8px;
          display: inline-flex;
          padding: 8px 13px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          width: fit-content;
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
          display: grid;
          grid-template-columns: repeat(6, minmax(86px, 1fr));
          gap: 9px;
          width: 100%;
        }

        .stat-box {
          min-height: 74px;
          border-radius: 16px;
          padding: 10px 8px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.12);
          background: linear-gradient(135deg, rgba(255,49,88,0.92), rgba(100,8,26,0.88));
        }

        .stat-box.gold {
          color: #2a1700;
          background: linear-gradient(135deg, #ffe58a, #ffb300, #fff1b5);
          box-shadow: 0 0 18px rgba(255, 190, 35, 0.35);
        }

        .stat-box.silver {
          color: #101820;
          background: linear-gradient(135deg, #f5f7fa, #aab4c0, #ffffff);
          box-shadow: 0 0 16px rgba(220, 230, 240, 0.26);
        }

        .stat-box.bronze {
          color: #2b1200;
          background: linear-gradient(135deg, #d88a42, #9a4f18, #f3b06c);
          box-shadow: 0 0 16px rgba(210, 120, 50, 0.28);
        }

        .stat-number {
          display: block;
          font-size: 24px;
          line-height: 1;
          font-weight: 950;
        }

        .stat-label {
          display: block;
          margin-top: 7px;
          font-size: 9px;
          line-height: 1.05;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        @media (max-width: 820px) {
          .manager-page {
            padding: 22px 10px 34px;
          }

          .manager-row {
            grid-template-columns: 112px 1fr;
            gap: 10px;
            min-height: 230px;
            padding: 12px 10px 12px 0;
            border-radius: 24px;
          }

          .rank-rail {
            width: 32px;
            font-size: 13px;
            border-radius: 24px 0 0 24px;
          }

          .manager-image-wrap {
            width: 112px;
            height: 150px;
            padding-left: 32px;
            border-radius: 0 18px 18px 0;
            align-self: start;
          }

          .manager-image-real {
            width: 80px;
            height: 150px;
          }

          .manager-image-wrap.dual .manager-image-real {
            width: 40px;
          }

          .row-main {
            justify-content: flex-start;
            padding-top: 2px;
          }

          .row-top {
            display: block;
            margin-bottom: 10px;
          }

          .row-name {
            font-size: 22px;
            white-space: normal;
            line-height: 1.05;
          }

          .row-bonus {
            margin-top: 7px;
            font-size: 10px;
            padding: 7px 10px;
            max-width: 100%;
          }

          .row-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 7px;
          }

          .stat-box {
            min-height: 58px;
            border-radius: 13px;
            padding: 8px 5px;
          }

          .stat-number {
            font-size: 20px;
          }

          .stat-label {
            font-size: 8px;
            margin-top: 5px;
          }
        }

        @media (max-width: 420px) {
          .manager-row {
            grid-template-columns: 96px 1fr;
            min-height: 250px;
          }

          .manager-image-wrap {
            width: 96px;
            height: 140px;
            padding-left: 30px;
          }

          .manager-image-real {
            width: 66px;
            height: 140px;
          }

          .manager-image-wrap.dual .manager-image-real {
            width: 33px;
          }

          .rank-rail {
            width: 30px;
            font-size: 12px;
          }

          .row-name {
            font-size: 20px;
          }

          .row-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .stat-number {
            font-size: 18px;
          }
        }
      `}</style>

      <div className="manager-shell">
        <div className="manager-hero">
          <div className="manager-pill">Aqua Manager Leaderboard</div>
          <h1 className="manager-title">Manager Points</h1>

          <div className="bonus-info">
            <div className="bonus-info-pill">Targets are manager based</div>
            <div className="bonus-info-pill">Bonus + double bonus visible</div>
          </div>
        </div>

        {!loading && (
          <div className="manager-list">
            {sortedRows.map((row, index) => {
              const points = getCurrentPoints(row);
              const target = getTarget(row.name);
              const bonusTarget = getBonusPoints(target);
              const doubleBonusTarget = getDoubleBonusPoints(target);
              const status = getBonusStatus(points, target);
              const rankClass = getRankClass(index);

              return (
                <div key={row.name} className="manager-row">
                  <div className={`rank-rail ${rankClass}`}>#{index + 1}</div>

                  <ManagerImageFade name={row.name} />

                  <div className="card-shade" />

                  <div className="row-main">
                    <div className="row-top">
                      <div className="row-name-wrap">
                        <div className="row-name">{getDisplayName(row.name)}</div>

                        <div className={`row-bonus ${status}`}>
                          {getBonusLabel(points, target)}
                        </div>
                      </div>
                    </div>

                    <div className="row-stats">
                      <div className={`stat-box ${rankClass}`}>
                        <span className="stat-number">{row.recruitPoints}</span>
                        <span className="stat-label">Recruits</span>
                      </div>

                      <div className={`stat-box ${rankClass}`}>
                        <span className="stat-number">{points}</span>
                        <span className="stat-label">Points</span>
                      </div>

                      <div className={`stat-box ${rankClass}`}>
                        <span className="stat-number">
                          {formatSigned(row.adjustments)}
                        </span>
                        <span className="stat-label">Adjustments</span>
                      </div>

                      <div className={`stat-box ${rankClass}`}>
                        <span className="stat-number">{target}</span>
                        <span className="stat-label">Target</span>
                      </div>

                      <div className={`stat-box ${rankClass}`}>
                        <span className="stat-number">{bonusTarget}</span>
                        <span className="stat-label">Bonus Target</span>
                      </div>

                      <div className={`stat-box ${rankClass}`}>
                        <span className="stat-number">{doubleBonusTarget}</span>
                        <span className="stat-label">Double Bonus Target</span>
                      </div>
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