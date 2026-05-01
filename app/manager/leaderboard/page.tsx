"use client";

import { useEffect, useMemo, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

const POINTS_PER_RECRUIT = 3;
const MONTHLY_TARGET = 35;
const BONUS_POINTS = 50;
const DOUBLE_BONUS_POINTS = 70;
const REMOVAL_RISK_PROJECTED_POINTS = 15;

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

function isEarlyMonth() {
  return new Date().getDate() <= 15;
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

function getMonthProjection(points: number) {
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();

  const safeDay = Math.max(currentDay, 1);
  const projectedEndPoints = (points / safeDay) * daysInMonth;
  const expectedPointsNow = (MONTHLY_TARGET / daysInMonth) * currentDay;

  return {
    expectedPointsNow,
    projectedEndPoints,
  };
}

function getStatus(points: number) {
  if (isEarlyMonth()) return "";

  if (points >= DOUBLE_BONUS_POINTS) return "Active Manager + Double Bonus";
  if (points >= BONUS_POINTS) return "Active Manager + Bonus";
  if (points >= MONTHLY_TARGET) return "Target Hit";

  const { projectedEndPoints, expectedPointsNow } = getMonthProjection(points);

  if (projectedEndPoints < REMOVAL_RISK_PROJECTED_POINTS) {
    return "Removal Risk";
  }

  if (projectedEndPoints < MONTHLY_TARGET) {
    return "Strike Risk";
  }

  if (points >= expectedPointsNow + 3) {
    return "Bonus Potential";
  }

  return "On Track";
}

function getStatusClass(points: number) {
  if (isEarlyMonth()) return "";

  if (points >= DOUBLE_BONUS_POINTS) return "manager-status double-bonus";
  if (points >= BONUS_POINTS) return "manager-status bonus";
  if (points >= MONTHLY_TARGET) return "manager-status active";

  const { projectedEndPoints, expectedPointsNow } = getMonthProjection(points);

  if (projectedEndPoints < REMOVAL_RISK_PROJECTED_POINTS) {
    return "manager-status removal";
  }

  if (projectedEndPoints < MONTHLY_TARGET) {
    return "manager-status strike";
  }

  if (points >= expectedPointsNow + 3) {
    return "manager-status bonus";
  }

  return "manager-status active";
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

  return (
    <section className="manager-wrapper">
      <div className="manager-hero">
        <div className="manager-pill">Leaderboard</div>
        <h1 className="manager-title">Manager Points</h1>
        <p className="manager-subtitle">35 point target.</p>
      </div>

      {message ? (
        <div className="manager-card" style={{ marginBottom: "20px" }}>
          <div className="manager-card-sub">{message}</div>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div className="manager-card">
          <div className="manager-card-title">Messages</div>
          <div className="manager-card-sub">
            1 point per 20 messages
            <br />
            Max 3 per day
          </div>
        </div>

        <div className="manager-card">
          <div className="manager-card-title">Recruits</div>
          <div className="manager-card-sub">3 points per recruit</div>
        </div>

        <div className="manager-card">
          <div className="manager-card-title">Bonus</div>
          <div className="manager-card-sub">
            50 points = bonus
            <br />
            70 points = double bonus
          </div>
        </div>

        <div className="manager-card">
          <div className="manager-card-title">Adjustments</div>
          <div className="manager-card-sub">
            Points can be added or removed by James
          </div>
        </div>
      </div>

      {loading ? (
        <div className="manager-card">
          <div className="manager-card-sub">Loading leaderboard...</div>
        </div>
      ) : (
        <div className="manager-table-wrap">
          <table className="manager-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Manager</th>
                <th>Recruits</th>
                <th>Recruit Points</th>
                <th>Submission</th>
                <th>Adjustments</th>
                <th>Total Points</th>
                <th>Status</th>
                <th>Target</th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((row, index) => {
                const recruitScore = getRecruitScore(row);
                const currentPoints = getCurrentPoints(row);
                const status = getStatus(currentPoints);
                const statusClass = getStatusClass(currentPoints);

                return (
                  <tr key={row.name}>
                    <td>{index + 1}</td>

                    <td style={{ textTransform: "capitalize", fontWeight: 700 }}>
                      {row.name}
                    </td>

                    <td>{row.recruitPoints}</td>
                    <td>{recruitScore}</td>
                    <td>{row.submissionPoints}</td>
                    <td>{row.additionalPoints}</td>
                    <td>{currentPoints}</td>

                    <td>
                      {status ? (
                        <span className={statusClass}>{status}</span>
                      ) : (
                        ""
                      )}
                    </td>

                    <td>{MONTHLY_TARGET}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}