"use client";

import { useEffect, useMemo, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const POINTS_PER_RECRUIT = 3;
const MONTHLY_TARGET = 35;
const BONUS_POINTS = 50;
const DOUBLE_BONUS_POINTS = 70;

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
  { name: "ellie", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "ellie1", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "jade", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "teddie", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "scotty", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "lewis", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "vitali", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "harry", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "joechloe", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
];

function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
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

function getBonusLabel(points: number) {
  if (points >= DOUBLE_BONUS_POINTS) return "Double Bonus";
  if (points >= BONUS_POINTS) return "Bonus Unlocked";
  if (points >= MONTHLY_TARGET) return "Target Hit";
  return `${Math.max(MONTHLY_TARGET - points, 0)} Points To Target`;
}

function getDisplayName(name: string) {
  if (name === "ellie1") return "Ellie 1";
  if (name === "joechloe") return "Joe & Chloe";
  return name;
}

function getImageNames(name: string) {
  if (name === "joechloe") return ["joe", "chloe"];
  return [name];
}

function ManagerImageFade({
  name,
  variant = "list",
}: {
  name: string;
  variant?: "podium" | "list";
}) {
  const imageNames = getImageNames(name);

  return (
    <div
      className={`manager-image-wrap ${variant} ${
        imageNames.length > 1 ? "dual" : ""
      }`}
    >
      {imageNames.map((imageName) => (
        <SingleManagerImage
          key={imageName}
          name={imageName}
          variant={variant}
        />
      ))}
    </div>
  );
}

function SingleManagerImage({
  name,
  variant,
}: {
  name: string;
  variant: "podium" | "list";
}) {
  const originalSrc = `/creators/${encodeURIComponent(name)}.jpg`;
  const fallbackSrc = "/creators/default.jpg";
  const [src, setSrc] = useState(originalSrc);

  return (
    <img
      src={src}
      alt={name}
      onError={() => setSrc(fallbackSrc)}
      className={`manager-image-real ${variant}`}
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
    const { data } = await submissionsSupabase
      .from("manager_points")
      .select("*");

    const dbRows = (data || []) as ManagerPointsDbRow[];

    const merged = defaultManagers.map((manager) => {
      if (manager.name === "joechloe") {
        const joe = dbRows.find((item) => item.name === "joe");
        const chloe = dbRows.find((item) => item.name === "chloe");

        return {
          name: "joechloe",
          recruitPoints:
            (joe?.recruit_points ?? 0) + (chloe?.recruit_points ?? 0),
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

  const podiumRows = sortedRows.slice(0, 3);
  const listRows = sortedRows.slice(3);

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
          margin-bottom: 26px;
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

        .bonus-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 26px 0 32px;
        }

        .bonus-item {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 22px;
          padding: 18px;
          text-align: center;
        }

        .bonus-number {
          font-size: 34px;
          font-weight: 950;
          color: #ff4d6d;
        }

        .bonus-label {
          font-size: 13px;
          color: rgba(255,255,255,0.72);
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .podium {
          display: grid;
          grid-template-columns: 1fr 1.14fr 1fr;
          gap: 16px;
          align-items: end;
          margin-bottom: 22px;
        }

        .podium-card {
          position: relative;
          overflow: hidden;
          border-radius: 32px;
          min-height: 320px;
          display: flex;
          align-items: flex-end;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.18);
        }

        .podium-card.rank-1 {
          order: 2;
        }

        .podium-card.rank-2 {
          order: 1;
        }

        .podium-card.rank-3 {
          order: 3;
        }

        .manager-image-wrap {
          position: absolute;
          overflow: hidden;
          z-index: 0;
          display: flex;
        }

        .manager-image-wrap.podium {
          inset: 0;
        }

        .manager-image-wrap.list {
          width: 177px;
          height: 177px;
          left: 0;
          top: 0;
          bottom: 0;

          mask-image: linear-gradient(
            90deg,
            black 0%,
            black 82%,
            rgba(0,0,0,0.5) 92%,
            transparent 100%
          );

          -webkit-mask-image: linear-gradient(
            90deg,
            black 0%,
            black 82%,
            rgba(0,0,0,0.5) 92%,
            transparent 100%
          );
        }

        .manager-image-wrap.dual .manager-image-real {
          flex: 1;
          min-width: 0;
        }

        .manager-image-real {
          display: block;
          object-fit: cover;
        }

        .manager-image-real.podium {
          width: 100%;
          height: 100%;
          opacity: 0.96;
        }

        .manager-image-real.list {
          width: 177px;
          height: 177px;
          opacity: 0.95;
        }

        .podium-content {
          position: relative;
          z-index: 3;
          width: 100%;
          padding: 24px 18px;
          background: linear-gradient(
            0deg,
            rgba(0,0,0,0.5) 0%,
            rgba(0,0,0,0.2) 55%,
            transparent 100%
          );
        }

        .row-content,
        .row-stats {
          position: relative;
          z-index: 3;
        }

        .rank-badge {
          width: 48px;
          height: 48px;
          display: inline-grid;
          place-items: center;
          border-radius: 16px;
          color: white;
          font-weight: 950;
          margin-bottom: 12px;
          background: rgba(0,0,0,0.45);
        }

        .podium-name {
          font-size: 25px;
          font-weight: 950;
          text-transform: capitalize;
          text-shadow: 0 4px 18px rgba(0,0,0,0.55);
        }

        .podium-points {
          margin-top: 4px;
          font-size: 48px;
          font-weight: 950;
          color: #ff4d6d;
          line-height: 1;
        }

        .podium-meta {
          display: inline-flex;
          margin-top: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255, 77, 109, 0.18);
          border: 1px solid rgba(255, 77, 109, 0.35);
          color: #ffd6df;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
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

        .card-shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(0,0,0,0.08),
            rgba(0,0,0,0.34)
          );
          z-index: 1;
        }

        .row-content {
          text-align: center;
          padding-left: 180px;
        }

        .row-name {
          font-size: 23px;
          font-weight: 950;
          text-transform: capitalize;
          text-shadow: 0 4px 16px rgba(0,0,0,0.55);
        }

        .row-bonus {
          margin-top: 6px;
          display: inline-flex;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.14);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
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
          background: linear-gradient(
            135deg,
            rgba(255,49,88,0.94),
            rgba(100,8,26,0.9)
          );
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
          text-transform: uppercase;
        }

        @media (max-width: 780px) {
          .manager-page {
            padding: 24px 12px;
          }

          .bonus-strip {
            grid-template-columns: 1fr;
          }

          .podium {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .podium-card,
          .podium-card.rank-1,
          .podium-card.rank-2,
          .podium-card.rank-3 {
            order: initial;
            min-height: 170px;
            border-radius: 24px;
          }

          .manager-image-wrap.podium {
            width: 170px;
            height: 170px;
            left: 50%;
            top: 0;
            bottom: auto;
            transform: translateX(-50%);

            mask-image: linear-gradient(
              90deg,
              transparent 0%,
              black 14%,
              black 86%,
              transparent 100%
            );

            -webkit-mask-image: linear-gradient(
              90deg,
              transparent 0%,
              black 14%,
              black 86%,
              transparent 100%
            );
          }

          .manager-image-real.podium {
            width: 170px;
            height: 170px;
            object-fit: contain;
          }

          .podium-content {
            display: grid;
            grid-template-columns: 52px 1fr;
            gap: 12px;
            align-items: center;
            padding: 14px;
            min-height: 170px;
            background: transparent;
          }

          .rank-badge {
            width: 42px;
            height: 42px;
            margin-bottom: 0;
          }

          .podium-name {
            font-size: 21px;
            line-height: 1;
          }

          .podium-points {
            font-size: 34px;
            margin-top: 2px;
          }

          .podium-meta {
            font-size: 11px;
            padding: 5px 8px;
            margin-top: 4px;
          }

          .manager-row {
            min-height: 150px;
            grid-template-columns: 1fr 118px;
            gap: 10px;
            padding: 14px;
          }

          .manager-image-wrap.list {
            width: 150px;
            height: 150px;
          }

          .manager-image-real.list {
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
        </div>

        <div className="bonus-strip">
          <div className="bonus-item">
            <div className="bonus-number">3</div>
            <div className="bonus-label">Points Per Recruit</div>
          </div>

          <div className="bonus-item">
            <div className="bonus-number">50</div>
            <div className="bonus-label">Bonus Points</div>
          </div>

          <div className="bonus-item">
            <div className="bonus-number">70</div>
            <div className="bonus-label">Double Bonus</div>
          </div>
        </div>

        {!loading && (
          <>
            <div className="podium">
              {podiumRows.map((row, index) => {
                const points = getCurrentPoints(row);

                return (
                  <div
                    key={row.name}
                    className={`podium-card rank-${index + 1}`}
                  >
                    <ManagerImageFade name={row.name} variant="podium" />

                    <div className="podium-content">
                      <div className="rank-badge">#{index + 1}</div>

                      <div>
                        <div className="podium-name">
                          {getDisplayName(row.name)}
                        </div>

                        <div className="podium-points">{points}</div>

                        <div className="podium-meta">
                          {row.recruitPoints} recruits ·{" "}
                          {getBonusLabel(points)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="manager-list">
              {listRows.map((row) => {
                const points = getCurrentPoints(row);

                return (
                  <div key={row.name} className="manager-row">
                    <ManagerImageFade name={row.name} variant="list" />

                    <div className="card-shade" />

                    <div className="row-content">
                      <div className="row-name">
                        {getDisplayName(row.name)}
                      </div>

                      <div className="row-bonus">
                        {getBonusLabel(points)}
                      </div>
                    </div>

                    <div className="row-stats">
                      <div className="stat-slash">
                        <span className="stat-number">
                          {row.recruitPoints}
                        </span>
                        <span className="stat-label">Recruits</span>
                      </div>

                      <div className="stat-slash">
                        <span className="stat-number">{points}</span>
                        <span className="stat-label">Points</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}