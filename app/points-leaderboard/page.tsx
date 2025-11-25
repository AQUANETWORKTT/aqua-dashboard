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
  lifetimeDiamonds: number;
  streakDays: number;
};

function parseDate(d: string) {
  return new Date(d + "T00:00:00Z");
}

// Compute CURRENT streak based on consecutive valid days (>=1h)
function computeStreak(entries: HistoryEntry[]): number {
  if (!entries || entries.length === 0) return 0;

  const validEntries = entries
    .filter((e) => e.date && typeof e.hours === "number")
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (validEntries.length === 0) return 0;

  let streak = 0;
  let lastDate: Date | null = null;

  // Walk from latest backwards and count consecutive valid days
  for (let i = validEntries.length - 1; i >= 0; i--) {
    const entry = validEntries[i];
    const hasValidHours = (entry.hours ?? 0) >= 1;
    if (!hasValidHours) break;

    const thisDate = parseDate(entry.date);

    if (!lastDate) {
      // Start streak from latest valid day
      streak = 1;
      lastDate = thisDate;
    } else {
      // Check if previous valid day is exactly 1 day before
      const diffMs = lastDate.getTime() - thisDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays >= 0.5 && diffDays <= 1.5) {
        streak += 1;
        lastDate = thisDate;
      } else {
        break;
      }
    }
  }

  return streak;
}

// Streak points according to your rules
function streakPoints(streakDays: number): number {
  if (streakDays >= 30) return 30;
  if (streakDays >= 14) return 14;
  if (streakDays >= 7) return 7;
  if (streakDays >= 5) return 5;
  if (streakDays >= 3) return 3;
  return 0;
}

// Try to load /public/history/{username}.json
function loadHistory(username: string): HistoryEntry[] {
  const filePath = path.join(
    process.cwd(),
    "public",
    "history",
    `${username}.json`
  );

  if (!fs.existsSync(filePath)) return [];

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw) as HistoryFile;
    if (!data || !Array.isArray(data.entries)) return [];
    return [...data.entries].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    );
  } catch {
    return [];
  }
}

function formatNumber(num: number) {
  return num.toLocaleString("en-GB");
}

export default function PointsLeaderboardPage() {
  // 1) Load all histories
  const histories: Record<string, HistoryEntry[]> = {};
  creators.forEach((c: any) => {
    const username: string = c.username;
    histories[username] = loadHistory(username);
  });

  // 2) Collect all unique dates across all creators
  const allDateSet = new Set<string>();
  Object.values(histories).forEach((entries) => {
    entries.forEach((e) => {
      if (e.date) allDateSet.add(e.date);
    });
  });
  const allDates = Array.from(allDateSet).sort(); // ascending

  // 3) Build achievement map: date -> username -> points for THAT day
  const achievementByDay: Record<string, Record<string, number>> = {};
  const achievementValues = [8, 6, 4, 2];

  allDates.forEach((date) => {
    // For this date, grab all creators' daily values
    const dayStats: { username: string; daily: number }[] = [];

    creators.forEach((c: any) => {
      const username: string = c.username;
      const entries = histories[username] || [];
      const entry = entries.find((e) => e.date === date);
      const daily = entry?.daily ?? 0;
      if (daily > 0) {
        dayStats.push({ username, daily });
      }
    });

    if (dayStats.length === 0) return;

    // Sort by daily diamonds for that day
    dayStats.sort((a, b) => b.daily - a.daily);

    const dayMap: Record<string, number> = {};
    dayStats.forEach((item, idx) => {
      if (idx < achievementValues.length && item.daily > 0) {
        dayMap[item.username] = achievementValues[idx];
      }
    });

    achievementByDay[date] = dayMap;
  });

  // 4) Compute total points per creator across ALL days in history
  const scoredCreators: PointsCreator[] = creators.map((c: any) => {
    const username: string = c.username;
    const entries = histories[username] || [];

    let totalDailyPoints = 0;
    let totalDailyDiamonds = 0;
    let totalHoursLive = 0;
    let lifetimeDiamonds = 0;

    entries.forEach((entry) => {
      const daily = entry.daily ?? 0;
      const hours = entry.hours ?? 0;

      totalDailyDiamonds += daily;
      totalHoursLive += hours;

      if (typeof entry.lifetime === "number") {
        lifetimeDiamonds = entry.lifetime;
      }

      const hoursWhole = Math.floor(hours);
      const perHourPts = hoursWhole * 2;
      const oneKPts = daily >= 1000 ? 2 : 0;
      const validDayPts = hours >= 1 ? 2 : 0;
      const achievementPts =
        achievementByDay[entry.date]?.[username] ?? 0;

      const dayPoints =
        perHourPts + oneKPts + validDayPts + achievementPts;

      totalDailyPoints += dayPoints;
    });

    const streakDays = computeStreak(entries);
    const streakPts = streakPoints(streakDays);

    const totalPoints = totalDailyPoints + streakPts;

    return {
      username,
      displayName: c.displayName ?? username,
      avatar: `/creators/${username}.jpg`,
      totalPoints,
      totalDailyDiamonds,
      totalHoursLive,
      lifetimeDiamonds,
      streakDays,
    };
  });

  // 5) Sort by total points desc, then by total diamonds desc
  const ranked = [...scoredCreators].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return b.totalDailyDiamonds - a.totalDailyDiamonds;
  });

  return (
    <main className="leaderboard-wrapper">
      {/* Header / Banner */}
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
          <div className="leaderboard-row" key={creator.username}>
            {/* LEFT SIDE: rank + avatar + name */}
            <div className="leaderboard-left">
              <div className="rank-number">{index + 1}</div>

              <img
                src={creator.avatar}
                alt={creator.displayName}
                className="leaderboard-avatar"
              />

              <div className="creator-info">
                <div className="creator-username glow-text">
                  {creator.displayName}
                </div>
                <div className="creator-daily">
                  Total diamonds:{" "}
                  <span>{formatNumber(creator.totalDailyDiamonds)}</span>{" "}
                  · {Math.floor(creator.totalHoursLive)}h live
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: points + lifetime + streak */}
            <div className="creator-diamonds">
              <div className="lifetime-number">
                {creator.totalPoints}
              </div>
              <div className="lifetime-label">points</div>

              <div className="yesterday-number">
                {formatNumber(creator.lifetimeDiamonds)}
              </div>
              <div className="yesterday-label">lifetime</div>

              {creator.streakDays > 0 && (
                <div className="creator-daily">
                  Streak:{" "}
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
