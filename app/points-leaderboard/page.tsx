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

function parseDate(d: string) {
  return new Date(d + "T00:00:00Z");
}

function computeStreak(entries: HistoryEntry[]): number {
  if (!entries.length) return 0;

  const valid = entries
    .filter((e) => (e.hours ?? 0) >= 1)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (!valid.length) return 0;

  let streak = 1;
  for (let i = valid.length - 1; i > 0; i--) {
    const d1 = parseDate(valid[i].date);
    const d0 = parseDate(valid[i - 1].date);

    const diff = (d1.getTime() - d0.getTime()) / (1000 * 60 * 60 * 24);

    if (diff >= 0.5 && diff <= 1.5) streak++;
    else break;
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
  const file = path.join(process.cwd(), "public", "history", `${username}.json`);
  if (!fs.existsSync(file)) return [];

  try {
    const json = JSON.parse(fs.readFileSync(file, "utf8")) as HistoryFile;
    return json.entries?.sort((a, b) => (a.date < b.date ? -1 : 1)) ?? [];
  } catch {
    return [];
  }
}

function formatNumber(n: number) {
  return n.toLocaleString("en-GB");
}

export default function PointsLeaderboardPage() {
  // Load histories
  const histories: Record<string, HistoryEntry[]> = {};
  creators.forEach((c: any) => {
    histories[c.username] = loadHistory(c.username);
  });

  // Collect all unique dates
  const dateSet = new Set<string>();
  Object.values(histories).forEach((arr) =>
    arr.forEach((e) => dateSet.add(e.date))
  );
  const dates = [...dateSet].sort();

  // Achievement map: date -> user -> points
  const achievementValues = [8, 6, 4, 2];
  const achievementByDay: Record<string, Record<string, number>> = {};

  dates.forEach((date) => {
    const dayStats: { username: string; daily: number }[] = [];

    creators.forEach((c) => {
      const entry = histories[c.username].find((e) => e.date === date);
      if (entry?.daily && entry.daily > 0) {
        dayStats.push({ username: c.username, daily: entry.daily });
      }
    });

    if (!dayStats.length) return;

    dayStats.sort((a, b) => b.daily - a.daily);

    const map: Record<string, number> = {};
    dayStats.forEach((c, i) => {
      if (i < achievementValues.length) {
        map[c.username] = achievementValues[i];
      }
    });

    achievementByDay[date] = map;
  });

  // Score all creators
  const scored: PointsCreator[] = creators.map((c) => {
    const username = c.username;
    const entries = histories[username] || [];

    let totalPoints = 0;
    let totalDailyDiamonds = 0;
    let totalHoursLive = 0;

    entries.forEach((e) => {
      const daily = e.daily ?? 0;
      const hrs = e.hours ?? 0;

      totalDailyDiamonds += daily;
      totalHoursLive += hrs;

      const perHourPts = Math.floor(hrs) * 2;
      const oneKPts = daily >= 1000 ? 2 : 0;
      const validDayPts = hrs >= 1 ? 2 : 0;
      const achievePts = achievementByDay[e.date]?.[username] ?? 0;

      totalPoints += perHourPts + oneKPts + validDayPts + achievePts;
    });

    const streakDays = computeStreak(entries);
    totalPoints += streakPoints(streakDays);

    return {
      username,
      avatar: `/creators/${username}.jpg`,
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
        {ranked.map((creator, index) => (
          <div key={creator.username} className="leaderboard-row">
            <div className="leaderboard-left">
              <div className="rank-number">{index + 1}</div>

              <img
                src={creator.avatar}
                className="leaderboard-avatar"
                alt={creator.username}
              />

              <div className="creator-info">
                <div className="creator-username glow-text">
                  {creator.username}
                </div>
                <div className="creator-daily">
                  Total diamonds:{" "}
                  <span>{formatNumber(creator.totalDailyDiamonds)}</span> ·{" "}
                  {Math.floor(creator.totalHoursLive)}h live
                </div>
              </div>
            </div>

            <div className="creator-diamonds">
              <div className="lifetime-number">{creator.totalPoints}</div>
              <div className="lifetime-label">points</div>

              {creator.streakDays > 0 && (
                <div className="creator-daily">
                  Streak: <span>{creator.streakDays} days</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
