"use client";

import { creators } from "@/data/creators";
import { incentiveExtras } from "@/data/incentive-extras";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/* ===================== TYPES ===================== */

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
  diamonds: number; // month diamonds (calculated)
  hours: number; // month hours (calculated)
  validDays: number; // month valid days (calculated)
  top5Count: number;
  calculatedPoints: number;
  extrasPoints: number; // file extras (incentiveExtras)
  incentiveBalance: number; // calculatedPoints + extrasPoints (BEFORE ladder points)
};

/* ===================== SMALL HELPERS ===================== */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function percent(value: number, target: number) {
  if (!target) return 0;
  return clamp((value / target) * 100, 0, 100);
}

/* ===================== PAGE ===================== */

export default function CreatorDashboardPage() {
  const params = useParams();
  const username = (params?.username as string) || "";

  const creator = creators.find(
    (c) => c.username.toLowerCase() === username.toLowerCase()
  );

  const yesterdayDiamonds = creator?.daily ?? 0;

  /* ---------- rank ---------- */
  const sorted = useMemo(
    () => [...creators].sort((a, b) => b.lifetime - a.lifetime),
    []
  );

  const rankIndex = sorted.findIndex(
    (c) => c.username.toLowerCase() === username.toLowerCase()
  );

  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  /* ---------- state ---------- */
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [allHistories, setAllHistories] = useState<
    Record<string, HistoryEntry[]>
  >({});
  const [stats, setStats] = useState<IncentiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  /* ===================== LOAD HISTORY ===================== */

  useEffect(() => {
    if (!username) return;

    fetch(`/history/${username}.json`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: HistoryFile) =>
        setHistory(Array.isArray(j.entries) ? j.entries : [])
      )
      .catch(() => setHistory([]));
  }, [username]);

  useEffect(() => {
    async function loadAll() {
      const out: Record<string, HistoryEntry[]> = {};

      await Promise.all(
        creators.map(async (c) => {
          try {
            const r = await fetch(`/history/${c.username}.json`, {
              cache: "no-store",
            });
            if (!r.ok) return;
            const j = (await r.json()) as HistoryFile;
            out[c.username] = j.entries || [];
          } catch {}
        })
      );

      setAllHistories(out);
    }

    loadAll();
  }, []);

  /* ===================== INCENTIVE LOGIC (MONTH-ONLY) ===================== */

  useEffect(() => {
    if (!history.length || !Object.keys(allHistories).length) return;

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    const monthHistory = history.filter((e) => e.date.startsWith(monthKey));

    const monthAll: Record<string, HistoryEntry[]> = {};
    for (const u in allHistories) {
      monthAll[u] = (allHistories[u] || []).filter((e) =>
        e.date.startsWith(monthKey)
      );
    }

    let diamonds = 0;
    let hours = 0;
    let validDays = 0;
    let top5Count = 0;

    const dates = new Set<string>();
    Object.values(monthAll).forEach((arr) =>
      arr.forEach((e) => dates.add(e.date))
    );

    const top5ByDay: Record<string, string[]> = {};
    [...dates].forEach((date) => {
      const rows: { username: string; daily: number }[] = [];

      for (const u in monthAll) {
        const e = monthAll[u].find((x) => x.date === date);
        if (e && e.daily > 0) rows.push({ username: u, daily: e.daily });
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

    // ---------- calculated points ----------
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

    const calculatedPoints =
      diamondPoints + hourPoints + validDayPoints + top5Points;

    // ---------- FILE-BASED EXTRAS ----------
    const extrasPoints = incentiveExtras[username] ?? 0;
    const incentiveBalance = calculatedPoints + extrasPoints;

    setStats({
      diamonds,
      hours,
      validDays,
      top5Count,
      calculatedPoints,
      extrasPoints,
      incentiveBalance,
    });

    setLoading(false);
  }, [history, allHistories, username]);

  /* ===================== MONTH + CALENDAR ===================== */

  function buildMonth() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;

    const cells: { day: number | null; dateStr?: string }[] = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null });

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ day: d, dateStr: date.toISOString().slice(0, 10) });
    }

    return {
      cells,
      year,
      month,
      label: today.toLocaleString("default", { month: "long" }),
    };
  }

  const { cells, year, month, label } = buildMonth();

  const historyByDate = useMemo(() => {
    const map: Record<string, HistoryEntry> = {};
    history.forEach((e) => (map[e.date] = e));
    return map;
  }, [history]);

  const monthlyDiamonds = history.reduce((sum, e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month
      ? sum + (e.daily ?? 0)
      : sum;
  }, 0);

  const monthlyHours = history.reduce((sum, e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month
      ? sum + (e.hours ?? 0)
      : sum;
  }, 0);

  /* ===================== INCENTIVE TARGETS (ONE AT A TIME + LOCKED PREVIEW) ===================== */

  const validDaysNow = stats?.validDays ?? 0;
  const hoursNow = stats?.hours ?? 0;

  const ladderUnlocked = monthlyDiamonds >= 150_000;

  const levels = [
    { level: 2, days: 15, hours: 40, gated: false },
    { level: 3, days: 20, hours: 60, gated: true },
    { level: 4, days: 20, hours: 80, gated: true },
    { level: 5, days: 22, hours: 100, gated: true },
  ] as const;

  const isLevelEligible = (l: (typeof levels)[number]) =>
    validDaysNow >= l.days && hoursNow >= l.hours;

  const isLevelAvailable = (l: (typeof levels)[number]) =>
    l.gated ? ladderUnlocked : true;

  // scaling: 150K => 1x, 300K => 2x, 900K => 6x, etc.
  const diamondScale = Math.max(1, Math.floor(monthlyDiamonds / 150_000));
  const scaledReward = 500 * diamondScale;

  const level2 = levels[0];
  const level3 = levels[1];
  const level4 = levels[2];
  const level5 = levels[3];

  let targetLevel: (typeof levels)[number] | null = null;

  if (!isLevelEligible(level2)) targetLevel = level2;
  else if (!ladderUnlocked) targetLevel = level3; // show next target but locked
  else if (!isLevelEligible(level3)) targetLevel = level3;
  else if (!isLevelEligible(level4)) targetLevel = level4;
  else if (!isLevelEligible(level5)) targetLevel = level5;
  else targetLevel = null;

  const baseEligible = isLevelEligible(level2);

  // Preview (always show next level AFTER the current target, faded + locked)
  const targetIndex = targetLevel
    ? levels.findIndex((l) => l.level === targetLevel.level)
    : -1;
  const nextLevel =
    targetIndex >= 0 && targetIndex < levels.length - 1
      ? levels[targetIndex + 1]
      : null;

  // ✅ Level points (only 3–5), ✅ unlocked at 150K, ✅ scale by diamonds, ✅ STACK
  const earnedLevelPoints =
    (isLevelAvailable(level3) && isLevelEligible(level3) ? scaledReward : 0) +
    (isLevelAvailable(level4) && isLevelEligible(level4) ? scaledReward : 0) +
    (isLevelAvailable(level5) && isLevelEligible(level5) ? scaledReward : 0);

  // Add earned level points into Incentive Balance + Extras (as requested)
  const incentiveBalanceWithLevels =
    (stats?.incentiveBalance ?? 0) + earnedLevelPoints;
  const extrasWithLevels = (stats?.extrasPoints ?? 0) + earnedLevelPoints;

  const daysRemainingBase = Math.max(0, level2.days - validDaysNow);
  const hoursRemainingBase = Math.max(0, level2.hours - hoursNow);

  /* ===================== MONTHLY PROGRESS (ONE BAR + OUTSIDE MILESTONES) ===================== */

  const maxDiamonds = 500_000;
  const progressPct = clamp((monthlyDiamonds / maxDiamonds) * 100, 0, 100);

  const milestones = [
    { value: 75_000, label: "75K" },
    { value: 150_000, label: "150K" },
    { value: 500_000, label: "500K" },
  ];

  const milestoneLeftPct = (value: number) =>
    clamp((value / maxDiamonds) * 100, 0, 100);

  function milestoneLabelStyle(value: number): React.CSSProperties {
    if (value === 75_000)
      return { transform: "translateX(0%)", textAlign: "left" };
    if (value === 500_000)
      return { transform: "translateX(-100%)", textAlign: "right" };
    return { transform: "translateX(-50%)", textAlign: "center" };
  }

  /* ===================== SHARED BAR STYLES ===================== */

  const barOuter: React.CSSProperties = {
    width: "100%",
    height: 12,
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.10)",
    overflow: "hidden",
  };

  const barInner = (p: number, done: boolean): React.CSSProperties => ({
    height: "100%",
    width: `${p}%`,
    borderRadius: 999,
    background: done
      ? "linear-gradient(90deg, rgba(45,224,255,0.95), rgba(123,232,255,0.85))"
      : "linear-gradient(90deg, rgba(255,77,77,0.95), rgba(255,140,140,0.75))",
    boxShadow: done
      ? "0 0 10px rgba(45,224,255,0.45)"
      : "0 0 10px rgba(255,77,77,0.35)",
    transition: "width 350ms ease",
  });

  const pillStyle = (ok: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: ok ? "#7cf6ff" : "#ff4d4d",
    background: ok ? "rgba(124,246,255,0.10)" : "rgba(255,77,77,0.10)",
    border: ok
      ? "1px solid rgba(124,246,255,0.55)"
      : "1px solid rgba(255,77,77,0.55)",
    textShadow: ok
      ? "0 0 8px rgba(124,246,255,0.55)"
      : "0 0 8px rgba(255,77,77,0.45)",
    whiteSpace: "nowrap",
  });

  // Fancy single-number style for Total Diamonds (clean + clear)
  const totalDiamondsNumberStyle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 900,
    color: "#7cf6ff",
    textShadow: "0 0 12px rgba(45,224,255,0.55), 0 0 26px rgba(45,224,255,0.28)",
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  const totalDiamondsLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.75)",
    textShadow: "0 0 6px rgba(45,224,255,0.12)",
    lineHeight: 1.1,
  };

  const lockedPreviewStyle: React.CSSProperties = {
    marginTop: 10,
    borderRadius: 16,
    padding: 12,
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.08)",
    opacity: 0.55,
    filter: "saturate(0.85)",
  };

  /* ===================== UI ===================== */

  return (
    <main className="dashboard-wrapper">
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
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-card-title">💎 Incentive Stats</div>
          {loading && <div>Loading…</div>}
          {!loading && stats && (
            <>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  marginBottom: "8px",
                  color: "#2de0ff",
                  textShadow: "0 0 10px rgba(45,224,255,0.75)",
                }}
              >
                💰 Incentive Balance:{" "}
                {incentiveBalanceWithLevels.toLocaleString()}
              </div>

              <div>
                ⚙️ Live-earned points: <b>{stats.calculatedPoints}</b>
              </div>
              <div>
                🎓 Graduations & extras: <b>{extrasWithLevels}</b>
              </div>

              <div style={{ marginTop: 8 }}>
                💎 Diamonds: <b>{stats.diamonds.toLocaleString()}</b>
                <br />
                ⏱️ Hours: <b>{stats.hours.toFixed(1)}h</b>
                <br />
                ✅ Valid days: <b>{stats.validDays}</b>
                <br />
                🏆 Top-5 finishes: <b>{stats.top5Count}</b>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ✅ Incentive Requirements (one target at a time + locked preview of next) */}
      <section className="dash-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div className="dash-card-title">✅ Incentive Requirements</div>

            <div className="glow-text" style={{ marginTop: 6 }}>
              Level 2 makes you <b>eligible</b> (no points). Levels <b>3–5</b>{" "}
              unlock at <b>150K</b> and award points that scale with diamonds.
            </div>
          </div>

          <div style={pillStyle(baseEligible)}>
            {baseEligible ? "Eligible" : "Not Eligible"}
          </div>
        </div>

        <div className="glow-text" style={{ marginTop: 10 }}>
          Base remaining:{" "}
          {baseEligible
            ? "✅ Completed."
            : `⏳ ${daysRemainingBase} day(s) and ${hoursRemainingBase.toFixed(
                1
              )} hour(s) remaining.`}
        </div>

        <div className="glow-text" style={{ marginTop: 8, opacity: 0.95 }}>
          {ladderUnlocked ? (
            <>🔓 Levels 3–5 are unlocked (150K reached).</>
          ) : (
            <>
              🔒 Levels 3–5 unlock when you hit <b>150K</b> monthly diamonds.
            </>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          {targetLevel ? (
            (() => {
              const available = isLevelAvailable(targetLevel);
              const done = isLevelEligible(targetLevel);

              const daysPct = percent(validDaysNow, targetLevel.days);
              const hrsPct = percent(hoursNow, targetLevel.hours);

              const isL2 = targetLevel.level === 2;

              const rewardText = isL2
                ? "Eligibility only (0 points)"
                : `+${scaledReward.toLocaleString()} points`;

              return (
                <>
                  {/* CURRENT TARGET */}
                  <div
                    style={{
                      borderRadius: 16,
                      padding: 14,
                      background: available
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      opacity: available ? 1 : 0.75,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 900,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                          className="glow-text"
                        >
                          Target: Level {targetLevel.level}
                        </div>

                        {!available && (
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 900,
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.12)",
                            }}
                          >
                            🔒 Locked (needs 150K)
                          </span>
                        )}

                        {available && done && (
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 900,
                              background: "rgba(124,246,255,0.10)",
                              border: "1px solid rgba(124,246,255,0.45)",
                              color: "#7cf6ff",
                              textShadow: "0 0 8px rgba(124,246,255,0.35)",
                            }}
                          >
                            ✅ Completed
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontWeight: 900,
                          color: "#2de0ff",
                          textShadow: "0 0 10px rgba(45,224,255,0.55)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rewardText}
                      </div>
                    </div>

                    <div className="glow-text" style={{ marginBottom: 10 }}>
                      Target: <b>{targetLevel.days}</b> valid days &{" "}
                      <b>{targetLevel.hours}</b> hours
                      {!isL2 && (
                        <>
                          {" "}
                          • Diamond scale: <b>{diamondScale}×</b> (150K → 1×,
                          300K → 2×, 900K → 6×)
                        </>
                      )}
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      {/* Valid Days */}
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            marginBottom: 8,
                          }}
                          className="glow-text"
                        >
                          <div
                            style={{
                              fontWeight: 900,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            Valid Days
                          </div>
                          <div style={{ fontWeight: 900 }}>
                            {Math.min(validDaysNow, targetLevel.days)}/
                            {targetLevel.days}{" "}
                            <span style={{ opacity: 0.95 }}>
                              ({Math.round(daysPct)}%)
                            </span>
                          </div>
                        </div>

                        <div style={barOuter}>
                          <div
                            style={barInner(
                              daysPct,
                              validDaysNow >= targetLevel.days
                            )}
                          />
                        </div>
                      </div>

                      {/* Hours */}
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            marginBottom: 8,
                          }}
                          className="glow-text"
                        >
                          <div
                            style={{
                              fontWeight: 900,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            Hours Live
                          </div>
                          <div style={{ fontWeight: 900 }}>
                            {Math.min(hoursNow, targetLevel.hours).toFixed(1)}/
                            {targetLevel.hours}{" "}
                            <span style={{ opacity: 0.95 }}>
                              ({Math.round(hrsPct)}%)
                            </span>
                          </div>
                        </div>

                        <div style={barOuter}>
                          <div
                            style={barInner(hrsPct, hoursNow >= targetLevel.hours)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LOCKED PREVIEW (NEXT TARGET) */}
                  {nextLevel && (
                    <div style={lockedPreviewStyle}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          className="glow-text"
                          style={{
                            fontWeight: 900,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          Next: Level {nextLevel.level}
                        </div>

                        <div
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 900,
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)",
                          }}
                        >
                          🔒 Locked
                        </div>
                      </div>

                      <div className="glow-text" style={{ marginTop: 6 }}>
                        {nextLevel.days} valid days • {nextLevel.hours} hours
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          ) : (
            <div
              style={{
                borderRadius: 16,
                padding: 14,
                background: "rgba(45,224,255,0.06)",
                border: "1px solid rgba(45,224,255,0.22)",
              }}
              className="glow-text"
            >
              ✅ All levels completed for this month.
            </div>
          )}

          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(45,224,255,0.22)",
              background: "rgba(45,224,255,0.06)",
            }}
            className="glow-text"
          >
            🎯 Points earned from Levels 3–5 this month:{" "}
            <b>{earnedLevelPoints.toLocaleString()}</b>
          </div>
        </div>
      </section>

      {/* ✅ Monthly Progress (one bar, clean) */}
      <section className="dash-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          <div className="dash-card-title">Monthly Progress</div>

          <div style={{ textAlign: "right" }}>
            <div style={totalDiamondsLabelStyle}>Total Diamonds</div>
            <div style={totalDiamondsNumberStyle}>
              {monthlyDiamonds.toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          {/* bar */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 14,
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.10)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, rgba(45,224,255,0.95), rgba(123,232,255,0.85))",
                boxShadow: "0 0 10px rgba(45,224,255,0.45)",
                transition: "width 350ms ease",
              }}
            />

            {/* ticks */}
            {milestones.map((m) => {
              const left = milestoneLeftPct(m.value);
              const hit = monthlyDiamonds >= m.value;
              return (
                <div
                  key={m.value}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: `${left}%`,
                    height: "100%",
                    width: 2,
                    transform: "translateX(-50%)",
                    background: hit
                      ? "rgba(255,255,255,0.95)"
                      : "rgba(255,255,255,0.65)",
                  }}
                />
              );
            })}
          </div>

          {/* outside labels */}
          <div style={{ position: "relative", marginTop: 10, height: 44 }}>
            {milestones.map((m) => {
              const left = milestoneLeftPct(m.value);
              const hit = monthlyDiamonds >= m.value;
              const edgeStyle = milestoneLabelStyle(m.value);

              return (
                <div
                  key={`out-${m.value}`}
                  style={{
                    position: "absolute",
                    left: `${left}%`,
                    top: 0,
                    width: 110,
                    maxWidth: "40vw",
                    ...edgeStyle,
                  }}
                >
                  <div
                    className="glow-text"
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      opacity: hit ? 1 : 0.85,
                      lineHeight: 1.1,
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    className="glow-text"
                    style={{
                      marginTop: 2,
                      fontSize: 14,
                      lineHeight: 1,
                      opacity: hit ? 0.95 : 0.6,
                    }}
                  ></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ✅ Summary grid */}
      <section className="dash-summary-grid">
        <div className="dash-mini-card">
          <div className="mini-label">Yesterday’s diamonds</div>
          <div className="mini-value">{yesterdayDiamonds.toLocaleString()}</div>
        </div>

        <div className="dash-mini-card">
          <div className="mini-label">This month’s diamonds</div>
          <div className="mini-value">{monthlyDiamonds.toLocaleString()}</div>
        </div>

        <div className="dash-mini-card">
          <div className="mini-label">Total hours (this month)</div>
          <div className="mini-value">{monthlyHours.toFixed(1)}h</div>
        </div>
      </section>

      {/* Calendar */}
      <section className="dash-card">
        <div className="dash-card-title">
          {label} {year} Activity
        </div>

        <div className="calendar">
          <div className="calendar-weekdays">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          <div className="calendar-grid">
            {cells.map((cell, i) => {
              if (!cell.day) {
                return <div key={i} className="calendar-cell empty" />;
              }

              const e = historyByDate[cell.dateStr!];
              const hrs = e?.hours ?? 0;

              return (
                <div
                  key={cell.dateStr}
                  className={
                    "calendar-cell day-cell" + (hrs >= 1 ? " day-active" : "")
                  }
                >
                  <div className="day-number">{cell.day}</div>
                  <div className="day-metrics compact">
                    <span>💎 {e?.daily?.toLocaleString() ?? "-"}</span>
                    <span>{hrs > 0 ? `⏱ ${hrs.toFixed(1)}h` : ""}</span>
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
