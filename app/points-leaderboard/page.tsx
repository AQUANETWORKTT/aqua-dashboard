// app/points-leaderboard/page.tsx

import fs from "fs";
import path from "path";
import { creators } from "@/data/creators";

type HistoryEntry = {
  date: string;
  daily?: number;
  hours?: number;
  lifetime?: number;
  lifetimeHours?: number;
};

type HistoryFile = {
  username: string;
  entries: HistoryEntry[];
};

type PointsCreator = {
  username: string;
  avatar: string;
  totalPoints: number;
  totalDailyDiamonds: number;
  totalHoursLive: number;
  streakDays: number;
};

// ------------------ Helpers ------------------

function parseDate(d: string) {
  return new Date(d + "T00:00:00Z");
}

// ⭐ FIXED STREAK LOGIC ⭐
// Prevents streak from dropping at midnight when today has 0 hours
function computeStreak(entries: HistoryEntry[]): number {
  if (!entries.length) return 0;

  const sorted = [...entries].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  const todayKey = new Date().toISOString().split("T")[0];
  const last = sorted[sorted.length - 1];
  const lastHours = last.hours ?? 0;

  // ⭐ If the most recent entry is today AND has 0 hours → ignore it
  if (last.date === todayKey && lastHours < 1) {
    return computeStreak(sorted.slice(0, -1));
  }

  // Normal rule
  if (lastHours < 1) return 0;

  let streak = 1;
  let lastDate = parseDate(last.date);

  for (let i = sorted.length - 2; i >= 0; i--) {
    const e = sorted[i];
    const d = parseDate(e.date);

    const diff =
      (lastDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);

    if (diff >= 0.5 && diff <= 1.5 && (e.hours ?? 0) >= 1) {
      streak++;
      lastDate = d;
    } else break;
  }

  return streak;
}

// no change
function streakPoints(days: number) {
  if (days >= 30) return 30;
  if (days >= 14) return 14;
  if (days >= 7) return 7;
  if (days >= 5) return 5;
  if (days >= 3) return 3;
  return 0;
}

function loadHistory(username: string): HistoryEntry[] {
  const file = path.join(process.cwd(), "public", "history", `${username}.json`);
  if (!fs.existsSync(file)) return [];

  try {
    const json = JSON.parse(fs.readFileSync(file, "utf8")) as HistoryFile;
    return json.entries?.sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    ) ?? [];
  } catch {
    return [];
  }
}

function formatNumber(n: number) {
  return n.toLocaleString("en-GB");
}

// ------------------ Main Component ------------------

export default function PointsLeaderboardPage() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const histories: Record<string, HistoryEntry[]> = {};
  creators.forEach((c: any) => {
    histories[c.username] = loadHistory(c.username);
  });

  // Collect this month's dates
  const dateSet = new Set<string>();
  Object.values(histories).forEach((arr) =>
    arr.forEach((e) => {
      if (e.date.startsWith(monthKey)) dateSet.add(e.date);
    })
  );
  const dates = [...dateSet].sort();

  // Daily achievements
  const achievementValues = [8, 6, 4, 2];
  const achievementByDay: Record<string, Record<string, number>> = {};

  dates.forEach((date) => {
    const dailyStats: { username: string; daily: number }[] = [];

    creators.forEach((c) => {
      const ex = histories[c.username].find((e) => e.date === date);
      if (ex?.daily && ex.daily > 0) {
        dailyStats.push({ username: c.username, daily: ex.daily });
      }
    });

    if (!dailyStats.length) return;

    dailyStats.sort((a, b) => b.daily - a.daily);

    const map: Record<string, number> = {};
    dailyStats.forEach((x, i) => {
      if (i < achievementValues.length) {
        map[x.username] = achievementValues[i];
      }
    });

    achievementByDay[date] = map;
  });

  // Score all creators
  const scored: PointsCreator[] = creators.map((c) => {
    const entries = histories[c.username] || [];
    const monthEntries = entries.filter((e) => e.date.startsWith(monthKey));

    let totalPoints = 0;
    let totalDailyDiamonds = 0;
    let totalHoursLive = 0;

    monthEntries.forEach((e) => {
      const daily = e.daily ?? 0;
      const hrs = e.hours ?? 0;

      totalDailyDiamonds += daily;
      totalHoursLive += hrs;

      const perHourPts = Math.floor(hrs) * 2;
      const oneKPts = daily >= 1000 ? 2 : 0;
      const validDayPts = hrs >= 1 ? 2 : 0;
      const achievePts = achievementByDay[e.date]?.[c.username] ?? 0;

      totalPoints += perHourPts + oneKPts + validDayPts + achievePts;
    });

    const streakDays = computeStreak(monthEntries);
    totalPoints += streakPoints(streakDays);

    return {
      username: c.username,
      avatar: `/creators/${c.username}.jpg`,
      totalPoints,
      totalDailyDiamonds,
      totalHoursLive,
      streakDays,
    };
  });

  // Sort
  const ranked = scored.sort((a, b) =>
    b.totalPoints !== a.totalPoints
      ? b.totalPoints - a.totalPoints
      : b.totalDailyDiamonds - a.totalDailyDiamonds
  );

  return (
    <main className="leaderboard-wrapper">

      {/* points explanation */}
      <div
        style={{
          margin: "28px auto",
          maxWidth: "850px",
          padding: "20px 25px",
          borderRadius: "14px",
          background: "#03101a",
          border: "1px solid rgba(45,224,255,0.45)",
          boxShadow: "0 0 16px rgba(45,224,255,0.28)",
        }}
      >
        <h2 className="glow-text" style={{ textAlign: "center", marginBottom: "12px" }}>
          How to Achieve Points
        </h2>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            fontSize: "14px",
            lineHeight: "1.55",
            color: "#e7f9ff",
          }}
        >
          <li>✨ Hit 1,000 diamonds → <strong>2 points</strong></li>
          <li>⏱️ Every hour streamed → <strong>2 points</strong></li>
          <li>🔥 Valid day (1h+) → <strong>2 points</strong></li>
          <li>🏆 Top 4 daily → <strong>8 / 6 / 4 / 2 bonus points</strong></li>
          <li>🎯 Streak bonuses for 3/5/15/30 Days</li>
        </ul>
      </div>

      {/* banner */}
      <div className="leaderboard-title-image">
        <img src="/branding/points-leaderboard.png" className="leaderboard-title-img" />
      </div>

      {/* leaderboard */}
      <div className="leaderboard-list">
        {ranked.map((creator, index) => (
          <div key={creator.username} className="leaderboard-row">
            <div className="leaderboard-left">
              <div className="rank-number">{index + 1}</div>

              <img src={creator.avatar} className="leaderboard-avatar" />

              <div className="creator-info">
                <div className="creator-username glow-text">{creator.username}</div>
                <div className="creator-daily">
                  Total diamonds this month:{" "}
                  <span>{formatNumber(creator.totalDailyDiamonds)}</span> ·{" "}
                  {Math.floor(creator.totalHoursLive)}h live
                </div>
              </div>
            </div>

            <div className="creator-diamonds">
              <div className="lifetime-number">{creator.totalPoints}</div>
              <div className="lifetime-label">points this month</div>

              {creator.streakDays > 0 && (
                <div className="creator-daily">
                  Streak this month:{" "}
                  <span>{creator.streakDays} days</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

    </main>
  );
}
