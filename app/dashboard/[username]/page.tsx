"use client";
import { supabase } from "@/lib/supabase";
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

type IncentiveStats = {
  diamonds: number;
  hours: number;
  validDays: number;
  top5Count: number;
  incentiveBalance: number;
};


export default function CreatorDashboardPage() {
  const params = useParams();
  const usernameParam = (params?.username as string) || "";

  const creator = creators.find(
    (c) => c.username.toLowerCase() === usernameParam.toLowerCase()
  );

  const yesterdayDiamonds = creator?.daily ?? 0;

  // Rank
  const sorted = useMemo(
    () => [...creators].sort((a, b) => b.lifetime - a.lifetime),
    []
  );
  const rankIndex = sorted.findIndex(
    (c) => c.username.toLowerCase() === usernameParam.toLowerCase()
  );
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [allHistories, setAllHistories] = useState<
    Record<string, HistoryEntry[]>
  >({});
  const [stats, setStats] = useState<IncentiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  // ------------------ Load user history ------------------
  useEffect(() => {
    if (!usernameParam) return;

    fetch(`/history/${usernameParam}.json`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: HistoryFile) =>
        setHistory(Array.isArray(j.entries) ? j.entries : [])
      )
      .catch(() => setHistory([]));
  }, [usernameParam]);

  // ------------------ Load all histories (Top 5) ------------------
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
      setLoading(false);
    }

    loadAll();
  }, []);

  // ------------------ Incentive raw stats ------------------
useEffect(() => {
  if (!history.length || !Object.keys(allHistories).length) {
    setStats(null);
    return;
  }

  async function run() {
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
      if (top5ByDay[e.date]?.includes(usernameParam)) top5Count++;
    });

// ================= INCENTIVE POINT CALCULATION =================

// 💎 Diamond points
const thousands = Math.floor(diamonds / 1000);
let diamondPoints = 0;

if (thousands >= 1) {
  diamondPoints += 10; // first 1k
  diamondPoints += Math.max(0, thousands - 1) * 5; // additional 1ks
}

// ⏱ Live hour points
const fullHours = Math.floor(hours);
const hourPoints = fullHours * 3;

// ✅ Valid day bonus (1h+)
const validDayPoints = validDays * 3;

// 🏆 Top-5 placement points
let top5Points = 0;

history.forEach((e) => {
  const placements = top5ByDay[e.date];
  if (!placements) return;

  const pos = placements.indexOf(usernameParam);
  if (pos === -1) return;

  if (pos === 0) top5Points += 25;
  else if (pos === 1) top5Points += 20;
  else if (pos === 2) top5Points += 15;
  else if (pos === 3) top5Points += 10;
  else if (pos === 4) top5Points += 5;
});

// ✅ TOTAL app-calculated incentive points
const calculatedPoints =
  diamondPoints +
  hourPoints +
  validDayPoints +
  top5Points;


    // ✅ FETCH ADMIN ADJUSTMENT FROM SUPABASE
const { data } = await supabase
  .from("points_adjustments")
  .select("points")
  .eq("username", usernameParam)
  .single();

const adminAdjustment = data?.points ?? 0;

// ✅ ADD admin points ON TOP (not replace)
const incentiveBalance = adminAdjustment;

setStats({
  diamonds,
  hours,
  validDays,
  top5Count,
  incentiveBalance,
});

  }

  run();
}, [history, allHistories, usernameParam]);

  // ------------------ Month + calendar ------------------
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

  const monthTotals = useMemo(() => {
    let diamonds = 0;
    let hours = 0;

    history.forEach((e) => {
      const d = new Date(e.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        diamonds += e.daily ?? 0;
        hours += e.hours ?? 0;
      }
    });

    return { diamonds, hours };
  }, [history, year, month]);

  const monthlyDiamonds = monthTotals.diamonds;
  const totalHoursAllTime = history.reduce((s, e) => s + (e.hours ?? 0), 0);

  const pct75 = Math.min(1, monthlyDiamonds / 75_000);
  const pct150 = Math.min(1, monthlyDiamonds / 150_000);
  const pct500 = Math.min(1, monthlyDiamonds / 500_000);

  return (
    <main className="dashboard-wrapper">
      {/* HEADER */}
      <section className="dash-header">
        <div className="dash-profile">
          <img src={`/creators/${usernameParam}.jpg`} className="dash-avatar" />
          <div>
            <div className="dash-username">{usernameParam}</div>
            {rank && (
              <div className="dash-rank">
                Rank #{rank} of {creators.length}
              </div>
            )}
          </div>
        </div>

        {/* INCENTIVE STATS */}
        <div className="dash-card">
          <div className="dash-card-title">💎 Incentive Stats</div>
          {loading && <div>Loading…</div>}
          {!loading && stats && (
            <>
		<div
  style={{
    fontSize: "20px",
    fontWeight: 800,
    marginBottom: "8px",
    color: "#2de0ff",
    textShadow: "0 0 6px rgba(45,224,255,0.5)",
  }}
>
  💰 Incentive Balance: {stats?.incentiveBalance?.toLocaleString() ?? 0}
</div>

              <div>💎 Diamonds: <b>{stats.diamonds.toLocaleString()}</b></div>
              <div>⏱️ Hours live: <b>{stats.hours.toFixed(1)}h</b></div>
              <div>✅ Valid days: <b>{stats.validDays}</b></div>
              <div>🏆 Top-5 finishes: <b>{stats.top5Count}</b></div>
            </>
          )}
        </div>
      </section>

      {/* MONTHLY PROGRESS */}
      <section className="dash-card">
        <div className="dash-card-title">Monthly Progress</div>

        {[["75K", 75_000, pct75], ["150K", 150_000, pct150], ["500K", 500_000, pct500]].map(
          ([label, target, pct]) => (
            <div key={String(target)} className="progress-block">
              <div className="progress-label">{label} Monthly Target</div>
              <div className="target-bar">
                <div className="target-bar-bg">
                  <div className="target-bar-fill" style={{ width: `${(pct as number) * 100}%` }} />
                </div>
                <div className="target-current">
                  {monthlyDiamonds.toLocaleString()} / {Number(target).toLocaleString()}
                </div>
              </div>
            </div>
          )
        )}
      </section>

      {/* MONTHLY ACHIEVEMENTS */}
      <section className="dash-card achievement-card">
        <div className="achievement-title">Monthly Achievements</div>
        <div className="achievement-grid">
          {[75_000, 150_000, 500_000].map((t) => (
            <div
              key={t}
              className={
                "achievement-badge " +
                (monthlyDiamonds >= t ? "badge-unlocked" : "badge-locked")
              }
            >
              <div className="badge-level">{t / 1000}K</div>
              <div className="badge-text">
                {monthlyDiamonds >= t ? "Unlocked" : "Locked"}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SUMMARY */}
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
          <div className="mini-label">Total hours (all time)</div>
          <div className="mini-value">{totalHoursAllTime.toFixed(1)}h</div>
        </div>
      </section>

      {/* CALENDAR */}
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

              const stats = cell.dateStr
                ? historyByDate[cell.dateStr]
                : undefined;

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
                  <div className="day-metrics compact">
                    <span>💎 {stats?.daily ? stats.daily.toLocaleString() : "-"}</span>
                    <span>{hours > 0 ? `⏱ ${hours.toFixed(1)}h` : ""}</span>
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
