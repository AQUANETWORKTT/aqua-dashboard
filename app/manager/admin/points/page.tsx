"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type ManagerRow = {
  name: string;
  recruitPoints: number;
  submissionPoints: number;
  pointAdjustments: number;
  targetPoints: number;
};

type ManagerPointsDbRow = {
  name: string;
  recruit_points: number | null;
  submission_points: number | null;
  additional_points: number | null;
};

type ManagerTargetDbRow = {
  name: string;
  target_points: number | null;
};

const defaultTargets: Record<string, number> = {
  james: 50,
  alfie: 50,
  dylan: 40,
  mavis: 15,
  chris: 40,
  ellie: 35,
  teddie: 30,
  millie: 30,
  vitali: 50,
  harry: 35,
  joechloe: 30,
};

function getDefaultTarget(name: string) {
  return defaultTargets[name] ?? 35;
}

const defaultManagers: ManagerRow[] = [
  { name: "james", recruitPoints: 0, submissionPoints: 0, pointAdjustments: 0, targetPoints: 50 },
  { name: "alfie", recruitPoints: 0, submissionPoints: 0, pointAdjustments: 0, targetPoints: 50 },
  { name: "dylan", recruitPoints: 0, submissionPoints: 0, pointAdjustments: 0, targetPoints: 40 },
  { name: "mavis", recruitPoints: 0, submissionPoints: 0, pointAdjustments: 0, targetPoints: 15 },
  { name: "chris", recruitPoints: 0, submissionPoints: 0, pointAdjustments: 0, targetPoints: 40 },

  { name: "ellie", recruitPoints: 0, submissionPoints: 0, pointAdjustments: 0, targetPoints: 35 },

  { name: "teddie", recruitPoints: 0, submissionPoints: 0, pointAdjustments: 0, targetPoints: 30 },
  { name: "millie", recruitPoints: 0, submissionPoints: 0, pointAdjustments: 0, targetPoints: 30 },
  { name: "vitali", recruitPoints: 0, submissionPoints: 0, pointAdjustments: 0, targetPoints: 50 },
  { name: "harry", recruitPoints: 0, submissionPoints: 0, pointAdjustments: 0, targetPoints: 35 },
  { name: "joechloe", recruitPoints: 0, submissionPoints: 0, pointAdjustments: 0, targetPoints: 30 },
];

const POINTS_PER_RECRUIT = 3;

function getTotalPoints(row: ManagerRow) {
  return (
    row.recruitPoints * POINTS_PER_RECRUIT +
    row.submissionPoints +
    row.pointAdjustments
  );
}

function getDisplayName(name: string) {
  if (name === "ellie") return "ELLIE";
  if (name === "ellie1") return "ELLIE B";
  if (name === "joechloe") return "JOE & CHLOE";
  return name.toUpperCase();
}

export default function ManagerPointsPage() {
  const [rows, setRows] = useState<ManagerRow[]>(defaultManagers);
  const [message, setMessage] = useState("");
  const [checkedAccess, setCheckedAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function loadPoints() {
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
    const { data: targetData } = await submissionsSupabase
      .from("manager_targets")
      .select("name,target_points");
    const targetRows = (targetData || []) as ManagerTargetDbRow[];

    const mergedRows = defaultManagers.map((manager) => {
      const targetPoints =
        targetRows.find((row) => row.name === manager.name)?.target_points ??
        getDefaultTarget(manager.name);

      if (manager.name === "joechloe") {
        const joe = dbRows.find((row) => row.name === "joe");
        const chloe = dbRows.find((row) => row.name === "chloe");

        return {
          name: "joechloe",
          recruitPoints:
            (joe?.recruit_points ?? 0) + (chloe?.recruit_points ?? 0),
          submissionPoints:
            (joe?.submission_points ?? 0) + (chloe?.submission_points ?? 0),
          pointAdjustments:
            (joe?.additional_points ?? 0) + (chloe?.additional_points ?? 0),
          targetPoints,
        };
      }

      const existing = dbRows.find((row) => row.name === manager.name);

      return {
        name: manager.name,
        recruitPoints: existing?.recruit_points ?? 0,
        submissionPoints: existing?.submission_points ?? 0,
        pointAdjustments: existing?.additional_points ?? 0,
        targetPoints,
      };
    });

    setRows(mergedRows);
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(() => {
      const hasAccess = localStorage.getItem("manager_admin_access");

      if (hasAccess !== "true") {
        router.push("/manager/admin");
        return;
      }

      setCheckedAccess(true);
      loadPoints();
    });
  }, [router]);

  const updateRow = (
    name: string,
    field: "recruitPoints" | "submissionPoints" | "pointAdjustments" | "targetPoints",
    value: string
  ) => {
    const rawNumber = Number(value) || 0;
    const numberValue =
      field === "pointAdjustments" ? rawNumber : Math.max(0, rawNumber);

    setRows((current) =>
      current.map((row) =>
        row.name === name ? { ...row, [field]: numberValue } : row
      )
    );
  };

  const savePoints = async () => {
    setMessage("Saving...");

    const normalRows = rows.filter((row) => row.name !== "joechloe");
    const joeChloeRow = rows.find((row) => row.name === "joechloe");

    const payload = normalRows.map((row) => ({
      name: row.name,
      recruit_points: row.recruitPoints,
      submission_points: row.submissionPoints,
      additional_points: row.pointAdjustments,
    }));

    if (joeChloeRow) {
      payload.push(
        {
          name: "joe",
          recruit_points: joeChloeRow.recruitPoints,
          submission_points: joeChloeRow.submissionPoints,
          additional_points: joeChloeRow.pointAdjustments,
        },
        {
          name: "chloe",
          recruit_points: 0,
          submission_points: 0,
          additional_points: 0,
        }
      );
    }

    const { error } = await submissionsSupabase
      .from("manager_points")
      .upsert(payload, { onConflict: "name" });

    if (error) {
      setMessage(error.message);
      return;
    }

    const targetPayload = rows.map((row) => ({
      name: row.name,
      target_points: row.targetPoints,
      updated_at: new Date().toISOString(),
    }));

    const { error: targetError } = await submissionsSupabase
      .from("manager_targets")
      .upsert(targetPayload, { onConflict: "name" });

    if (targetError) {
      setMessage(targetError.message);
      return;
    }

    setMessage("Points saved.");
    await loadPoints();
  }

  const resetAllPoints = async () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset ALL manager points to 0 for the new month?"
    );

    if (!confirmReset) return;

    setLoading(true);
    setMessage("Resetting all manager points...");

    const payload = [
      ...defaultManagers
        .filter((manager) => manager.name !== "joechloe")
        .map((manager) => ({
          name: manager.name,
          recruit_points: 0,
          submission_points: 0,
          additional_points: 0,
        })),
      {
        name: "joe",
        recruit_points: 0,
        submission_points: 0,
        additional_points: 0,
      },
      {
        name: "chloe",
        recruit_points: 0,
        submission_points: 0,
        additional_points: 0,
      },
    ];

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
          Manually adjust manager points for this month. 1 recruit = 3 points. Point adjustments can be positive or negative.
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
                  {getDisplayName(row.name)}
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
                  Points Target
                  <input
                    type="number"
                    min="0"
                    value={row.targetPoints}
                    onChange={(e) =>
                      updateRow(row.name, "targetPoints", e.target.value)
                    }
                    className="manager-input"
                  />
                </label>

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
                  Point Adjustments
                  <input
                    type="number"
                    step="1"
                    value={row.pointAdjustments}
                    onChange={(e) =>
                      updateRow(row.name, "pointAdjustments", e.target.value)
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
