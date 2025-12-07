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
  diamonds: number;
  hours: number;
  validDays: number;
  top5Count: number;
  calculatedPoints: number;
  extrasPoints: number;
  incentiveBalance: number;
};

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

  /* ===================== INCENTIVE LOGIC ===================== */

  useEffect(() => {
    if (!history.length || !Object.keys(allHistories).length) return;

    let diamonds = 0;
    let hours = 0;
    let validDays = 0;
    let top5Count = 0;

    const dates = new Set<string>();
    Object.values(allHistories).forEach((arr) =>
      arr.forEach((e) => dates.add(e.date))
    );

    const top5ByDay: Record<string, string[]> = {};
    [...dates].forEach((date) => {
      const rows: { username: string; daily: number }[] = [];

      for (const u in allHistories) {
        const e = allHistories[u].find((x) => x.date === date);
        if (e && e.daily > 0) rows.push({ username: u, daily: e.daily });
      }

      rows.sort((a, b) => b.daily - a.daily);
      top5ByDay[date] = rows.slice(0, 5).map((r) => r.username);
    });

    history.forEach((e) => {
      diamonds += e.daily ?? 0;
      hours += e.hours ?? 0;
      if ((e.hours ?? 0) >= 1) validDays++;
      if (top5ByDay[e.date]?.includes(username)) top5Count++;
    });

    /* ---------- calculated points ---------- */

    const thousands = Math.floor(diamonds / 1000);
    let diamondPoints = 0;

    if (thousands >= 1) {
      diamondPoints += 10;
      diamondPoints += Math.max(0, thousands - 1) * 5;
    }

    const hourPoints = Math.floor(hours) * 3;
    const validDayPoints = validDays * 3;

    let top5Points = 0;
    history.forEach((e) => {
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

    /* ---------- FILE-BASED EXTRAS ---------- */
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

  const totalHoursAllTime = history.reduce(
    (s, e) => s + (e.hours ?? 0),
    0
  );

  const pct75 = Math.min(1, monthlyDiamonds / 75_000);
  const pct150 = Math.min(1, monthlyDiamonds / 150_000);
  const pct500 = Math.min(1, monthlyDiamonds / 500_000);

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
                {stats.incentiveBalance.toLocaleString()}
              </div>

              <div>
                ⚙️ Live-earned points: <b>{stats.calculatedPoints}</b>
              </div>
              <div>
                🎓 Graduations & extras: <b>{stats.extrasPoints}</b>
              </div>

              <div style={{ marginTop: 8 }}>
                💎 Diamonds: <b>{stats.diamonds.toLocaleString()}</b><br />
                ⏱️ Hours: <b>{stats.hours.toFixed(1)}h</b><br />
                ✅ Valid days: <b>{stats.validDays}</b><br />
                🏆 Top-5 finishes: <b>{stats.top5Count}</b>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="dash-card">
        <div className="dash-card-title">Monthly Progress</div>

        {[
          ["75K", 75_000, pct75],
          ["150K", 150_000, pct150],
          ["500K", 500_000, pct500],
        ].map(([labelText, target, pct]) => (
          <div key={String(target)} className="progress-block">
            <div className="progress-label">{labelText} Monthly Target</div>
            <div className="target-bar">
              <div className="target-bar-bg">
                <div
                  className="target-bar-fill"
                  style={{ width: `${(pct as number) * 100}%` }}
                />
              </div>
              <div className="target-current">
                {monthlyDiamonds.toLocaleString()} /{" "}
                {Number(target).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </section>

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

      <section className="dash-card">
        <div className="dash-card-title">
          {label} {year} Activity
        </div>

        <div className="calendar">
          <div className="calendar-weekdays">
            <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div>
            <div>Fri</div><div>Sat</div><div>Sun</div>
          </div>

          <div className="calendar-grid">
            {cells.map((cell, i) => {
              if (!cell.day)
                return <div key={i} className="calendar-cell empty" />;

              const e = historyByDate[cell.dateStr!];
              const hrs = e?.hours ?? 0;

              return (
                <div
                  key={cell.dateStr}
                  className={
                    "calendar-cell day-cell" +
                    (hrs >= 1 ? " day-active" : "")
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
