"use client";

import { creators } from "@/data/creators";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";

type HistoryEntry = {
  date: string;
  daily: number;
  lifetime: number;
  hours?: number;
};

// Load per-creator history JSON through API
async function loadHistory(username: string) {
  try {
    const res = await fetch(`/api/history/${username}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function CreatorDashboardPage() {
  const params = useParams();
  const username = (params?.username as string) || "";

  const creator = creators.find(
    (c) => c.username.toLowerCase() === username.toLowerCase()
  );

  const lifetime = creator?.lifetime ?? 0;
  const yesterdayDiamonds = creator?.daily ?? 0;

  // REAL history storage
  const [history, setHistory] = useState<Record<string, HistoryEntry>>({});

  // Load JSON history
  useEffect(() => {
    loadHistory(username).then((data) => {
      if (!data) return;

      const mapped: Record<string, HistoryEntry> = {};
      data.entries.forEach((e: HistoryEntry) => {
        mapped[e.date] = {
          date: e.date,
          daily: e.daily,
          lifetime: e.lifetime,
          hours: e.hours ?? 0,
        };
      });
      setHistory(mapped);
    });
  }, [username]);

  // Leaderboard rank
  const sorted = useMemo(
    () => [...creators].sort((a, b) => b.lifetime - a.lifetime),
    []
  );
  const index = sorted.findIndex(
    (c) => c.username.toLowerCase() === username.toLowerCase()
  );
  const rank = index >= 0 ? index + 1 : null;

  // Build calendar
  function buildMonth() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;

    const cells: { day: number | null; dateStr?: string }[] = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null });

    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().slice(0, 10);
      cells.push({ day: d, dateStr });
    }

    return {
      cells,
      year,
      monthLabel: new Date(year, month).toLocaleString("default", {
        month: "long",
      }),
    };
  }

  const { cells, year, monthLabel } = buildMonth();

  // Streak calculator (1+ hour days)
  function computeStreak(historyObj: Record<string, HistoryEntry>) {
    const activeDays = new Set(
      Object.values(historyObj)
        .filter((e) => (e.hours ?? 0) >= 1)
        .map((e) => e.date)
    );

    if (activeDays.size === 0) return 0;

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);

      if (activeDays.has(iso)) streak++;
      else break;
    }
    return streak;
  }

  const streak = computeStreak(history);

  // Target progress
  const pctTotal = Math.min(1, lifetime / 500000);

  return (
    <main className="dashboard-wrapper">
      {/* HEADER */}
      <section className="dash-header">
        <div className="dash-profile">
          <img
            src={`/creators/${username}.jpg`}
            className="dash-avatar"
            alt={`${username} avatar`}
          />
          <div>
            <div className="dash-username">{username}</div>
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
          <p className="streak-subtext">Streak = 1h+ a day</p>
        </div>
      </section>

      {/* TARGET BAR */}
      <section className="dash-card">
        <div className="dash-card-title">Network Targets</div>
        <div className="dash-card-sub">
          Progress toward 75k, 150k & 500k lifetime diamonds
        </div>

        <div className="target-bar">
          <div className="target-bar-bg">
            <div
              className="target-bar-fill"
              style={{ width: `${pctTotal * 100}%` }}
            />
            <div className="target-marker marker-75" />
            <div className="target-marker marker-150" />
            <div className="target-marker marker-500" />
          </div>

          <div className="target-current">
            Lifetime: <span>{lifetime.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* ACHIEVEMENTS — original correct style */}
      <section className="dash-card achievement-card">
        <div className="achievement-title">Achievements</div>

        <div className="achievement-grid">
          {/* 75k */}
          <div
            className={`achievement-badge ${
              lifetime >= 75000 ? "badge-unlocked bronze" : "badge-locked"
            }`}
          >
            <div className="badge-level">75K</div>
            <div className="badge-text">
              {lifetime >= 75000 ? "Bronze Achieved" : "Locked"}
            </div>
          </div>

          {/* 150k */}
          <div
            className={`achievement-badge ${
              lifetime >= 150000 ? "badge-unlocked silver" : "badge-locked"
            }`}
          >
            <div className="badge-level">150K</div>
            <div className="badge-text">
              {lifetime >= 150000 ? "Silver Achieved" : "Locked"}
            </div>
          </div>

          {/* 500k */}
          <div
            className={`achievement-badge ${
              lifetime >= 500000 ? "badge-unlocked gold" : "badge-locked"
            }`}
          >
            <div className="badge-level">500K</div>
            <div className="badge-text">
              {lifetime >= 500000 ? "GOLD Completed 🎉" : "Locked"}
            </div>
          </div>
        </div>
      </section>

      {/* SUMMARY CARDS */}
      <section className="dash-summary-grid">
        <div className="dash-mini-card">
          <div className="mini-label">Yesterday’s Diamonds</div>
          <div className="mini-value">
            {yesterdayDiamonds.toLocaleString()}
          </div>
        </div>

        <div className="dash-mini-card">
          <div className="mini-label">Month Diamonds</div>
          <div className="mini-value">
            {Object.values(history)
              .reduce((s, e) => s + (e.daily ?? 0), 0)
              .toLocaleString()}
          </div>
        </div>

        <div className="dash-mini-card">
          <div className="mini-label">Total Hours</div>
          <div className="mini-value">
            {Object.values(history)
              .reduce((s, e) => s + (e.hours ?? 0), 0)
              .toFixed(1)}
            h
          </div>
        </div>
      </section>

      {/* CALENDAR */}
      <section className="dash-card">
        <div className="dash-card-title">
          {monthLabel} {year} Activity
        </div>

        <div className="calendar">
          <div className="calendar-weekdays">
            <div>Mon</div><div>Tue</div><div>Wed</div>
            <div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
          </div>

          <div className="calendar-grid">
            {cells.map((cell, i) => {
              if (!cell.day)
                return <div key={i} className="calendar-cell empty" />;

              const stats = cell.dateStr ? history[cell.dateStr] : undefined;

              return (
                <div
                  key={cell.dateStr}
                  className={
                    "calendar-cell day-cell" +
                    ((stats?.hours ?? 0) >= 1 ? " day-active" : "")
                  }
                >
                  <div className="day-number">{cell.day}</div>
                  <div className="day-metrics">
                    <span className="day-diamonds">
                      {stats?.daily
                        ? stats.daily.toLocaleString()
                        : "-"}
                    </span>
                    <span className="day-hours">
                      {stats?.hours ? `${stats.hours}h` : ""}
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
