"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Status = "ON_TRACK" | "NEEDS_FOCUS" | "INACTIVE";

export type ClientRow = {
  username: string;
  monthDiamonds: number;
  monthHours: number;
  validDays: number;
  underHourDays: number;
  lastLiveDate?: string;
  daysSinceLastLive?: number;
  status: Status;
  avatarSrc: string;
  manager: string;
};

type Props = {
  rows: ClientRow[];
  managers: readonly string[];
  targetDays: number;
  targetHours: number;
  nextLevelDays: number;
  nextLevelHours: number;
  showSinceLiveIfOverDays: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function ImprovementsClient({
  rows,
  managers,
  targetDays,
  targetHours,
  nextLevelDays,
  nextLevelHours,
  showSinceLiveIfOverDays,
}: Props) {
  const baseRows = Array.isArray(rows) ? rows : [];

  const [selectedManager, setSelectedManager] = useState<string>("All");

  const filtered = useMemo(() => {
    if (selectedManager === "All") return baseRows;
    return baseRows.filter((r) => r.manager === selectedManager);
  }, [baseRows, selectedManager]);

  const counts = useMemo(() => {
    return {
      onTrack: filtered.filter((r) => r.status === "ON_TRACK").length,
      needsFocus: filtered.filter((r) => r.status === "NEEDS_FOCUS").length,
      inactive: filtered.filter((r) => r.status === "INACTIVE").length,
      total: filtered.length,
    };
  }, [filtered]);

  /* ===================== STYLES ===================== */

  const pillRowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  };

  const pillStyle = (
    accent: "cyan" | "red" | "green" | "white"
  ): React.CSSProperties => {
    const border =
      accent === "cyan"
        ? "rgba(124,246,255,0.40)"
        : accent === "red"
        ? "rgba(255,77,77,0.45)"
        : accent === "green"
        ? "rgba(77,255,207,0.35)"
        : "rgba(255,255,255,0.18)";

    const bg =
      accent === "cyan"
        ? "rgba(45,224,255,0.10)"
        : accent === "red"
        ? "rgba(255,77,77,0.10)"
        : accent === "green"
        ? "rgba(77,255,207,0.08)"
        : "rgba(255,255,255,0.06)";

    const color =
      accent === "cyan"
        ? "#7cf6ff"
        : accent === "red"
        ? "#ff6b6b"
        : accent === "green"
        ? "#4dffcf"
        : "rgba(255,255,255,0.85)";

    return {
      padding: "7px 12px",
      borderRadius: 999,
      border: `1px solid ${border}`,
      background: bg,
      color,
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    };
  };

  const tableOuter: React.CSSProperties = {
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(45,224,255,0.18)",
    background: "rgba(4, 21, 33, 0.82)",
    boxShadow: "0 0 32px rgba(45,224,255,0.08)",
  };

  const headerRow: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "4fr 2fr 2fr 2fr 2fr",
    gap: 10,
    padding: "12px 14px",
    background: "rgba(45,224,255,0.08)",
    borderBottom: "1px solid rgba(45,224,255,0.18)",
    color: "rgba(124,246,255,0.95)",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  };

  const rowStyle = (idx: number): React.CSSProperties => ({
    display: "grid",
    gridTemplateColumns: "4fr 2fr 2fr 2fr 2fr",
    gap: 10,
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background:
      idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.00)",
  });

  const creatorCell: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  };

  const avatarStyle: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 999,
    objectFit: "cover",
    border: "1px solid rgba(124,246,255,0.40)",
    boxShadow: "0 0 12px rgba(45,224,255,0.30)",
    flex: "0 0 auto",
  };

  const usernameStyle: React.CSSProperties = {
    fontWeight: 900,
    color: "#7cf6ff",
    textShadow: "0 0 8px rgba(45,224,255,0.45)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const metaLine: React.CSSProperties = {
    marginTop: 4,
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    fontSize: 12,
    color: "rgba(255,255,255,0.70)",
  };

  const miniTag: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
  };

  const statusBadge = (status: Status): React.CSSProperties => {
    if (status === "ON_TRACK") {
      return {
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(77,255,207,0.35)",
        background: "rgba(77,255,207,0.08)",
        color: "#4dffcf",
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      };
    }
    if (status === "INACTIVE") {
      return {
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,77,77,0.45)",
        background: "rgba(255,77,77,0.10)",
        color: "#ff6b6b",
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      };
    }
    return {
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid rgba(124,246,255,0.40)",
      background: "rgba(45,224,255,0.10)",
      color: "#7cf6ff",
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    };
  };

  const centerCell: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontWeight: 900,
    letterSpacing: "0.02em",
  };

  const dangerText: React.CSSProperties = {
    color: "#ff6b6b",
    textShadow: "0 0 10px rgba(255,77,77,0.25)",
  };

  const okText: React.CSSProperties = {
    color: "#4dffcf",
    textShadow: "0 0 10px rgba(77,255,207,0.18)",
  };

  const linkStyle: React.CSSProperties = {
    display: "inline-block",
    marginTop: 6,
    fontSize: 12,
    fontWeight: 900,
    color: "#2de0ff",
    textShadow: "0 0 10px rgba(45,224,255,0.30)",
    textDecoration: "none",
  };

  const barOuter: React.CSSProperties = {
    width: 120,
    height: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    overflow: "hidden",
    marginTop: 6,
  };

  const barInner = (pct: number, ok: boolean): React.CSSProperties => ({
    height: "100%",
    width: `${clamp(pct, 0, 100)}%`,
    borderRadius: 999,
    background: ok
      ? "linear-gradient(90deg, rgba(77,255,207,0.90), rgba(45,224,255,0.55))"
      : "linear-gradient(90deg, rgba(255,77,77,0.95), rgba(255,140,140,0.70))",
  });

  const managerTag: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    color: "rgba(255,255,255,0.85)",
  };

  const statusNote = (r: ClientRow): string => {
    if (r.status === "INACTIVE") return "0 days • 0 hours";
    if (r.status === "ON_TRACK") {
      const daysLeft = Math.max(0, nextLevelDays - r.validDays);
      const hoursLeft = Math.max(0, nextLevelHours - r.monthHours);
      return `Until next level: ${daysLeft} day(s) & ${hoursLeft.toFixed(
        1
      )} hour(s)`;
    }
    if (r.underHourDays > 4) return "Needs to do 1-hour lives";
    return "Needs more days / hours";
  };

  return (
    <>
      {/* Filter + counts */}
      <section
        style={{ ...tableOuter, padding: 14, borderRadius: 18, overflow: "visible" }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(124,246,255,0.95)",
            }}
          >
            Manager
          </div>

          <select
            value={selectedManager}
            onChange={(e) => setSelectedManager(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(45,224,255,0.25)",
              background: "rgba(4, 21, 33, 0.85)",
              color: "white",
              fontWeight: 900,
              outline: "none",
            }}
          >
            {managers.map((m) => (
              <option key={m} value={m} style={{ color: "black" }}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div style={pillRowStyle}>
          <span style={pillStyle("green")}>On track: {counts.onTrack}</span>
          <span style={pillStyle("cyan")}>Needs focus: {counts.needsFocus}</span>
          <span style={pillStyle("red")}>Inactive: {counts.inactive}</span>
          <span style={pillStyle("white")}>
            Total: <span style={{ color: "#7cf6ff" }}>{counts.total}</span>
          </span>
        </div>
      </section>

      {/* Table */}
      <section style={tableOuter}>
        <div style={headerRow} className="aqua-table-head">
          <div>Creator</div>
          <div style={{ textAlign: "center" }}>Valid Days</div>
          <div style={{ textAlign: "center" }}>Hours</div>
          <div style={{ textAlign: "center" }}>Under 1h</div>
          <div style={{ textAlign: "center" }}>Status</div>
        </div>

        {filtered.map((r, idx) => {
          const needsDays = r.validDays < targetDays;
          const needsHours = r.monthHours < targetHours;

          const validPct = (r.validDays / targetDays) * 100;
          const hoursPct = (r.monthHours / targetHours) * 100;

          const showSinceLive =
            typeof r.daysSinceLastLive === "number" &&
            r.daysSinceLastLive > showSinceLiveIfOverDays;

          return (
            <div key={r.username} style={rowStyle(idx)} className="aqua-table-row">
              {/* Creator */}
              <div style={creatorCell} className="aqua-creator">
                <img src={r.avatarSrc} alt={r.username} style={avatarStyle} />

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={usernameStyle}>{r.username}</div>
                    <span style={managerTag}>{r.manager}</span>
                    <span style={statusBadge(r.status)}>
                      {r.status === "ON_TRACK"
                        ? "On track"
                        : r.status === "INACTIVE"
                        ? "Inactive"
                        : "Needs focus"}
                    </span>
                  </div>

                  <div style={metaLine}>
                    <span style={miniTag}>💎 {Math.round(r.monthDiamonds).toLocaleString()}</span>
                    <span style={miniTag}>⏱ {r.monthHours.toFixed(1)}h</span>
                    <span style={miniTag}>✅ {r.validDays} days</span>
                    {showSinceLive && (
                      <span style={{ ...miniTag, border: "1px solid rgba(255,77,77,0.25)" }}>
                        ⚠️ {r.daysSinceLastLive}d since live
                      </span>
                    )}
                  </div>

                  <Link href={`/creator/${encodeURIComponent(r.username)}`} style={linkStyle}>
                    View dashboard →
                  </Link>
                </div>
              </div>

              {/* Valid Days */}
              <div style={centerCell} className="aqua-cell-center" data-label="Valid Days">
                <div>
                  <div style={needsDays ? dangerText : okText}>
                    {r.validDays} / {targetDays}
                  </div>
                  <div style={barOuter} className="aqua-bars">
                    <div style={barInner(validPct, !needsDays)} />
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div style={centerCell} className="aqua-cell-center" data-label="Hours">
                <div>
                  <div style={needsHours ? dangerText : okText}>
                    {r.monthHours.toFixed(1)} / {targetHours}
                  </div>
                  <div style={barOuter} className="aqua-bars">
                    <div style={barInner(hoursPct, !needsHours)} />
                  </div>
                </div>
              </div>

              {/* Under 1h */}
              <div style={centerCell} className="aqua-cell-center" data-label="Under 1h">
                <div>
                  <div style={r.underHourDays > 0 ? dangerText : okText}>{r.underHourDays}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                    under 1h
                  </div>
                </div>
              </div>

              {/* Status */}
              <div style={centerCell} className="aqua-cell-center" data-label="Status">
                <div>
                  <div
                    style={
                      r.status === "ON_TRACK"
                        ? okText
                        : r.status === "INACTIVE"
                        ? dangerText
                        : { color: "#7cf6ff", textShadow: "0 0 10px rgba(45,224,255,0.25)" }
                    }
                  >
                    {r.status === "ON_TRACK"
                      ? "On track"
                      : r.status === "INACTIVE"
                      ? "Inactive"
                      : "Needs focus"}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.72)" }}>
                    {statusNote(r)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
