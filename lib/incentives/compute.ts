// lib/incentives/compute.ts
import { incentiveExtras } from "@/data/incentive-extras";

export type HistoryEntry = {
  date: string;        // YYYY-MM-DD
  daily?: number;      // daily diamonds
  hours?: number;      // daily hours
  lifetime?: number;   // optional
};

export type IncentiveStats = {
  diamonds: number;            // month diamonds
  hours: number;              // month hours
  validDays: number;          // month valid days
  top5Count: number;          // if you use this
  calculatedPoints: number;   // points before extras
  extrasPoints: number;       // from incentiveExtras
  incentiveBalance: number;   // FINAL balance shown on dashboard
};

export function computeIncentiveStatsForMonth(
  username: string,
  entries: HistoryEntry[],
  now = new Date()
): IncentiveStats {
  // 🔥 IMPORTANT:
  // Copy/paste your EXACT dashboard logic here.
  // This file becomes the single source of truth.

  // Month filter (UTC)
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 1));

  const month = entries.filter(e => {
    const dt = new Date(e.date + "T00:00:00Z");
    return dt >= start && dt < end;
  });

  const diamonds = month.reduce((s, e) => s + Number(e.daily ?? 0), 0);
  const hours = month.reduce((s, e) => s + Number(e.hours ?? 0), 0);

  const validDays = month.reduce((s, e) => {
    const d = Number(e.daily ?? 0);
    const h = Number(e.hours ?? 0);
    return s + ((d > 0 || h > 0) ? 1 : 0);
  }, 0);

  // -------------------------------
  // ⬇️ REPLACE THIS SECTION
  // with your dashboard’s real rules
  // -------------------------------
  const top5Count = 0; // if you track it from entries, replicate that too
  const calculatedPoints = diamonds; // placeholder — REMOVE
  // -------------------------------

  const extrasPoints = Number(incentiveExtras?.[username] ?? 0);

  // This must match dashboard:
  const incentiveBalance = calculatedPoints + extrasPoints;

  return {
    diamonds,
    hours: Math.round(hours * 10) / 10,
    validDays,
    top5Count,
    calculatedPoints,
    extrasPoints,
    incentiveBalance,
  };
}
