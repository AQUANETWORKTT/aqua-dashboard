"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ManagerRow = {
  name: string;
  recruitPoints: number;
  submissionPoints: number;
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

export default function ManagerPointsPage() {
  const [rows, setRows] = useState<ManagerRow[]>(defaultManagers);
  const [message, setMessage] = useState("");
  const [checkedAccess, setCheckedAccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hasAccess = localStorage.getItem("manager_admin_access");

    if (hasAccess !== "true") {
      router.push("/manager/admin");
      return;
    }

    const saved = localStorage.getItem("manager_points_v2");

    if (saved) {
      setRows(JSON.parse(saved));
    } else {
      localStorage.setItem("manager_points_v2", JSON.stringify(defaultManagers));
      setRows(defaultManagers);
    }

    setCheckedAccess(true);
  }, [router]);

  const updateRow = (
    name: string,
    field: "recruitPoints" | "submissionPoints",
    value: string
  ) => {
    const numberValue = Math.max(0, Number(value) || 0);

    setRows((current) =>
      current.map((row) =>
        row.name === name ? { ...row, [field]: numberValue } : row
      )
    );
  };

  const savePoints = () => {
    localStorage.setItem("manager_points_v2", JSON.stringify(rows));
    setMessage("Points saved.");
  };

  if (!checkedAccess) return null;

  return (
    <section className="manager-wrapper">
      <div className="manager-hero">
        <div className="manager-pill">Admin Points</div>
        <h1 className="manager-title">Edit Points</h1>
        <p className="manager-subtitle">
          Manually adjust recruit and submission points for this month.
        </p>

        <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
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
          >
            Save Points
          </button>
        </div>
      </div>

      {message ? (
        <div className="manager-card" style={{ marginBottom: "16px" }}>
          <p className="manager-card-sub">{message}</p>
        </div>
      ) : null}

      <div className="manager-form">
        {rows.map((row) => (
          <div key={row.name} className="manager-card">
            <div className="manager-card-title">
              {row.name.toUpperCase()}
            </div>

            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "12px",
              }}
            >
              <label className="manager-label">
                Recruit Points
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
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}