"use client";

import { saveAs } from "file-saver";
import JSZip from "jszip";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type CreatorStat = {
  [key: string]: unknown;
  stat_date: string;
  creator_id?: string | null;
  creator_username?: string | null;
  "Creator's username"?: string | null;
  agency?: string | null;
  team?: string | null;
  group_name?: string | null;
  manager_email?: string | null;
  creator_network_manager?: string | null;
  "Creator Network manager"?: string | null;
  days_since_joining?: number | null;
  diamonds?: number | null;
  live_hours?: number | null;
  live_duration?: string | null;
  valid_days?: number | null;
  valid_live_days?: number | null;
  matches?: number | null;
  live_streams?: number | null;
  new_followers?: number | null;
  graduation_status?: string | null;
  tier_status?: string | null;
};

type HealthStatus = "Elite" | "Healthy" | "Needs Attention" | "Low Performance" | "Low Quality";

type CreatorDailyPoint = {
  date: string;
  diamonds: number;
  liveHours: number;
  validDays: number;
  matches: number;
  newFollowers: number;
  dph: number;
  healthScore: number;
};

type CreatorSummary = {
  key: string;
  id: string;
  username: string;
  managerLabel: string;
  group: string;
  diamonds: number;
  liveHours: number;
  validDays: number;
  matches: number;
  liveStreams: number;
  newFollowers: number;
  daysSinceJoining: number;
  dph: number;
  isNewCreator: boolean;
  healthScore: number;
  healthStatus: HealthStatus;
  dailyPoints: CreatorDailyPoint[];
  graduationStatus: string;
  tierStatus: string;
};

type WeeklyComparison = {
  creator: CreatorSummary;
  previousScore: number | null;
  change: number | null;
};

const managerSearchMap: Record<string, string[]> = {
  james: ["james"],
  alfie: ["alfie"],
  dylan: ["dylan"],
  jay: ["jay"],
  ellie: ["ellie"],
  lewis: ["lewis"],
  vitali: ["vitali", "vitaly"],
  vitaly: ["vitali", "vitaly"],
  callum: ["callum"],
  harry: ["harry"],
  chloe: ["chloe"],
  joe: ["joe", "chloe"],
  millie: ["millie"],
  jade: ["jade", "jade1"],
  teddie1: ["teddie", "teddie1"],
  teddie: ["teddie", "teddie1"],
  ellie1: ["ellie1", "ellie b", "leb"],
  chris: ["matt"],
};

const managerDisplayMap: Record<string, string> = {
  teddie1: "Teddie",
  teddie: "Teddie",
  ellie1: "Ellie B",
  chris: "Chris",
  vitali: "Vitaly",
};

function safeNumber(value: unknown) {
  const cleaned = String(value || "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  const numberValue = Number(cleaned || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function cleanText(value: unknown, fallback = "") {
  return String(value || fallback).trim();
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

function formatHours(value: number) {
  return `${value.toFixed(1)}h`;
}

function titleCase(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getManagerDisplayName(value: string) {
  return managerDisplayMap[value] || titleCase(value);
}

function getText(row: CreatorStat, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = cleanText(row[key]);
    if (value) return value;
  }

  return fallback;
}

function durationToHours(value: unknown) {
  const text = cleanText(value).toLowerCase();
  if (!text) return 0;

  const hours = Number(text.match(/(\d+(?:\.\d+)?)\s*h/)?.[1] || 0);
  const minutes = Number(text.match(/(\d+(?:\.\d+)?)\s*m/)?.[1] || 0);
  const seconds = Number(text.match(/(\d+(?:\.\d+)?)\s*s/)?.[1] || 0);

  if (hours || minutes || seconds) {
    return Number((hours + minutes / 60 + seconds / 3600).toFixed(2));
  }

  return safeNumber(value);
}

function getNumber(row: CreatorStat, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && cleanText(value) !== "") return safeNumber(value);
  }

  return 0;
}

function getDurationHours(row: CreatorStat, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && cleanText(value) !== "") return durationToHours(value);
  }

  return 0;
}

function getUsername(row: CreatorStat) {
  return getText(row, ["creator_username", "Creator's username", "creator_id"], "Unknown").replace(/^@/, "");
}

function getManagerRaw(row: CreatorStat) {
  return getText(row, ["manager_email", "creator_network_manager", "Creator Network manager"]);
}

function getManagerLabel(value: string) {
  const clean = value
    .replace(/\[|\]/g, "")
    .replace(/\(mailto:|\)/g, "")
    .trim()
    .toLowerCase();

  if (clean.includes("@")) {
    return `Team ${titleCase(clean.split("@")[0].replace(/_?aquaagency$/i, ""))}`;
  }

  return clean ? `Team ${titleCase(clean)}` : "Unassigned";
}

function isManagerMatch(managerField: string, managerUsername: string) {
  const field = managerField.toLowerCase();
  const keys = managerSearchMap[managerUsername] || [managerUsername];
  return keys.some((key) => field.includes(key.toLowerCase()));
}

function capScore(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function getDailyPoint(row: CreatorStat) {
  const liveHours = getDurationHours(row, ["live_hours", "LIVE duration", "live_duration"]);
  const diamonds = getNumber(row, ["diamonds", "Diamonds"]);
  const matches = getNumber(row, ["matches", "Matches"]);
  const newFollowers = getNumber(row, ["new_followers", "New followers", "followers"]);

  return {
    date: row.stat_date,
    diamonds,
    liveHours,
    validDays: liveHours >= 1 ? 1 : 0,
    matches,
    newFollowers,
    dph: liveHours > 0 ? diamonds / liveHours : 0,
    healthScore: getHealthScore([row], [row.stat_date]),
  };
}

function getHealthScore(creatorRows: CreatorStat[], windowDates: string[]) {
  const rowsByDate = new Map(creatorRows.map((row) => [row.stat_date, row]));
  const currentDates = windowDates.slice(-7);
  let liveAppearDays = 0;
  let liveDays = 0;
  let totalHours = 0;
  let totalMatches = 0;
  let totalDiamonds = 0;

  for (const date of currentDates) {
    const row = rowsByDate.get(date);
    const hours = row ? getDurationHours(row, ["live_hours", "LIVE duration", "live_duration"]) : 0;
    const matches = row ? getNumber(row, ["matches", "Matches"]) : 0;
    const diamonds = row ? getNumber(row, ["diamonds", "Diamonds"]) : 0;

    if (hours > 0) liveAppearDays += 1;
    if (hours >= 1) liveDays += 1;
    totalHours += hours;
    totalMatches += matches;
    totalDiamonds += diamonds;
  }

  const dph = totalHours > 0 ? totalDiamonds / totalHours : 0;
  const liveDaysScore = capScore(liveAppearDays * 3 + liveDays * 2, 35);
  const liveHoursScore =
    totalHours >= 20 ? 30 : totalHours >= 15 ? 22 : totalHours >= 10 ? 15 : totalHours >= 5 ? 8 : 0;
  const matchesScore = capScore(Math.floor(totalMatches / 7), 10);
  const dphScore =
    dph >= 2500 ? 25 : dph >= 2000 ? 20 : dph >= 1500 ? 15 : dph >= 1000 ? 10 : dph >= 500 ? 5 : dph >= 100 ? 1 : 0;

  return Math.round(liveDaysScore + liveHoursScore + matchesScore + dphScore);
}

function getHealthStatus(score: number, diamonds = 0): HealthStatus {
  if (score >= 85) return "Elite";
  if (score >= 70) return "Healthy";
  if (score >= 50) return "Needs Attention";
  if (diamonds >= 5000) return "Low Performance";
  return "Low Quality";
}

function statusClasses(status: HealthStatus) {
  if (status === "Elite") return "border-purple-200 bg-purple-50 text-purple-700";
  if (status === "Healthy") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Needs Attention") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "Low Performance") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function getRoundedPercentages(counts: number[]) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) return counts.map(() => 0);

  const raw = counts.map((count) => (count / total) * 100);
  const roundedDown = raw.map(Math.floor);
  let remainder = 100 - roundedDown.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (const item of order) {
    if (remainder <= 0) break;
    roundedDown[item.index] += 1;
    remainder -= 1;
  }

  return roundedDown;
}

function getMonthBounds() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const start = `${month}-01`;
  const end = `${month}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;
  const previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousStart = `${previousStartDate.getFullYear()}-${String(previousStartDate.getMonth() + 1).padStart(2, "0")}-01`;

  return {
    month,
    label: now.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    start,
    end,
    previousStart,
  };
}

function buildCreatorSummaries(rows: CreatorStat[]) {
  const byCreator = new Map<string, CreatorStat[]>();
  const windowDates = Array.from(new Set(rows.map((row) => row.stat_date)))
    .sort((a, b) => a.localeCompare(b))
    .slice(-7);

  for (const row of rows) {
    const username = getUsername(row).toLowerCase();
    if (!byCreator.has(username)) byCreator.set(username, []);
    byCreator.get(username)?.push(row);
  }

  return Array.from(byCreator.entries())
    .map(([key, creatorRows]) => {
      const sortedRows = [...creatorRows].sort((a, b) => a.stat_date.localeCompare(b.stat_date));
      const latest = sortedRows[sortedRows.length - 1] || creatorRows[0];
      const managerRaw = getManagerRaw(latest);
      const diamonds = creatorRows.reduce((sum, row) => sum + getNumber(row, ["diamonds", "Diamonds"]), 0);
      const liveHours = creatorRows.reduce(
        (sum, row) => sum + getDurationHours(row, ["live_hours", "LIVE duration", "live_duration"]),
        0
      );
      const matches = creatorRows.reduce((sum, row) => sum + getNumber(row, ["matches", "Matches"]), 0);
      const liveStreams = creatorRows.reduce((sum, row) => sum + getNumber(row, ["live_streams", "LIVE streams"]), 0);
      const newFollowers = creatorRows.reduce((sum, row) => sum + getNumber(row, ["new_followers", "New followers", "followers"]), 0);
      const daysSinceJoining = Math.max(...creatorRows.map((row) => getNumber(row, ["days_since_joining", "Days since joining"])), 0);
      const healthScore = getHealthScore(creatorRows, windowDates);
      const dailyPoints = sortedRows.map(getDailyPoint);

      return {
        key,
        id: getText(latest, ["creator_id", "Creator ID"], key),
        username: getUsername(latest),
        managerLabel: getManagerLabel(managerRaw),
        group: getText(latest, ["team", "group_name", "Group"], "Aqua"),
        diamonds,
        liveHours,
        validDays: creatorRows.filter((row) => getDurationHours(row, ["live_hours", "LIVE duration", "live_duration"]) >= 1).length,
        matches,
        liveStreams,
        newFollowers,
        daysSinceJoining,
        dph: liveHours > 0 ? diamonds / liveHours : 0,
        isNewCreator: daysSinceJoining > 0 && daysSinceJoining <= 14,
        healthScore,
        healthStatus: getHealthStatus(healthScore, diamonds),
        dailyPoints,
        graduationStatus: getText(latest, ["graduation_status", "Graduation status"], "Unknown"),
        tierStatus: getText(latest, ["tier_status", "Tier status"], "Unknown"),
      };
    })
    .sort((a, b) => a.healthScore - b.healthScore);
}

function buildWeeklyComparison(creators: CreatorSummary[], rows: CreatorStat[]) {
  const uploadedDates = Array.from(new Set(rows.map((row) => row.stat_date))).sort((a, b) => a.localeCompare(b));
  const previousDates = uploadedDates.slice(-14, -7);
  const previousSet = new Set(previousDates);
  const previousSummaries = buildCreatorSummaries(rows.filter((row) => previousSet.has(row.stat_date)));
  const previousByCreator = new Map(previousSummaries.map((creator) => [creator.key, creator.healthScore]));

  return creators
    .filter((creator) => !creator.isNewCreator)
    .map((creator) => {
      const previousScore = previousByCreator.get(creator.key) ?? null;

      return {
        creator,
        previousScore,
        change: previousScore === null ? null : creator.healthScore - previousScore,
      };
    });
}

function buildCreatorReportHtml(creator: CreatorSummary, reportType: "creator" | "internal") {
  const weeklyPoints = creator.dailyPoints.slice(-7);
  const weeklyDiamonds = weeklyPoints.reduce((sum, point) => sum + point.diamonds, 0);
  const weeklyHours = weeklyPoints.reduce((sum, point) => sum + point.liveHours, 0);
  const weeklyLiveDays = weeklyPoints.filter((point) => point.liveHours > 0).length;
  const weeklyMatches = weeklyPoints.reduce((sum, point) => sum + point.matches, 0);
  const title =
    reportType === "creator"
      ? `${creator.username} - Weekly Creator Report`
      : `${creator.username} Internal Data Report`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; color: #102033; background: #eef7ff; }
    main { max-width: 900px; margin: 0 auto; min-height: 100vh; background: white; padding: 40px; border-top: 8px solid #0ea5e9; }
    h1 { color: #075985; margin-bottom: 4px; }
    h2 { color: #0369a1; margin-top: 28px; }
    table { border-collapse: collapse; width: 100%; margin: 18px 0; }
    td { border: 1px solid #d8e8f5; padding: 10px; }
    td:first-child { font-weight: 700; background: #eff8ff; width: 240px; color: #075985; }
  </style>
</head>
<body>
<main>
  <h1>${title}</h1>
  <p>${creator.managerLabel} / ${creator.healthStatus}</p>
  <table>
    <tr><td>Health score</td><td>${creator.healthScore}/100</td></tr>
    <tr><td>Weekly diamonds</td><td>${formatNumber(weeklyDiamonds)}</td></tr>
    <tr><td>Weekly live hours</td><td>${formatHours(weeklyHours)}</td></tr>
    <tr><td>Weekly live days</td><td>${formatNumber(weeklyLiveDays)}</td></tr>
    <tr><td>Weekly battles</td><td>${formatNumber(weeklyMatches)}</td></tr>
    <tr><td>DPH</td><td>${formatNumber(creator.dph)}</td></tr>
  </table>
  <h2>Weekly Breakdown</h2>
  <table>
    <tr><td>Day</td><td>Hours</td><td>Diamonds</td><td>Battles</td><td>Followers</td></tr>
    ${weeklyPoints
      .map(
        (point) =>
          `<tr><td>${point.date}</td><td>${formatHours(point.liveHours)}</td><td>${formatNumber(point.diamonds)}</td><td>${formatNumber(point.matches)}</td><td>${formatNumber(point.newFollowers)}</td></tr>`
      )
      .join("")}
  </table>
  ${
    reportType === "internal"
      ? `<h2>Manager Notes</h2><ul><li>Health: ${creator.healthStatus}</li><li>Target live days: 5 per week.</li><li>Target live hours: 20 per week.</li></ul>`
      : `<h2>Next Week Target</h2><ul><li>Push for 5 live days and 20 live hours.</li><li>Improve session quality and battles.</li></ul>`
  }
</main>
</body>
</html>`;
}

function downloadCreatorReport(creator: CreatorSummary, reportType: "creator" | "internal") {
  const blob = new Blob([buildCreatorReportHtml(creator, reportType)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  link.href = url;
  link.download = `${creator.username}-${reportType === "creator" ? "weekly-creator-report" : "internal-data-report"}-${timestamp}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadAllCreatorReports(creators: CreatorSummary[], managerName: string) {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const safeManager = managerName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const zip = new JSZip();
  const folder = zip.folder(`${safeManager}-creator-reports-${timestamp}`);

  creators
    .filter((creator) => !creator.isNewCreator)
    .forEach((creator) => {
      const safeUsername = creator.username.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();
      folder?.file(`${safeUsername}-weekly-creator-report.html`, buildCreatorReportHtml(creator, "creator"));
    });

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${safeManager}-creator-reports-${timestamp}.zip`);
}

export default function ManagerPortalPage() {
  const router = useRouter();
  const [managerUsername, setManagerUsername] = useState("");
  const [rows, setRows] = useState<CreatorStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreatorKey, setSelectedCreatorKey] = useState("");
  const monthBounds = useMemo(() => getMonthBounds(), []);

  useEffect(() => {
    const loggedIn = localStorage.getItem("manager_logged_in");
    const user = localStorage.getItem("manager_username");

    if (loggedIn !== "true" || !user) {
      router.push("/manager");
      return;
    }

    setManagerUsername(user.toLowerCase().trim());
  }, [router]);

  useEffect(() => {
    async function fetchRows(table: "creator_daily_stats" | "aqua_daily_stats", startDate: string, endDate: string) {
      const allRows: CreatorStat[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await submissionsSupabase
          .from(table)
          .select("*")
          .gte("stat_date", startDate)
          .lte("stat_date", endDate)
          .order("stat_date", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        const batch = (data || []) as CreatorStat[];
        allRows.push(...batch);
        hasMore = batch.length === pageSize;
        from += pageSize;
      }

      return allRows;
    }

    async function loadData() {
      if (!managerUsername) return;
      setLoading(true);

      try {
        const legacyRows =
          monthBounds.previousStart <= "2026-06-18"
            ? await fetchRows("creator_daily_stats", monthBounds.previousStart, "2026-06-18")
            : [];
        const aquaRows =
          monthBounds.end >= "2026-06-19"
            ? await fetchRows("aqua_daily_stats", monthBounds.previousStart > "2026-06-19" ? monthBounds.previousStart : "2026-06-19", monthBounds.end)
            : [];
        const allRows = [...legacyRows, ...aquaRows].filter((row) =>
          isManagerMatch(`${getManagerRaw(row)} ${getManagerLabel(getManagerRaw(row))}`, managerUsername)
        );

        setRows(allRows);
      } catch (error) {
        console.error(error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [managerUsername, monthBounds]);

  const creators = useMemo(() => buildCreatorSummaries(rows), [rows]);
  const matureCreators = useMemo(() => creators.filter((creator) => !creator.isNewCreator), [creators]);
  const selectedCreator = creators.find((creator) => creator.key === selectedCreatorKey) || creators[0] || null;
  const weeklyComparison = useMemo(() => buildWeeklyComparison(creators, rows), [creators, rows]);
  const improvingCreators = weeklyComparison
    .filter((item) => item.change !== null && item.change > 10)
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0));
  const decliningCreators = weeklyComparison
    .filter((item) => item.change !== null && item.change < -10)
    .sort((a, b) => (a.change ?? 0) - (b.change ?? 0));
  const stableCreators = weeklyComparison
    .filter((item) => item.change !== null && item.change >= -10 && item.change <= 10)
    .sort((a, b) => (a.change ?? 0) - (b.change ?? 0));
  const [improvingPercent, decliningPercent, stablePercent] = getRoundedPercentages([
    improvingCreators.length,
    decliningCreators.length,
    stableCreators.length,
  ]);

  const totals = {
    totalCreators: creators.length,
    healthyCreators: matureCreators.filter((creator) => creator.healthStatus === "Healthy" || creator.healthStatus === "Elite").length,
    diamonds: creators.reduce((sum, creator) => sum + creator.diamonds, 0),
    hours: creators.reduce((sum, creator) => sum + creator.liveHours, 0),
    battles: creators.reduce((sum, creator) => sum + creator.matches, 0),
    followers: creators.reduce((sum, creator) => sum + creator.newFollowers, 0),
    averageHealth: matureCreators.length
      ? matureCreators.reduce((sum, creator) => sum + creator.healthScore, 0) / matureCreators.length
      : 0,
  };
  const highPotentialCreators = creators
    .filter((creator) => creator.isNewCreator && creator.diamonds >= 10000 && creator.liveHours >= 5)
    .sort((a, b) => b.diamonds - a.diamonds);
  const hiddenPotentialCreators = matureCreators
    .filter((creator) => creator.healthScore < 70 && creator.dph >= 1500)
    .sort((a, b) => b.dph - a.dph);
  const graduationCreators = creators
    .filter((creator) => creator.daysSinceJoining > 0 && creator.daysSinceJoining <= 60)
    .sort((a, b) => b.diamonds - a.diamonds);

  return (
    <section className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-300">Manager Portal</p>
            <h1 className="mt-2 text-4xl font-black uppercase text-white">
              {getManagerDisplayName(managerUsername)} Team Intelligence
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Team-only view from the Aqua daily upload for {monthBounds.label}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void downloadAllCreatorReports(creators, getManagerDisplayName(managerUsername))}
            className="rounded-xl border border-sky-300/30 bg-sky-400 px-4 py-3 text-sm font-black uppercase text-slate-950 hover:bg-sky-300"
          >
            Download All Creator Reports
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            Loading team intelligence...
          </div>
        ) : (
          <>
            <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Metric label="Total Creators" value={formatNumber(totals.totalCreators)} />
              <Metric label="Healthy Creators" value={formatNumber(totals.healthyCreators)} />
              <Metric label="Team Health" value={`${formatNumber(totals.averageHealth)}/100`} />
              <Metric label="Total Diamonds" value={formatNumber(totals.diamonds)} />
              <Metric label="Total Live Hours" value={formatHours(totals.hours)} />
              <Metric label="Total Battles" value={formatNumber(totals.battles)} />
              <Metric label="New Followers" value={formatNumber(totals.followers)} />
              <Metric label="Creators Declining" value={formatNumber(decliningCreators.length)} />
            </section>

            <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black uppercase text-sky-200">Manager Team Health</h2>
                  <p className="mt-1 text-sm text-slate-400">Only creators managed by this login.</p>
                </div>
                <span className="rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-sm font-black text-sky-200">
                  {formatNumber(totals.averageHealth)}/100
                </span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-sky-400" style={{ width: `${Math.min(Math.max(totals.averageHealth, 0), 100)}%` }} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                {(["Elite", "Healthy", "Needs Attention", "Low Performance", "Low Quality"] as HealthStatus[]).map((status) => (
                  <div key={status} className={`rounded-2xl border p-3 text-center font-black ${statusClasses(status)}`}>
                    <p>{formatNumber(matureCreators.filter((creator) => creator.healthStatus === status).length)}</p>
                    <p className="mt-1 text-[10px] uppercase">{status}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-2xl font-black uppercase text-sky-200">Manager Creator Movement</h2>
              <p className="mt-1 text-sm text-slate-400">Stable is within 10 health score points either way.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <MovementCard label="Improving" count={improvingCreators.length} percent={improvingPercent} tone="emerald" />
                <MovementCard label="Declining" count={decliningCreators.length} percent={decliningPercent} tone="red" />
                <MovementCard label="Stable" count={stableCreators.length} percent={stablePercent} tone="slate" />
              </div>
            </section>

            <section className="mb-6 grid gap-5 xl:grid-cols-3">
              <MovementList title="Improving" items={improvingCreators} tone="emerald" onSelect={setSelectedCreatorKey} />
              <MovementList title="Stable" items={stableCreators} tone="slate" onSelect={setSelectedCreatorKey} />
              <MovementList title="Declining" items={decliningCreators} tone="red" onSelect={setSelectedCreatorKey} />
            </section>

            <section className="mb-6 grid gap-5 xl:grid-cols-2">
              <CreatorPanel title="High Potential Creators" creators={highPotentialCreators} onSelect={setSelectedCreatorKey} />
              <CreatorPanel title="Hidden Potential" creators={hiddenPotentialCreators} onSelect={setSelectedCreatorKey} />
            </section>

            <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-2xl font-black uppercase text-sky-200">Graduation</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {graduationCreators.slice(0, 12).map((creator) => (
                  <button
                    key={`graduation-${creator.key}`}
                    type="button"
                    onClick={() => setSelectedCreatorKey(creator.key)}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left hover:border-sky-400"
                  >
                    <p className="font-black text-white">{creator.username}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatNumber(creator.diamonds)} diamonds / {formatNumber(creator.daysSinceJoining)} days
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {selectedCreator ? (
              <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-2xl font-black uppercase text-white">{selectedCreator.username}</h2>
                    <p className="mt-1 text-sm text-slate-400">{selectedCreator.managerLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => downloadCreatorReport(selectedCreator, "creator")}
                      className="rounded-xl border border-sky-300/30 bg-sky-400 px-3 py-2 text-xs font-black uppercase text-slate-950 hover:bg-sky-300"
                    >
                      Download Creator Report
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCreatorReport(selectedCreator, "internal")}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-black uppercase text-slate-200 hover:bg-slate-800"
                    >
                      Download Internal Data Report
                    </button>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <Metric label="Health" value={`${selectedCreator.healthScore}/100`} dark />
                  <Metric label="Diamonds" value={formatNumber(selectedCreator.diamonds)} dark />
                  <Metric label="Hours" value={formatHours(selectedCreator.liveHours)} dark />
                  <Metric label="DPH" value={formatNumber(selectedCreator.dph)} dark />
                </div>
                <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-slate-950 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Health</th>
                        <th className="p-3">Diamonds</th>
                        <th className="p-3">Hours</th>
                        <th className="p-3">Battles</th>
                        <th className="p-3">Followers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCreator.dailyPoints.slice(-14).map((point) => (
                        <tr key={point.date} className="border-t border-slate-800">
                          <td className="p-3">{point.date}</td>
                          <td className="p-3">{point.healthScore}/100</td>
                          <td className="p-3">{formatNumber(point.diamonds)}</td>
                          <td className="p-3">{formatHours(point.liveHours)}</td>
                          <td className="p-3">{formatNumber(point.matches)}</td>
                          <td className="p-3">{formatNumber(point.newFollowers)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${dark ? "border-slate-800 bg-slate-950" : "border-slate-800 bg-slate-900"}`}>
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function MovementCard({
  label,
  count,
  percent,
  tone,
}: {
  label: string;
  count: number;
  percent: number;
  tone: "emerald" | "red" | "slate";
}) {
  const classes =
    tone === "emerald"
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
      : tone === "red"
        ? "border-red-300/20 bg-red-400/10 text-red-200"
        : "border-slate-700 bg-slate-950 text-slate-200";

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-4xl font-black">{percent}%</p>
      <p className="mt-1 text-xs font-black uppercase">{label}</p>
      <p className="mt-2 text-sm">{formatNumber(count)} creators</p>
    </div>
  );
}

function MovementList({
  title,
  items,
  tone,
  onSelect,
}: {
  title: string;
  items: WeeklyComparison[];
  tone: "emerald" | "red" | "slate";
  onSelect: (key: string) => void;
}) {
  const headingClass = tone === "emerald" ? "text-emerald-300" : tone === "red" ? "text-red-300" : "text-slate-300";

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <h2 className={`text-xl font-black uppercase ${headingClass}`}>{title}</h2>
      <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <button
            key={`${title}-${item.creator.key}`}
            type="button"
            onClick={() => onSelect(item.creator.key)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 text-left hover:border-sky-400"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-white">{item.creator.username}</p>
                <p className="mt-1 text-xs text-slate-400">{item.creator.managerLabel}</p>
              </div>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-black text-slate-200">
                {item.change && item.change > 0 ? "+" : ""}
                {formatNumber(item.change ?? 0)}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {formatNumber(item.previousScore ?? 0)} to {formatNumber(item.creator.healthScore)} health score
            </p>
          </button>
        ))}
        {!items.length ? <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">None found.</p> : null}
      </div>
    </div>
  );
}

function CreatorPanel({
  title,
  creators,
  onSelect,
}: {
  title: string;
  creators: CreatorSummary[];
  onSelect: (key: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black uppercase text-sky-200">{title}</h2>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-black text-slate-300">
          {formatNumber(creators.length)}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {creators.slice(0, 10).map((creator) => (
          <button
            key={`${title}-${creator.key}`}
            type="button"
            onClick={() => onSelect(creator.key)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-left hover:border-sky-400"
          >
            <span>
              <span className="block font-black text-white">{creator.username}</span>
              <span className="block text-xs text-slate-400">{creator.healthScore}/100 health</span>
            </span>
            <span className="text-sm font-black text-sky-200">{formatNumber(creator.diamonds)}</span>
          </button>
        ))}
        {!creators.length ? <p className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-500">None found.</p> : null}
      </div>
    </div>
  );
}
