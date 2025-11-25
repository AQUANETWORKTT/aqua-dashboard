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
  displayName: string;
  avatar: string;
  totalPoints: number;
  totalDailyDiamonds: number;
  totalHoursLive: number;
  streakDays: number;
};

function parseDate(d: string) {
  return new Date(d + "T00:00:00Z");
}

function computeStreak(entries: HistoryEntry[]): number {
  if (!entries || entries.length === 0) return 0;

  const validEntries = entries
    .filter((e) => e.date && typeof e.hours === "number")
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (validEntries.length === 0) return 0;

  let streak = 0;
  let lastDate: Date | null = null;

  for (let i = validEntries.length - 1; i >= 0; i--) {
    const entry = validEntries[i];
    if ((entry.hours ?? 0) < 1) break;

    const thisDate = parseDate(entry.date);

    if (!lastDate) {
      streak = 1;
      lastDate = thisDate;
    } else {
      const diffMs = lastDate.getTime() - thisDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays >= 0.5 && diffDays <= 1.5) {
        streak++;
        lastDate = thisDate;
      } else break;
    }
  }

  return streak;
}

function streakPoints(days: number) {
  if (days >= 30) return 30;
  if (days >= 14) return 14;
  if (days >= 7) return 7;
  if (days >= 5) return 5;
  if (days >= 3) return 3;
  return 0;
}

function loadHistory(username: string): HistoryEntry[] {
  const filePath = path.join(process.cwd(), "public", "history", `${username}.json`);
  if (!fs.existsSync(filePath)) return [];

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw) as HistoryFile;
    return Array.isArray(data.entries)
      ? [...data.entries].sort((a, b) => (a.date < b.date ? -1 : 1))
      : [];
  } catch {
    return [];
  }
}

function formatNumber(n: number) {
  return n.toLocaleString("en-GB");
}

export default function PointsLeaderboardPage() {
  const histories: Record<string, HistoryEntry[]> = {};
  creators.forEach((c) => {
    histories[c.username] = loadHistory(c.username);
  });

  // Collect all dates
  const allDates = Array.from(
    new Set(
      Object.values(histories)
        .flat()
        .map((e) => e.date)
    )
  ).sort();

  // Achievement points per day
  const achievementByDay: Record<string, Record<string, number>> = {};
  const achievementValues = [8, 6, 4, 2];

  allDates.forEach((date) => {
    const stats = creators
      .map((c) => {
        const entry = histories[c.username].find((e) => e.date === date);
        return { username: c.username, daily: entry?.daily ?? 0 };
      })
      .filter((x) => x.daily > 0)
      .sort((a, b) => b.daily - a.daily);

    const dayMap: Record<string, number> = {};
    stats.forEach((s, i) => {
      if (i < 4) dayMap[s.username] = achievementValues[i];
    });

    achievementByDay[date] = dayMap;
  });

  // Calculate totals
  const scored = creators.map((c) => {
    const entries = histories[c.username] || [];

    let totalDaily = 0;
    let totalHours = 0;
    let totalPoints = 0;

    entries.forEach((e) => {
      const daily = e.daily ?? 0;
      const hours = e.hours ?? 0;

      totalDaily += daily;
      totalHours += hours;

      const perHourPts = Math.floor(hours) * 2;
      const oneKPts = daily >= 1000 ? 2 : 0;
      const validDay = hours >= 1 ? 2 : 0;
      const achievePts = achievementByDay[e.date]?.[c.username] ?? 0;

      totalPoints += perHourPts + oneKPts + validDay + achievePts;
    });

    const streak = computeStreak(entries);
    totalPoints += streakPoints(streak);

    return {
      username: c.username,
      displayName: c.displayName ?? c.username,
      avatar: `/creators/${c.username}.jpg`,
      totalPoints,
      totalDailyDiamonds: totalDaily,
      totalHoursLive: totalHours,
      streakDays: streak,
    };
  });

  const ranked = scored.sort((a, b) =>
    b.totalPoints !== a.totalPoints
      ? b.totalPoints - a.totalPoints
      : b.totalDailyDiamonds - a.totalDailyDiamonds
  );

  return (
    <main className="leaderboard-wrapper">
      <div className="leaderboard-title-image">
        <img
          src="/branding/points-leaderboard.png"
          alt="Points Leaderboard"
          className="leaderboard-title-img"
        />
      </div>

      <p className="leaderboard-sub">
        Points from all days in history · Hours, diamonds, achievements & streaks
      </p>

      <div className="leaderboard-list">
        {ranked.map((c, i) => (
          <div className="leaderboard-row" key={c.username}>
            <div className="leaderboard-left">
              <div className="rank-number">{i + 1}</div>

              <img src={c.avatar} className="leaderboard-avatar" />

              <div className="creator-info">
                <div className="creator-username glow-text">{c.displayName}</div>
                <div className="creator-daily">
                  Total diamonds: <span>{formatNumber(c.totalDailyDiamonds)}</span> ·{" "}
                  {Math.floor(c.totalHoursLive)}h live
                </div>
              </div>
            </div>

            {/* RIGHT SIDE — NOW ONLY POINTS + STREAK */}
            <div className="creator-diamonds">
              <div className="lifetime-number">{c.totalPoints}</div>
              <div className="lifetime-label">points</div>

              {c.streakDays > 0 && (
                <div className="creator-daily">
                  Streak: <span>{c.streakDays} days</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
