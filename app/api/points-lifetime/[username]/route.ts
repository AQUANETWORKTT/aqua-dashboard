import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { creators } from "@/data/creators";

type HistoryEntry = {
  date: string;
  daily: number;
  hours: number;
};

type HistoryFile = {
  username: string;
  entries: HistoryEntry[];
};

const START = "2025-12-01";

// -------------------- POINT RULES --------------------
function calcPoints(e: HistoryEntry, rankBonus: number) {
  let pts = 0;

  // First 1k diamonds → 10 pts
  if (e.daily >= 1000) pts += 10;

  // Additional 1k → 2 pts each
  if (e.daily > 1000) {
    const extra = Math.floor((e.daily - 1000) / 1000);
    pts += extra * 2;
  }

  // Hours streamed
  pts += Math.floor(e.hours) * 3;

  // Valid day
  if (e.hours >= 1) pts += 3;

  // Daily top 5
  pts += rankBonus;

  return pts;
}

// -------------------- STREAK --------------------
function computeStreak(entries: HistoryEntry[]) {
  if (!entries.length) return 0;

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date().toISOString().slice(0, 10);

  let arr = sorted;

  // Ignore today's 0h placeholder
  if (arr[arr.length - 1].date === today && arr[arr.length - 1].hours < 1) {
    arr = arr.slice(0, -1);
  }

  if (!arr.length) return 0;
  if (arr[arr.length - 1].hours < 1) return 0;

  let streak = 1;

  for (let i = arr.length - 2; i >= 0; i--) {
    const a = new Date(arr[i + 1].date);
    const b = new Date(arr[i].date);
    const diff = (a.getTime() - b.getTime()) / 86400000;

    if (diff >= 0.5 && diff <= 1.5 && arr[i].hours >= 1) {
      streak++;
    } else break;
  }

  return streak;
}

// Streak → bonus points
function streakBonus(d: number) {
  if (d >= 30) return 150;
  if (d >= 20) return 100;
  if (d >= 10) return 50;
  if (d >= 5) return 25;
  if (d >= 3) return 15;
  return 0;
}

// -------------------- MAIN API --------------------
export async function GET(_: Request, ctx: any) {
  const username = ctx.params.username;

  const userFile = path.join(
    process.cwd(),
    "public",
    "history",
    `${username}.json`
  );

  if (!fs.existsSync(userFile)) {
    return NextResponse.json({ total: 0, breakdown: {}, streak: 0 });
  }

  const userJson = JSON.parse(fs.readFileSync(userFile, "utf8")) as HistoryFile;

  // Normalise + filter
  const entries = userJson.entries
    .filter((e) => e.date >= START)
    .map((e) => ({
      date: e.date,
      daily: Number(e.daily) || 0,
      hours: Number(e.hours) || 0,
    }))
    // Remove duplicate dates safely
    .reduce((map, e) => {
      map[e.date] = e;
      return map;
    }, {} as Record<string, HistoryEntry>);

  const cleanEntries: HistoryEntry[] = Object.values(entries);

  // ------------------ COLLECT DAILY RANK BONUSES ------------------
  const rankBonusByDay: Record<string, Record<string, number>> = {};
  const allHistories: Record<string, HistoryEntry[]> = {};

  for (const c of creators) {
    const f = path.join(process.cwd(), "public", "history", `${c.username}.json`);
    if (fs.existsSync(f)) {
      const json = JSON.parse(fs.readFileSync(f, "utf8")) as HistoryFile;
      allHistories[c.username] = json.entries
        .filter((e) => e.date >= START)
        .map((e) => ({
          date: e.date,
          daily: Number(e.daily) || 0,
          hours: Number(e.hours) || 0,
        }));
    }
  }

  const allDates = new Set<string>();
  for (const u in allHistories) {
    allHistories[u].forEach((e) => allDates.add(e.date));
  }

  const bonusValues = [25, 20, 15, 10, 5];

  [...allDates].forEach((date) => {
    const list = [];
    for (const c of creators) {
      const h = allHistories[c.username]?.find((e) => e.date === date);
      if (h && h.daily > 0) list.push({ user: c.username, daily: h.daily });
    }

    list.sort((a, b) => b.daily - a.daily);
    rankBonusByDay[date] = {};

    list.forEach((x, i) => {
      if (i < bonusValues.length) {
        rankBonusByDay[date][x.user] = bonusValues[i];
      }
    });
  });

  // ------------------ COMPUTE TOTAL POINTS ------------------
  let total = 0;

  let breakdown = {
    diamonds: 0,
    hours: 0,
    valid: 0,
    top5: 0,
    streak: 0,
  };

  cleanEntries.forEach((e) => {
    const rb = rankBonusByDay[e.date]?.[username] ?? 0;
    const pts = calcPoints(e, rb);
    total += pts;

    if (e.daily >= 1000) breakdown.diamonds += 10;
    if (e.daily > 1000)
      breakdown.diamonds += Math.floor((e.daily - 1000) / 1000) * 2;

    breakdown.hours += Math.floor(e.hours) * 3;
    if (e.hours >= 1) breakdown.valid += 3;
    breakdown.top5 += rb;
  });

  // streak
  const streak = computeStreak(cleanEntries);
  const sBonus = streakBonus(streak);
  breakdown.streak = sBonus;
  total += sBonus;

  return NextResponse.json({
    total,
    breakdown,
    streak,
  });
}
