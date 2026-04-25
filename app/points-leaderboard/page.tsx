
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

type CoinsCreator = {
  username: string;
  avatar: string;
  totalCoins: number;
  totalDailyDiamonds: number;
  totalHoursLive: number;
  streakDays: number;
};

// ------------------ Helpers ------------------

function parseDate(d: string) {
  return new Date(d + "T00:00:00Z");
}

// ⭐ FIXED STREAK LOGIC ⭐ (valid go live streak = consecutive days with 1h+)
function computeStreak(entries: HistoryEntry[]): number {
  if (!entries.length) return 0;

  const sorted = [...entries].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  const todayKey = new Date().toISOString().split("T")[0];
  const last = sorted[sorted.length - 1];
  const lastHours = last.hours ?? 0;

  // If today's entry exists but not yet valid, ignore it for streak purposes
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

// Streak rewards (coins)
function streakCoins(days: number) {
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
    return (
      json.entries?.sort((a, b) =>
        a.date < b.date ? -1 : a.date > b.date ? 1 : 0
      ) ?? []
    );
  } catch {
    return [];
  }
}

function formatNumber(n: number) {
  return n.toLocaleString("en-GB");
}

// ------------------ Main Component ------------------

export default function PointsLeaderboardPage() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const histories: Record<string, HistoryEntry[]> = {};
  creators.forEach((c: any) => {
    histories[c.username] = loadHistory(c.username);
  });

  // Collect dates from this month
  const dateSet = new Set<string>();
  Object.values(histories).forEach((arr) =>
    arr.forEach((e) => {
      if (e.date.startsWith(monthKey)) dateSet.add(e.date);
    })
  );
  const dates = [...dateSet].sort();

  // ------------------ Daily Top Creator Bonuses ------------------

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

  // ------------------ Score creators ------------------

  const scored: CoinsCreator[] = creators.map((c) => {
    const entries = histories[c.username] || [];
    const monthEntries = entries.filter((e) => e.date.startsWith(monthKey));

    let totalCoins = 0;
    let totalDailyDiamonds = 0;
    let totalHoursLive = 0;

    monthEntries.forEach((e) => {
      const daily = e.daily ?? 0;
      const hrs = e.hours ?? 0;

      totalDailyDiamonds += daily;
      totalHoursLive += hrs;

      let diamondCoins = 0;
      if (daily >= 1000) {
        diamondCoins += 10;
        const extra = Math.floor(daily / 1000) - 1;
        if (extra > 0) diamondCoins += extra * 5;
      }

      const hourCoins = Math.floor(hrs) * 3;
      const validDayCoins = hrs >= 1 ? 3 : 0;
      const achieveCoins = achievementByDay[e.date]?.[c.username] ?? 0;

      totalCoins += diamondCoins + hourCoins + validDayCoins + achieveCoins;
    });

    const streakDays = computeStreak(monthEntries);
    totalCoins += streakCoins(streakDays);

    return {
      username: c.username,
      avatar: `/creators/${c.username}.jpg`,
      totalCoins,
      totalDailyDiamonds,
      totalHoursLive,
      streakDays,
    };
  });

  const ranked = scored.sort((a, b) =>
    b.totalCoins !== a.totalCoins
      ? b.totalCoins - a.totalCoins
      : b.totalDailyDiamonds - a.totalDailyDiamonds
  );

  // ------------------ UI ------------------

  const coinText: React.CSSProperties = {
    color: "#FFD700",
    fontWeight: 900,
    textShadow: "0 0 10px rgba(255,215,0,0.75), 0 0 24px rgba(255,215,0,0.25)",
    whiteSpace: "nowrap",
  };

  return (
    <main className="leaderboard-wrapper">
      {/* Coins System Panel */}
      <div
        style={{
          margin: "28px auto",
          maxWidth: "900px",
          padding: "25px 30px",
          borderRadius: "16px",
          background: "#03101a",
          border: "1px solid rgba(45,224,255,0.45)",
          boxShadow: "0 0 18px rgba(45,224,255,0.25)",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: "20px",
            fontSize: "24px",
            fontWeight: 700,
            background: "linear-gradient(90deg,#2de0ff,#7be8ff,#2de0ff)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            textShadow: "0 0 4px rgba(45,224,255,0.45)",
          }}
        >
          Aqua Agency Coins System
        </h2>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            fontSize: "17px",
            lineHeight: "1.7",
            color: "#ffffff",
            fontWeight: 600,
            textShadow: "0 0 3px rgba(255,255,255,0.35)",
          }}
        >
          <li
            style={{
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(45,224,255,0.25)",
              fontSize: "18px",
              background: "linear-gradient(90deg,#2de0ff,#7be8ff)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            ✅ Redeemable Requirements
          </li>

          <li>• At the beginning of the month</li>

          <li>
            • If the creator has achieved{" "}
            <span
              style={{
                color: "#ff4d4d",
                fontWeight: 800,
                textShadow: "0 0 6px rgba(255,77,77,0.9)",
              }}
            >
              15 valid days
            </span>{" "}
            and{" "}
            <span
              style={{
                color: "#ff4d4d",
                fontWeight: 800,
                textShadow: "0 0 6px rgba(255,77,77,0.9)",
              }}
            >
              40 hours
            </span>{" "}
            within the month
          </li>

          <li
            style={{
              marginTop: "18px",
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(45,224,255,0.25)",
              fontSize: "18px",
              background: "linear-gradient(90deg,#2de0ff,#7be8ff)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            💎 Diamond Coins
          </li>
          <li>
            • First 1,000 diamonds → <span style={coinText}>10 coins</span>
          </li>
          <li>
            • Every additional 1,000 diamonds →{" "}
            <span style={coinText}>5 coins</span>
          </li>

          <li
            style={{
              marginTop: "18px",
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(45,224,255,0.25)",
              fontSize: "18px",
              background: "linear-gradient(90deg,#2de0ff,#7be8ff)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            ⏱️ Live Hours
          </li>
          <li>
            • Every full hour streamed → <span style={coinText}>3 coins</span>
          </li>
          <li>
            • Valid day bonus (1h+) → <span style={coinText}>+3 coins</span>
          </li>

          <li
            style={{
              marginTop: "18px",
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(45,224,255,0.25)",
              fontSize: "18px",
              background: "linear-gradient(90deg,#2de0ff,#7be8ff)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            🏆 Daily Top Creator Bonuses
          </li>
          <li>
            • 1st → <span style={coinText}>25 coins</span>
          </li>
          <li>
            • 2nd → <span style={coinText}>20 coins</span>
          </li>
          <li>
            • 3rd → <span style={coinText}>15 coins</span>
          </li>
          <li>
            • 4th → <span style={coinText}>10 coins</span>
          </li>
          <li>
            • 5th → <span style={coinText}>5 coins</span>
          </li>

          <li
            style={{
              marginTop: "18px",
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(45,224,255,0.25)",
              fontSize: "18px",
              background: "linear-gradient(90deg,#2de0ff,#7be8ff)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            🔥 Valid Go Live Streak Rewards
          </li>
          <li>
            • 3-day streak → <span style={coinText}>15 coins</span>
          </li>
          <li>
            • 5-day streak → <span style={coinText}>25 coins</span>
          </li>
          <li>
            • 10-day streak → <span style={coinText}>50 coins</span>
          </li>
          <li>
            • 20-day streak → <span style={coinText}>100 coins</span>
          </li>
          <li>
            • 30-day streak → <span style={coinText}>150 coins</span>
          </li>

          <li
            style={{
              marginTop: "18px",
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(45,224,255,0.25)",
              fontSize: "18px",
              background: "linear-gradient(90deg,#2de0ff,#7be8ff)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            🌙 Monthly Milestones (Manual Rewards)
          </li>
          <li>
            • First time hitting 75,000 diamonds →{" "}
            <span style={coinText}>1,000 coins</span>
          </li>
          <li>
            • First time hitting 150,000 diamonds →{" "}
            <span style={coinText}>2,000 coins</span>
          </li>
          <li>
            • Second time hitting 150,000 diamonds →{" "}
            <span style={coinText}>1,750 coins</span>
          </li>
          <li>
            • First time hitting 500,000 diamonds →{" "}
            <span style={coinText}>6,000 coins</span>
          </li>
        </ul>
      </div>

      <div className="leaderboard-title-image">
        <img
          src="/branding/points-leaderboard.png"
          className="leaderboard-title-img"
        />
      </div>

      <div className="leaderboard-list">
        {ranked.map((creator, index) => (
          <div key={creator.username} className="leaderboard-row">
            <div className="leaderboard-left">
              <div className="rank-number">{index + 1}</div>

              <img src={creator.avatar} className="leaderboard-avatar" />

              <div className="creator-info">
                <div className="creator-username glow-text">
                  {creator.username}
                </div>
                <div className="creator-daily">
                  Total diamonds this month:{" "}
                  <span>{formatNumber(creator.totalDailyDiamonds)}</span> ·{" "}
                  {Math.floor(creator.totalHoursLive)}h live
                </div>
              </div>
            </div>

            <div className="creator-diamonds">
              <div className="lifetime-number" style={coinText}>
                {creator.totalCoins}
              </div>
              <div className="lifetime-label">coins this month</div>

              {creator.streakDays > 0 && (
                <div className="creator-daily">
                  Valid go live streak this month:{" "}
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
