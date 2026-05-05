"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { creators } from "@/data/creators";
import { incentiveExtras } from "@/data/incentive-extras";

type HistoryEntry = {
  date: string;
  daily: number;
  lifetime: number;
  hours?: number;
};

type HistoryFile = {
  username: string;
  entries: HistoryEntry[];
};

type IncentiveStats = {
  diamonds: number;
  hours: number;
  validDays: number;
  top5Count: number;
  calculatedPoints: number;
  extrasPoints: number;
};

type TierConfig = {
  id: number;
  min: number;
  label: string;
  color: string;
  incentiveCoins: number;
};

type ActivenessRule = {
  level: number;
  days: number;
  hours: number;
};

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

function formatMonthLabel(monthKey: string) {
  const { year, monthIndex } = parseMonthKey(monthKey);

  const month = new Date(year, monthIndex, 1).toLocaleString("default", {
    month: "long",
  });

  return `${month} ${year}`;
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

const TIERS: TierConfig[] = [
  { id: 1, label: "Tier 1", min: 0, color: "#9CA3AF", incentiveCoins: 0 },
  { id: 2, label: "Tier 2", min: 100_000, color: "#84cc16", incentiveCoins: 1_200 },
  { id: 3, label: "Tier 3", min: 200_000, color: "#06b6d4", incentiveCoins: 2_400 },
  { id: 4, label: "Tier 4", min: 300_000, color: "#3b82f6", incentiveCoins: 3_600 },
  { id: 5, label: "Tier 5", min: 500_000, color: "#6366f1", incentiveCoins: 4_800 },
  { id: 6, label: "Tier 6", min: 700_000, color: "#8b5cf6", incentiveCoins: 6_000 },
  { id: 7, label: "Tier 7", min: 1_000_000, color: "#d946ef", incentiveCoins: 7_200 },
  { id: 8, label: "Tier 8", min: 1_600_000, color: "#f43f5e", incentiveCoins: 8_400 },
  { id: 9, label: "Tier 9", min: 2_500_000, color: "#f97316", incentiveCoins: 9_600 },
  { id: 10, label: "Tier 10", min: 5_000_000, color: "#f59e0b", incentiveCoins: 10_800 },
];

const ACTIVENESS_RULES: ActivenessRule[] = [
  { level: 1, days: 8, hours: 20 },
  { level: 2, days: 11, hours: 30 },
  { level: 3, days: 15, hours: 40 },
  { level: 4, days: 18, hours: 60 },
  { level: 5, days: 22, hours: 80 },
];

const MIN_VALID_DAYS = 15;
const MIN_HOURS = 40;

// Change this whenever you want the default month to move.
const DEFAULT_SELECTED_MONTH = "2026-05";

function getTier(monthlyDiamonds: number) {
  let current = TIERS[0];

  for (const t of TIERS) {
    if (monthlyDiamonds >= t.min) current = t;
  }

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

export default function CreatorDashboardPage() {
  const params = useParams();
  const username = (params?.username as string) || "";

  const sorted = useMemo(
    () => [...creators].sort((a, b) => b.lifetime - a.lifetime),
    []
  );

  const rankIndex = sorted.findIndex(
    (c) => c.username.toLowerCase() === username.toLowerCase()
  );

  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  const availableMonths = useMemo(() => {
    const now = new Date();
    const currentMonth = toMonthKey(now);

    const months = new Set<string>([
      DEFAULT_SELECTED_MONTH,
      currentMonth,
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
    ]);

    return [...months].sort((a, b) => b.localeCompare(a));
  }, []);

  const [selectedMonthKey, setSelectedMonthKey] = useState(DEFAULT_SELECTED_MONTH);

  const { year: selectedYear, monthIndex: selectedMonthIndex } = useMemo(
    () => parseMonthKey(selectedMonthKey),
    [selectedMonthKey]
  );

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [allHistories, setAllHistories] = useState<Record<string, HistoryEntry[]>>({});
  const [stats, setStats] = useState<IncentiveStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  const monthHistory = useMemo(() => {
    return history.filter((e) => (e.date || "").startsWith(selectedMonthKey));
  }, [history, selectedMonthKey]);

  const monthlyDiamonds = useMemo(() => {
    return monthHistory.reduce((sum, e) => sum + (e.daily ?? 0), 0);
  }, [monthHistory]);

  useEffect(() => {
    if (!Object.keys(allHistories).length || !username) return;

    setLoading(true);

    const monthAll: Record<string, HistoryEntry[]> = {};

    for (const u in allHistories) {
      monthAll[u] = (allHistories[u] || []).filter((e) =>
        (e.date || "").startsWith(selectedMonthKey)
      );
    }

    let diamonds = 0;
    let hours = 0;
    let validDays = 0;
    let top5Count = 0;

    const dates = new Set<string>();

    Object.values(monthAll).forEach((arr) =>
      arr.forEach((e) => {
        if (e?.date) dates.add(e.date);
      })
    );

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

    monthHistory.forEach((e) => {
      diamonds += e.daily ?? 0;
      hours += e.hours ?? 0;

      if ((e.hours ?? 0) >= 1) validDays++;
      if (top5ByDay[e.date]?.includes(username)) top5Count++;
    });

    const reducedLiveDiamonds = Math.floor(diamonds * 0.5);
    const thousands = Math.floor(reducedLiveDiamonds / 1000);

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

  const okReq = validDaysNow >= MIN_VALID_DAYS && hoursNow >= MIN_HOURS;

  const daysPct = (clamp(validDaysNow, 0, MIN_VALID_DAYS) / MIN_VALID_DAYS) * 100;
  const hrsPct = (clamp(hoursNow, 0, MIN_HOURS) / MIN_HOURS) * 100;

  const nextTierProgress = useMemo(() => {
    if (!nextTier) return { pct: 100, text: "Max Tier" };

    const from = currentTier.min;
    const to = nextTier.min;
    const span = Math.max(1, to - from);
    const now = clamp(monthlyDiamonds - from, 0, span);

    return {
      pct: (now / span) * 100,
      text: `${monthlyDiamonds.toLocaleString()} / ${to.toLocaleString()} diamonds`,
    };
  }, [currentTier.min, monthlyDiamonds, nextTier]);

  const page: React.CSSProperties = {
    minHeight: "100vh",
    padding: "26px 14px 70px",
    background:
      "radial-gradient(circle at top, rgba(0,180,255,0.16), transparent 32%), linear-gradient(180deg, #020617 0%, #030712 55%, #000 100%)",
    color: "#fff",
    fontFamily: "'Orbitron', 'Rajdhani', system-ui, sans-serif",
  };

  const shell: React.CSSProperties = {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  };

  const card: React.CSSProperties = {
    borderRadius: 24,
    background:
      "linear-gradient(180deg, rgba(7,17,31,0.92), rgba(3,7,18,0.96))",
    border: "1px solid rgba(45,224,255,0.22)",
    boxShadow:
      "inset 0 0 26px rgba(45,224,255,0.04), 0 0 28px rgba(0,180,255,0.10)",
  };

  const cardPad: React.CSSProperties = {
    ...card,
    padding: 20,
  };

  const title: React.CSSProperties = {
    fontSize: 14,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "#2de0ff",
    fontWeight: 900,
    textShadow: "0 0 10px rgba(45,224,255,0.55)",
  };

  const bigNumber: React.CSSProperties = {
    fontSize: 34,
    fontWeight: 900,
    lineHeight: 1,
    textShadow: "0 0 16px rgba(255,255,255,0.25)",
  };

  const gold: React.CSSProperties = {
    color: "#FFD76A",
    fontWeight: 900,
    textShadow: "0 0 14px rgba(255,215,106,0.5)",
  };

  const pill = (good: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 11px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: good ? "#7cf6ff" : "#ff6b6b",
    background: good ? "rgba(124,246,255,0.09)" : "rgba(255,77,77,0.09)",
    border: good
      ? "1px solid rgba(124,246,255,0.4)"
      : "1px solid rgba(255,77,77,0.4)",
  });

  const progressOuter: React.CSSProperties = {
    width: "100%",
    height: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  const progressInner = (pct: number, color = "#2de0ff"): React.CSSProperties => ({
    width: `${clamp(pct, 0, 100)}%`,
    height: "100%",
    borderRadius: 999,
    background: `linear-gradient(90deg, ${color}, #7cf6ff)`,
    boxShadow: `0 0 18px ${color}99`,
  });

  return (
    <main style={page}>
      <div style={shell}>
        <section
          style={{
            ...card,
            overflow: "hidden",
            position: "relative",
            padding: 22,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 20% 0%, rgba(45,224,255,0.18), transparent 32%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 18,
              alignItems: "center",
            }}
          >
            <img
              src={`/creators/${username}.jpg`}
              alt={username}
              style={{
                width: 96,
                height: 96,
                borderRadius: 22,
                objectFit: "cover",
                border: "1px solid rgba(45,224,255,0.45)",
                boxShadow: "0 0 26px rgba(45,224,255,0.25)",
              }}
            />

            <div>
              <div style={title}>Creator Dashboard</div>

              <h1
                style={{
                  margin: "8px 0 6px",
                  fontSize: 34,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  textShadow:
                    "0 0 12px rgba(45,224,255,0.75), 0 0 26px rgba(45,224,255,0.25)",
                }}
              >
                {username}
              </h1>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {rank && (
                  <span style={pill(true)}>
                    Rank #{rank} / {creators.length}
                  </span>
                )}

                <span style={pill(okReq)}>
                  {okReq ? "Incentives Unlocked" : "Requirements Not Met"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            ...cardPad,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={title}>Selected Month</div>
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900 }}>
              {formatMonthLabel(selectedMonthKey)}
            </div>
            <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              Change this when reviewing a previous month.
            </p>
          </div>

          <select
            value={selectedMonthKey}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
            style={{
              minWidth: 220,
              borderRadius: 14,
              padding: "12px 14px",
              background: "rgba(3,7,18,0.95)",
              color: "#fff",
              border: "1px solid rgba(45,224,255,0.38)",
              fontFamily: "inherit",
              fontWeight: 900,
              outline: "none",
              boxShadow: "0 0 16px rgba(45,224,255,0.10)",
            }}
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <div style={cardPad}>
            <div style={title}>Monthly Diamonds</div>
            <div style={{ ...bigNumber, marginTop: 12 }}>
              {monthlyDiamonds.toLocaleString()}
            </div>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              Diamonds earned in {formatMonthLabel(selectedMonthKey)}
            </p>
          </div>

          <div style={cardPad}>
            <div style={title}>Total Hours</div>
            <div style={{ ...bigNumber, marginTop: 12 }}>{hoursNow.toFixed(1)}h</div>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              Hours live in {formatMonthLabel(selectedMonthKey)}
            </p>
          </div>

          <div style={cardPad}>
            <div style={title}>Incentive Coins</div>
            {loading ? (
              <div style={{ marginTop: 14 }}>Loading…</div>
            ) : (
              <>
                <div style={{ ...bigNumber, ...gold, marginTop: 12 }}>
                  {incentiveCoinsTotal.toLocaleString()}
                </div>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                  Live + extras + tier bonus
                </p>
              </>
            )}
          </div>

          <div style={cardPad}>
            <div style={title}>Activeness</div>
            <div style={{ ...bigNumber, marginTop: 12 }}>Level {activenessLevel}</div>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              Based on days and hours
            </p>
          </div>

          <div style={cardPad}>
            <div style={title}>Current Tier</div>
            <div style={{ ...bigNumber, color: currentTier.color, marginTop: 12 }}>
              {currentTier.label}
            </div>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              Minimum {formatTierMin(currentTier.min)} diamonds
            </p>
          </div>
        </section>

        <section style={cardPad}>
          <div style={title}>Tier Progress</div>

          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 16,
              padding: 8,
              borderRadius: 999,
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {TIERS.map((t) => {
              const active = t.id <= currentTier.id;

              return (
                <div
                  key={`tier-${t.id}`}
                  title={`${t.label} • ${formatTierMin(t.min)}`}
                  style={{
                    height: 10,
                    flex: 1,
                    borderRadius: 999,
                    background: t.color,
                    opacity: active ? 1 : 0.28,
                    boxShadow: t.id === currentTier.id ? `0 0 18px ${t.color}` : "none",
                  }}
                />
              );
            })}
          </div>

          <div style={{ marginTop: 18 }}>
            {nextTier ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>
                    Next: <span style={{ color: nextTier.color }}>{nextTier.label}</span>
                  </div>

                  <div style={gold}>{nextTier.incentiveCoins.toLocaleString()} coins</div>
                </div>

                <div style={progressOuter}>
                  <div style={progressInner(nextTierProgress.pct, currentTier.color)} />
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 12,
                  }}
                >
                  {nextTierProgress.text}
                </div>
              </>
            ) : (
              <div style={gold}>Maximum tier reached</div>
            )}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          <div style={cardPad}>
            <div style={title}>Valid Days</div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 14,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                {Math.min(validDaysNow, MIN_VALID_DAYS)} / {MIN_VALID_DAYS}
              </div>

              <span style={pill(validDaysNow >= MIN_VALID_DAYS)}>
                {validDaysNow >= MIN_VALID_DAYS ? "Met" : "Not Met"}
              </span>
            </div>

            <div style={{ ...progressOuter, marginTop: 12 }}>
              <div style={progressInner(daysPct)} />
            </div>
          </div>

          <div style={cardPad}>
            <div style={title}>Hours Live</div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 14,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900 }}>
                {Math.min(hoursNow, MIN_HOURS).toFixed(1)} / {MIN_HOURS}
              </div>

              <span style={pill(hoursNow >= MIN_HOURS)}>
                {hoursNow >= MIN_HOURS ? "Met" : "Not Met"}
              </span>
            </div>

            <div style={{ ...progressOuter, marginTop: 12 }}>
              <div style={progressInner(hrsPct)} />
            </div>
          </div>
        </section>

        <section style={cardPad}>
          <div style={title}>
            {label} {year} Activity
          </div>

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(142px, 1fr))",
              gap: 10,
            }}
          >
            {cells.map((cell) => {
              const e = historyByDate[cell.dateStr];
              const hrs = e?.hours ?? 0;
              const daily = e?.daily ?? 0;
              const hourMet = hrs >= 1;
              const hasActivity = daily > 0 || hrs > 0;

              return (
                <div
                  key={cell.dateStr}
                  style={{
                    minHeight: 132,
                    borderRadius: 18,
                    padding: 13,
                    background: hourMet
                      ? "linear-gradient(180deg, rgba(45,224,255,0.12), rgba(3,7,18,0.9))"
                      : "rgba(255,255,255,0.025)",
                    border: hourMet
                      ? "1px solid rgba(45,224,255,0.38)"
                      : "1px solid rgba(255,255,255,0.075)",
                    boxShadow: hourMet ? "0 0 16px rgba(45,224,255,0.14)" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      minHeight: 28,
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{cell.day}</div>
                    {hourMet && <span style={pill(true)}>Live</span>}
                  </div>

                  {hasActivity && (
                    <div
                      style={{
                        marginTop: 14,
                        display: "grid",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "rgba(255,255,255,0.45)",
                            marginBottom: 5,
                          }}
                        >
                          Diamonds
                        </div>

                        <div
                          style={{
                            fontSize: daily >= 100000 ? 17 : 20,
                            fontWeight: 900,
                            lineHeight: 1.12,
                            wordBreak: "break-word",
                          }}
                        >
                          {daily ? daily.toLocaleString() : ""}
                        </div>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "rgba(255,255,255,0.45)",
                            marginBottom: 5,
                          }}
                        >
                          Hours
                        </div>

                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            lineHeight: 1.12,
                          }}
                        >
                          {hrs > 0 ? `${hrs.toFixed(1)}h` : ""}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}