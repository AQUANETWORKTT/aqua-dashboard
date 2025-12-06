import { NextResponse } from "next/server";
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

const HISTORY_DIR = path.join(process.cwd(), "public", "history");
const INCENTIVES_START = "2025-12-01";

// ---- helpers (same as leaderboard) ----

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

  // ignore today's placeholder if 0h
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
  const file = path.join(HISTORY_DIR, `${username}.json`);
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = url.searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "username query param is required" },
      { status: 400 }
    );
  }

  // load all histories so we can compute daily Top 5 like the leaderboard
  const histories: Record<string, HistoryEntry[]> = {};
  creators.forEach((c: any) => {
    histories[c.username] = loadHistory(c.username);
  });

  const userHistory = histories[username] || [];
  const entriesSinceStart = userHistory.filter(
    (e) => e.date >= INCENTIVES_START
  );

  if (!entriesSinceStart.length) {
    return NextResponse.json({
      username,
      diamondsPoints: 0,
      hourPoints: 0,
      validDayPoints: 0,
      top5Points: 0,
      streakPoints: 0,
      streakDays: 0,
      total: 0,
    });
  }

  // build date set for Top 5
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
      if (ex && typeof ex.daily === "number" && ex.daily > 0) {
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

  // sum up components
  let diamondsPoints = 0;
  let hourPoints = 0;
  let validDayPoints = 0;
  let top5Points = 0;

  entriesSinceStart.forEach((e) => {
    const daily = e.daily ?? 0;
    const hrs = e.hours ?? 0;

    // diamonds
    if (daily >= 1000) {
      diamondsPoints += 10; // first 1k
      const extra = Math.floor(daily / 1000) - 1;
      if (extra > 0) diamondsPoints += extra * 2;
    }

    // hours + valid day
    hourPoints += Math.floor(hrs) * 3;
    if (hrs >= 1) validDayPoints += 3;

    // Top 5
    top5Points += achievementByDay[e.date]?.[username] ?? 0;
  });

  const streakDays = computeStreak(entriesSinceStart);
  const sp = streakPoints(streakDays);

  const total =
    diamondsPoints + hourPoints + validDayPoints + top5Points + sp;

  return NextResponse.json({
    username,
    diamondsPoints,
    hourPoints,
    validDayPoints,
    top5Points,
    streakPoints: sp,
    streakDays,
    total,
  });
}
