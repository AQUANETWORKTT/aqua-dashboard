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

export default function CreatorDashboardPage() {
  const params = useParams();
  const usernameParam = (params?.username as string) || "";

  const creator = creators.find(
    (c) => c.username.toLowerCase() === usernameParam.toLowerCase()
  );

  const lifetime = creator?.lifetime ?? 0;
  const yesterdayDiamonds = creator?.daily ?? 0;

  // leaderboard rank by lifetime
  const sorted = useMemo(
    () => [...creators].sort((a, b) => b.lifetime - a.lifetime),
    []
  );
  const rankIndex = sorted.findIndex(
    (c) => c.username.toLowerCase() === usernameParam.toLowerCase()
  );
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load history JSON
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
        setHistory(Array.isArray(json.entries) ? json.entries : []);
      } catch {
        setHistory([]);
      }
    }

    load();
  }, [usernameParam]);

  // build calendar for current month
  function buildMonth() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const firstWeekday = (first.getDay() + 6) % 7;

    const cells: { day: number | null; dateStr?: string }[] = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ day: null });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().slice(0, 10);
      cells.push({ day: d, dateStr });
    }

    const monthLabel = today.toLocaleString("default", { month: "long" });

    return { cells, year, month, monthLabel };
  }

  const { cells, year, month, monthLabel } = buildMonth();

  // history lookup
  const historyByDate = useMemo(() => {
    const map: Record<string, HistoryEntry> = {};
    for (const e of history) map[e.date] = e;
    return map;
  }, [history]);

  // streak
  function computeStreak(entries: HistoryEntry[]): number {
    if (!entries.length) return 0;

    const active = new Set(
      entries.filter((e) => (e.hours ?? 0) >= 1).map((e) => e.date)
    );
    if (!active.size) return 0;

    let streak = 0;

    const start = new Date();
    start.setDate(start.getDate() - 1);

    for (let i = 0; i < 365; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);

      const iso = d.toISOString().slice(0, 10);
      if (active.has(iso)) streak++;
      else break;
    }

    return streak;
  }

  const streak = computeStreak(history);

  // monthly totals
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

  // NEW progress bar percentages
  const pct75 = Math.min(1, monthlyDiamonds / 75_000);
  const pct150 = Math.min(1, monthlyDiamonds / 150_000);
  const pct500 = Math.min(1, monthlyDiamonds / 500_000);

  const totalHoursAllTime = history.reduce(
    (sum, e) => sum + (e.hours ?? 0),
    0
  );

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
            Streak = 1 hour+ live per day (from yesterday backwards)
          </p>
        </div>
      </section>

      {/* ⭐ NEW MONTHLY PROGRESS BARS */}
      <section className="dash-card">
        <div className="dash-card-title">Monthly Progress</div>
        <div className="dash-card-sub">
          Monthly diamond targets updated automatically.
        </div>

        {/* 75K MONTHLY BAR */}
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

        {/* 150K MONTHLY BAR */}
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

        {/* 500K MONTHLY BAR */}
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

      {/* ACHIEVEMENTS */}
      <section className="dash-card achievement-card">
        <div className="achievement-title">Achievements</div>

        <div className="achievement-grid">
          <div
            className={
              "achievement-badge " +
              (lifetime >= 75_000 ? "badge-unlocked bronze" : "badge-locked")
            }
          >
            <div className="badge-level">75K</div>
            <div className="badge-text">
              {lifetime >= 75_000 ? "Bronze Target Achieved" : "Locked"}
            </div>
          </div>

          <div
            className={
              "achievement-badge " +
              (lifetime >= 150_000 ? "badge-unlocked silver" : "badge-locked")
            }
          >
            <div className="badge-level">150K</div>
            <div className="badge-text">
              {lifetime >= 150_000 ? "Silver Target Achieved" : "Locked"}
            </div>
          </div>

          <div
            className={
              "achievement-badge " +
              (lifetime >= 500_000 ? "badge-unlocked gold" : "badge-locked")
            }
          >
            <div className="badge-level">500K</div>
            <div className="badge-text">
              {lifetime >= 500_000 ? "Gold Target Achieved" : "Locked"}
            </div>
          </div>
        </div>
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
          <div className="mini-label">Total hours (all time)</div>
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
          Diamonds & hours per day. Blue days show 1+ hour live.
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
