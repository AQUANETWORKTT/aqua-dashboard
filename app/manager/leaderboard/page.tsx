"use client";

import { useEffect, useMemo, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type ManagerRow = {
  name: string;
  recruitPoints: number;
  submissionPoints: number;
};

type ManagerPointsDbRow = {
  name: string;
  recruit_points: number;
  submission_points: number;
};

const defaultManagers: ManagerRow[] = [
  { name: "james", recruitPoints: 0, submissionPoints: 0 },
  { name: "alfie", recruitPoints: 0, submissionPoints: 0 },
  { name: "dylan", recruitPoints: 0, submissionPoints: 0 },
  { name: "jay", recruitPoints: 0, submissionPoints: 0 },
  { name: "ellie", recruitPoints: 0, submissionPoints: 0 },
  { name: "lewis", recruitPoints: 0, submissionPoints: 0 },
  { name: "vitali", recruitPoints: 0, submissionPoints: 0 },
  { name: "callum", recruitPoints: 0, submissionPoints: 0 },
  { name: "harry", recruitPoints: 0, submissionPoints: 0 },
  { name: "chloe", recruitPoints: 0, submissionPoints: 0 },
  { name: "joe", recruitPoints: 0, submissionPoints: 0 },
];

function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getCurrentPoints(row: ManagerRow) {
  return toNumber(row.recruitPoints) + toNumber(row.submissionPoints);
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
  const expectedPointsNow = (25 / daysInMonth) * currentDay;

  return {
    currentDay,
    daysInMonth,
    expectedPointsNow,
    projectedEndPoints,
  };
}

function getStatus(points: number) {
  if (points >= 60) return "Active Manager + Double Bonus";
  if (points >= 40) return "Active Manager + Bonus";
  if (points >= 25) return "Target Hit";

  const { projectedEndPoints, expectedPointsNow } = getMonthProjection(points);

  if (projectedEndPoints < 10) return "Removal Risk";
  if (projectedEndPoints < 25) return "Strike Risk";

  if (points >= expectedPointsNow + 2) return "Bonus Potential";
  return "On Track";
}

function getStatusClass(points: number) {
  if (points >= 60) return "manager-status double-bonus";
  if (points >= 40) return "manager-status bonus";
  if (points >= 25) return "manager-status active";

  const { projectedEndPoints, expectedPointsNow } = getMonthProjection(points);

  if (projectedEndPoints < 10) return "manager-status removal";
  if (projectedEndPoints < 25) return "manager-status strike";

  if (points >= expectedPointsNow + 2) return "manager-status bonus";
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
      };
    });

    setRows(merged);
    setLoading(false);
  };

  const sortedRows = useMemo(() => {
    return [...rows].sort(
      (a, b) => getCurrentPoints(b) - getCurrentPoints(a)
    );
  }, [rows]);

  return (
    <section className="manager-wrapper">
      <div className="manager-hero">
        <div className="manager-pill">Leaderboard</div>
        <h1 className="manager-title">Manager Points</h1>
        <p className="manager-subtitle">
          Manager progress is based on pace toward 25 points by the end of the
          month, with bonus tiers at 40 and 60 points.
        </p>
      </div>

      {message ? (
        <div className="manager-card" style={{ marginBottom: "20px" }}>
          <div className="manager-card-sub">{message}</div>
        </div>
      ) : null}

      <div className="manager-card" style={{ marginBottom: "20px" }}>
        <div className="manager-card-title">Point Rules</div>
        <div
          className="manager-card-sub"
          style={{ marginBottom: 0, lineHeight: 1.7 }}
        >
          Managers are tracked against a <strong>25 point monthly target</strong>.
          <br />
          Under pace for less than <strong>10 projected points</strong> = removal
          risk.
          <br />
          Under pace for <strong>25 projected points</strong> = strike risk.
          <br />
          <strong>40 points</strong> = Active Manager + Bonus.
          <br />
          <strong>60 points</strong> = Active Manager + Double Bonus.
          <br />
          <strong>1 point</strong> per recruit.
          <br />
          <strong>1 point</strong> per 20 messages, max <strong>3 per day</strong>.
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
                <th>Recruit</th>
                <th>Submission</th>
                <th>Points</th>
                <th>Status</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => {
                const currentPoints = getCurrentPoints(row);

                return (
                  <tr key={row.name}>
                    <td>{index + 1}</td>
                    <td style={{ textTransform: "capitalize", fontWeight: 700 }}>
                      {row.name}
                    </td>
                    <td>{row.recruitPoints}</td>
                    <td>{row.submissionPoints}</td>
                    <td>{currentPoints}</td>
                    <td>
                      <span className={getStatusClass(currentPoints)}>
                        {getStatus(currentPoints)}
                      </span>
                    </td>
                    <td>25</td>
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