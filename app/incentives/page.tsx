// app/incentives/page.tsx
import fs from "fs";
import path from "path";
import type { Metadata, Viewport } from "next";

import styles from "./incentives.module.css";
import { incentiveExtras } from "@/data/incentive-extras";

export const runtime = "nodejs"; // ✅ fs/path require node runtime

// ✅ Move themeColor here (NOT in metadata)
export const viewport: Viewport = {
  themeColor: "#00d5ff",
};

export const metadata: Metadata = {
  title: "Aqua Incentives",
};

/* ===================== TYPES ===================== */

type Creator = {
  username: string;
  avatar: string;
};

type HistoryEntry = {
  date: string; // "YYYY-MM-DD"
  daily: number;
  lifetime: number;
  hours?: number;
};

type HistoryFile = {
  username: string;
  entries: HistoryEntry[];
};

type IncentiveStats = {
  diamonds: number;
  hours: number;
  validDays: number; // dashboard rule: hours >= 1
  top5Count: number;
  calculatedPoints: number;
  extrasPoints: number;
  incentiveBalance: number; // calculatedPoints + extrasPoints (BEFORE level points)
};

type Row = {
  username: string;
  avatar: string;

  diamonds: number;
  hours: number;
  validDays: number;
  top5Count: number;

  calculatedPoints: number;
  extrasPoints: number;
  incentiveBalance: number;

  earnedLevelPoints: number;
  incentiveBalanceWithLevels: number;

  eligible: boolean; // payout eligibility (aligned to dashboard)
  level: number; // 0..5 (ALWAYS shown)
};

/* ===================== RULES (ALIGN TO DASHBOARD) ===================== */

// ✅ Dashboard eligibility (you’ve been using 15 days + 40 hours on the dashboards)
const ELIGIBLE_DAYS = 15;
const ELIGIBLE_HOURS = 40;

// ✅ DISPLAY: all blue “points” numbers on this page are shown as x2 with 🪙
const DISPLAY_POINTS_MULT = 2;

/* ===================== FORMAT HELPERS ===================== */

function fmt(n: number) {
  return (n ?? 0).toLocaleString("en-GB");
}

function showPoints(n: number) {
  const val = Math.round((n ?? 0) * DISPLAY_POINTS_MULT);
  return `${fmt(val)}🪙`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toMonthKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

// ✅ default = previous month (so on Feb 1 you see Jan automatically)
function defaultPrevMonthKey() {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return toMonthKey(prev);
}

function safeMonthKey(input: string | undefined) {
  if (!input) return defaultPrevMonthKey();
  return /^\d{4}-\d{2}$/.test(input) ? input : defaultPrevMonthKey();
}

/* ===================== FILE LOADERS ===================== */

// ✅ IMPORTANT: keep as a function declaration (hoisted) so it can’t go “undefined”
function loadCreatorsFromPublicCreatorsFolder(): Creator[] {
  const dir = path.join(process.cwd(), "public", "creators");

  // Don’t crash the whole page — return []
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);

  const creators: Creator[] = files
    .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .map((f) => {
      const username = f.replace(/\.(png|jpg|jpeg|webp)$/i, "");
      return { username, avatar: `/creators/${f}` };
    });

  creators.sort((a, b) => a.username.localeCompare(b.username));
  return creators;
}

function loadHistoryFromPublic(username: string): HistoryEntry[] {
  try {
    const fp = path.join(process.cwd(), "public", "history", `${username}.json`);
    if (!fs.existsSync(fp)) return [];
    const raw = fs.readFileSync(fp, "utf8");
    const j = JSON.parse(raw) as HistoryFile;
    return Array.isArray(j.entries) ? j.entries : [];
  } catch {
    return [];
  }
}

/* ===================== DASHBOARD-ALIGNED POINTS ===================== */

// ✅ points = floor(diamonds / diamondsPerPoint) * rateMultiplier
function pointsFromDiamondsRate(
  diamonds: number,
  diamondsPerPoint: number,
  rateMultiplier: number
) {
  if (!Number.isFinite(diamonds) || diamonds <= 0) return 0;
  if (!Number.isFinite(diamondsPerPoint) || diamondsPerPoint <= 0) return 0;
  if (!Number.isFinite(rateMultiplier) || rateMultiplier <= 0) return 0;
  return Math.floor(diamonds / diamondsPerPoint) * rateMultiplier;
}

/**
 * ✅ Ported 1:1 from your dashboard incentive logic.
 */
function computeDashboardStatsForUser(opts: {
  username: string;
  monthHistory: HistoryEntry[];
  top5ByDay: Record<string, string[]>;
}): IncentiveStats {
  const { username, monthHistory, top5ByDay } = opts;

  let diamonds = 0;
  let hours = 0;
  let validDays = 0;
  let top5Count = 0;

  monthHistory.forEach((e) => {
    diamonds += e.daily ?? 0;
    hours += e.hours ?? 0;
    if ((e.hours ?? 0) >= 1) validDays++;
    if (top5ByDay[e.date]?.includes(username)) top5Count++;
  });

  // ---------- calculated points ----------
  const thousands = Math.floor(diamonds / 1000);
  let diamondPoints = 0;

  if (thousands >= 1) {
    diamondPoints += 10;
    diamondPoints += Math.max(0, thousands - 1) * 5;
  }

  const hourPoints = Math.floor(hours) * 3;
  const validDayPoints = validDays * 3;

  let top5Points = 0;
  monthHistory.forEach((e) => {
    const placements = top5ByDay[e.date];
    if (!placements) return;

    const pos = placements.indexOf(username);
    if (pos === 0) top5Points += 25;
    else if (pos === 1) top5Points += 20;
    else if (pos === 2) top5Points += 15;
    else if (pos === 3) top5Points += 10;
    else if (pos === 4) top5Points += 5;
  });

  const calculatedPoints =
    diamondPoints + hourPoints + validDayPoints + top5Points;

  // ---------- FILE-BASED EXTRAS ----------
  const extrasPoints = incentiveExtras[username] ?? 0;
  const incentiveBalance = calculatedPoints + extrasPoints;

  return {
    diamonds,
    hours,
    validDays,
    top5Count,
    calculatedPoints,
    extrasPoints,
    incentiveBalance,
  };
}

/**
 * ✅ Level points aligned to your (new) dashboard logic:
 * - Levels 3–5 unlock at 150K diamonds
 * - Non-stacking: you earn only the highest completed rate level (3 OR 4 OR 5)
 * - points = floor(monthlyDiamonds / 300) * rate (rate: 1/2/3)
 */
function computeEarnedLevelPointsAligned(
  monthlyDiamonds: number,
  validDaysNow: number,
  hoursNow: number
) {
  const ladderUnlocked = monthlyDiamonds >= 150_000;

  const levels = [
    { level: 2, days: 15, hours: 40, gated: false },
    { level: 3, days: 20, hours: 60, gated: true, diamondsPerPoint: 300, rate: 1 },
    { level: 4, days: 20, hours: 80, gated: true, diamondsPerPoint: 300, rate: 2 },
    { level: 5, days: 22, hours: 100, gated: true, diamondsPerPoint: 300, rate: 3 },
  ] as const;

  const isLevelEligible = (l: (typeof levels)[number]) =>
    validDaysNow >= l.days && hoursNow >= l.hours;

  const isLevelAvailable = (l: (typeof levels)[number]) =>
    l.gated ? ladderUnlocked : true;

  const level3 = levels[1];
  const level4 = levels[2];
  const level5 = levels[3];

  const completedRateLevel =
    isLevelAvailable(level5) && isLevelEligible(level5)
      ? level5
      : isLevelAvailable(level4) && isLevelEligible(level4)
      ? level4
      : isLevelAvailable(level3) && isLevelEligible(level3)
      ? level3
      : null;

  if (!completedRateLevel) return 0;

  return pointsFromDiamondsRate(
    monthlyDiamonds,
    (completedRateLevel as any).diamondsPerPoint,
    (completedRateLevel as any).rate
  );
}

/**
 * ✅ Level indicator (0..5) aligned to dashboard thresholds.
 * (Level 1 is optional — keep it as an “almost there” tier.)
 */
function getLevelAligned(validDays: number, hours: number): number {
  if (validDays >= 22 && hours >= 100) return 5;
  if (validDays >= 20 && hours >= 80) return 4;
  if (validDays >= 20 && hours >= 60) return 3;
  if (validDays >= 15 && hours >= 40) return 2;
  if (validDays >= 12 && hours >= 25) return 1;
  return 0;
}

/* ===================== PAGE ===================== */

type SearchParams = { month?: string };

export default async function IncentivesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const creators = loadCreatorsFromPublicCreatorsFolder();

  // Friendly empty state instead of a 500 crash
  if (!creators.length) {
    const monthKey = safeMonthKey(sp.month);
    return (
      <main className={styles.wrap}>
        <div className={styles.container}>
          <header className={styles.hero}>
            <div className={styles.heroTop}>
              <div>
                <h1 className={styles.title}>Aqua Incentives</h1>
                <p className={styles.sub}>
                  Month key: <span className={styles.mono}>{monthKey}</span>
                </p>
                <p className={styles.sub} style={{ marginTop: 6 }}>
                  No creator images found in{" "}
                  <span className={styles.mono}>/public/creators</span>. Add
                  at least one <span className={styles.mono}>.png/.jpg/.webp</span>{" "}
                  named as the username.
                </p>
              </div>
            </div>
          </header>
        </div>
      </main>
    );
  }

  // ✅ Match the dashboard month selection:
  // - default previous month
  // - allow override via ?month=YYYY-MM
  const monthKey = safeMonthKey(sp.month);

  // Load all histories
  const allHistories: Record<string, HistoryEntry[]> = {};
  creators.forEach((c) => {
    allHistories[c.username] = loadHistoryFromPublic(c.username);
  });

  // Month-only histories (startsWith) — same as dashboard approach
  const monthAll: Record<string, HistoryEntry[]> = {};
  for (const u in allHistories) {
    monthAll[u] = (allHistories[u] || []).filter((e) =>
      (e.date ?? "").startsWith(monthKey)
    );
  }

  // All dates present in this month across everyone
  const dates = new Set<string>();
  Object.values(monthAll).forEach((arr) =>
    arr.forEach((e) => {
      if (e?.date) dates.add(e.date);
    })
  );

  // Build top5ByDay exactly like dashboard
  const top5ByDay: Record<string, string[]> = {};
  [...dates].forEach((date) => {
    const dayRows: { username: string; daily: number }[] = [];

    for (const u in monthAll) {
      const e = monthAll[u].find((x) => x.date === date);
      if (e && (e.daily ?? 0) > 0) dayRows.push({ username: u, daily: e.daily ?? 0 });
    }

    dayRows.sort((a, b) => b.daily - a.daily);
    top5ByDay[date] = dayRows.slice(0, 5).map((r) => r.username);
  });

  // Build rows
  const rows: Row[] = creators.map((c) => {
    const monthHistory = monthAll[c.username] || [];

    const stats = computeDashboardStatsForUser({
      username: c.username,
      monthHistory,
      top5ByDay,
    });

    // ✅ level points aligned to dashboard (non-stacking rate points)
    const earnedLevelPoints = computeEarnedLevelPointsAligned(
      stats.diamonds,
      stats.validDays,
      stats.hours
    );

    const incentiveBalanceWithLevels = stats.incentiveBalance + earnedLevelPoints;

    // ✅ payout eligibility aligned to dashboard (15 days + 40 hours)
    const eligible =
      stats.validDays >= ELIGIBLE_DAYS && stats.hours >= ELIGIBLE_HOURS;

    // ✅ Level badge aligned to dashboard thresholds
    const level = getLevelAligned(stats.validDays, stats.hours);

    return {
      username: c.username,
      avatar: c.avatar,

      diamonds: stats.diamonds,
      hours: Math.round(stats.hours * 10) / 10,
      validDays: stats.validDays,
      top5Count: stats.top5Count,

      calculatedPoints: stats.calculatedPoints,
      extrasPoints: stats.extrasPoints,
      incentiveBalance: stats.incentiveBalance,

      earnedLevelPoints,
      incentiveBalanceWithLevels,

      eligible,
      level,
    };
  });

  // ✅ Sort by Level (5 → 0), then by balance
  rows.sort((a, b) => {
    if (a.level !== b.level) return b.level - a.level;
    return b.incentiveBalanceWithLevels - a.incentiveBalanceWithLevels;
  });

  // ✅ Totals
  const eligibleRows = rows.filter((r) => r.eligible);

  const totalPayOut = eligibleRows.reduce(
    (s, r) => s + r.incentiveBalanceWithLevels,
    0
  );

  const notEligibleRows = rows.filter((r) => !r.eligible);
  const totalPotential = notEligibleRows.reduce(
    (s, r) => s + r.incentiveBalanceWithLevels,
    0
  );

  const agencyTotal = rows.reduce((s, r) => s + r.incentiveBalanceWithLevels, 0);

  const levelColorClass = (lvl: number) => {
    if (lvl === 5) return styles.level5;
    if (lvl === 4) return styles.level4;
    if (lvl === 3) return styles.level3;
    if (lvl === 2) return styles.level2;
    if (lvl === 1) return styles.level1;
    return styles.level0;
  };

  return (
    <main className={styles.wrap}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <div>
              <h1 className={styles.title}>Aqua Incentives</h1>
              <p className={styles.sub}>
                Month key: <span className={styles.mono}>{monthKey}</span> • Payout
                eligibility = <b>{ELIGIBLE_DAYS} days</b> +{" "}
                <b>{ELIGIBLE_HOURS} hours</b>
              </p>
              <p className={styles.sub} style={{ marginTop: 6 }}>
                Tip: change month with{" "}
                <span className={styles.mono}>?month=YYYY-MM</span>{" "}
                (e.g. <span className={styles.mono}>?month=2026-01</span>)
              </p>
            </div>

            <div className={styles.badge}>
              <div className={styles.badgeLabel}>Eligible (payout)</div>
              <div className={styles.badgeValue}>
                {eligibleRows.length} / {rows.length}
              </div>
            </div>
          </div>

          {/* ✅ Agency totals bar (eligible vs potential vs total) */}
          <div className={styles.cards}>
            <div className={`${styles.card} ${styles.glow}`}>
              <div className={styles.cardLabel}>Incentives to pay out (eligible)</div>
              <div className={styles.cardValue}>{showPoints(totalPayOut)}</div>
              <div className={styles.cardHint}>
                Sum of dashboard balances for creators who hit eligibility
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardLabel}>
                Potential incentives (if others hit eligibility)
              </div>
              <div className={styles.cardValue}>{showPoints(totalPotential)}</div>
              <div className={styles.cardHint}>
                Not eligible yet — this is what they’d add if they qualify
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardLabel}>Total across whole agency</div>
              <div className={styles.cardValue}>{showPoints(agencyTotal)}</div>
              <div className={styles.cardHint}>Eligible + potential combined</div>
            </div>
          </div>

          {/* Secondary cards */}
          <div className={styles.cards} style={{ marginTop: 12 }}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Creators source</div>
              <div className={`${styles.cardValue} ${styles.small}`}>
                /public/creators/*
              </div>
              <div className={styles.cardHint}>Filenames are treated as usernames</div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardLabel}>Sort order</div>
              <div className={`${styles.cardValue} ${styles.small}`}>
                Level 5 → Level 0
              </div>
              <div className={styles.cardHint}>Then highest dashboard balance</div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardLabel}>Display</div>
              <div className={`${styles.cardValue} ${styles.small}`}>
                Points shown as x{DISPLAY_POINTS_MULT}🪙
              </div>
              <div className={styles.cardHint}>
                Display only (doesn’t change calculations)
              </div>
            </div>
          </div>
        </header>

        <section className={styles.tableShell}>
          <div
            className={styles.tableHead}
            style={{
              gridTemplateColumns: "2.2fr 1fr .7fr .7fr .7fr .9fr .8fr .8fr 1fr",
            }}
          >
            <div className={styles.hCreator}>Creator</div>
            <div className={styles.hStatus}>Status</div>
            <div className={styles.hNum}>Level</div>
            <div className={styles.hNum}>Days</div>
            <div className={styles.hNum}>Hours</div>
            <div className={styles.hNum}>Points</div>
            <div className={styles.hNum}>Extras</div>
            <div className={styles.hNum}>Lvl pts</div>
            <div className={styles.hNum}>Dashboard balance</div>
          </div>

          <div className={styles.rows}>
            {rows.map((r) => {
              const needDays = Math.max(0, ELIGIBLE_DAYS - r.validDays);
              const needHours = Math.max(0, ELIGIBLE_HOURS - r.hours);

              return (
                <div
                  key={r.username}
                  className={`${styles.row} ${r.eligible ? styles.rowGood : ""}`}
                  style={{
                    gridTemplateColumns:
                      "2.2fr 1fr .7fr .7fr .7fr .9fr .8fr .8fr 1fr",
                  }}
                >
                  <div className={styles.creator}>
                    <img className={styles.avatar} src={r.avatar} alt={r.username} />
                    <div className={styles.creatorText}>
                      <div className={styles.creatorName}>{r.username}</div>
                      <div
                        className={`${styles.creatorSub} ${
                          r.eligible ? styles.ok : styles.bad
                        }`}
                      >
                        {r.eligible
                          ? "Eligible for payout"
                          : `Needs ${needDays} day(s), ${needHours.toFixed(1)} hour(s)`}
                      </div>
                    </div>
                  </div>

                  <div className={styles.status}>
                    {r.eligible ? (
                      <span className={`${styles.pill} ${styles.good}`}>Eligible</span>
                    ) : (
                      <span className={`${styles.pill} ${styles.badPill}`}>
                        Not eligible
                      </span>
                    )}
                  </div>

                  {/* Level pill (always shows L0-L5) */}
                  <div className={`${styles.cell} ${styles.levelCell}`} data-label="Level">
                    <span className={`${styles.levelPill} ${levelColorClass(r.level)}`}>
                      L{r.level}
                    </span>
                  </div>

                  <div className={`${styles.cell} ${styles.mono}`} data-label="Days">
                    {fmt(r.validDays)}
                  </div>
                  <div className={`${styles.cell} ${styles.mono}`} data-label="Hours">
                    {r.hours.toFixed(1)}
                  </div>

                  <div className={`${styles.cell} ${styles.mono}`} data-label="Points">
                    {showPoints(r.calculatedPoints)}
                  </div>
                  <div className={`${styles.cell} ${styles.mono}`} data-label="Extras">
                    {showPoints(r.extrasPoints)}
                  </div>
                  <div className={`${styles.cell} ${styles.mono}`} data-label="Lvl pts">
                    {showPoints(r.earnedLevelPoints)}
                  </div>

                  <div
                    className={`${styles.cell} ${styles.mono} ${styles.balance}`}
                    data-label="Dashboard balance"
                  >
                    {showPoints(r.incentiveBalanceWithLevels)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
