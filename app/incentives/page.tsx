import fs from "fs";
import path from "path";
import styles from "./incentives.module.css";
import { incentiveExtras } from "@/data/incentive-extras";

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

  eligible: boolean; // payout eligibility (15 days + 14 hours)
  level: number; // 0..5 (ALWAYS shown)
};

const ELIGIBLE_DAYS = 15;
const ELIGIBLE_HOURS = 14;

// ----- Option B: load creators from public/creators folder -----
function loadCreatorsFromPublicCreatorsFolder(): Creator[] {
  const dir = path.join(process.cwd(), "public", "creators");

  if (!fs.existsSync(dir)) {
    throw new Error("Missing public/creators folder");
  }

  const files = fs.readdirSync(dir);

  const creators: Creator[] = files
    .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .map((f) => {
      const username = f.replace(/\.(png|jpg|jpeg|webp)$/i, "");
      return { username, avatar: `/creators/${f}` };
    });

  if (!creators.length) {
    throw new Error("No images found in public/creators (png/jpg/jpeg/webp)");
  }

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

  const calculatedPoints = diamondPoints + hourPoints + validDayPoints + top5Points;

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
 * ✅ Ported from your dashboard level-points logic (unchanged).
 * (If you later want these points to follow your new levels system, tell me.)
 */
function computeEarnedLevelPoints(monthlyDiamonds: number, validDaysNow: number, hoursNow: number) {
  const ladderUnlocked = monthlyDiamonds >= 150_000;

  const levels = [
    { level: 2, days: 15, hours: 40, gated: false },
    { level: 3, days: 20, hours: 60, gated: true },
    { level: 4, days: 20, hours: 80, gated: true },
    { level: 5, days: 22, hours: 100, gated: true },
  ] as const;

  const isLevelEligible = (l: (typeof levels)[number]) => validDaysNow >= l.days && hoursNow >= l.hours;
  const isLevelAvailable = (l: (typeof levels)[number]) => (l.gated ? ladderUnlocked : true);

  const diamondScale = Math.max(1, Math.floor(monthlyDiamonds / 150_000));
  const scaledReward = 500 * diamondScale;

  const level3 = levels[1];
  const level4 = levels[2];
  const level5 = levels[3];

  const earnedLevelPoints =
    (isLevelAvailable(level3) && isLevelEligible(level3) ? scaledReward : 0) +
    (isLevelAvailable(level4) && isLevelEligible(level4) ? scaledReward : 0) +
    (isLevelAvailable(level5) && isLevelEligible(level5) ? scaledReward : 0);

  return earnedLevelPoints;
}

/**
 * ✅ NEW LEVEL SYSTEM (0..5 always)
 *
 * Level 0: under 12 days OR under 25 hours
 * Level 1: 12 days AND 25 hours
 * Level 2: 15 days AND 14 hours
 * Level 3: 20 days AND 16 hours
 * Level 4: 20 days AND 80 hours
 * Level 5: 22 days AND 100 hours
 *
 * We compute highest-to-lowest because Level 2 hours (14) is lower than Level 1 hours (25).
 */
function getLevelNew(validDays: number, hours: number): number {
  if (validDays >= 22 && hours >= 100) return 5;
  if (validDays >= 20 && hours >= 80) return 4;
  if (validDays >= 20 && hours >= 16) return 3;
  if (validDays >= 15 && hours >= 14) return 2;
  if (validDays >= 12 && hours >= 25) return 1;
  return 0;
}

function fmt(n: number) {
  return n.toLocaleString("en-GB");
}

export default function IncentivesPage() {
  const creators = loadCreatorsFromPublicCreatorsFolder();

  // Match your dashboard monthKey logic
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Load all histories
  const allHistories: Record<string, HistoryEntry[]> = {};
  creators.forEach((c) => {
    allHistories[c.username] = loadHistoryFromPublic(c.username);
  });

  // Month-only histories (startsWith)
  const monthAll: Record<string, HistoryEntry[]> = {};
  for (const u in allHistories) {
    monthAll[u] = (allHistories[u] || []).filter((e) => e.date?.startsWith(monthKey));
  }

  // All dates present in this month across everyone
  const dates = new Set<string>();
  Object.values(monthAll).forEach((arr) => arr.forEach((e) => dates.add(e.date)));

  // Build top5ByDay exactly like dashboard
  const top5ByDay: Record<string, string[]> = {};
  [...dates].forEach((date) => {
    const rows: { username: string; daily: number }[] = [];

    for (const u in monthAll) {
      const e = monthAll[u].find((x) => x.date === date);
      if (e && e.daily > 0) rows.push({ username: u, daily: e.daily });
    }

    rows.sort((a, b) => b.daily - a.daily);
    top5ByDay[date] = rows.slice(0, 5).map((r) => r.username);
  });

  // Build rows
  const rows: Row[] = creators.map((c) => {
    const monthHistory = monthAll[c.username] || [];

    const stats = computeDashboardStatsForUser({
      username: c.username,
      monthHistory,
      top5ByDay,
    });

    const earnedLevelPoints = computeEarnedLevelPoints(stats.diamonds, stats.validDays, stats.hours);
    const incentiveBalanceWithLevels = stats.incentiveBalance + earnedLevelPoints;

    // payout eligibility remains (15 days + 14 hours)
    const eligible = stats.validDays >= ELIGIBLE_DAYS && stats.hours >= ELIGIBLE_HOURS;

    // NEW LEVEL SYSTEM (0..5)
    const level = getLevelNew(stats.validDays, stats.hours);

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

  // Total owed: still only for payout-eligible (15d + 14h)
  const eligibleRows = rows.filter((r) => r.eligible);
  const totalOwed = eligibleRows.reduce((s, r) => s + r.incentiveBalanceWithLevels, 0);

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
                Month key: <span className={styles.mono}>{monthKey}</span> • Total owed uses payout eligibility ={" "}
                <b>{ELIGIBLE_DAYS} days</b> + <b>{ELIGIBLE_HOURS} hours</b>
              </p>
            </div>

            <div className={styles.badge}>
              <div className={styles.badgeLabel}>Eligible (payout)</div>
              <div className={styles.badgeValue}>
                {eligibleRows.length} / {rows.length}
              </div>
            </div>
          </div>

          <div className={styles.cards}>
            <div className={`${styles.card} ${styles.glow}`}>
              <div className={styles.cardLabel}>Total incentives owed (eligible)</div>
              <div className={styles.cardValue}>{fmt(totalOwed)} pts</div>
              <div className={styles.cardHint}>Uses the same “💰 Incentive Balance” as dashboards</div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardLabel}>Creators source</div>
              <div className={`${styles.cardValue} ${styles.small}`}>/public/creators/*</div>
              <div className={styles.cardHint}>Filenames are treated as usernames</div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardLabel}>Sort order</div>
              <div className={`${styles.cardValue} ${styles.small}`}>Level 5 → Level 0</div>
              <div className={styles.cardHint}>Then highest dashboard balance</div>
            </div>
          </div>
        </header>

        <section className={styles.tableShell}>
          <div
            className={styles.tableHead}
            style={{ gridTemplateColumns: "2.2fr 1fr .7fr .7fr .7fr .9fr .8fr .8fr 1fr" }}
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
                  style={{ gridTemplateColumns: "2.2fr 1fr .7fr .7fr .7fr .9fr .8fr .8fr 1fr" }}
                >
                  <div className={styles.creator}>
                    <img className={styles.avatar} src={r.avatar} alt={r.username} />
                    <div className={styles.creatorText}>
                      <div className={styles.creatorName}>{r.username}</div>
                      <div className={`${styles.creatorSub} ${r.eligible ? styles.ok : styles.bad}`}>
                        {r.eligible ? "Eligible for payout" : `Needs ${needDays} day(s), ${needHours.toFixed(1)} hour(s)`}
                      </div>
                    </div>
                  </div>

                  <div className={styles.status}>
                    {r.eligible ? (
                      <span className={`${styles.pill} ${styles.good}`}>Eligible</span>
                    ) : (
                      <span className={`${styles.pill} ${styles.badPill}`}>Not eligible</span>
                    )}
                  </div>

                  {/* Level pill (always shows L0-L5) */}
                  <div className={`${styles.cell} ${styles.levelCell}`} data-label="Level">
                    <span className={`${styles.levelPill} ${levelColorClass(r.level)}`}>L{r.level}</span>
                  </div>

                  <div className={`${styles.cell} ${styles.mono}`} data-label="Days">
                    {fmt(r.validDays)}
                  </div>
                  <div className={`${styles.cell} ${styles.mono}`} data-label="Hours">
                    {r.hours.toFixed(1)}
                  </div>
                  <div className={`${styles.cell} ${styles.mono}`} data-label="Points">
                    {fmt(r.calculatedPoints)}
                  </div>
                  <div className={`${styles.cell} ${styles.mono}`} data-label="Extras">
                    {fmt(r.extrasPoints)}
                  </div>
                  <div className={`${styles.cell} ${styles.mono}`} data-label="Lvl pts">
                    {fmt(r.earnedLevelPoints)}
                  </div>
                  <div className={`${styles.cell} ${styles.mono} ${styles.balance}`} data-label="Dashboard balance">
                    {fmt(r.incentiveBalanceWithLevels)}
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
