"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { creators } from "@/data/creators";
import { incentiveExtras } from "@/data/incentive-extras";

/* ===================== TYPES ===================== */

type HistoryEntry = {
  date: string; // "YYYY-MM-DD"
  daily: number;
  lifetime: number;
  hours?: number;
};

type HistoryFile = {
  username: string;
  entries: HistoryEntry[];
};

type IncentiveStats = {
  diamonds: number; // month diamonds (calculated)
  hours: number; // month hours (calculated)
  validDays: number; // month valid days (>= 1h)
  top5Count: number;
  calculatedPoints: number;
  extrasPoints: number; // incentiveExtras
};

type TierConfig = {
  id: number; // 1..10
  min: number; // diamonds threshold (monthly)
  label: string;
  color: string;
  incentiveCoins: number;
};

type ActivenessRule = {
  level: number; // 1..5
  days: number;
  hours: number;
};

/* ===================== SMALL HELPERS ===================== */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toMonthKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function parseMonthKey(monthKey: string): { year: number; monthIndex: number } {
  const [yStr, mStr] = (monthKey || "").split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  }
  return { year: y, monthIndex: m - 1 };
}

function formatTierMin(min: number) {
  if (min >= 1_000_000) {
    const v = min / 1_000_000;
    const dp = min % 1_000_000 === 0 ? 0 : 1;
    return `${v.toFixed(dp)}M`;
  }
  if (min >= 1000) return `${Math.round(min / 1000)}K`;
  return String(min);
}

/* ===================== CONFIG ===================== */

// Tier ladder (monthly diamonds)
const TIERS: TierConfig[] = [
  { id: 1, label: "Tier 1", min: 0, color: "#9CA3AF", incentiveCoins: 0 },
  { id: 2, label: "Tier 2", min: 100_000, color: "#84cc16", incentiveCoins: 2_100 },
  { id: 3, label: "Tier 3", min: 200_000, color: "#06b6d4", incentiveCoins: 4_200 },
  { id: 4, label: "Tier 4", min: 300_000, color: "#3b82f6", incentiveCoins: 6_300 },
  { id: 5, label: "Tier 5", min: 500_000, color: "#6366f1", incentiveCoins: 10_500 },
  { id: 6, label: "Tier 6", min: 700_000, color: "#8b5cf6", incentiveCoins: 14_700 },
  { id: 7, label: "Tier 7", min: 1_000_000, color: "#d946ef", incentiveCoins: 21_000 },
  { id: 8, label: "Tier 8", min: 1_600_000, color: "#f43f5e", incentiveCoins: 33_600 },
  { id: 9, label: "Tier 9", min: 2_500_000, color: "#f97316", incentiveCoins: 52_500 },
  { id: 10, label: "Tier 10", min: 5_000_000, color: "#f59e0b", incentiveCoins: 105_000 },
];

// Only used to compute "Activeness level" label (no levels UI shown)
const ACTIVENESS_RULES: ActivenessRule[] = [
  { level: 1, days: 8, hours: 20 },
  { level: 2, days: 11, hours: 30 },
  { level: 3, days: 15, hours: 40 },
  { level: 4, days: 18, hours: 60 },
  { level: 5, days: 22, hours: 80 },
];

// Minimum requirements for incentives (single target)
const MIN_VALID_DAYS = 15;
const MIN_HOURS = 40;

function getTier(monthlyDiamonds: number) {
  let current = TIERS[0];
  for (const t of TIERS) if (monthlyDiamonds >= t.min) current = t;

  const idx = TIERS.findIndex((t) => t.id === current.id);
  const next = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;

  return { current, next };
}

function getActivenessLevel(validDays: number, hours: number) {
  let level = 0;
  for (const r of ACTIVENESS_RULES) {
    if (validDays >= r.days && hours >= r.hours) level = r.level;
  }
  return level;
}

/* ===================== PAGE ===================== */

export default function CreatorDashboardPage() {
  const params = useParams();
  const username = (params?.username as string) || "";

  const creator = creators.find(
    (c) => c.username.toLowerCase() === username.toLowerCase()
  );

  /* ---------- rank ---------- */
  const sorted = useMemo(
    () => [...creators].sort((a, b) => b.lifetime - a.lifetime),
    []
  );

  const rankIndex = sorted.findIndex(
    (c) => c.username.toLowerCase() === username.toLowerCase()
  );
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  /* ---------- month selection (CURRENT MONTH ONLY) ---------- */
  const selectedMonthKey = useMemo(() => toMonthKey(new Date()), []);
  const { year: selectedYear, monthIndex: selectedMonthIndex } = useMemo(
    () => parseMonthKey(selectedMonthKey),
    [selectedMonthKey]
  );

  /* ---------- state ---------- */
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [allHistories, setAllHistories] = useState<Record<string, HistoryEntry[]>>(
    {}
  );
  const [stats, setStats] = useState<IncentiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  /* ===================== LOAD HISTORY ===================== */

  useEffect(() => {
    if (!username) return;

    setLoading(true);

    fetch(`/history/${username}.json`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: HistoryFile) => setHistory(Array.isArray(j.entries) ? j.entries : []))
      .catch(() => setHistory([]));
  }, [username]);

  useEffect(() => {
    async function loadAll() {
      const out: Record<string, HistoryEntry[]> = {};

      await Promise.all(
        creators.map(async (c) => {
          try {
            const r = await fetch(`/history/${c.username}.json`, { cache: "no-store" });
            if (!r.ok) return;
            const j = (await r.json()) as HistoryFile;
            out[c.username] = Array.isArray(j.entries) ? j.entries : [];
          } catch {
            // ignore
          }
        })
      );

      setAllHistories(out);
    }

    loadAll();
  }, []);

  /* ===================== MONTH TOTALS ===================== */

  const monthHistory = useMemo(() => {
    const mk = selectedMonthKey;
    return history.filter((e) => (e.date || "").startsWith(mk));
  }, [history, selectedMonthKey]);

  const monthlyDiamonds = useMemo(() => {
    return monthHistory.reduce((sum, e) => sum + (e.daily ?? 0), 0);
  }, [monthHistory]);

  /* ===================== INCENTIVE LOGIC (MONTH) ===================== */

  useEffect(() => {
    if (!monthHistory.length || !Object.keys(allHistories).length || !username) return;

    // month histories for all users (for top-5 per day)
    const mk = selectedMonthKey;
    const monthAll: Record<string, HistoryEntry[]> = {};
    for (const u in allHistories) {
      monthAll[u] = (allHistories[u] || []).filter((e) => (e.date || "").startsWith(mk));
    }

    let diamonds = 0;
    let hours = 0;
    let validDays = 0;
    let top5Count = 0;

    // collect all dates seen in month across all users (for top5 each day)
    const dates = new Set<string>();
    Object.values(monthAll).forEach((arr) =>
      arr.forEach((e) => {
        if (e?.date) dates.add(e.date);
      })
    );

    // top5 by day
    const top5ByDay: Record<string, string[]> = {};
    [...dates].forEach((date) => {
      const rows: { username: string; daily: number }[] = [];

      for (const u in monthAll) {
        const e = monthAll[u].find((x) => x.date === date);
        if (e && (e.daily ?? 0) > 0) rows.push({ username: u, daily: e.daily ?? 0 });
      }

      rows.sort((a, b) => b.daily - a.daily);
      top5ByDay[date] = rows.slice(0, 5).map((r) => r.username);
    });

    // totals + top5 count
    monthHistory.forEach((e) => {
      diamonds += e.daily ?? 0;
      hours += e.hours ?? 0;

      // valid day definition (>=1h)
      if ((e.hours ?? 0) >= 1) validDays++;

      if (top5ByDay[e.date]?.includes(username)) top5Count++;
    });

    // base calculated points (keep your existing feel)
    const thousands = Math.floor(diamonds / 1000);
    let diamondPoints = 0;
    if (thousands >= 1) {
      diamondPoints += 10;
      diamondPoints += Math.max(0, thousands - 1) * 5;
    }

    const hourPoints = Math.floor(hours) * 3;
    const validDayPoints = validDays * 3;

    let top5Points = 0;
    monthHistory.forEach((e) => {
      const placements = top5ByDay[e.date];
      if (!placements) return;

      const pos = placements.indexOf(username);
      if (pos === 0) top5Points += 25;
      else if (pos === 1) top5Points += 20;
      else if (pos === 2) top5Points += 15;
      else if (pos === 3) top5Points += 10;
      else if (pos === 4) top5Points += 5;
    });

    const calculatedPoints = diamondPoints + hourPoints + validDayPoints + top5Points;

    const extrasPoints = incentiveExtras[username] ?? 0;

    setStats({
      diamonds,
      hours,
      validDays,
      top5Count,
      calculatedPoints,
      extrasPoints,
    });

    setLoading(false);
  }, [monthHistory, allHistories, username, selectedMonthKey]);

  /* ===================== TIER + ACTIVENESS ===================== */

  const validDaysNow = stats?.validDays ?? 0;
  const hoursNow = stats?.hours ?? 0;

  const { current: currentTier, next: nextTier } = useMemo(
    () => getTier(monthlyDiamonds),
    [monthlyDiamonds]
  );

  const activenessLevel = useMemo(
    () => getActivenessLevel(validDaysNow, hoursNow),
    [validDaysNow, hoursNow]
  );

  const tierCoins = currentTier?.incentiveCoins ?? 0;
  const liveEarnedCoins = stats?.calculatedPoints ?? 0;
  const extrasCoins = stats?.extrasPoints ?? 0;

  const incentiveCoinsTotal = liveEarnedCoins + extrasCoins + tierCoins;

  /* ===================== CALENDAR (MONTH) ===================== */

  function buildMonth(year: number, monthIndex: number) {
 	 const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

 	 const cells: { day: number; dateStr: string }[] = [];

 	 for (let d = 1; d <= daysInMonth; d++) {
 	   const dateStr = `${year}-${pad2(monthIndex + 1)}-${pad2(d)}`;
 	   cells.push({ day: d, dateStr });
 	 }

	  const label = new Date(year, monthIndex, 1).toLocaleString("default", {
	    month: "long",
	  });

	  return { cells, year, month: monthIndex, label };
  }

  const { cells, year, label } = useMemo(
    () => buildMonth(selectedYear, selectedMonthIndex),
    [selectedYear, selectedMonthIndex]
  );

  const historyByDate = useMemo(() => {
    const map: Record<string, HistoryEntry> = {};
    history.forEach((e) => {
      if (e?.date) map[e.date] = e;
    });
    return map;
  }, [history]);

  /* ===================== UI STYLES ===================== */

  const coinText: React.CSSProperties = {
    color: "#FFD700",
    fontWeight: 900,
    textShadow: "0 0 12px rgba(255,215,0,0.75), 0 0 26px rgba(255,215,0,0.25)",
    whiteSpace: "nowrap",
  };

  const pillStyle = (ok: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: ok ? "#7cf6ff" : "#ff4d4d",
    background: ok ? "rgba(124,246,255,0.10)" : "rgba(255,77,77,0.10)",
    border: ok ? "1px solid rgba(124,246,255,0.55)" : "1px solid rgba(255,77,77,0.55)",
    textShadow: ok ? "0 0 8px rgba(124,246,255,0.55)" : "0 0 8px rgba(255,77,77,0.45)",
    whiteSpace: "nowrap",
  });

  const barOuter: React.CSSProperties = {
    width: "100%",
    height: 12,
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.10)",
    overflow: "hidden",
  };

  const barInner = (p: number, accent: string): React.CSSProperties => ({
    height: "100%",
    width: `${clamp(p, 0, 100)}%`,
    borderRadius: 999,
    background: `linear-gradient(90deg, ${accent}, rgba(123,232,255,0.55))`,
    boxShadow: `0 0 10px ${accent}55`,
    transition: "width 350ms ease",
  });

  /* Requirements met? */
  const okReq = validDaysNow >= MIN_VALID_DAYS && hoursNow >= MIN_HOURS;

  const daysPct = (clamp(validDaysNow, 0, MIN_VALID_DAYS) / MIN_VALID_DAYS) * 100;
  const hrsPct = (clamp(hoursNow, 0, MIN_HOURS) / MIN_HOURS) * 100;

  /* Tier progress */
  const nextTierProgress = useMemo(() => {
    if (!nextTier) return { pct: 100, text: "Max Tier" };
    const from = currentTier.min;
    const to = nextTier.min;
    const span = Math.max(1, to - from);
    const now = clamp(monthlyDiamonds - from, 0, span);
    return { pct: (now / span) * 100, text: `${monthlyDiamonds.toLocaleString()} / ${to.toLocaleString()} diamonds` };
  }, [currentTier.min, monthlyDiamonds, nextTier]);

  /* ===================== UI ===================== */

  return (
    <main className="dashboard-wrapper">
      {/* HEADER */}
      <section className="dash-header">
        <div className="dash-profile">
          <img src={`/creators/${username}.jpg`} className="dash-avatar" />
          <div>
            <div className="dash-username">{username}</div>

            {rank && (
              <div className="dash-rank">
                Rank #{rank} of {creators.length}
              </div>
            )}

            {/* Monthly diamonds box under profile */}
            <div
              style={{
                marginTop: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div className="glow-text" style={{ opacity: 0.9, fontWeight: 900 }}>
                This month’s diamonds:
              </div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {monthlyDiamonds.toLocaleString()}
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Viewing: {selectedMonthKey}
              </div>

              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: `${currentTier.color}20`,
                  border: `1px solid ${currentTier.color}66`,
                  color: currentTier.color,
                }}
              >
                {currentTier.label} • ≥ {formatTierMin(currentTier.min)}
              </div>

              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: "rgba(124,246,255,0.10)",
                  border: "1px solid rgba(124,246,255,0.45)",
                  color: "#7cf6ff",
                }}
              >
                Activeness level: {activenessLevel}
              </div>

              <div style={pillStyle(okReq)}>{okReq ? "Incentives Unlocked" : "Requirements Not Met"}</div>
            </div>
          </div>
        </div>

        {/* Incentive Coins card */}
        <div className="dash-card">
          <div className="dash-card-title">Incentive Coins</div>
          {loading && <div>Loading…</div>}

          {!loading && stats && (
            <>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, ...coinText }}>
                {incentiveCoinsTotal.toLocaleString()} Coins
              </div>

              <div>
                Live-earned coins: <span style={coinText}>{liveEarnedCoins.toLocaleString()}</span>
              </div>
              <div>
                Extras: <span style={coinText}>{extrasCoins.toLocaleString()}</span>
              </div>
              <div>
                Tier bonus: <span style={coinText}>{tierCoins.toLocaleString()}</span>
              </div>

              <div style={{ marginTop: 10 }}>
                Diamonds: <b>{stats.diamonds.toLocaleString()}</b>
                <br />
                Hours: <b>{stats.hours.toFixed(1)}h</b>
                <br />
                Valid days: <b>{stats.validDays}</b>
              </div>
            </>
          )}
        </div>
      </section>

      {/* TIER */}
      <section className="dash-card">
        <div className="dash-card-title">Tier</div>

        {/* Thin ladder bar */}
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              padding: 8,
              borderRadius: 999,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            {TIERS.map((t) => {
              const active = t.id === currentTier.id;
              return (
                <div
                  key={`tier-strip-${t.id}`}
                  title={`${t.label} • ≥ ${formatTierMin(t.min)} • ${t.incentiveCoins.toLocaleString()} coins`}
                  style={{
                    height: 10,
                    flex: 1,
                    borderRadius: 999,
                    background: t.color,
                    opacity: active ? 1 : 0.45,
                    boxShadow: active ? `0 0 14px ${t.color}66` : "none",
                    outline: active ? `2px solid ${t.color}AA` : "none",
                    outlineOffset: 2,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Next tier only */}
        <div style={{ marginTop: 14 }}>
          {nextTier ? (
            <div
              style={{
                borderRadius: 16,
                padding: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div className="glow-text" style={{ fontWeight: 900, letterSpacing: "0.06em" }}>
                  Next: <span style={{ color: nextTier.color }}>{nextTier.label}</span> (≥{" "}
                  {formatTierMin(nextTier.min)})
                </div>
                <div style={{ fontWeight: 900, ...coinText }}>
                  {nextTier.incentiveCoins.toLocaleString()} coins
                </div>
              </div>

              <div style={barOuter}>
                <div style={barInner(nextTierProgress.pct, currentTier.color)} />
              </div>

              <div className="glow-text" style={{ opacity: 0.9 }}>
                {nextTierProgress.text}
              </div>
            </div>
          ) : (
            <div className="glow-text" style={{ marginTop: 10 }}>
              You’re at the maximum tier 🎉
            </div>
          )}
        </div>
      </section>

      {/* ACTIVENESS (single target only) */}
      <section className="dash-card">
        <div className="dash-card-title">Activeness</div>
        <div className="glow-text" style={{ marginTop: 8, opacity: 0.95 }}>
          Minimum requirements for incentives: <b>{MIN_VALID_DAYS} days</b> and <b>{MIN_HOURS} hours</b>.
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {/* Days */}
          <div
            style={{
              borderRadius: 16,
              padding: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div className="glow-text" style={{ fontWeight: 900, letterSpacing: "0.06em" }}>
              Valid days
            </div>
            <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {Math.min(validDaysNow, MIN_VALID_DAYS)}/{MIN_VALID_DAYS}
              </div>
              <div style={pillStyle(validDaysNow >= MIN_VALID_DAYS)}>{validDaysNow >= MIN_VALID_DAYS ? "Met" : "Not Met"}</div>
            </div>

            <div style={{ marginTop: 10, ...barOuter }}>
              <div style={barInner(daysPct, "#7cf6ff")} />
            </div>
          </div>

          {/* Hours */}
          <div
            style={{
              borderRadius: 16,
              padding: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div className="glow-text" style={{ fontWeight: 900, letterSpacing: "0.06em" }}>
              Hours live
            </div>
            <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {Math.min(hoursNow, MIN_HOURS).toFixed(1)}/{MIN_HOURS}
              </div>
              <div style={pillStyle(hoursNow >= MIN_HOURS)}>{hoursNow >= MIN_HOURS ? "Met" : "Not Met"}</div>
            </div>

            <div style={{ marginTop: 10, ...barOuter }}>
              <div style={barInner(hrsPct, "#7cf6ff")} />
            </div>
          </div>
        </div>
      </section>

      {/* CALENDAR (no weekday row, no extra gap) */}
      <section className="dash-card">
        <div className="dash-card-title">
          {label} {year} Activity
        </div>

        <div className="calendar" style={{ marginTop: 10, paddingTop: 0 }}>
          <div className="calendar-grid" style={{ marginTop: 0 }}>
            {cells.map((cell, i) => {
              if (!cell.day) return <div key={`empty-${i}`} className="calendar-cell empty" />;

              const e = historyByDate[cell.dateStr!];
              const hrs = e?.hours ?? 0;
              const daily = e?.daily ?? 0;

              const hourMet = hrs >= 1;

              return (
                <div
                  key={cell.dateStr}
                  className={"calendar-cell day-cell" + (hourMet ? " day-active" : "")}
                  style={{ padding: 10 }}
                >
                  <div className="day-number" style={{ fontSize: 16, fontWeight: 900, opacity: 0.95 }}>
                    {cell.day}
                  </div>

                  <div style={{ marginTop: 8, display: "grid", gap: 8, fontSize: 13, fontWeight: 900 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ opacity: 0.9 }}>💎</span>
                      <span style={{ flex: 1, textAlign: "right" }}>
                        {daily ? daily.toLocaleString() : "-"}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ opacity: 0.9 }}>⏱</span>
                      <span style={{ flex: 1, textAlign: "right" }}>
                        {hrs > 0 ? `${hrs.toFixed(1)}h / 1h` : "-"}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 2,
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        textAlign: "center",
                        color: hourMet ? "#7cf6ff" : "rgba(255,255,255,0.75)",
                        background: hourMet ? "rgba(124,246,255,0.10)" : "rgba(255,255,255,0.05)",
                        border: hourMet ? "1px solid rgba(124,246,255,0.45)" : "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      {hourMet ? "Hour achieved" : "Hour not achieved"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}