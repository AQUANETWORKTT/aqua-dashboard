// lib/points.ts

export type HistoryEntry = {
  date: string;
  daily?: number;
  hours?: number;
};

export type PointsBreakdown = {
  total: number;
  diamonds: number;
  hours: number;
  valid: number;
  top5: number;
  streak: number;
};

function parseDate(d: string) {
  return new Date(d + "T00:00:00Z");
}

function computeStreak(entries: HistoryEntry[]): number {
  if (!entries.length) return 0;

  const sorted = [...entries].sort((a, b) =>
    a.date < b.date ? -1 : 1
  );

  const last = sorted[sorted.length - 1];
  if ((last.hours ?? 0) < 1) return 0;

  let streak = 1;
  let lastDate = parseDate(last.date);

  for (let i = sorted.length - 2; i >= 0; i--) {
    const e = sorted[i];
    const d = parseDate(e.date);
    const diff = (lastDate.getTime() - d.getTime()) / 86400000;

    if (diff >= 0.5 && diff <= 1.5 && (e.hours ?? 0) >= 1) {
      streak++;
      lastDate = d;
    } else break;
  }

  return streak;
}

export function calculateLifetimePoints(
  username: string,
  myEntries: HistoryEntry[],
  allEntriesByUser: Record<string, HistoryEntry[]>
): PointsBreakdown {
  const breakdown: PointsBreakdown = {
    total: 0,
    diamonds: 0,
    hours: 0,
    valid: 0,
    top5: 0,
    streak: 0,
  };

  const bonuses = [25, 20, 15, 10, 5];

  // ---------- build daily top 5 ----------
  const daySet = new Set<string>();
  Object.values(allEntriesByUser).forEach(arr =>
    arr.forEach(e => daySet.add(e.date))
  );

  const top5ByDay: Record<string, Record<string, number>> = {};

  daySet.forEach(date => {
    const list: { username: string; daily: number }[] = [];

    for (const u in allEntriesByUser) {
      const row = allEntriesByUser[u].find(e => e.date === date);
      if (row && row.daily && row.daily > 0) {
        list.push({ username: u, daily: row.daily });
      }
    }

    list.sort((a, b) => b.daily - a.daily);

    top5ByDay[date] = {};
    list.slice(0, 5).forEach((r, i) => {
      top5ByDay[date][r.username] = bonuses[i];
    });
  });

  // ---------- per-day points ----------
  myEntries.forEach(e => {
    const daily = e.daily ?? 0;
    const hrs = e.hours ?? 0;

    let pts = 0;

    // diamonds
    if (daily >= 1000) {
      pts += 10;
      breakdown.diamonds += 10;

      const extra = Math.floor((daily - 1000) / 1000);
      if (extra > 0) {
        pts += extra * 2;
        breakdown.diamonds += extra * 2;
      }
    }

    // hours
    const hourPts = Math.floor(hrs) * 3;
    pts += hourPts;
    breakdown.hours += hourPts;

    // valid day
    if (hrs >= 1) {
      pts += 3;
      breakdown.valid += 3;
    }

    // top 5
    const bonus = top5ByDay[e.date]?.[username] ?? 0;
    pts += bonus;
    breakdown.top5 += bonus;

    breakdown.total += pts;
  });

  // ---------- streak bonus ----------
  const streakDays = computeStreak(myEntries);
  let streakBonus = 0;

  if (streakDays >= 30) streakBonus = 150;
  else if (streakDays >= 20) streakBonus = 100;
  else if (streakDays >= 10) streakBonus = 50;
  else if (streakDays >= 5) streakBonus = 25;
  else if (streakDays >= 3) streakBonus = 15;

  breakdown.streak = streakBonus;
  breakdown.total += streakBonus;

  return breakdown;
}
