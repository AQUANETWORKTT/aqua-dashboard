"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { submissionsSupabase } from "@/lib/submissions-supabase";

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

const POINTS_PER_RECRUIT = 3;

function getTotalPoints(row: ManagerRow) {
  return (
    row.recruitPoints * POINTS_PER_RECRUIT +
    row.submissionPoints +
    row.additionalPoints
  );
}

export default function ManagerPointsPage() {
  const [rows, setRows] = useState<ManagerRow[]>(defaultManagers);
  const [message, setMessage] = useState("");
  const [checkedAccess, setCheckedAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const hasAccess = localStorage.getItem("manager_admin_access");

    if (hasAccess !== "true") {
      router.push("/manager/admin");
      return;
    }

    setCheckedAccess(true);
    loadPoints();
  }, [router]);

  const loadPoints = async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await submissionsSupabase
      .from("manager_points")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const dbRows = (data || []) as ManagerPointsDbRow[];

    const mergedRows = defaultManagers.map((manager) => {
      const existing = dbRows.find((row) => row.name === manager.name);

      return {
        name: manager.name,
        recruitPoints: existing?.recruit_points ?? 0,
        submissionPoints: existing?.submission_points ?? 0,
        additionalPoints: existing?.additional_points ?? 0,
      };
    });

    setRows(mergedRows);
    setLoading(false);
  };

  const updateRow = (
    name: string,
    field: "recruitPoints" | "submissionPoints" | "additionalPoints",
    value: string
  ) => {
    const numberValue = Math.max(0, Number(value) || 0);

    setRows((current) =>
      current.map((row) =>
        row.name === name ? { ...row, [field]: numberValue } : row
      )
    );
  };

  const savePoints = async () => {
    setMessage("Saving...");

    const payload = rows.map((row) => ({
      name: row.name,
      recruit_points: row.recruitPoints,
      submission_points: row.submissionPoints,
      additional_points: row.additionalPoints,
    }));

    const { error } = await submissionsSupabase
      .from("manager_points")
      .upsert(payload, { onConflict: "name" });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Points saved.");
    await loadPoints();
  };

  const resetAllPoints = async () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset ALL manager points to 0 for the new month?"
    );

    if (!confirmReset) return;

    setLoading(true);
    setMessage("Resetting all manager points...");

    const payload = defaultManagers.map((manager) => ({
      name: manager.name,
      recruit_points: 0,
      submission_points: 0,
      additional_points: 0,
    }));

    const { error } = await submissionsSupabase
      .from("manager_points")
      .upsert(payload, { onConflict: "name" });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setRows(defaultManagers);
    setMessage("All manager points reset to 0.");
    setLoading(false);
  };

  if (!checkedAccess) return null;

  return (
    <section className="manager-wrapper">
      <div className="manager-hero">
        <div className="manager-pill">Admin Points</div>
        <h1 className="manager-title">Edit Points</h1>

        <p className="manager-subtitle">
          Manually adjust manager points for this month. 1 recruit = 3 points.
        </p>

        <div
          style={{
            marginTop: "16px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="manager-button-secondary"
            onClick={() => router.push("/manager/admin/review")}
          >
            Back to Review
          </button>

          <button
            type="button"
            className="manager-button"
            onClick={savePoints}
            disabled={loading}
          >
            {loading ? "Loading..." : "Save Points"}
          </button>

          <button
            type="button"
            className="manager-button-secondary"
            onClick={resetAllPoints}
            disabled={loading}
            style={{
              borderColor: "rgba(248, 113, 113, 0.55)",
              color: "#fecaca",
            }}
          >
            Reset Month
          </button>
        </div>
      </div>

      {message ? (
        <div className="manager-card" style={{ marginBottom: "16px" }}>
          <p className="manager-card-sub">{message}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="manager-card">
          <p className="manager-card-sub">Loading points...</p>
        </div>
      ) : (
        <div className="manager-form">
          {rows.map((row) => (
            <div key={row.name} className="manager-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div className="manager-card-title">
                  {row.name.toUpperCase()}
                </div>

                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "999px",
                    background: "rgba(34, 211, 238, 0.12)",
                    border: "1px solid rgba(34, 211, 238, 0.35)",
                    color: "#a5f3fc",
                    fontWeight: 800,
                    fontSize: "13px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Total: {getTotalPoints(row)}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                <label className="manager-label">
                  Recruit Points — 1 recruit = 3 points
                  <input
                    type="number"
                    min="0"
                    value={row.recruitPoints}
                    onChange={(e) =>
                      updateRow(row.name, "recruitPoints", e.target.value)
                    }
                    className="manager-input"
                  />
                </label>

                <label className="manager-label">
                  Submission Points
                  <input
                    type="number"
                    min="0"
                    value={row.submissionPoints}
                    onChange={(e) =>
                      updateRow(row.name, "submissionPoints", e.target.value)
                    }
                    className="manager-input"
                  />
                </label>

                <label className="manager-label">
                  Additional Points
                  <input
                    type="number"
                    min="0"
                    value={row.additionalPoints}
                    onChange={(e) =>
                      updateRow(row.name, "additionalPoints", e.target.value)
                    }
                    className="manager-input"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}