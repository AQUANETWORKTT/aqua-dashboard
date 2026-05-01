"use client";

import React, { useEffect, useMemo, useState } from "react";
import { creators } from "@/data/creators";
import { incentiveExtras } from "@/data/incentive-extras";

type HistoryEntry = {
  date: string;
  daily: number;
  lifetime: number;
  hours?: number;
};

type HistoryFile = {
  username: string;
  entries: HistoryEntry[];
};

type CreatorIncentiveRow = {
  username: string;
  diamonds: number;
  hours: number;
  validDays: number;
  tierCoins: number;
  liveCoins: number;
  extrasCoins: number;
  coinsOwed: number;
  eligible: boolean;
};

type TierConfig = {
  id: number;
  min: number;
  label: string;
  color: string;
  incentiveCoins: number;
};

const MIN_VALID_DAYS = 15;
const MIN_HOURS = 40;

const TIERS: TierConfig[] = [
  { id: 1, label: "Tier 1", min: 0, color: "#9CA3AF", incentiveCoins: 0 },
  { id: 2, label: "Tier 2", min: 100_000, color: "#84cc16", incentiveCoins: 1_200 },
  { id: 3, label: "Tier 3", min: 200_000, color: "#06b6d4", incentiveCoins: 2_400 },
  { id: 4, label: "Tier 4", min: 300_000, color: "#3b82f6", incentiveCoins: 3_600 },
  { id: 5, label: "Tier 5", min: 500_000, color: "#6366f1", incentiveCoins: 4_800 },
  { id: 6, label: "Tier 6", min: 700_000, color: "#8b5cf6", incentiveCoins: 6_000 },
  { id: 7, label: "Tier 7", min: 1_000_000, color: "#d946ef", incentiveCoins: 7_200 },
  { id: 8, label: "Tier 8", min: 1_600_000, color: "#f43f5e", incentiveCoins: 8_400 },
  { id: 9, label: "Tier 9", min: 2_500_000, color: "#f97316", incentiveCoins: 9_600 },
  { id: 10, label: "Tier 10", min: 5_000_000, color: "#f59e0b", incentiveCoins: 10_800 },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toMonthKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);

  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function getMonthOptions(count = 12) {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = toMonthKey(date);

    return {
      value,
      label: formatMonthLabel(value),
    };
  });
}

function getTier(monthlyDiamonds: number) {
  let current = TIERS[0];

  for (const tier of TIERS) {
    if (monthlyDiamonds >= tier.min) current = tier;
  }

  return current;
}

function calculateLiveCoins(diamonds: number, hours: number, validDays: number) {
  const reducedLiveDiamonds = Math.floor(diamonds * 0.5);
  const thousands = Math.floor(reducedLiveDiamonds / 1000);

  let diamondPoints = 0;

  if (thousands >= 1) {
    diamondPoints += 10;
    diamondPoints += Math.max(0, thousands - 1) * 5;
  }

  const hourPoints = Math.floor(hours) * 3;
  const validDayPoints = validDays * 3;

  return diamondPoints + hourPoints + validDayPoints;
}

export default function IncentivesPage() {
  const [rows, setRows] = useState<CreatorIncentiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() =>
    toMonthKey(new Date())
  );

  const monthOptions = useMemo(() => getMonthOptions(18), []);

  useEffect(() => {
    async function loadCreatorStats() {
      setLoading(true);

      const results = await Promise.all(
        creators.map(async (creator) => {
          try {
            const res = await fetch(`/history/${creator.username}.json`, {
              cache: "no-store",
            });

            if (!res.ok) {
              return {
                username: creator.username,
                diamonds: 0,
                hours: 0,
                validDays: 0,
                tierCoins: 0,
                liveCoins: 0,
                extrasCoins: incentiveExtras[creator.username] ?? 0,
                coinsOwed: 0,
                eligible: false,
              };
            }

            const json = (await res.json()) as HistoryFile;
            const entries = Array.isArray(json.entries) ? json.entries : [];

            const monthEntries = entries.filter((e) =>
              (e.date || "").startsWith(selectedMonthKey)
            );

            const diamonds = monthEntries.reduce(
              (sum, e) => sum + (e.daily ?? 0),
              0
            );

            const hours = monthEntries.reduce(
              (sum, e) => sum + (e.hours ?? 0),
              0
            );

            const validDays = monthEntries.filter(
              (e) => (e.hours ?? 0) >= 1
            ).length;

            const eligible =
              validDays >= MIN_VALID_DAYS && hours >= MIN_HOURS;

            const tier = getTier(diamonds);
            const tierCoins = tier.incentiveCoins;
            const liveCoins = calculateLiveCoins(diamonds, hours, validDays);
            const extrasCoins = incentiveExtras[creator.username] ?? 0;

            const coinsOwed = eligible
              ? liveCoins + tierCoins + extrasCoins
              : 0;

            return {
              username: creator.username,
              diamonds,
              hours,
              validDays,
              tierCoins,
              liveCoins,
              extrasCoins,
              coinsOwed,
              eligible,
            };
          } catch {
            return {
              username: creator.username,
              diamonds: 0,
              hours: 0,
              validDays: 0,
              tierCoins: 0,
              liveCoins: 0,
              extrasCoins: incentiveExtras[creator.username] ?? 0,
              coinsOwed: 0,
              eligible: false,
            };
          }
        })
      );

      const sorted = results.sort((a, b) => {
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        if (b.coinsOwed !== a.coinsOwed) return b.coinsOwed - a.coinsOwed;
        return b.diamonds - a.diamonds;
      });

      setRows(sorted);
      setLoading(false);
    }

    loadCreatorStats();
  }, [selectedMonthKey]);

  const eligibleRows = rows.filter((r) => r.eligible);
  const notEligibleRows = rows.filter((r) => !r.eligible);

  const totalCoinsOwed = eligibleRows.reduce(
    (sum, row) => sum + row.coinsOwed,
    0
  );

  const page: React.CSSProperties = {
    minHeight: "100vh",
    padding: "28px 14px 70px",
    background:
      "radial-gradient(circle at top, rgba(0,180,255,0.18), transparent 34%), linear-gradient(180deg, #020617 0%, #030712 55%, #000 100%)",
    color: "#fff",
    fontFamily: "'Orbitron', 'Rajdhani', system-ui, sans-serif",
  };

  const shell: React.CSSProperties = {
    width: "100%",
    maxWidth: 1220,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  };

  const card: React.CSSProperties = {
    borderRadius: 24,
    background:
      "linear-gradient(180deg, rgba(7,17,31,0.94), rgba(3,7,18,0.96))",
    border: "1px solid rgba(45,224,255,0.22)",
    boxShadow:
      "inset 0 0 26px rgba(45,224,255,0.04), 0 0 28px rgba(0,180,255,0.10)",
  };

  const title: React.CSSProperties = {
    fontSize: 14,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "#2de0ff",
    fontWeight: 900,
    textShadow: "0 0 10px rgba(45,224,255,0.55)",
  };

  const bigNumber: React.CSSProperties = {
    fontSize: 36,
    fontWeight: 900,
    lineHeight: 1,
  };

  const gold: React.CSSProperties = {
    color: "#FFD76A",
    fontWeight: 900,
    textShadow: "0 0 14px rgba(255,215,106,0.5)",
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 260,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(45,224,255,0.38)",
    background: "rgba(2,6,23,0.88)",
    color: "#fff",
    fontFamily: "inherit",
    fontWeight: 900,
    outline: "none",
    boxShadow: "0 0 18px rgba(45,224,255,0.12)",
    cursor: "pointer",
  };

  const pill = (good: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 11px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: good ? "#7cf6ff" : "#ff6b6b",
    background: good ? "rgba(124,246,255,0.09)" : "rgba(255,77,77,0.09)",
    border: good
      ? "1px solid rgba(124,246,255,0.4)"
      : "1px solid rgba(255,77,77,0.4)",
  });

  function renderRows(data: CreatorIncentiveRow[]) {
    return (
      <div style={{ display: "grid", gap: 10, minWidth: 1040 }}>
        {data.map((row, index) => {
          const daysLeft = Math.max(0, MIN_VALID_DAYS - row.validDays);
          const hoursLeft = Math.max(0, MIN_HOURS - row.hours);

          return (
            <div
              key={row.username}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "48px 1fr 120px 90px 90px 120px 120px 120px",
                gap: 12,
                alignItems: "center",
                padding: 14,
                borderRadius: 18,
                background: row.eligible
                  ? "linear-gradient(90deg, rgba(45,224,255,0.11), rgba(255,255,255,0.035))"
                  : "rgba(255,255,255,0.025)",
                border: row.eligible
                  ? "1px solid rgba(45,224,255,0.34)"
                  : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  background: "rgba(255,255,255,0.05)",
                  color: row.eligible ? "#7cf6ff" : "#94a3b8",
                }}
              >
                #{index + 1}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.username}
                </div>

                {!row.eligible && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: "rgba(255,255,255,0.48)",
                    }}
                  >
                    Needs {daysLeft} more valid days and{" "}
                    {hoursLeft.toFixed(1)}h more
                  </div>
                )}
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900 }}>
                  {row.diamonds.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                  Diamonds
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900 }}>{row.validDays}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                  Days
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900 }}>{row.hours.toFixed(1)}h</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                  Hours
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900 }}>
                  {row.liveCoins.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                  Live Coins
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900 }}>
                  {row.tierCoins.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                  Tier Bonus
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={gold}>{row.coinsOwed.toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                  Coins Owed
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <main style={page}>
      <div style={shell}>
        <section style={{ ...card, padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={title}>Aqua Creator Network</div>

              <h1
                style={{
                  margin: "10px 0 8px",
                  fontSize: "clamp(32px, 7vw, 66px)",
                  lineHeight: 1,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  textShadow:
                    "0 0 12px rgba(45,224,255,0.75), 0 0 28px rgba(45,224,255,0.25)",
                }}
              >
                Incentives
              </h1>

              <p style={{ margin: 0, color: "rgba(255,255,255,0.62)" }}>
                Creators must hit {MIN_VALID_DAYS} valid days and {MIN_HOURS}{" "}
                hours to be eligible. Coins owed only show for eligible creators.
              </p>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label
                htmlFor="month-select"
                style={{
                  ...title,
                  fontSize: 11,
                  letterSpacing: "0.16em",
                }}
              >
                Select Month
              </label>

              <select
                id="month-select"
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                style={selectStyle}
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <div style={{ ...card, padding: 20 }}>
            <div style={title}>Eligible</div>
            <div style={{ ...bigNumber, marginTop: 12, color: "#7cf6ff" }}>
              {eligibleRows.length}
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={title}>Not Eligible</div>
            <div style={{ ...bigNumber, marginTop: 12, color: "#ff6b6b" }}>
              {notEligibleRows.length}
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={title}>Total Creators</div>
            <div style={{ ...bigNumber, marginTop: 12 }}>{rows.length}</div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={title}>Total Coins Owed</div>
            <div style={{ ...bigNumber, ...gold, marginTop: 12 }}>
              {totalCoinsOwed.toLocaleString()}
            </div>
          </div>
        </section>

        <section style={{ ...card, padding: 20, overflowX: "auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div style={title}>
              Eligible Creators — {formatMonthLabel(selectedMonthKey)}
            </div>
            <span style={pill(true)}>{eligibleRows.length} Qualified</span>
          </div>

          {loading ? (
            <div style={{ color: "rgba(255,255,255,0.6)" }}>
              Loading incentives…
            </div>
          ) : eligibleRows.length ? (
            renderRows(eligibleRows)
          ) : (
            <div style={{ color: "rgba(255,255,255,0.6)" }}>
              No creators are eligible for this month yet.
            </div>
          )}
        </section>

        <section style={{ ...card, padding: 20, overflowX: "auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div style={title}>
              Still To Qualify — {formatMonthLabel(selectedMonthKey)}
            </div>
            <span style={pill(false)}>
              {notEligibleRows.length} Not Eligible
            </span>
          </div>

          {loading ? (
            <div style={{ color: "rgba(255,255,255,0.6)" }}>
              Loading creators…
            </div>
          ) : notEligibleRows.length ? (
            renderRows(notEligibleRows)
          ) : (
            <div style={{ color: "rgba(255,255,255,0.6)" }}>
              Everyone is eligible for this month.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}