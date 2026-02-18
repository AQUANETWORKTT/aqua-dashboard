"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  ManagementData,
  ManagerId,
  ManagerRow,
  Meeting,
} from "@/lib/management-schema";
import {
  DEFAULT_MANAGEMENT_DATA,
  attendancePercent,
  clampNullableNumber,
} from "@/lib/management-schema";

const VALID_TARGET = 32; // %
const PAY_MAX = 60; // %

function slugifyMeetingLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function attendanceBadge(percent: number, totalMeetings: number) {
  if (!totalMeetings) return { text: "—", tone: "neutral" as const };
  if (percent < 70) return { text: `${percent}%`, tone: "red" as const };
  if (percent <= 95) return { text: `${percent}%`, tone: "yellow" as const };
  return { text: `${percent}%`, tone: "green" as const };
}

function validRateTone(rate: number | null) {
  if (rate === null || rate === undefined) return "neutral" as const;
  if (rate < VALID_TARGET * 0.5) return "red" as const; // < 16
  if (rate < VALID_TARGET) return "yellow" as const; // 16 - 31.99
  return "green" as const; // >= 32
}

function toneStyles(tone: "neutral" | "red" | "yellow" | "green") {
  if (tone === "red") {
    return {
      border: "1px solid rgba(255,77,77,0.45)",
      background: "rgba(255,77,77,0.12)",
    };
  }
  if (tone === "yellow") {
    return {
      border: "1px solid rgba(255,210,77,0.45)",
      background: "rgba(255,210,77,0.12)",
    };
  }
  if (tone === "green") {
    return {
      border: "1px solid rgba(77,255,160,0.40)",
      background: "rgba(77,255,160,0.10)",
    };
  }
  return {
    border: "1px solid rgba(45,224,255,0.22)",
    background: "rgba(45,224,255,0.08)",
  };
}

function isValidShape(x: any): x is ManagementData {
  return (
    x &&
    typeof x.updatedAtISO === "string" &&
    Array.isArray(x.managers) &&
    Array.isArray(x.meetings)
  );
}

function normalizeData(input: any): ManagementData {
  // If file is missing fields or managers, we merge with defaults
  const base = structuredClone(DEFAULT_MANAGEMENT_DATA) as ManagementData;

  if (!isValidShape(input)) return base;

  const byId = new Map<string, any>();
  for (const m of input.managers ?? []) {
    if (m?.id) byId.set(String(m.id).toLowerCase(), m);
  }

  const mergedManagers = base.managers.map((m) => {
    const src = byId.get(m.id);
    return {
      ...m,
      name: typeof src?.name === "string" ? src.name : m.name,
      validGoLiveRate:
        typeof src?.validGoLiveRate === "number" ? src.validGoLiveRate : null,
      recruitsThisWeek:
        typeof src?.recruitsThisWeek === "number" ? src.recruitsThisWeek : null,
      recruitsMTD: typeof src?.recruitsMTD === "number" ? src.recruitsMTD : null,
      avgDiamondsPerCreator:
        typeof src?.avgDiamondsPerCreator === "number"
          ? src.avgDiamondsPerCreator
          : null,
      matchesPerCreator:
        typeof src?.matchesPerCreator === "number" ? src.matchesPerCreator : null,
      currentPayPercent:
        typeof src?.currentPayPercent === "number" ? src.currentPayPercent : null,
      notes: typeof src?.notes === "string" ? src.notes : "",
    } satisfies ManagerRow;
  });

  // ✅ FIX: map can return null, so filter with a type-guard to get Meeting[]
  const meetings: Meeting[] = Array.isArray(input.meetings)
    ? input.meetings
        .map((m: any): Meeting | null => {
          if (!m || typeof m !== "object") return null;
          if (
            typeof m.id !== "string" ||
            typeof m.label !== "string" ||
            typeof m.dateISO !== "string"
          )
            return null;

          const attendance = (m.attendance ?? {}) as Record<string, boolean>;
          const cleanAttendance: Record<string, boolean> = {};
          for (const k of Object.keys(attendance)) {
            cleanAttendance[String(k).toLowerCase()] = !!attendance[k];
          }

          return {
            id: m.id,
            label: m.label,
            dateISO: m.dateISO,
            attendance: cleanAttendance,
          };
        })
        .filter((m): m is Meeting => m !== null)
    : [];

  return {
    updatedAtISO:
      typeof input.updatedAtISO === "string" ? input.updatedAtISO : base.updatedAtISO,
    managers: mergedManagers,
    meetings,
  };
}

function downloadJSON(filename: string, obj: any) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminManagementClient() {
  const [data, setData] = useState<ManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [activeManager, setActiveManager] = useState<ManagerId | "all">("all");
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/management/get", { cache: "no-store" });
        const json = await res.json();
        if (json?.ok) setData(normalizeData(json.data));
        else setData(structuredClone(DEFAULT_MANAGEMENT_DATA));
      } catch {
        setData(structuredClone(DEFAULT_MANAGEMENT_DATA));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const managers = data?.managers ?? [];
  const meetings = data?.meetings ?? [];
  const managerOptions = useMemo(() => managers.map((m) => m.id), [managers]);

  const activeMeeting = useMemo(() => {
    if (!activeMeetingId) return null;
    return meetings.find((m) => m.id === activeMeetingId) ?? null;
  }, [meetings, activeMeetingId]);

  const filteredManagers = useMemo(() => {
    if (!data) return [];
    if (activeManager === "all") return data.managers;
    return data.managers.filter((m) => m.id === activeManager);
  }, [data, activeManager]);

  function updateManager(id: ManagerId, patch: Partial<ManagerRow>) {
    if (!data) return;
    setData({
      ...data,
      managers: data.managers.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  }

  function updateMeeting(meetingId: string, patch: Partial<Meeting>) {
    if (!data) return;
    setData({
      ...data,
      meetings: data.meetings.map((m) =>
        m.id === meetingId ? { ...m, ...patch } : m
      ),
    });
  }

  function toggleAttendance(meetingId: string, managerId: ManagerId) {
    if (!data) return;
    const meeting = data.meetings.find((m) => m.id === meetingId);
    if (!meeting) return;

    const current = !!meeting.attendance?.[managerId];
    const nextAttendance = { ...(meeting.attendance ?? {}) };
    nextAttendance[managerId] = !current;

    updateMeeting(meetingId, { attendance: nextAttendance });
  }

  function addMeeting() {
    if (!data) return;

    const label = prompt("Meeting label (e.g. Feb Week 1):")?.trim();
    if (!label) return;

    const dateISO = prompt("Meeting date (YYYY-MM-DD):", todayISO())?.trim();
    if (!dateISO) return;

    const id = `${dateISO}-${slugifyMeetingLabel(label)}`;

    const next: Meeting = {
      id,
      label,
      dateISO,
      attendance: {},
    };

    setData({
      ...data,
      meetings: [...data.meetings, next].sort((a, b) =>
        a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0
      ),
    });

    setActiveMeetingId(id);
  }

  function deleteMeeting(meetingId: string) {
    if (!data) return;
    const ok = confirm("Delete this meeting? This removes attendance marks too.");
    if (!ok) return;

    const nextMeetings = data.meetings.filter((m) => m.id !== meetingId);
    setData({ ...data, meetings: nextMeetings });
    setActiveMeetingId(null);
  }

  function onClickUpload() {
    fileInputRef.current?.click();
  }

  async function onFilePicked(file: File | null) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = normalizeData(parsed);
      setData(normalized);
      setToast("Uploaded JSON ✅ (remember to Download + commit)");
    } catch {
      setToast("Upload failed: invalid JSON file");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function downloadCurrent() {
    if (!data) return;
    const stamped: ManagementData = {
      ...data,
      updatedAtISO: new Date().toISOString(),
    };
    downloadJSON("management-data.json", stamped);
    setToast("Downloaded JSON ✅ (replace /data/management-data.json)");
  }

  if (loading) {
    return (
      <main style={{ padding: 22, color: "white" }}>
        <div style={{ opacity: 0.8 }}>Loading management portal…</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ padding: 22, color: "white" }}>
        <div style={{ opacity: 0.85 }}>No data loaded.</div>
      </main>
    );
  }

  return (
    <main style={{ padding: 18, color: "white" }}>
      {/* Hidden uploader */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
      />

      {/* Top Bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          padding: "14px 14px",
          borderRadius: 14,
          background: "rgba(3,16,26,0.92)",
          border: "1px solid rgba(45,224,255,0.35)",
          boxShadow: "0 0 18px rgba(45,224,255,0.12)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              Aqua Management Admin
            </div>
            <div style={{ opacity: 0.65, fontSize: 13 }}>
              Updated: {new Date(data.updatedAtISO).toLocaleString("en-GB")}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Manager switcher */}
            <select
              value={activeManager}
              onChange={(e) =>
                setActiveManager(e.target.value as ManagerId | "all")
              }
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(45,224,255,0.35)",
                background: "#061826",
                color: "white",
                fontWeight: 700,
              }}
            >
              <option value="all">All managers</option>
              {managerOptions.map((id) => {
                const m = managers.find((x) => x.id === id);
                return (
                  <option key={id} value={id}>
                    {m?.name ?? id}
                  </option>
                );
              })}
            </select>

            {/* Upload + Download */}
            <button
              onClick={onClickUpload}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(45,224,255,0.55)",
                background: "transparent",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Upload JSON
            </button>

            <button
              onClick={downloadCurrent}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(45,224,255,0.55)",
                background: "rgba(45,224,255,0.10)",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Download JSON
            </button>
          </div>
        </div>

        {toast && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(45,224,255,0.12)",
              border: "1px solid rgba(45,224,255,0.25)",
              fontWeight: 800,
            }}
          >
            {toast}
          </div>
        )}
      </div>

      {/* Admin layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.8fr 1fr",
          gap: 14,
          marginTop: 14,
          alignItems: "start",
        }}
      >
        {/* Left: Big table */}
        <section
          style={{
            borderRadius: 16,
            background: "#03101a",
            border: "1px solid rgba(45,224,255,0.25)",
            boxShadow: "0 0 18px rgba(45,224,255,0.10)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 14px",
              borderBottom: "1px solid rgba(45,224,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 16 }}>
              Managers Overview
            </div>
            <div style={{ opacity: 0.7, fontSize: 13 }}>
              Valid target: <b>{VALID_TARGET}%</b> · Pay max: <b>{PAY_MAX}%</b>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 12, opacity: 0.9 }}>
                  <th style={th}>Manager</th>
                  <th style={th}>Attendance</th>
                  <th style={th}>Valid %</th>
                  <th style={th}>Pay % (max 60)</th>
                  <th style={th}>Recruits (wk)</th>
                  <th style={th}>Recruits (MTD)</th>
                  <th style={th}>Avg diamonds/creator</th>
                  <th style={th}>Matches/creator</th>
                  <th style={th}>Notes</th>
                  <th style={th}></th>
                </tr>
              </thead>

              <tbody>
                {filteredManagers.map((m) => {
                  const att = attendancePercent(m.id, meetings);
                  const attBadge = attendanceBadge(att.percent, att.total);
                  const validTone = validRateTone(m.validGoLiveRate);
                  const portalUrl = `/management/${m.id}`;

                  return (
                    <tr key={m.id} style={{ borderTop: rowBorder }}>
                      <td style={td}>
                        <div style={{ fontWeight: 900 }}>{m.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.65 }}>{m.id}</div>
                      </td>

                      <td style={td}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            borderRadius: 999,
                            fontWeight: 950,
                            ...toneStyles(attBadge.tone),
                          }}
                        >
                          {attBadge.text}
                          <span style={{ opacity: 0.75, fontWeight: 900 }}>
                            ({att.attended}/{att.total || 0})
                          </span>
                        </div>
                      </td>

                      <td style={td}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <NumInput
                            value={m.validGoLiveRate}
                            suffix="%"
                            onChange={(v) =>
                              updateManager(m.id, { validGoLiveRate: v })
                            }
                            boxTone={validTone}
                          />
                          <div
                            style={{
                              fontSize: 12,
                              opacity: 0.75,
                              fontWeight: 800,
                            }}
                          >
                            Valid go live rate target is {VALID_TARGET}%
                          </div>
                        </div>
                      </td>

                      <td style={td}>
                        <NumInput
                          value={m.currentPayPercent}
                          suffix="%"
                          onChange={(v) => {
                            const clamped =
                              v === null ? null : Math.max(0, Math.min(PAY_MAX, v));
                            updateManager(m.id, { currentPayPercent: clamped });
                          }}
                        />
                      </td>

                      <td style={td}>
                        <NumInput
                          value={m.recruitsThisWeek}
                          onChange={(v) =>
                            updateManager(m.id, { recruitsThisWeek: v })
                          }
                        />
                      </td>

                      <td style={td}>
                        <NumInput
                          value={m.recruitsMTD}
                          onChange={(v) => updateManager(m.id, { recruitsMTD: v })}
                        />
                      </td>

                      <td style={td}>
                        <NumInput
                          value={m.avgDiamondsPerCreator}
                          onChange={(v) =>
                            updateManager(m.id, { avgDiamondsPerCreator: v })
                          }
                        />
                      </td>

                      <td style={td}>
                        <NumInput
                          value={m.matchesPerCreator}
                          onChange={(v) =>
                            updateManager(m.id, { matchesPerCreator: v })
                          }
                        />
                      </td>

                      <td style={td}>
                        <textarea
                          value={m.notes}
                          onChange={(e) =>
                            updateManager(m.id, { notes: e.target.value })
                          }
                          placeholder="Notes for this manager…"
                          style={{
                            width: 260,
                            minHeight: 46,
                            resize: "vertical",
                            padding: "10px 10px",
                            borderRadius: 12,
                            border: "1px solid rgba(45,224,255,0.22)",
                            background: "#061826",
                            color: "white",
                            fontWeight: 650,
                            outline: "none",
                          }}
                        />
                      </td>

                      <td style={td}>
                        <a
                          href={portalUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(45,224,255,0.35)",
                            color: "white",
                            textDecoration: "none",
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                          }}
                        >
                          View portal →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right: Meetings / attendance */}
        <section
          style={{
            borderRadius: 16,
            background: "#03101a",
            border: "1px solid rgba(45,224,255,0.25)",
            boxShadow: "0 0 18px rgba(45,224,255,0.10)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 14px",
              borderBottom: "1px solid rgba(45,224,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 16 }}>Meetings</div>
            <button
              onClick={addMeeting}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(45,224,255,0.55)",
                background: "transparent",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              + Add
            </button>
          </div>

          <div style={{ padding: 14 }}>
            {meetings.length === 0 ? (
              <div style={{ opacity: 0.75, lineHeight: 1.6 }}>
                No meetings yet. Click <b>+ Add</b> to create meetings and mark
                attendance.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <select
                  value={activeMeetingId ?? ""}
                  onChange={(e) => setActiveMeetingId(e.target.value || null)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(45,224,255,0.35)",
                    background: "#061826",
                    color: "white",
                    fontWeight: 800,
                  }}
                >
                  <option value="">Select a meeting…</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} — {m.dateISO}
                    </option>
                  ))}
                </select>

                {activeMeeting && (
                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(45,224,255,0.20)",
                      background: "rgba(6,24,38,0.8)",
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900 }}>{activeMeeting.label}</div>
                        <div style={{ opacity: 0.7, fontSize: 13 }}>
                          {activeMeeting.dateISO}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMeeting(activeMeeting.id)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,77,77,0.45)",
                          background: "transparent",
                          color: "white",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      {managers.map((mgr) => {
                        const checked = !!activeMeeting.attendance?.[mgr.id];
                        return (
                          <label
                            key={mgr.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              padding: "10px 10px",
                              borderRadius: 12,
                              border: "1px solid rgba(45,224,255,0.16)",
                              background: "rgba(3,16,26,0.65)",
                              cursor: "pointer",
                            }}
                          >
                            <span style={{ fontWeight: 850 }}>{mgr.name}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleAttendance(activeMeeting.id, mgr.id)
                              }
                              style={{ transform: "scale(1.15)" }}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function NumInput({
  value,
  onChange,
  suffix,
  boxTone,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  boxTone?: "neutral" | "red" | "yellow" | "green";
}) {
  const tone = boxTone ?? "neutral";
  const styles = toneStyles(tone);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(clampNullableNumber(e.target.value))}
        inputMode="decimal"
        style={{
          width: 110,
          padding: "10px 10px",
          borderRadius: 12,
          border: styles.border,
          background: "#061826",
          color: "white",
          fontWeight: 850,
          outline: "none",
          boxShadow:
            tone === "neutral" ? "none" : "0 0 14px rgba(255,255,255,0.04)",
        }}
        placeholder="—"
      />
      {suffix ? (
        <span style={{ opacity: 0.7, fontWeight: 900 }}>{suffix}</span>
      ) : null}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "12px 12px",
  borderBottom: "1px solid rgba(45,224,255,0.18)",
  background: "rgba(6,24,38,0.65)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "12px 12px",
  verticalAlign: "top",
};

const rowBorder = "1px solid rgba(45,224,255,0.12)";
