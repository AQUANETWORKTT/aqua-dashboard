"use client";

import { creators } from "@/data/creators";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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


const INCENTIVES_START = "2025-12-01";

export default function CreatorDashboardPage() {
  const { username } = useParams() as { username: string };
  const usernameParam = username || "";

  const creator = creators.find(
    (c) => c.username.toLowerCase() === usernameParam.toLowerCase()
  );

  const lifetime = creator?.lifetime ?? 0;
  const yesterdayDiamonds = creator?.daily ?? 0;

  // Leaderboard ranking
  const sorted = useMemo(
    () => [...creators].sort((a, b) => b.lifetime - a.lifetime),
    []
  );
  const rankIndex = sorted.findIndex(
    (c) => c.username.toLowerCase() === usernameParam.toLowerCase()
  );
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  // Individual history (for calendar & monthly stats)
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // All histories (for daily top 5 + points math)
  const [allHistories, setAllHistories] = useState<
    Record<string, HistoryEntry[]>
  >({});

  // Lifetime system points (incentives)
  const [systemPoints, setSystemPoints] = useState<number | null>(null);
  const [systemBreakdown, setSystemBreakdown] =
    useState<PointsBreakdown | null>(null);
  const [systemStreakDays, setSystemStreakDays] = useState<number>(0);
  const [systemLoading, setSystemLoading] = useState<boolean>(true);

  // ----------------- Load current user's history -----------------
  useEffect(() => {
    if (!usernameParam) return;

    async function load() {
      try {
        const res = await fetch(`/history/${usernameParam}.json`, {
          cache: "no-store",
        });

        if (!res.ok) {
          setHistory([]);
          return;
        }

        const json = (await res.json()) as HistoryFile;
        const all = Array.isArray(json.entries) ? json.entries : [];

        // Only from incentives start date
        const filtered = all.filter((e) => e.date >= INCENTIVES_START);
        setHistory(filtered);
      } catch {
        setHistory([]);
      }
    }

    load();
  }, [usernameParam]);

  // ----------------- Load ALL creators' histories (for top 5 & points) -----------------
  useEffect(() => {
    async function loadAll() {
      const result: Record<string, HistoryEntry[]> = {};

      await Promise.all(
        creators.map(async (c) => {
          try {
            const res = await fetch(`/history/${c.username}.json`, {
              cache: "no-store",
            });
            if (!res.ok) return;

            const json = (await res.json()) as HistoryFile;
            const entries = Array.isArray(json.entries)
              ? json.entries.filter((e) => e.date >= INCENTIVES_START)
              : [];

            result[c.username] = entries;
          } catch {
            // ignore
          }
        })
      );

      setAllHistories(result);
      setSystemLoading(false);
    }

    loadAll();
  }, []);

  // ----------------- Shared helpers -----------------

  function computeStreak(entries: HistoryEntry[]): number {
    if (!entries.length) return 0;

    const sorted = [...entries].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    );

    const last = sorted[sorted.length - 1];
    const todayKey = new Date().toISOString().split("T")[0];

    const lastHours = last.hours ?? 0;
    const lastIsToday = last.date === todayKey;

    // Ignore today's placeholder with 0h
    if (lastIsToday && lastHours < 1) {
      return computeStreak(sorted.slice(0, -1));
    }

    if (lastHours < 1) return 0;

    let streak = 1;
    let lastDate = new Date(last.date + "T00:00:00Z");

    for (let i = sorted.length - 2; i >= 0; i--) {
      const e = sorted[i];
      const d = new Date(e.date + "T00:00:00Z");

      const diff =
        (lastDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);

      if (diff >= 0.5 && diff <= 1.5 && (e.hours ?? 0) >= 1) {
        streak++;
        lastDate = d;
      } else break;
    }

    return streak;
  }

  function streakPoints(days: number) {
    if (days >= 30) return 150;
    if (days >= 20) return 100;
    if (days >= 10) return 50;
    if (days >= 5) return 25;
    if (days >= 3) return 15;
    return 0;
  }

  function calcDayPoints(e: HistoryEntry, rankBonus: number) {
    const hrs = e.hours ?? 0;
    let pts = 0;

    // First 1,000 diamonds → 10 pts
    if (e.daily >= 1000) pts += 10;

    // Every extra 1,000 → 2 pts
    if (e.daily > 1000) {
      const extra = Math.floor((e.daily - 1000) / 1000);
      pts += extra * 2;
    }

    // Every full hour → 3 pts
    pts += Math.floor(hrs) * 3;

    // Valid day (1h+) → +3 pts
    if (hrs >= 1) pts += 3;

    // Top 5 daily
    pts += rankBonus;

    return pts;
  }

  // ----------------- Compute lifetime system points (since Dec 1) -----------------
  useEffect(() => {
    if (!usernameParam) return;
    if (!Object.keys(allHistories).length) return;

    const myEntries = allHistories[usernameParam] || [];

    if (!myEntries.length) {
      setSystemPoints(0);
      setSystemBreakdown({
        diamonds: 0,
        hours: 0,
        valid: 0,
        top5: 0,
        streak: 0,
        rawHours: 0,
        validDays: 0,
      });
      setSystemStreakDays(0);
      return;
    }

    // Build rank bonus per day using all creators' histories
    const daySet = new Set<string>();
    for (const uname in allHistories) {
      allHistories[uname].forEach((e) => daySet.add(e.date));
    }

    const rankBonusByDay: Record<string, Record<string, number>> = {};
    const bonuses = [25, 20, 15, 10, 5];

    daySet.forEach((date) => {
      const list: { username: string; daily: number }[] = [];

      for (const uname in allHistories) {
        const entry = allHistories[uname].find((x) => x.date === date);
        if (entry && entry.daily > 0) {
          list.push({ username: uname, daily: entry.daily });
        }
      }

      if (!list.length) return;

      list.sort((a, b) => b.daily - a.daily);

      const map: Record<string, number> = {};
      list.forEach((row, i) => {
        if (i < bonuses.length) {
          map[row.username] = bonuses[i];
        }
      });

      rankBonusByDay[date] = map;
    });

    // Sum points & breakdown
    const breakdown: PointsBreakdown = {
      diamonds: 0,
      hours: 0,
      valid: 0,
      top5: 0,
      streak: 0,
      rawHours: 0,
      validDays: 0,
    };

    let total = 0;

    myEntries.forEach((e) => {
      const rankBonus = rankBonusByDay[e.date]?.[usernameParam] ?? 0;
      const dayPts = calcDayPoints(e, rankBonus);
      total += dayPts;

      // Diamonds points
      if (e.daily >= 1000) breakdown.diamonds += 10;
      if (e.daily > 1000) {
        const extra = Math.floor((e.daily - 1000) / 1000);
        breakdown.diamonds += extra * 2;
      }

      const hrs = e.hours ?? 0;

      // Raw stats
      breakdown.rawHours += hrs;
      if (hrs >= 1) breakdown.validDays += 1;

      // Hour points
      breakdown.hours += Math.floor(hrs) * 3;

      // Valid day points
      if (hrs >= 1) breakdown.valid += 3;

      // Top 5 points
      breakdown.top5 += rankBonus;
    });

    const streakDays = computeStreak(myEntries);
    const sBonus = streakPoints(streakDays);
    total += sBonus;
    breakdown.streak = sBonus;

    setSystemPoints(total);
    setSystemBreakdown(breakdown);
    setSystemStreakDays(streakDays);
  }, [allHistories, usernameParam]);

  // ----------------- Month + calendar stuff (same as before) -----------------

  function buildMonth() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = (first.getDay() + 6) % 7; // Monday-based

    const cells: { day: number | null; dateStr?: string }[] = [];

    for (let i = 0; i < firstWeekday; i++) cells.push({ day: null });

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().slice(0, 10);
      cells.push({ day: d, dateStr });
    }

    return {
      cells,
      year,
      month,
      monthLabel: today.toLocaleString("default", { month: "long" }),
    };
  }

  const { cells, year, month, monthLabel } = buildMonth();

  const historyByDate = useMemo(() => {
    const map: Record<string, HistoryEntry> = {};
    for (const e of history) map[e.date] = e;
    return map;
  }, [history]);

  const streak = computeStreak(history);

  const monthTotals = useMemo(() => {
    let diamonds = 0;
    let hours = 0;

    for (const e of history) {
      const d = new Date(e.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        diamonds += e.daily ?? 0;
        hours += e.hours ?? 0;
      }
    }

    return { diamonds, hours };
  }, [history, year, month]);

  const monthlyDiamonds = monthTotals.diamonds;
  const totalHoursAllTime = history.reduce((s, e) => s + (e.hours ?? 0), 0);

  const pct75 = Math.min(1, monthlyDiamonds / 75_000);
  const pct150 = Math.min(1, monthlyDiamonds / 150_000);
  const pct500 = Math.min(1, monthlyDiamonds / 500_000);

  // ----------------- JSX -----------------

  return (
    <main className="dashboard-wrapper">
      {/* HEADER */}
      <section className="dash-header">
        <div className="dash-profile">
          <img
            src={`/creators/${usernameParam}.jpg`}
            className="dash-avatar"
            alt={`${usernameParam} avatar`}
          />
          <div>
            <div className="dash-username">{usernameParam}</div>
            {rank && (
              <div className="dash-rank">
                Rank #{rank} of {creators.length}
              </div>
            )}
          </div>
        </div>

        <div className="dash-streak-card">
          <div className="streak-label">Current Streak</div>
          <div className="streak-value">
            {streak}
            <span className="streak-unit"> days</span>
          </div>
          <p className="streak-subtext">
            Streak counts 1h+ days from yesterday backwards.
          </p>
        </div>
      </section>

      {/* LIFETIME SYSTEM POINTS */}
      <section
        className="dash-card"
        style={{
          marginTop: "20px",
          border: "1px solid rgba(45,224,255,0.45)",
          background: "#031018",
          boxShadow: "0 0 14px rgba(45,224,255,0.25)",
        }}
      >
        <div
          style={{
            fontSize: "22px",
            fontWeight: 700,
            marginBottom: "10px",
            background: "linear-gradient(90deg,#2de0ff,#7be8ff)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          🌊 Lifetime Points (System)
        </div>

        {systemLoading && (
          <div style={{ color: "#9fdcf5", fontSize: "14px" }}>Loading...</div>
        )}

        {!systemLoading && systemPoints === null && (
          <div style={{ color: "#f3b0b0", fontSize: "14px" }}>
            No incentive points data found yet.
          </div>
        )}

        {!systemLoading && systemPoints !== null && systemBreakdown && (
          <>
            <div
              style={{
                fontSize: "34px",
                fontWeight: 800,
                color: "#fff",
                marginBottom: "6px",
                textShadow: "0 0 10px rgba(45,224,255,0.8)",
              }}
            >
              {systemPoints}
            </div>

            <div style={{ color: "#9fdcf5", marginBottom: "14px" }}>
              Points earned from <strong>1st December</strong> onwards. This is
              your total system points (before any manual redemptions).
            </div>

            <div
              style={{
                marginTop: "10px",
                paddingTop: "10px",
                borderTop: "1px solid rgba(45,224,255,0.25)",
                fontSize: "14px",
                lineHeight: "1.6",
                display: "grid",
                gap: "8px",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <div>
                <b>Diamonds:</b> {systemBreakdown.diamonds} pts
              </div>

              <div>
                <b>Hours:</b>{" "}
                {systemBreakdown.rawHours.toFixed(1)}h →{" "}
                <span>{systemBreakdown.hours} pts</span>
              </div>

              <div>
                <b>Valid Days:</b>{" "}
                {systemBreakdown.validDays} days →{" "}
                <span>{systemBreakdown.valid} pts</span>
              </div>

              <div>
                <b>Top 5 Bonuses:</b> {systemBreakdown.top5} pts
              </div>

              <div>
                <b>Streak Bonus:</b> {systemBreakdown.streak} pts (
                {systemStreakDays} days)
              </div>
            </div>
          </>
        )}
      </section>

      {/* MONTHLY PROGRESS */}
      <section className="dash-card">
        <div className="dash-card-title">Monthly Progress</div>
        <div className="dash-card-sub">
          Diamonds earned this month across all streams.
        </div>

        {/* 75K */}
        <div className="progress-block">
          <div className="progress-label">75K Monthly Target</div>
          <div className="target-bar">
            <div className="target-bar-bg">
              <div
                className="target-bar-fill"
                style={{ width: `${pct75 * 100}%` }}
              />
            </div>
            <div className="target-current">
              {monthlyDiamonds.toLocaleString()} / 75,000
            </div>
          </div>
        </div>

        {/* 150K */}
        <div className="progress-block">
          <div className="progress-label">150K Monthly Target</div>
          <div className="target-bar">
            <div className="target-bar-bg">
              <div
                className="target-bar-fill"
                style={{ width: `${pct150 * 100}%` }}
              />
            </div>
            <div className="target-current">
              {monthlyDiamonds.toLocaleString()} / 150,000
            </div>
          </div>
        </div>

        {/* 500K */}
        <div className="progress-block">
          <div className="progress-label">500K Monthly Target</div>
          <div className="target-bar">
            <div className="target-bar-bg">
              <div
                className="target-bar-fill"
                style={{ width: `${pct500 * 100}%` }}
              />
            </div>
            <div className="target-current">
              {monthlyDiamonds.toLocaleString()} / 500,000
            </div>
          </div>
        </div>
      </section>

      {/* MONTHLY ACHIEVEMENTS */}
      <section className="dash-card achievement-card">
        <div className="achievement-title">Monthly Achievements</div>

        <div className="achievement-grid">
          {/* BRONZE */}
          <div
            className={
              "achievement-badge " +
              (monthlyDiamonds >= 75_000
                ? "badge-unlocked bronze"
                : "badge-locked")
            }
          >
            <div className="badge-level">75K</div>
            <div className="badge-text">
              {monthlyDiamonds >= 75_000 ? "Bronze Reached" : "Locked"}
            </div>
          </div>

          {/* SILVER */}
          <div
            className={
              "achievement-badge " +
              (monthlyDiamonds >= 150_000
                ? "badge-unlocked silver"
                : "badge-locked")
            }
          >
            <div className="badge-level">150K</div>
            <div className="badge-text">
              {monthlyDiamonds >= 150_000 ? "Silver Reached" : "Locked"}
            </div>
          </div>

          {/* GOLD */}
          <div
            className={
              "achievement-badge " +
              (monthlyDiamonds >= 500_000
                ? "badge-unlocked gold"
                : "badge-locked")
            }
          >
            <div className="badge-level">500K</div>
            <div className="badge-text">
              {monthlyDiamonds >= 500_000 ? "Gold Reached" : "Locked"}
            </div>
          </div>
        </div>

        <p
          style={{
            marginTop: "14px",
            fontSize: "13px",
            color: "#9fe8ff",
            textAlign: "center",
          }}
        >
          Monthly Diamonds: <b>{monthlyDiamonds.toLocaleString()}</b>
        </p>
      </section>

      {/* SUMMARY CARDS */}
      <section className="dash-summary-grid">
        <div className="dash-mini-card">
          <div className="mini-label">Yesterday’s diamonds</div>
          <div className="mini-value">
            {yesterdayDiamonds.toLocaleString()}
          </div>
        </div>

        <div className="dash-mini-card">
          <div className="mini-label">This month’s diamonds</div>
          <div className="mini-value">
            {monthlyDiamonds.toLocaleString()}
          </div>
        </div>

        <div className="dash-mini-card">
          <div className="mini-label">Total hours (since Dec)</div>
          <div className="mini-value">
            {totalHoursAllTime.toFixed(1)}h
          </div>
        </div>
      </section>

      {/* CALENDAR */}
      <section className="dash-card">
        <div className="dash-card-title">
          {monthLabel} {year} Activity
        </div>
        <div className="dash-card-sub">
          Diamonds & hours per day. Blue = 1h+ live.
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
              if (!cell.day)
                return <div key={i} className="calendar-cell empty" />;

              const stats = cell.dateStr
                ? historyByDate[cell.dateStr]
                : undefined;

              const daily = stats?.daily ?? 0;
              const hours = stats?.hours ?? 0;
              const isActive = hours >= 1;

              return (
                <div
                  key={cell.dateStr}
                  className={
                    "calendar-cell day-cell" +
                    (isActive ? " day-active" : "")
                  }
                >
                  <div className="day-number">{cell.day}</div>
                  <div className="day-metrics">
                    <span className="day-diamonds">
                      {daily > 0 ? daily.toLocaleString() : "-"}
                    </span>
                    <span className="day-hours">
                      {hours > 0 ? `${hours.toFixed(1)}h` : ""}
                    </span>
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
