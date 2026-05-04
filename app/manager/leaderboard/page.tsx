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
  { name: "lewis", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "vitali", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "callum", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "harry", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "chloe", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
  { name: "joe", recruitPoints: 0, submissionPoints: 0, additionalPoints: 0 },
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
  return `${Math.max(MONTHLY_TARGET - points, 0)} points to target`;
}

function ManagerImageFade({
  name,
  variant = "list",
}: {
  name: string;
  variant?: "podium" | "list";
}) {
  const originalSrc = `/creators/${encodeURIComponent(name)}.jpg`;
  const fallbackSrc = "/creators/default.jpg";
  const [src, setSrc] = useState(fallbackSrc);

  useEffect(() => {
    const img = new window.Image();
    img.src = originalSrc;
    img.onload = () => setSrc(originalSrc);
    img.onerror = () => setSrc(fallbackSrc);
  }, [originalSrc]);

  return (
    <div
      className={`manager-image-fade ${variant}`}
      style={{ backgroundImage: `url("${src}")` }}
    />
  );
}

export default function ManagerLeaderboardPage() {
  const [rows, setRows] = useState<ManagerRow[]>(defaultManagers);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPoints();
  }, []);

  const loadPoints = async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await submissionsSupabase
      .from("manager_points")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setMessage(error.message);
      setRows(defaultManagers);
      setLoading(false);
      return;
    }

    const dbRows = (data || []) as ManagerPointsDbRow[];

    const merged = defaultManagers.map((manager) => {
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
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.16);
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

        .manager-statement {
          margin: 14px auto 0;
          font-size: clamp(18px, 3vw, 30px);
          font-weight: 850;
          color: #fff0f3;
        }

        .manager-statement span {
          color: #ff4d6d;
        }

        .bonus-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 26px 0 32px;
        }

        .bonus-item {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 22px;
          padding: 18px;
          text-align: center;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
        }

        .bonus-number {
          font-size: 34px;
          font-weight: 950;
          color: #ff4d6d;
        }

        .bonus-label {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.72);
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
          padding: 24px 18px;
          min-height: 260px;
          display: flex;
          align-items: flex-end;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.34);
        }

        .podium-card.rank-1 {
          order: 2;
          min-height: 330px;
          border-color: rgba(255, 215, 95, 0.75);
          box-shadow:
            0 0 0 1px rgba(255, 215, 95, 0.22),
            0 24px 80px rgba(255, 190, 40, 0.2);
        }

        .podium-card.rank-2 {
          order: 1;
          min-height: 285px;
          border-color: rgba(220, 230, 245, 0.58);
        }

        .podium-card.rank-3 {
          order: 3;
          min-height: 255px;
          border-color: rgba(205, 127, 50, 0.58);
        }

        .manager-image-fade {
          position: absolute;
          inset: 0;
          background-repeat: no-repeat;
          z-index: 0;
          filter: saturate(1.08) contrast(1.06);
        }

        .manager-image-fade.podium {
          background-size: cover;
          background-position: center center;
          opacity: 0.84;
        }

        .manager-image-fade.list {
          width: 46%;
          right: auto;
          background-size: cover;
          background-position: center center;
          opacity: 0.82;
          mask-image: linear-gradient(
            90deg,
            black 0%,
            black 72%,
            rgba(0,0,0,0.45) 88%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            90deg,
            black 0%,
            black 72%,
            rgba(0,0,0,0.45) 88%,
            transparent 100%
          );
        }

        .card-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(0,0,0,0.08), rgba(0,0,0,0.58)),
            linear-gradient(0deg, rgba(0,0,0,0.78), transparent 64%);
          z-index: 1;
        }

        .podium-content {
          position: relative;
          z-index: 3;
          width: 100%;
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
          box-shadow: 0 12px 28px rgba(0,0,0,0.35);
        }

        .rank-badge.rank-1 {
          color: #2b1800;
          background: linear-gradient(135deg, #fff2a8, #ffc233, #b87500);
        }

        .rank-badge.rank-2 {
          color: #15171c;
          background: linear-gradient(135deg, #ffffff, #bcc7d7, #7c8796);
        }

        .rank-badge.rank-3 {
          color: #241005;
          background: linear-gradient(135deg, #ffd0a1, #cd7f32, #7a3f16);
        }

        .podium-name {
          text-transform: capitalize;
          font-size: 25px;
          font-weight: 950;
          text-shadow: 0 4px 18px rgba(0,0,0,0.55);
        }

        .podium-points {
          margin-top: 4px;
          font-size: 48px;
          font-weight: 950;
          color: #ff4d6d;
          line-height: 1;
        }

        .rank-1 .podium-points {
          color: #ffd866;
        }

        .rank-2 .podium-points {
          color: #dce6f5;
        }

        .rank-3 .podium-points {
          color: #e29a54;
        }

        .podium-meta {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.82);
          font-size: 14px;
          font-weight: 700;
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
          padding: 18px 18px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.13);
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.2);
        }

        .manager-row.ellie {
          border-color: rgba(255, 176, 230, 0.52);
          background:
            radial-gradient(circle at left, rgba(255, 173, 226, 0.22), transparent 36%),
            radial-gradient(circle at right, rgba(190, 230, 255, 0.14), transparent 30%),
            rgba(255, 255, 255, 0.08);
        }

        .row-content {
          position: relative;
          z-index: 3;
          text-align: center;
          padding-left: 28%;
        }

        .row-name {
          text-transform: capitalize;
          font-size: 23px;
          font-weight: 950;
          text-shadow: 0 4px 16px rgba(0,0,0,0.55);
        }

        .row-bonus {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.76);
          margin-top: 4px;
          font-weight: 800;
        }

        .row-stats {
          position: relative;
          z-index: 3;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          align-items: center;
        }

        .stat-slash {
          min-width: 82px;
          transform: skewX(-12deg);
          border-radius: 14px;
          padding: 11px 10px;
          text-align: center;
          background: linear-gradient(135deg, rgba(255, 49, 88, 0.94), rgba(100, 8, 26, 0.9));
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow: 0 12px 28px rgba(0,0,0,0.3);
        }

        .stat-slash:nth-child(2) {
          background: linear-gradient(135deg, rgba(255, 120, 150, 0.94), rgba(70, 6, 18, 0.9));
        }

        .stat-inner {
          transform: skewX(12deg);
        }

        .stat-number {
          display: block;
          font-size: 25px;
          line-height: 1;
          font-weight: 950;
        }

        .stat-label {
          display: block;
          margin-top: 4px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.78);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 900;
        }

        .message-card,
        .loading-card {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 22px;
          padding: 18px;
          text-align: center;
          color: rgba(255, 255, 255, 0.78);
        }

        @media (max-width: 780px) {
          .manager-page {
            padding: 24px 12px;
          }

          .bonus-strip {
            grid-template-columns: 1fr;
            gap: 10px;
            margin-bottom: 22px;
          }

          .podium {
            grid-template-columns: 1fr;
          }

          .podium-card.rank-1,
          .podium-card.rank-2,
          .podium-card.rank-3 {
            order: initial;
            min-height: 255px;
          }

          .manager-row {
            min-height: 122px;
            grid-template-columns: 1fr 118px;
            gap: 10px;
            padding: 14px;
          }

          .manager-image-fade.list {
            width: 58%;
            background-position: left center;
          }

          .row-content {
            padding-left: 34%;
            text-align: center;
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
            padding: 8px 8px;
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
          <div className="manager-statement">
            Hit <span>35 points</span> to stay active.
          </div>
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

        {message ? <div className="message-card">{message}</div> : null}

        {loading ? (
          <div className="loading-card">Loading leaderboard...</div>
        ) : (
          <>
            <div className="podium">
              {podiumRows.map((row, index) => {
                const points = getCurrentPoints(row);
                const trueRank = index + 1;

                return (
                  <div
                    key={row.name}
                    className={`podium-card rank-${trueRank} ${
                      row.name === "ellie" ? "ellie" : ""
                    }`}
                  >
                    <ManagerImageFade name={row.name} variant="podium" />
                    <div className="card-shade" />

                    <div className="podium-content">
                      <div className={`rank-badge rank-${trueRank}`}>
                        #{trueRank}
                      </div>
                      <div className="podium-name">{row.name}</div>
                      <div className="podium-points">{points}</div>
                      <div className="podium-meta">
                        {row.recruitPoints} recruits · {getBonusLabel(points)}
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
                  <div
                    key={row.name}
                    className={`manager-row ${
                      row.name === "ellie" ? "ellie" : ""
                    }`}
                  >
                    <ManagerImageFade name={row.name} variant="list" />
                    <div className="card-shade" />

                    <div className="row-content">
                      <div className="row-name">{row.name}</div>
                      <div className="row-bonus">{getBonusLabel(points)}</div>
                    </div>

                    <div className="row-stats">
                      <div className="stat-slash">
                        <div className="stat-inner">
                          <span className="stat-number">{row.recruitPoints}</span>
                          <span className="stat-label">Recruits</span>
                        </div>
                      </div>

                      <div className="stat-slash">
                        <div className="stat-inner">
                          <span className="stat-number">{points}</span>
                          <span className="stat-label">Points</span>
                        </div>
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