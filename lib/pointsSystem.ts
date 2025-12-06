// lib/pointsSystem.ts

export type HistoryEntry = {
  date: string;
  daily: number;
  lifetime: number;
  hours?: number;
};

export type PointsBreakdown = {
  diamonds: number;
  hours: number;
  valid: number;
  top5: number;
  streak: number;
  rawHours: number;
  validDays: number;
};

function computeStreak(entries: HistoryEntry[]): number {
  if (!entries.length) return 0;

  const sorted = [...entries].sort((a, b) =>
    a.date < b.date ? -1 : 1
  );

  const todayKey = new Date().toISOString().split("T")[0];
  const last = sorted[sorted.length - 1];
  const lastHours = last.hours ?? 0;

  if (last.date === todayKey && lastHours < 1) {
    return computeStreak(sorted.slice(0, -1));
  }

  if (lastHours < 1) return 0;

  let streak = 1;
  let lastDate = new Date(last.date + "T00:00:00Z");

  for (let i = sorted.length - 2; i >= 0; i--) {
    const e = sorted[i];
    const d = new Date(e.date + "T00:00:00Z");
    const diff = (lastDate.getTime() - d.getTime()) / 86400000;

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

export function calculateLifetimePoints(
  username: string,
  allHistories: Record<string, HistoryEntry[]>
) {
  const myEntries = allHistories[username] || [];

  const breakdown: PointsBreakdown = {
    diamonds: 0,
    hours: 0,
    valid: 0,
    top5: 0,
    streak: 0,
    rawHours: 0,
    validDays: 0,
  };

  if (!myEntries.length) {
    return { total: 0, breakdown, streakDays: 0 };
  }

  // Build rank bonuses
  const daySet = new Set<string>();
  Object.values(allHistories).forEach(entries =>
    entries.forEach(e => daySet.add(e.date))
  );

  const bonuses = [25, 20, 15, 10, 5];
  const rankBonusByDay: Record<string, Record<string, number>> = {};

  daySet.forEach(date => {
    const daily: { username: string; daily: number }[] = [];

    for (const u in allHistories) {
      const e = allHistories[u].find(x => x.date === date);
      if (e && e.daily > 0) {
        daily.push({ username: u, daily: e.daily });
      }
    }

    daily.sort((a, b) => b.daily - a.daily);

    rankBonusByDay[date] = {};
    daily.slice(0, bonuses.length).forEach((row, i) => {
      rankBonusByDay[date][row.username] = bonuses[i];
    });
  });

  let total = 0;

  myEntries.forEach(e => {
    const hrs = e.hours ?? 0;
    const rankBonus = rankBonusByDay[e.date]?.[username] ?? 0;

    // diamonds
    if (e.daily >= 1000) breakdown.diamonds += 10;
    if (e.daily > 1000) {
      breakdown.diamonds += (Math.floor((e.daily - 1000) / 1000)) * 2;
    }

    // hours
    breakdown.rawHours += hrs;
    breakdown.hours += Math.floor(hrs) * 3;
    if (hrs >= 1) {
      breakdown.validDays += 1;
      breakdown.valid += 3;
    }

    breakdown.top5 += rankBonus;

    total +=
      breakdown.diamonds +
      Math.floor(hrs) * 3 +
      (hrs >= 1 ? 3 : 0) +
      rankBonus;
  });

  const streakDays = computeStreak(myEntries);
  breakdown.streak = streakPoints(streakDays);
  total += breakdown.streak;

  return { total, breakdown, streakDays };
}
