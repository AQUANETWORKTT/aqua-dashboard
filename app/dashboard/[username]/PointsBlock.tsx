// app/dashboard/[username]/PointsBlock.tsx

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

type LifetimeBreakdown = {
  diamondsPoints: number;
  hourPoints: number;
  validDayPoints: number;
  top5Points: number;
  streakPoints: number;
  total: number;
};

// Start of incentive system
const INCENTIVES_START = "2025-12-01";

// ---- Helpers shared with leaderboard ----

function parseDate(d: string) {
  return new Date(d + "T00:00:00Z");
}

function computeStreak(entries: HistoryEntry[]): number {
  if (!entries.length) return 0;

  const sorted = [...entries].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  const todayKey = new Date().toISOString().split("T")[0];
  const last = sorted[sorted.length - 1];
  const lastHours = last.hours ?? 0;

  if (last.date === todayKey && lastHours < 1) {
    return computeStreak(sorted.slice(0, -1));
  }

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

function streakPoints(days: number) {
  if (days >= 30) return 150;
  if (days >= 20) return 100;
  if (days >= 10) return 50;
  if (days >= 5) return 25;
  if (days >= 3) return 15;
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

// ---- Point rules (same as points leaderboard) ----

function diamondPoints(daily: number) {
  if (daily < 1000) return 0;

  let points = 10; // first 1,000 diamonds
  const extra = Math.floor((daily - 1000) / 1000);
  points += extra * 2; // 2 pts per additional 1k

  return points;
}

function hourPoints(hours: number) {
  let pts = 0;

  pts += Math.floor(hours) * 3; // 3 per full hour
  if (hours >= 1) pts += 3;     // valid day bonus

  return pts;
}

export default function PointsBlock({ username }: { username: string }) {
  // Load histories for all creators so we can compute daily top 5 (same as leaderboard)
  const histories: Record<string, HistoryEntry[]> = {};
  creators.forEach((c: any) => {
    histories[c.username] = loadHistory(c.username);
  });

  const userHistory = histories[username] || [];

  // Only count from incentives start date onwards
  const entriesSinceStart = userHistory.filter(
    (e) => e.date >= INCENTIVES_START
  );

  // Build daily placement bonuses (Top 5 by diamonds per day)
  const dateSet = new Set<string>();
  Object.values(histories).forEach((arr) =>
    arr.forEach((e) => {
      if (e.date >= INCENTIVES_START) dateSet.add(e.date);
    })
  );
  const dates = [...dateSet].sort();

  const achievementValues = [25, 20, 15, 10, 5];
  const achievementByDay: Record<string, Record<string, number>> = {};

  dates.forEach((date) => {
    const dailyStats: { username: string; daily: number }[] = [];

    creators.forEach((c) => {
      const ex = histories[c.username].find((e) => e.date === date);
      if (ex && typeof ex.daily === "number") {
        dailyStats.push({ username: c.username, daily: ex.daily });
      }
    });

    if (!dailyStats.length) return;

    dailyStats.sort((a, b) => b.daily - a.daily);

    const map: Record<string, number> = {};
    dailyStats.slice(0, 5).forEach((x, i) => {
      map[x.username] = achievementValues[i];
    });

    achievementByDay[date] = map;
  });

  // Compute lifetime breakdown
  const breakdown: LifetimeBreakdown = entriesSinceStart.reduce(
    (acc, e) => {
      const daily = e.daily ?? 0;
      const hrs = e.hours ?? 0;

      const dPts = diamondPoints(daily);
      const hPts = Math.floor(hrs) * 3;
      const vPts = hrs >= 1 ? 3 : 0;
      const t5Pts = achievementByDay[e.date]?.[username] ?? 0;

      acc.diamondsPoints += dPts;
      acc.hourPoints += hPts;
      acc.validDayPoints += vPts;
      acc.top5Points += t5Pts;

      acc.total += dPts + hPts + vPts + t5Pts;

      return acc;
    },
    {
      diamondsPoints: 0,
      hourPoints: 0,
      validDayPoints: 0,
      top5Points: 0,
      streakPoints: 0,
      total: 0,
    } as LifetimeBreakdown
  );

  // Add streak bonus (based on all entries since start)
  const streakDays = computeStreak(entriesSinceStart);
  const sPts = streakPoints(streakDays);
  breakdown.streakPoints = sPts;
  breakdown.total += sPts;

  const lifetimePoints = breakdown.total;

  return (
    <div
      style={{
        margin: "24px auto 40px",
        maxWidth: "900px",
        padding: "22px 26px",
        borderRadius: "16px",
        background: "#050d15",
        border: "1px solid rgba(45,224,255,0.5)",
        boxShadow: "0 0 18px rgba(45,224,255,0.25)",
      }}
    >
      <div
        style={{
          fontSize: "18px",
          fontWeight: 700,
          marginBottom: "10px",
          background: "linear-gradient(90deg,#2de0ff,#7be8ff)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        🌊 Lifetime Points (Incentives Balance)
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: "#ffffff",
            textShadow: "0 0 10px rgba(45,224,255,0.8)",
          }}
        >
          {lifetimePoints}
        </div>
        <div
          style={{
            fontSize: "14px",
            color: "#9fdcf5",
          }}
        >
          points available to spend
        </div>
      </div>

      <div
        style={{
          fontSize: "14px",
          color: "#c8e9ff",
          marginBottom: "14px",
        }}
      >
        This is your total incentives balance from <strong>1st December</strong>{" "}
        onwards. Points go up as you stream and perform, and will go down when
        you redeem rewards.
      </div>

      <div
        style={{
          marginTop: "10px",
          paddingTop: "10px",
          borderTop: "1px solid rgba(45,224,255,0.25)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "8px 18px",
          fontSize: "13px",
          color: "#e7f9ff",
        }}
      >
        <div>
          <strong>Diamonds points:</strong>{" "}
          <span>{breakdown.diamondsPoints}</span>
        </div>
        <div>
          <strong>Hours points:</strong>{" "}
          <span>{breakdown.hourPoints}</span>
        </div>
        <div>
          <strong>Valid day bonuses:</strong>{" "}
          <span>{breakdown.validDayPoints}</span>
        </div>
        <div>
          <strong>Top 5 daily bonuses:</strong>{" "}
          <span>{breakdown.top5Points}</span>
        </div>
        <div>
          <strong>Streak bonus (current streak):</strong>{" "}
          <span>
            {breakdown.streakPoints} pts ({streakDays} days)
          </span>
        </div>
      </div>
    </div>
  );
}
