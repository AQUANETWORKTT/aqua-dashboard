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
  { name: "mavis", recruitPoints: 0, submissionPoints: 0 },
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

function getStatus(points: number) {
  if (points < 10) return "Manager Removal";
  if (points < 25) return "Strike Risk";
  if (points < 40) return "Active Manager";
  if (points < 60) return "Active Manager + Bonus";
  return "Active Manager + Double Bonus";
}

function getStatusClass(points: number) {
  if (points < 10) return "manager-status removal";
  if (points < 25) return "manager-status strike";
  if (points < 40) return "manager-status active";
  if (points < 60) return "manager-status bonus";
  return "manager-status double-bonus";
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
          Managers must achieve 25 points to avoid a strike and to prove active
          management.
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
          Managers must achieve <strong>25 points</strong> to avoid a strike and
          to prove active management.
          <br />
          <strong>1 point</strong> per recruit.
          <br />
          <strong>1 point</strong> per 20 messages, max <strong>3 per day</strong>.
          <br />
          Bonus points are available occasionally.
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