// app/admin/targets/page.tsx
// /admin/targets
// Mobile-optimized:
// - Uses responsive card layout on small screens (stacked blocks per creator)
// - Keeps table layout on desktop
// - Still sorted by closest target (level OR diamonds)
// - Still marks inactive (red) if not live in >4 days

import fs from "fs/promises";
import path from "path";
import { creators } from "@/data/creators";

export const dynamic = "force-dynamic";

type HistoryEntry = {
  date: string; // YYYY-MM-DD
  daily?: number;
  lifetime?: number;
  hours?: number;
};

type HistoryFile = {
  username: string;
  entries: HistoryEntry[];
};

type Level = { level: 2 | 3 | 4 | 5; days: number; hours: number; gated: boolean };

const LEVELS: Level[] = [
  { level: 2, days: 15, hours: 40, gated: false },
  { level: 3, days: 20, hours: 60, gated: true }, // unlocks at 150K diamonds
  { level: 4, days: 20, hours: 80, gated: true },
  { level: 5, days: 22, hours: 100, gated: true },
];

const MILESTONES = [
  { value: 75_000, label: "75K" },
  { value: 150_000, label: "150K" },
  { value: 500_000, label: "500K" },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pctDone(value: number, target: number) {
  if (!target) return 0;
  return clamp(value / target, 0, 1);
}

function isoTodayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function parseISODate(s: string) {
  return new Date(s + "T00:00:00Z");
}

async function readHistory(username: string): Promise<HistoryEntry[]> {
  const filePath = path.join(process.cwd(), "public", "history", `${username}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as HistoryFile;
    return Array.isArray(parsed?.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
}

function monthKeyNow() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // YYYY-MM
}

function getNextMilestone(monthlyDiamonds: number) {
  return MILESTONES.find((m) => monthlyDiamonds < m.value) ?? null;
}

function getLevelEligibility(validDays: number, hours: number, level: Level) {
  return validDays >= level.days && hours >= level.hours;
}

function getNextLevel(validDays: number, hours: number, monthlyDiamonds: number) {
  const ladderUnlocked = monthlyDiamonds >= 150_000;

  const l2 = LEVELS[0];
  const l3 = LEVELS[1];
  const l4 = LEVELS[2];
  const l5 = LEVELS[3];

  if (!getLevelEligibility(validDays, hours, l2)) return { target: l2, locked: false };
  if (!ladderUnlocked) return { target: l3, locked: true };

  if (!getLevelEligibility(validDays, hours, l3)) return { target: l3, locked: false };
  if (!getLevelEligibility(validDays, hours, l4)) return { target: l4, locked: false };
  if (!getLevelEligibility(validDays, hours, l5)) return { target: l5, locked: false };

  return { target: null as Level | null, locked: false };
}

function lastLiveInfo(monthEntries: HistoryEntry[]) {
  const liveDays = monthEntries
    .filter((e) => (e.hours ?? 0) > 0)
    .map((e) => e.date)
    .sort();

  const lastDate = liveDays.length ? liveDays[liveDays.length - 1] : null;
  return { lastDate };
}

function daysBetweenUTC(fromISO: string, toISO: string) {
  const a = parseISODate(fromISO).getTime();
  const b = parseISODate(toISO).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export default async function AdminTargetsPage() {
  const mk = monthKeyNow();
  const today = isoTodayUTC();

  const rows = await Promise.all(
    creators.map(async (c) => {
      const history = await readHistory(c.username);
      const month = history.filter((e) => e.date?.startsWith(mk));

      const monthlyDiamonds = month.reduce((s, e) => s + (e.daily ?? 0), 0);
      const monthlyHours = month.reduce((s, e) => s + (e.hours ?? 0), 0);
      const validDays = month.reduce((s, e) => s + ((e.hours ?? 0) >= 1 ? 1 : 0), 0);

      const nextMilestone = getNextMilestone(monthlyDiamonds);
      const milestoneRemaining = nextMilestone
        ? Math.max(0, nextMilestone.value - monthlyDiamonds)
        : 0;
      const milestoneProgress = nextMilestone ? pctDone(monthlyDiamonds, nextMilestone.value) : 1;

      const nextLevelInfo = getNextLevel(validDays, monthlyHours, monthlyDiamonds);
      const nextLevel = nextLevelInfo.target;

      const levelDaysRemaining = nextLevel ? Math.max(0, nextLevel.days - validDays) : 0;
      const levelHoursRemaining = nextLevel ? Math.max(0, nextLevel.hours - monthlyHours) : 0;
      const levelProgress = nextLevel
        ? Math.min(pctDone(validDays, nextLevel.days), pctDone(monthlyHours, nextLevel.hours))
        : 1;

      const { lastDate } = lastLiveInfo(month);
      const inactiveDays = lastDate ? daysBetweenUTC(lastDate, today) : 9999;
      const inactive = inactiveDays > 4;

      const remainingToMilestone = nextMilestone ? 1 - milestoneProgress : 1;
      const remainingToLevel = nextLevel ? 1 - levelProgress : 1;
      const sortScore = Math.min(remainingToLevel, remainingToMilestone);

      const closestType =
        remainingToLevel <= remainingToMilestone ? ("level" as const) : ("milestone" as const);
      const progress01 = closestType === "level" ? levelProgress : milestoneProgress;

      return {
        username: c.username,
        monthlyDiamonds,
        monthlyHours,
        validDays,

        nextLevel,
        nextLevelLocked: nextLevelInfo.locked,
        levelDaysRemaining,
        levelHoursRemaining,
        levelProgress,

        nextMilestone,
        milestoneRemaining,
        milestoneProgress,

        closestType,
        progress01,
        sortScore,

        lastLive: lastDate,
        inactiveDays,
        inactive,
      };
    })
  );

  rows.sort((a, b) => {
    if (a.inactive !== b.inactive) return a.inactive ? 1 : -1;
    if (a.sortScore !== b.sortScore) return a.sortScore - b.sortScore;
    return b.monthlyDiamonds - a.monthlyDiamonds;
  });

  /* ===================== Aqua styles ===================== */

  const pageBg: React.CSSProperties = {
    padding: 14,
    maxWidth: 1280,
    margin: "0 auto",
  };

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    padding: 14,
  };

  const titleGlowStrong: React.CSSProperties = {
    color: "#7cf6ff",
    textShadow: "0 0 12px rgba(45,224,255,0.60), 0 0 28px rgba(45,224,255,0.32)",
    fontWeight: 900,
    letterSpacing: "0.02em",
    fontSize: 22,
    lineHeight: 1.05,
  };

  const titleGlow: React.CSSProperties = {
    color: "#2de0ff",
    textShadow: "0 0 10px rgba(45,224,255,0.38)",
    fontWeight: 900,
  };

  const aquaTextSoft: React.CSSProperties = {
    color: "rgba(210, 250, 255, 0.88)",
    textShadow: "0 0 6px rgba(45,224,255,0.10)",
  };

  const subtle: React.CSSProperties = { color: "rgba(255,255,255,0.72)" };

  const pill = (bg: string, border: string, color: string, glow?: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    background: bg,
    border: `1px solid ${border}`,
    color,
    textShadow: glow ?? "none",
    whiteSpace: "nowrap",
  });

  const barOuter: React.CSSProperties = {
    width: "100%",
    height: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.10)",
    overflow: "hidden",
  };

  const barFill = (p01: number): React.CSSProperties => ({
    width: `${clamp(p01, 0, 1) * 100}%`,
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, rgba(45,224,255,0.95), rgba(123,232,255,0.85))",
    boxShadow: "0 0 10px rgba(45,224,255,0.30)",
  });

  /* ===================== Responsive CSS (no Tailwind needed) ===================== */
  const css = `
    .deskOnly { display: block; }
    .mobOnly { display: none; }
    .gridCards { display: grid; gap: 12px; }
    .creatorCard { border-radius: 16px; padding: 12px; border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.03); }
    .creatorCard.inactive { border-color: rgba(255,77,77,0.50); background: rgba(255,77,77,0.10); }
    .rowTop { display:flex; align-items:center; justify-content:space-between; gap: 10px; }
    .who { display:flex; align-items:center; gap: 10px; min-width: 0; }
    .avatar { width: 38px; height: 38px; border-radius: 999px; object-fit: cover; flex: 0 0 auto; }
    .name { font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .miniStats { font-size: 12px; opacity: 0.9; margin-top: 2px; line-height: 1.2; }
    .twoCol { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
    .box { border-radius: 14px; padding: 10px; border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.03); }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.75; }
    .value { font-weight: 900; margin-top: 4px; }
    .hint { font-size: 12px; opacity: 0.8; margin-top: 4px; line-height: 1.2; }
    .progressWrap { margin-top: 10px; }
    .lastRow { display:flex; justify-content:space-between; align-items:flex-end; gap: 10px; margin-top: 10px; }
    @media (max-width: 820px) {
      .deskOnly { display: none; }
      .mobOnly { display: block; }
      .twoCol { grid-template-columns: 1fr; }
      .lastRow { align-items: center; }
    }
  `;

  return (
    <main style={pageBg}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div>
          <div style={titleGlowStrong}>Admin Targets Board</div>
          <div style={{ marginTop: 6, ...aquaTextSoft }}>
            Sorted by who’s <b>closest</b> to their next target. Inactive = not live in <b>4+ days</b>.
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ ...titleGlow, fontSize: 13 }}>Month</div>
          <div style={{ ...aquaTextSoft, fontWeight: 800 }}>{mk}</div>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <section style={card}>
        {/* ===================== DESKTOP TABLE ===================== */}
        <div className="deskOnly" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 10px" }}>
            <thead>
              <tr style={{ ...subtle, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Creator</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Next Level</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Next Diamonds</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Closest Progress</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Last Live</th>
                <th style={{ textAlign: "left", padding: "6px 10px" }}>Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const rowBg = r.inactive ? "rgba(255,77,77,0.10)" : "rgba(255,255,255,0.03)";
                const rowBorder = r.inactive ? "rgba(255,77,77,0.45)" : "rgba(255,255,255,0.10)";

                const statusPill = r.inactive
                  ? pill("rgba(255,77,77,0.14)", "rgba(255,77,77,0.55)", "#ffb3b3", "0 0 8px rgba(255,77,77,0.25)")
                  : pill("rgba(124,246,255,0.10)", "rgba(124,246,255,0.40)", "#7cf6ff", "0 0 8px rgba(124,246,255,0.25)");

                const levelLabel = r.nextLevel
                  ? `Level ${r.nextLevel.level}${r.nextLevelLocked ? " (locked)" : ""}`
                  : "✅ Done";
                const levelDetail = r.nextLevel
                  ? `Need ${r.levelDaysRemaining} day(s) + ${r.levelHoursRemaining.toFixed(1)} hour(s)`
                  : "All levels completed";

                const milestoneLabel = r.nextMilestone ? r.nextMilestone.label : "✅ Done";
                const milestoneDetail = r.nextMilestone
                  ? `Need ${r.milestoneRemaining.toLocaleString()} diamonds`
                  : "All milestones completed";

                return (
                  <tr key={r.username}>
                    {/* Creator */}
                    <td style={{ padding: 0 }}>
                      <div
                        style={{
                          padding: "12px 10px",
                          borderRadius: 14,
                          background: rowBg,
                          border: `1px solid ${rowBorder}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <img
                          src={`/creators/${r.username}.jpg`}
                          alt={r.username}
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 999,
                            objectFit: "cover",
                            border: r.inactive
                              ? "2px solid rgba(255,77,77,0.55)"
                              : "2px solid rgba(45,224,255,0.55)",
                            boxShadow: r.inactive
                              ? "0 0 10px rgba(255,77,77,0.18)"
                              : "0 0 10px rgba(45,224,255,0.22)",
                          }}
                        />
                        <div>
                          <div style={{ ...aquaTextSoft, fontWeight: 900 }}>{r.username}</div>
                          <div style={{ ...subtle, fontSize: 12 }}>
                            Diamonds: <b style={aquaTextSoft}>{r.monthlyDiamonds.toLocaleString()}</b> •{" "}
                            Hours: <b style={aquaTextSoft}>{r.monthlyHours.toFixed(1)}</b> •{" "}
                            Valid days: <b style={aquaTextSoft}>{r.validDays}</b>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Next Level */}
                    <td style={{ padding: 0 }}>
                      <div style={{ padding: "12px 10px", borderRadius: 14, background: rowBg, border: `1px solid ${rowBorder}` }}>
                        <div style={{ ...titleGlow, fontSize: 13 }}>{levelLabel}</div>
                        <div style={{ ...aquaTextSoft, fontSize: 12, marginTop: 4 }}>{levelDetail}</div>
                        {r.nextLevelLocked && (
                          <div style={{ ...subtle, fontSize: 12, marginTop: 6 }}>
                            🔒 Unlocks at <b style={aquaTextSoft}>150K</b> monthly diamonds
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Next Diamonds */}
                    <td style={{ padding: 0 }}>
                      <div style={{ padding: "12px 10px", borderRadius: 14, background: rowBg, border: `1px solid ${rowBorder}` }}>
                        <div style={{ ...titleGlow, fontSize: 13 }}>{milestoneLabel}</div>
                        <div style={{ ...aquaTextSoft, fontSize: 12, marginTop: 4 }}>{milestoneDetail}</div>
                      </div>
                    </td>

                    {/* Progress */}
                    <td style={{ padding: 0 }}>
                      <div style={{ padding: "12px 10px", borderRadius: 14, background: rowBg, border: `1px solid ${rowBorder}` }}>
                        <div style={{ ...subtle, fontSize: 12 }}>
                          Closest: <b style={aquaTextSoft}>{r.closestType === "level" ? "Level" : "Diamonds"}</b>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <div style={barOuter}>
                            <div style={barFill(r.progress01)} />
                          </div>
                          <div style={{ ...subtle, fontSize: 12, marginTop: 6 }}>
                            {(r.progress01 * 100).toFixed(0)}% to next target
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Last Live */}
                    <td style={{ padding: 0 }}>
                      <div style={{ padding: "12px 10px", borderRadius: 14, background: rowBg, border: `1px solid ${rowBorder}` }}>
                        <div style={{ ...subtle, fontSize: 12 }}>Last live day</div>
                        <div style={{ ...aquaTextSoft, fontWeight: 900, marginTop: 4 }}>{r.lastLive ?? "—"}</div>
                        <div style={{ ...subtle, fontSize: 12, marginTop: 4 }}>
                          {r.lastLive ? `${r.inactiveDays} day(s) ago` : "No live data"}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: 0 }}>
                      <div style={{ padding: "12px 10px", borderRadius: 14, background: rowBg, border: `1px solid ${rowBorder}` }}>
                        <div style={statusPill}>{r.inactive ? "Inactive" : "Active"}</div>
                        {r.inactive && (
                          <div style={{ ...subtle, fontSize: 12, marginTop: 8 }}>
                            Marked because last live is &gt; 4 days.
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ===================== MOBILE CARDS ===================== */}
        <div className="mobOnly">
          <div className="gridCards">
            {rows.map((r) => {
              const inactive = r.inactive;

              const statusPill = inactive
                ? pill("rgba(255,77,77,0.14)", "rgba(255,77,77,0.55)", "#ffb3b3", "0 0 8px rgba(255,77,77,0.25)")
                : pill("rgba(124,246,255,0.10)", "rgba(124,246,255,0.40)", "#7cf6ff", "0 0 8px rgba(124,246,255,0.25)");

              const levelLabel = r.nextLevel
                ? `Level ${r.nextLevel.level}${r.nextLevelLocked ? " (locked)" : ""}`
                : "✅ Done";
              const levelDetail = r.nextLevel
                ? `Need ${r.levelDaysRemaining} day(s) + ${r.levelHoursRemaining.toFixed(1)} hour(s)`
                : "All levels completed";

              const milestoneLabel = r.nextMilestone ? r.nextMilestone.label : "✅ Done";
              const milestoneDetail = r.nextMilestone
                ? `Need ${r.milestoneRemaining.toLocaleString()} diamonds`
                : "All milestones completed";

              return (
                <div key={r.username} className={`creatorCard ${inactive ? "inactive" : ""}`}>
                  <div className="rowTop">
                    <div className="who">
                      <img
                        src={`/creators/${r.username}.jpg`}
                        alt={r.username}
                        className="avatar"
                        style={{
                          border: inactive
                            ? "2px solid rgba(255,77,77,0.55)"
                            : "2px solid rgba(45,224,255,0.55)",
                          boxShadow: inactive
                            ? "0 0 10px rgba(255,77,77,0.18)"
                            : "0 0 10px rgba(45,224,255,0.22)",
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div className="name" style={aquaTextSoft}>
                          {r.username}
                        </div>
                        <div className="miniStats" style={subtle}>
                          💎 <b style={aquaTextSoft}>{r.monthlyDiamonds.toLocaleString()}</b>{" "}
                          • ⏱ <b style={aquaTextSoft}>{r.monthlyHours.toFixed(1)}</b>{" "}
                          • ✅ <b style={aquaTextSoft}>{r.validDays}</b>
                        </div>
                      </div>
                    </div>

                    <div style={statusPill}>{inactive ? "Inactive" : "Active"}</div>
                  </div>

                  <div className="twoCol">
                    <div className="box">
                      <div className="label" style={subtle}>Next Level</div>
                      <div className="value" style={titleGlow}>{levelLabel}</div>
                      <div className="hint" style={aquaTextSoft}>{levelDetail}</div>
                      {r.nextLevelLocked && (
                        <div className="hint" style={subtle}>
                          🔒 Unlocks at <b style={aquaTextSoft}>150K</b>
                        </div>
                      )}
                    </div>

                    <div className="box">
                      <div className="label" style={subtle}>Next Diamonds</div>
                      <div className="value" style={titleGlow}>{milestoneLabel}</div>
                      <div className="hint" style={aquaTextSoft}>{milestoneDetail}</div>
                    </div>
                  </div>

                  <div className="progressWrap">
                    <div style={{ ...subtle, fontSize: 12 }}>
                      Closest:{" "}
                      <b style={aquaTextSoft}>{r.closestType === "level" ? "Level" : "Diamonds"}</b>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={barOuter}>
                        <div style={barFill(r.progress01)} />
                      </div>
                      <div style={{ ...subtle, fontSize: 12, marginTop: 6 }}>
                        {(r.progress01 * 100).toFixed(0)}% to next target
                      </div>
                    </div>
                  </div>

                  <div className="lastRow">
                    <div>
                      <div className="label" style={subtle}>Last Live</div>
                      <div style={{ ...aquaTextSoft, fontWeight: 900, marginTop: 2 }}>
                        {r.lastLive ?? "—"}
                      </div>
                      <div style={{ ...subtle, fontSize: 12, marginTop: 2 }}>
                        {r.lastLive ? `${r.inactiveDays} day(s) ago` : "No live data"}
                      </div>
                    </div>

                    {inactive && (
                      <div style={{ ...subtle, fontSize: 12, textAlign: "right" }}>
                        Marked inactive (&gt;4 days)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div style={{ height: 12 }} />

      <div style={{ ...subtle, fontSize: 12 }}>
        Tip: “Inactive” currently means <b>no hours logged</b> in the last 4 days (hours &gt; 0).
        If you want it to be <b>hours ≥ 1</b>, I’ll switch it.
      </div>
    </main>
  );
}
