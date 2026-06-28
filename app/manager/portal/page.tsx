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
type GraduationTrackerStatus = "gold" | "green" | "amber" | "red";

type HealthBreakdown = {
  liveDays: number;
  liveHours: number;
  matches: number;
  dph: number;
};

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
  healthBreakdown: HealthBreakdown;
  healthScore: number;
  healthStatus: HealthStatus;
  monthlyHealthScore: number;
  monthlyHealthStatus: HealthStatus;
  monthlyHealthBreakdown: HealthBreakdown;
  creatorTags: string[];
  dailyPoints: CreatorDailyPoint[];
  graduationStatus: string;
  tierStatus: string;
};

type WeeklyComparison = {
  creator: CreatorSummary;
  previousScore: number | null;
  change: number | null;
};

type GraduationTrackerRow = {
  username: string;
  manager: string;
  daysSinceJoining: number;
  diamonds: number;
  remainingDiamonds: number;
  remainingDays: number;
  avgNeededPerDay: number;
  progressPercent: number;
  pacePercent: number;
  status: GraduationTrackerStatus;
  statusLabel: string;
};

const GRADUATION_TARGET = 100000;
const MINIMUM_TRACKER_DIAMONDS = 10000;

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

function getAgencyFromGroup(groupValue: string, fallback: string) {
  const clean = groupValue.toLowerCase();

  if (clean.includes("aqua")) return "Aqua";
  if (clean.includes("respawn")) return "Respawn";
  if (clean.includes("paradise")) return "Paradise";
  if (clean.includes("strive")) return "Strive";

  return fallback || "First Class";
}

function isAquaRow(row: CreatorStat) {
  const groupValue = getText(row, ["team", "group_name", "Group"], "");
  const agencyValue = getAgencyFromGroup(groupValue, getText(row, ["agency"], ""));
  return agencyValue === "Aqua";
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
    healthScore: getHealthBreakdown([row], [row.stat_date]).healthScore,
  };
}

function getHealthBreakdown(creatorRows: CreatorStat[], windowDates: string[], period: "weekly" | "monthly" = "weekly") {
  const rowsByDate = new Map(creatorRows.map((row) => [row.stat_date, row]));
  const currentDates = period === "monthly" ? windowDates : windowDates.slice(-7);
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
  const liveDaysScore =
    period === "monthly"
      ? capScore((liveAppearDays / 28) * 21 + (liveDays / 28) * 14, 35)
      : capScore(liveAppearDays * 3 + liveDays * 2, 35);
  const liveHoursScore =
    period === "monthly"
      ? totalHours >= 80
        ? 30
        : totalHours >= 60
          ? 22
          : totalHours >= 40
            ? 15
            : totalHours >= 20
              ? 8
              : 0
      : totalHours >= 20
        ? 30
        : totalHours >= 15
          ? 22
          : totalHours >= 10
            ? 15
            : totalHours >= 5
              ? 8
              : 0;
  const matchesScore = capScore(Math.floor(totalMatches / (period === "monthly" ? 28 : 7)), 10);
  const dphScore =
    dph >= 2500 ? 25 : dph >= 2000 ? 20 : dph >= 1500 ? 15 : dph >= 1000 ? 10 : dph >= 500 ? 5 : dph >= 100 ? 1 : 0;

  return {
    healthWindowDays: Math.max(currentDates.length, 1),
    liveAppearDays,
    oneHourDays: liveDays,
    healthWindowHours: totalHours,
    healthWindowMatches: totalMatches,
    healthBreakdown: {
      liveDays: liveDaysScore,
      liveHours: liveHoursScore,
      matches: matchesScore,
      dph: dphScore,
    },
    healthScore: Math.round(liveDaysScore + liveHoursScore + matchesScore + dphScore),
  };
}

function getHealthStatus(score: number, diamonds = 0): HealthStatus {
  if (score >= 85) return "Elite";
  if (score >= 70) return "Healthy";
  if (score >= 50) return "Needs Attention";
  if (diamonds >= 5000) return "Low Performance";
  return "Low Quality";
}

function getCreatorTags(creator: {
  isNewCreator: boolean;
  oneHourDays: number;
  healthWindowDays: number;
  healthWindowHours: number;
  healthWindowMatches: number;
  dph: number;
  diamonds: number;
  tierStatus: string;
  healthScore: number;
}) {
  const tags: string[] = [];

  if (creator.isNewCreator) tags.push("New Creator");
  if (creator.oneHourDays < creator.healthWindowDays) tags.push("Missed Live Days");
  if (creator.healthWindowHours < 10) tags.push("Low Hours");
  if (creator.healthWindowMatches < 28) tags.push("Low Battles");
  if (creator.dph < 1000) tags.push("Low DPH (diamonds per hour)");
  if (creator.healthScore >= 85) tags.push("Rising Star");
  if (/maintained|ranked up|tier/i.test(creator.tierStatus)) tags.push("Tier Performer");
  if (creator.healthScore < 40) tags.push("Needs Intervention");

  return tags;
}

function buildProfileInsights(creator: CreatorSummary, range: "week" | "month") {
  const insights: string[] = [];
  const points = range === "week" ? creator.dailyPoints.slice(-7) : creator.dailyPoints;
  const liveDays = points.filter((point) => point.liveHours >= 1).length;
  const diamonds = points.reduce((sum, point) => sum + point.diamonds, 0);
  const hours = points.reduce((sum, point) => sum + point.liveHours, 0);
  const battles = points.reduce((sum, point) => sum + point.matches, 0);
  const dph = hours > 0 ? diamonds / hours : 0;

  if (liveDays < (range === "week" ? 5 : 20)) insights.push(`Live consistency needs work: ${formatNumber(liveDays)} valid live days.`);
  if (hours < (range === "week" ? 20 : 80)) insights.push(`Live hours are below target at ${formatHours(hours)}.`);
  if (battles < (range === "week" ? 28 : 112)) insights.push(`Battle volume is low at ${formatNumber(battles)} battles.`);
  if (dph < 1000) insights.push(`DPH is low at ${formatNumber(dph)} diamonds per hour.`);
  if (!insights.length) insights.push("Performance is currently in a solid place. Keep protecting consistency.");

  return insights;
}

function statusClasses(status: HealthStatus) {
  if (status === "Elite") return "border-purple-200 bg-purple-50 text-purple-700";
  if (status === "Healthy") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Needs Attention") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "Low Performance") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function graduationStatusClasses(status: GraduationTrackerStatus) {
  if (status === "gold") return "border-yellow-200 bg-yellow-50 text-yellow-800";
  if (status === "green") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "amber") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function graduationProgressClasses(status: GraduationTrackerStatus) {
  if (status === "gold") return "bg-yellow-500";
  if (status === "green") return "bg-emerald-500";
  if (status === "amber") return "bg-orange-500";
  return "bg-red-500";
}

function cleanGraduationStatus(status: string) {
  return status
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");
}

function isGraduationEligibleStatus(status: string) {
  const cleanStatus = cleanGraduationStatus(status);

  if (!cleanStatus) return false;
  if (cleanStatus.includes("non new")) return false;
  if (cleanStatus.includes("quit")) return false;
  if (cleanStatus === "graduated") return false;
  if (cleanStatus.includes("graduated") && !cleanStatus.includes("not graduated")) return false;

  return (
    cleanStatus.includes("not graduated") ||
    cleanStatus.includes("non graduated") ||
    cleanStatus.includes("not reached")
  );
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
    lastDay: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
  };
}

function buildCreatorSummaries(rows: CreatorStat[], rollingRows: CreatorStat[] = rows) {
  const byCreator = new Map<string, CreatorStat[]>();
  const rollingByCreator = new Map<string, CreatorStat[]>();
  const windowDates = Array.from(new Set(rows.map((row) => row.stat_date)))
    .sort((a, b) => a.localeCompare(b))
    .slice(-7);

  for (const row of rows) {
    const username = getUsername(row).toLowerCase();
    if (!byCreator.has(username)) byCreator.set(username, []);
    byCreator.get(username)?.push(row);
  }

  for (const row of rollingRows) {
    const username = getUsername(row).toLowerCase();
    if (!rollingByCreator.has(username)) rollingByCreator.set(username, []);
    rollingByCreator.get(username)?.push(row);
  }

  return Array.from(byCreator.entries())
    .map(([key, creatorRows]) => {
      const sortedRows = [...creatorRows].sort((a, b) => a.stat_date.localeCompare(b.stat_date));
      const rollingCreatorRows = [...(rollingByCreator.get(key) || creatorRows)].sort((a, b) =>
        a.stat_date.localeCompare(b.stat_date)
      );
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
      const health = getHealthBreakdown(creatorRows, windowDates);
      const rollingDates = Array.from(new Set(rollingCreatorRows.map((row) => row.stat_date)))
        .sort((a, b) => a.localeCompare(b))
        .slice(-30);
      const monthlyHealth = getHealthBreakdown(rollingCreatorRows, rollingDates, "monthly");
      const dailyPoints = sortedRows.map(getDailyPoint);
      const tierStatus = getText(latest, ["tier_status", "Tier status"], "Unknown");
      const base = {
        isNewCreator: daysSinceJoining > 0 && daysSinceJoining <= 14,
        oneHourDays: health.oneHourDays,
        healthWindowDays: health.healthWindowDays,
        healthWindowHours: health.healthWindowHours,
        healthWindowMatches: health.healthWindowMatches,
        dph: liveHours > 0 ? diamonds / liveHours : 0,
        diamonds,
        tierStatus,
        healthScore: health.healthScore,
      };

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
        healthBreakdown: health.healthBreakdown,
        healthScore: health.healthScore,
        healthStatus: getHealthStatus(health.healthScore, diamonds),
        monthlyHealthScore: monthlyHealth.healthScore,
        monthlyHealthStatus: getHealthStatus(monthlyHealth.healthScore, diamonds),
        monthlyHealthBreakdown: monthlyHealth.healthBreakdown,
        creatorTags: getCreatorTags(base),
        dailyPoints,
        graduationStatus: getText(latest, ["graduation_status", "Graduation status"], "Unknown"),
        tierStatus,
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
        const allRows = [...legacyRows, ...aquaRows]
          .filter(isAquaRow)
          .filter((row) =>
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

  const dateRangeRows = useMemo(
    () => rows.filter((row) => row.stat_date.startsWith(`${monthBounds.month}-`)),
    [monthBounds.month, rows]
  );
  const latestPortalDate = useMemo(() => {
    const dates = dateRangeRows.map((row) => row.stat_date).sort((a, b) => a.localeCompare(b));
    return dates[dates.length - 1] || "";
  }, [dateRangeRows]);
  const activePortalCreatorKeys = useMemo(() => {
    const latestRows = latestPortalDate
      ? dateRangeRows.filter((row) => row.stat_date === latestPortalDate)
      : dateRangeRows;

    return new Set(latestRows.map((row) => getUsername(row).toLowerCase()));
  }, [dateRangeRows, latestPortalDate]);
  const creators = useMemo(
    () => buildCreatorSummaries(dateRangeRows, rows).filter((creator) => activePortalCreatorKeys.has(creator.key)),
    [activePortalCreatorKeys, dateRangeRows, rows]
  );
  const matureCreators = useMemo(() => creators.filter((creator) => !creator.isNewCreator), [creators]);
  const selectedCreator = creators.find((creator) => creator.key === selectedCreatorKey) || creators[0] || null;
  const weeklyComparison = useMemo(() => buildWeeklyComparison(creators, dateRangeRows), [creators, dateRangeRows]);
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
  const newCreators = creators
    .filter((creator) => creator.isNewCreator)
    .sort((a, b) => b.diamonds - a.diamonds);
  const hiddenPotentialCreators = newCreators.filter(
    (creator) =>
      creator.diamonds / Math.max(creator.daysSinceJoining || 1, 1) >= 1200 ||
      creator.dph >= 1000 ||
      creator.healthScore >= 70
  );
  const highPotentialCreators = hiddenPotentialCreators;
  const latestGraduationUploadDay = useMemo(() => {
    const uploadedDays = dateRangeRows
      .filter(
        (row) =>
          getNumber(row, ["diamonds", "Diamonds"]) > 0 ||
          getDurationHours(row, ["live_hours", "LIVE duration", "live_duration"]) > 0 ||
          getNumber(row, ["matches", "Matches"]) > 0
      )
      .map((row) => Number(row.stat_date.split("-")[2] || 0))
      .filter((day) => day > 0);

    return uploadedDays.length ? Math.min(Math.max(...uploadedDays), monthBounds.lastDay) : monthBounds.lastDay;
  }, [dateRangeRows, monthBounds.lastDay]);
  const graduationTrackerRows = useMemo<GraduationTrackerRow[]>(() => {
    const currentMonthDay = Math.min(latestGraduationUploadDay, monthBounds.lastDay);
    const targetToDate = (GRADUATION_TARGET / monthBounds.lastDay) * currentMonthDay;
    const remainingDays = Math.max(monthBounds.lastDay - currentMonthDay, 0);

    return creators
      .filter(
        (creator) =>
          creator.diamonds >= MINIMUM_TRACKER_DIAMONDS &&
          isGraduationEligibleStatus(creator.graduationStatus)
      )
      .map((creator) => {
        const remainingDiamonds = Math.max(GRADUATION_TARGET - creator.diamonds, 0);
        const avgNeededPerDay = remainingDays > 0 ? remainingDiamonds / remainingDays : remainingDiamonds;
        const progressPercent = Math.min((creator.diamonds / GRADUATION_TARGET) * 100, 100);
        const pacePercent = targetToDate > 0 ? (creator.diamonds / targetToDate) * 100 : 0;
        let status: GraduationTrackerStatus = "red";
        let statusLabel = "Far Behind";

        if (creator.diamonds >= GRADUATION_TARGET) {
          status = "gold";
          statusLabel = "Graduated";
        } else if (pacePercent >= 100) {
          status = "green";
          statusLabel = "On Target";
        } else if (pacePercent >= 75) {
          status = "amber";
          statusLabel = "Slightly Behind";
        }

        return {
          username: creator.username,
          manager: creator.managerLabel,
          daysSinceJoining: creator.daysSinceJoining,
          diamonds: creator.diamonds,
          remainingDiamonds,
          remainingDays,
          avgNeededPerDay,
          progressPercent,
          pacePercent,
          status,
          statusLabel,
        };
      })
      .sort((a, b) => {
        if (a.status !== b.status) {
          const order: Record<GraduationTrackerStatus, number> = {
            gold: 0,
            green: 1,
            amber: 2,
            red: 3,
          };
          return order[a.status] - order[b.status];
        }

        return b.progressPercent - a.progressPercent;
      });
  }, [creators, latestGraduationUploadDay, monthBounds.lastDay]);
  const [profileRange, setProfileRange] = useState<"week" | "month">("week");
  const selectedProfilePoints = selectedCreator
    ? profileRange === "week"
      ? selectedCreator.dailyPoints.slice(-7)
      : selectedCreator.dailyPoints
    : [];
  const selectedProfileStats =
    selectedCreator && selectedProfilePoints.length
      ? {
          diamonds:
            profileRange === "week"
              ? selectedProfilePoints.reduce((sum, point) => sum + point.diamonds, 0)
              : selectedCreator.diamonds,
          liveHours:
            profileRange === "week"
              ? selectedProfilePoints.reduce((sum, point) => sum + point.liveHours, 0)
              : selectedCreator.liveHours,
          validDays:
            profileRange === "week"
              ? selectedProfilePoints.reduce((sum, point) => sum + point.validDays, 0)
              : selectedCreator.validDays,
          liveStreams: selectedCreator.liveStreams,
          matches:
            profileRange === "week"
              ? selectedProfilePoints.reduce((sum, point) => sum + point.matches, 0)
              : selectedCreator.matches,
          newFollowers:
            profileRange === "week"
              ? selectedProfilePoints.reduce((sum, point) => sum + point.newFollowers, 0)
              : selectedCreator.newFollowers,
          dph:
            (profileRange === "week"
              ? selectedProfilePoints.reduce((sum, point) => sum + point.liveHours, 0)
              : selectedCreator.liveHours) > 0
              ? (profileRange === "week"
                  ? selectedProfilePoints.reduce((sum, point) => sum + point.diamonds, 0)
                  : selectedCreator.diamonds) /
                (profileRange === "week"
                  ? selectedProfilePoints.reduce((sum, point) => sum + point.liveHours, 0)
                  : selectedCreator.liveHours)
              : 0,
        }
      : null;
  const selectedInsights = selectedCreator ? buildProfileInsights(selectedCreator, profileRange) : [];

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
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase text-sky-200">Aqua Graduation Tracker</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Tracks eligible team creators towards {formatNumber(GRADUATION_TARGET)} diamonds.
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm font-bold text-sky-200">
                  Target pace day {latestGraduationUploadDay}:{" "}
                  {formatNumber((GRADUATION_TARGET / monthBounds.lastDay) * Math.min(latestGraduationUploadDay, monthBounds.lastDay))}
                </div>
              </div>

              <div className="mb-4 grid gap-4 md:grid-cols-4">
                <Metric label="Tracker Creators" value={formatNumber(graduationTrackerRows.length)} dark />
                <Metric
                  label="Graduated"
                  value={formatNumber(graduationTrackerRows.filter((creator) => creator.status === "gold").length)}
                  dark
                />
                <Metric
                  label="On Target"
                  value={formatNumber(graduationTrackerRows.filter((creator) => creator.status === "green").length)}
                  dark
                />
                <Metric label="Minimum Entry" value={formatNumber(MINIMUM_TRACKER_DIAMONDS)} dark />
              </div>

              <div className="max-h-[620px] overflow-auto rounded-2xl border border-slate-800">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-950 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="p-3">Creator</th>
                      <th className="p-3">Manager</th>
                      <th className="p-3">Days Joined</th>
                      <th className="p-3">Diamonds</th>
                      <th className="p-3">Progress</th>
                      <th className="p-3">Pace</th>
                      <th className="p-3">Needed</th>
                      <th className="p-3">Days Left</th>
                      <th className="p-3">Avg Needed / Day</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graduationTrackerRows.map((creator) => (
                      <tr key={`graduation-${creator.username}`} className="border-t border-slate-800">
                        <td className="p-3 font-black text-white">{creator.username}</td>
                        <td className="p-3 text-slate-400">{creator.manager}</td>
                        <td className="p-3">{formatNumber(creator.daysSinceJoining)}</td>
                        <td className="p-3 font-bold text-sky-200">{formatNumber(creator.diamonds)}</td>
                        <td className="p-3">
                          <div className="h-3 w-36 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full ${graduationProgressClasses(creator.status)}`}
                              style={{ width: `${creator.progressPercent}%` }}
                            />
                          </div>
                          <span className="mt-1 block text-xs text-slate-400">
                            {creator.progressPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3">{creator.pacePercent.toFixed(1)}%</td>
                        <td className="p-3">{formatNumber(creator.remainingDiamonds)}</td>
                        <td className="p-3">{formatNumber(creator.remainingDays)}</td>
                        <td className="p-3 font-bold text-slate-200">{formatNumber(creator.avgNeededPerDay)}</td>
                        <td className="p-3">
                          <span className={`rounded-full border px-3 py-1 text-xs font-black ${graduationStatusClasses(creator.status)}`}>
                            {creator.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!graduationTrackerRows.length ? (
                      <tr>
                        <td className="p-4 text-slate-500" colSpan={10}>
                          No eligible Aqua graduation creators found for this team.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedCreator ? (
              <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase text-sky-300">Selected Creator Profile</p>
                    <h2 className="mt-1 text-3xl font-black text-white md:text-5xl">{selectedCreator.username}</h2>
                    <p className="mt-2 text-sm text-slate-400">{selectedCreator.managerLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${statusClasses(selectedCreator.healthStatus)}`}>
                      Weekly performance {selectedCreator.healthScore}/100 {selectedCreator.healthStatus}
                    </span>
                    <span className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${statusClasses(selectedCreator.monthlyHealthStatus)}`}>
                      30-day performance {selectedCreator.monthlyHealthScore}/100 {selectedCreator.monthlyHealthStatus}
                    </span>
                  </div>
                </div>

                <div className="mb-5 flex flex-wrap gap-3">
                  <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-1">
                    {(["week", "month"] as const).map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setProfileRange(range)}
                        className={`rounded-lg px-4 py-2 text-sm font-black capitalize ${
                          profileRange === range
                            ? "bg-sky-500 text-slate-950"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadCreatorReport(selectedCreator, "creator")}
                    className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200 hover:bg-emerald-400/20"
                  >
                    Download Creator Report
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCreatorReport(selectedCreator, "internal")}
                    className="rounded-xl border border-sky-300/30 bg-sky-400/10 px-4 py-3 text-sm font-black text-sky-200 hover:bg-sky-400/20"
                  >
                    Download Internal Data Report
                  </button>
                </div>

                {selectedProfileStats ? (
                  <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                    <Metric label="Diamonds" value={formatNumber(selectedProfileStats.diamonds)} dark />
                    <Metric label="Live Hours" value={formatHours(selectedProfileStats.liveHours)} dark />
                    <Metric label="Valid Days" value={formatNumber(selectedProfileStats.validDays)} dark />
                    <Metric label="Live Streams" value={formatNumber(selectedProfileStats.liveStreams)} dark />
                    <Metric label="Battles" value={formatNumber(selectedProfileStats.matches)} dark />
                    <Metric label="New Followers" value={formatNumber(selectedProfileStats.newFollowers)} dark />
                    <Metric label="DPH" value={formatNumber(selectedProfileStats.dph)} dark />
                    <Metric label="Graduation" value={selectedCreator.graduationStatus} dark />
                    <Metric label="Tier" value={selectedCreator.tierStatus} dark />
                  </div>
                ) : null}

                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <h3 className="text-xl font-black uppercase text-sky-200">Health Score Breakdown</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <Metric label="Live Day Validation" value={`${Math.round(selectedCreator.healthBreakdown.liveDays)}/35`} dark />
                    <Metric label="Live Hours" value={`${Math.round(selectedCreator.healthBreakdown.liveHours)}/30`} dark />
                    <Metric label="Battles" value={`${Math.round(selectedCreator.healthBreakdown.matches)}/10`} dark />
                    <Metric label="DPH" value={`${Math.round(selectedCreator.healthBreakdown.dph)}/25`} dark />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedCreator.creatorTags.map((tag) => (
                      <span key={tag} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <h3 className="text-xl font-black uppercase text-sky-200">Creator Insights</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {selectedInsights.map((insight) => (
                      <div key={insight} className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
                        {insight}
                      </div>
                    ))}
                  </div>
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
