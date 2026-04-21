"use client";

import { useEffect, useState } from "react";

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

function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeManagerRow(
  raw: Partial<ManagerRow> & { name?: string }
): ManagerRow {
  return {
    name: String(raw.name || "").toLowerCase(),
    recruitPoints: toNumber(raw.recruitPoints),
    submissionPoints: toNumber(raw.submissionPoints),
  };
}

export default function ManagerPointsAdminPage() {
  const [rows, setRows] = useState<ManagerRow[]>(defaultManagers);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("manager_points_v2");

    if (saved) {
      const parsed = JSON.parse(saved) as Array<Partial<ManagerRow>>;
      const normalized = parsed.map(normalizeManagerRow);

      const merged = defaultManagers.map((manager) => {
        const existing = normalized.find((item) => item.name === manager.name);
        return existing ? existing : manager;
      });

      setRows(merged);

      const initialInputs: Record<string, string> = {};
      merged.forEach((manager) => {
        initialInputs[manager.name] = String(manager.recruitPoints);
      });
      setInputs(initialInputs);

      localStorage.setItem("manager_points_v2", JSON.stringify(merged));
    } else {
      setRows(defaultManagers);

      const initialInputs: Record<string, string> = {};
      defaultManagers.forEach((manager) => {
        initialInputs[manager.name] = "0";
      });
      setInputs(initialInputs);

      localStorage.setItem("manager_points_v2", JSON.stringify(defaultManagers));
    }
  }, []);

  const updateInput = (name: string, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitSingle = (name: string) => {
    const rawValue = inputs[name];
    const recruitPoints = Number(rawValue);

    if (rawValue === "" || Number.isNaN(recruitPoints) || recruitPoints < 0) {
      setMessage(`Enter a valid recruit number for ${name}.`);
      return;
    }

    const nextRows = rows.map((manager) =>
      manager.name === name
        ? { ...manager, recruitPoints }
        : manager
    );

    setRows(nextRows);
    localStorage.setItem("manager_points_v2", JSON.stringify(nextRows));

    setMessage(`${name} recruit points updated to ${recruitPoints}.`);
  };

  return (
    <section className="manager-wrapper">
      <div className="manager-hero">
        <div className="manager-pill">Admin Points</div>
        <h1 className="manager-title">Recruit Input</h1>
        <p className="manager-subtitle">
          Set recruit points manually. Submission points are added automatically from approved uploads.
        </p>
      </div>

      <div className="manager-card">
        {message ? (
          <p className="manager-message" style={{ marginBottom: "16px" }}>
            {message}
          </p>
        ) : null}

        <div className="manager-form" style={{ gap: "14px" }}>
          {rows.map((manager) => {
            const currentPoints =
              manager.recruitPoints + manager.submissionPoints;

            return (
              <div
                key={manager.name}
                className="manager-submission"
                style={{
                  padding: "16px",
                  display: "grid",
                  gap: "12px",
                }}
              >
                <div
                  className="manager-admin-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.9fr 1fr auto",
                    gap: "12px",
                    alignItems: "end",
                  }}
                >
                  <div>
                    <div
                      className="manager-card-title"
                      style={{ marginBottom: "4px", textTransform: "capitalize" }}
                    >
                      {manager.name}
                    </div>
                    <div className="manager-small">
                      Recruit points: {manager.recruitPoints}
                    </div>
                    <div className="manager-small">
                      Submission points: {manager.submissionPoints}
                    </div>
                    <div className="manager-small">
                      Current points: {currentPoints}
                    </div>
                  </div>

                  <label className="manager-label manager-label-glow">
                    Recruits
                    <input
                      type="number"
                      min="0"
                      value={inputs[manager.name] ?? ""}
                      onChange={(e) => updateInput(manager.name, e.target.value)}
                      className="manager-input"
                    />
                  </label>

                  <div className="manager-small" style={{ paddingBottom: "12px" }}>
                    Set recruit points only
                  </div>

                  <button
                    type="button"
                    className="manager-button"
                    onClick={() => handleSubmitSingle(manager.name)}
                  >
                    Submit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}