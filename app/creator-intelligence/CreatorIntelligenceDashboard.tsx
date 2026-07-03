"use client";

import Link from "next/link";
import Image from "next/image";
import { saveAs } from "file-saver";
import { toBlob } from "html-to-image";
import JSZip from "jszip";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";

type CreatorStat = {
  [key: string]: unknown;
  stat_date: string;
  data_period?: string | null;
  creator_id?: string | null;
  creator_username?: string | null;
  "Creator's username"?: string | null;
  email?: string | null;
  group_name?: string | null;
  agency?: string | null;
  team?: string | null;
  manager_email?: string | null;
  creator_network_manager?: string | null;
  "Creator Network manager"?: string | null;
  join_time?: string | null;
  days_since_joining?: number | null;
  diamonds?: number | null;
  live_duration?: string | null;
  live_hours?: number | null;
  valid_live_days?: number | null;
  valid_days?: number | null;
  new_followers?: number | null;
  followers?: number | null;
  live_streams?: number | null;
  diamonds_last_month?: number | null;
  live_hours_last_month?: number | null;
  live_duration_last_month?: number | null;
  valid_days_last_month?: number | null;
  followers_last_month?: number | null;
  new_followers_last_month?: number | null;
  live_streams_last_month?: number | null;
  diamonds_vs_last_month?: number | null;
  live_hours_vs_last_month?: number | null;
  valid_days_vs_last_month?: number | null;
  followers_vs_last_month?: number | null;
  live_streams_vs_last_month?: number | null;
  matches?: number | null;
  diamonds_from_matches?: number | null;
  diamonds_from_multiguest?: number | null;
  diamonds_from_multiguest_host?: number | null;
  diamonds_from_multiguest_guest?: number | null;
  graduation_status?: string | null;
  tier_status?: string | null;
  status?: string | null;
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

type ChartMetricKey = "diamonds" | "liveHours" | "validDays" | "matches" | "newFollowers" | "dph" | "healthScore";

type CreatorSummary = {
  key: string;
  id: string;
  username: string;
  email: string;
  group: string;
  agency: string;
  managerRaw: string;
  managerLabel: string;
  graduationStatus: string;
  tierStatus: string;
  sourceStatus: string;
  diamonds: number;
  liveHours: number;
  validDays: number;
  liveStreams: number;
  matches: number;
  newFollowers: number;
  daysSinceJoining: number;
  diamondsLastMonth: number;
  liveHoursLastMonth: number;
  validDaysLastMonth: number;
  followersLastMonth: number;
  liveStreamsLastMonth: number;
  diamondsFromMatches: number;
  diamondsFromMultiguest: number;
  diamondsFromMultiguestHost: number;
  diamondsFromMultiguestGuest: number;
  diamondsChange: number;
  liveHoursChange: number;
  validDaysChange: number;
  followersChange: number;
  liveStreamsChange: number;
  dph: number;
  dailyAverageDiamonds: number;
  isNewCreator: boolean;
  healthWindowDays: number;
  liveAppearDays: number;
  oneHourDays: number;
  twoHourDays: number;
  healthWindowHours: number;
  healthWindowMatches: number;
  healthWindowFollowers: number;
  creatorTags: string[];
  healthBreakdown: HealthBreakdown;
  healthScore: number;
  healthStatus: HealthStatus;
  monthlyHealthScore: number;
  monthlyHealthStatus: HealthStatus;
  monthlyHealthBreakdown: HealthBreakdown;
  dailyPoints: CreatorDailyPoint[];
  latestDate: string;
};

type AgencyHealthTrendPoint = {
  date: string;
  score: number;
  creators: number;
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

type WeeklyHealthComparison = {
  creator: CreatorSummary;
  previousScore: number | null;
  change: number | null;
};

type ManagerHealthSummary = {
  manager: string;
  creators: CreatorSummary[];
  totalCreators: number;
  matureCreators: number;
  newCreators: number;
  averageScore: number;
  thirtyDayAverageScore: number;
  elite: number;
  healthy: number;
  needsAttention: number;
  lowPerformance: number;
  lowQuality: number;
};

type ManagerHealthTrendPoint = {
  date: string;
  score: number;
};

const GRADUATION_TARGET = 200000;
const MINIMUM_TRACKER_DIAMONDS = 1000;
const MANUAL_FOCUS_STORAGE_KEY = "creator-intelligence-manual-focus";
const DATA_START_DATE = "2026-01-01";
const AQUA_TABLE_START_DATE = "2026-06-19";
const LEGACY_TABLE_END_DATE = "2026-06-18";
const OPEN_ENDED_DATA_DATE = "2099-12-31";
const CHART_METRICS: {
  key: ChartMetricKey;
  label: string;
  color: string;
  format: (value: number) => string;
}[] = [
  { key: "diamonds", label: "Diamonds", color: "#0284c7", format: formatNumber },
  { key: "liveHours", label: "Live Hours", color: "#059669", format: formatHours },
  { key: "validDays", label: "Valid Days", color: "#7c3aed", format: formatNumber },
  { key: "matches", label: "Battles", color: "#ea580c", format: formatNumber },
  { key: "newFollowers", label: "Followers", color: "#db2777", format: formatNumber },
  { key: "dph", label: "DPH (diamonds per hour)", color: "#0f766e", format: formatNumber },
  { key: "healthScore", label: "Health Score", color: "#4f46e5", format: formatNumber },
];

const MANAGER_LABELS: Record<string, string> = {
  "james_aquaagency@outlook.com": "James",
  "alfie_aquaagency@outlook.com": "Alfie",
  "ellie_aquaagency@outlook.com": "Ellie",
  "harryj_aquaagency@outlook.com": "Harry",
  "teamkieran@example.com": "Team Kieran",
};

const MANAGER_SEARCH_MAP: Record<string, string[]> = {
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
  millie: ["millie"],
  jade: ["jade", "jade1"],
  teddie1: ["teddie", "teddie1"],
  teddie: ["teddie", "teddie1"],
  ellie1: ["ellie1", "ellie b", "leb"],
  chris: ["matt", "chris"],
  luke: ["luke_agency", "luke agency", "luke"],
};

const MANAGER_DISPLAY_MAP: Record<string, string> = {
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
  return value.toFixed(1);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
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

function getChangePercent(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
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

function getText(row: CreatorStat, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = cleanText(row[key]);
    if (value) return value;
  }

  return fallback;
}

function getNumber(row: CreatorStat, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && cleanText(value) !== "") {
      return safeNumber(value);
    }
  }

  return 0;
}

function getDurationHours(row: CreatorStat, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && cleanText(value) !== "") {
      return durationToHours(value);
    }
  }

  return 0;
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

function getManagerRaw(row: CreatorStat) {
  return getText(row, [
    "manager_email",
    "creator_network_manager",
    "Creator Network manager",
    "email",
  ]);
}

function titleCaseName(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getManagerLabel(value: string, groupValue = "") {
  const clean = value
    .replace(/\[|\]/g, "")
    .replace(/\(mailto:|\)/g, "")
    .trim()
    .toLowerCase();

  if (MANAGER_LABELS[clean] || MANAGER_LABELS[value.toLowerCase()]) {
    return `Team ${MANAGER_LABELS[clean] || MANAGER_LABELS[value.toLowerCase()]}`;
  }

  if (clean.includes("@")) {
    const localPart = clean.split("@")[0];
    const namePart = localPart
      .replace(/_?(aqua|respawn|paradise|strive)?agency$/i, "")
      .replace(/respawn\d*$/i, "")
      .replace(/jb$/i, "");
    return `Team ${titleCaseName(namePart)}`;
  }

  if (clean) return `Team ${titleCaseName(clean)}`;
  if (groupValue.toLowerCase().startsWith("team ")) return groupValue;
  return "Unassigned";
}

function getPlainManagerName(managerLabel: string) {
  return managerLabel.replace(/^Team\s+/i, "");
}

function getManagerDisplayName(value: string) {
  return MANAGER_DISPLAY_MAP[value] || titleCaseName(value);
}

function isManagerMatch(managerField: string, managerUsername: string) {
  const normalizedUsername = managerUsername.toLowerCase().trim();
  const field = managerField.toLowerCase();
  const keys = MANAGER_SEARCH_MAP[normalizedUsername] || [normalizedUsername];
  return keys.some((key) => field.includes(key.toLowerCase()));
}

function isTeamHealthScoreCreator(creator: Pick<CreatorSummary, "daysSinceJoining">) {
  return creator.daysSinceJoining > 3;
}

function getCreatorMetaLine(creator: Pick<CreatorSummary, "agency" | "group" | "managerLabel">) {
  const managerName = getPlainManagerName(creator.managerLabel);
  const cleanGroup = creator.group.replace(/^Unassigned\s+/i, "").trim();

  if (creator.managerLabel === "Unassigned") return `${creator.agency} / Unassigned`;
  if (cleanGroup && cleanGroup.toLowerCase() !== managerName.toLowerCase()) {
    return `${creator.agency} / ${managerName}`;
  }

  return `${creator.agency} / ${managerName}`;
}

function getUsername(row: CreatorStat) {
  return getText(row, ["creator_username", "Creator's username", "creator_id", "Creator ID"], "Unknown");
}

function capScore(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function getHealthBreakdown(
  creatorRows: CreatorStat[],
  windowDates: string[],
  period: "weekly" | "monthly" = "weekly"
) {
  const rowsByDate = new Map(creatorRows.map((row) => [row.stat_date, row]));
  const currentDates = period === "monthly" ? windowDates : windowDates.slice(-7);
  const windowDays = Math.max(currentDates.length, 1);
  let liveAppearDays = 0;
  let liveDays = 0;
  let totalHours = 0;
  let totalMatches = 0;
  let totalFollowers = 0;
  let totalDiamonds = 0;

  for (const date of currentDates) {
    const row = rowsByDate.get(date);
    const hours = row ? getDurationHours(row, ["live_hours", "LIVE duration"]) : 0;
    const matches = row ? getNumber(row, ["matches", "Matches"]) : 0;
    const followers = row ? getNumber(row, ["new_followers", "New followers", "followers"]) : 0;
    const diamonds = row ? getNumber(row, ["diamonds", "Diamonds"]) : 0;

    if (hours > 0) liveAppearDays += 1;
    if (hours >= 1) liveDays += 1;

    totalHours += hours;
    totalMatches += matches;
    totalFollowers += followers;
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
    healthWindowDays: windowDays,
    liveAppearDays,
    oneHourDays: liveDays,
    twoHourDays: currentDates.filter((date) => {
      const row = rowsByDate.get(date);
      return row ? getDurationHours(row, ["live_hours", "LIVE duration"]) >= 2 : false;
    }).length,
    healthWindowHours: totalHours,
    healthWindowMatches: totalMatches,
    healthWindowFollowers: totalFollowers,
    healthBreakdown: {
      liveDays: liveDaysScore,
      liveHours: liveHoursScore,
      matches: matchesScore,
      dph: dphScore,
    },
    healthScore: Math.round(
      liveDaysScore + liveHoursScore + matchesScore + dphScore
    ),
  };
}

function getDailyPoint(row: CreatorStat): CreatorDailyPoint {
  const liveHours = getDurationHours(row, ["live_hours", "LIVE duration"]);
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
function getLastSevenPoints(creator: CreatorSummary) {
  return creator.dailyPoints.slice(-7);
}

function getLastSevenDiamonds(creator: CreatorSummary) {
  return getLastSevenPoints(creator).reduce((sum, point) => sum + point.diamonds, 0);
}

function getLastSevenHours(creator: CreatorSummary) {
  return getLastSevenPoints(creator).reduce((sum, point) => sum + point.liveHours, 0);
}

function getLastSevenMatches(creator: CreatorSummary) {
  return getLastSevenPoints(creator).reduce((sum, point) => sum + point.matches, 0);
}

function getLastSevenDph(creator: CreatorSummary) {
  const hours = getLastSevenHours(creator);
  return hours > 0 ? getLastSevenDiamonds(creator) / hours : 0;
}

function addDays(dateValue: string, offset: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatShortDate(dateValue: string) {
  const [, monthValue, dayValue] = dateValue.split("-");
  return `${dayValue}/${monthValue}`;
}

function getFocusDailyStatus(creator: CreatorSummary, latestDate: string) {
  const endDate = latestDate || creator.latestDate;
  const pointsByDate = new Map(creator.dailyPoints.map((point) => [point.date, point]));

  return [-2, -1, 0].map((offset) => {
    const date = addDays(endDate, offset);
    const point = pointsByDate.get(date);
    const liveHours = point?.liveHours ?? 0;
    const missed = !point || liveHours < 1;

    return {
      date,
      liveHours,
      missed,
      label: !point ? "Missed" : liveHours < 1 ? "Under 1h" : "On",
    };
  });
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

function getCreatorTags(creator: {
  healthWindowDays: number;
  oneHourDays: number;
  healthWindowHours: number;
  healthWindowMatches: number;
  dph: number;
  diamondsChange: number;
  followersChange: number;
  diamonds: number;
  tierStatus: string;
  healthScore: number;
  isNewCreator: boolean;
}) {
  const tags: string[] = [];

  if (creator.isNewCreator) tags.push("New Creator");
  if (creator.oneHourDays < creator.healthWindowDays) tags.push("Missed Live Days");
  if (creator.healthWindowHours < 10) tags.push("Low Hours");
  if (creator.healthWindowMatches < 28) tags.push("Low Battles");
  if (creator.dph < 1000) tags.push("Low DPH (diamonds per hour)");
  if (creator.diamondsChange < -10) tags.push("Declining Diamonds");
  if (creator.followersChange < -10) tags.push("Declining Followers");
  if (creator.healthScore >= 85 || (creator.diamondsChange >= 20 && creator.followersChange >= 20)) {
    tags.push("Rising Star");
  }
  if (/maintained|ranked up|tier/i.test(creator.tierStatus)) tags.push("Tier Performer");
  if (creator.healthScore < 40) tags.push("Needs Intervention");

  return tags;
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
      const groupValue = getText(latest, ["team", "group_name", "Group"], "Unassigned");
      const agencyValue = getAgencyFromGroup(groupValue, getText(latest, ["agency"], "First Class"));
      const validDaysFromRows = creatorRows.filter((row) => getDurationHours(row, ["live_hours", "LIVE duration"]) >= 1).length;
      const managerRaw = getManagerRaw(latest);
      const diamonds = creatorRows.reduce((sum, row) => sum + getNumber(row, ["diamonds", "Diamonds"]), 0);
      const liveHours = creatorRows.reduce(
        (sum, row) => sum + getDurationHours(row, ["live_hours", "LIVE duration"]),
        0
      );
      const validDays = validDaysFromRows;
      const liveStreams = creatorRows.reduce((sum, row) => sum + getNumber(row, ["live_streams", "LIVE streams"]), 0);
      const newFollowers =
        creatorRows.reduce((sum, row) => sum + getNumber(row, ["new_followers", "New followers"]), 0) ||
        Math.max(...creatorRows.map((row) => getNumber(row, ["followers"])), 0);
      const diamondsLastMonth = getNumber(latest, ["diamonds_last_month", "Diamonds last month"]);
      const liveHoursLastMonth =
        getDurationHours(latest, ["live_hours_last_month", "live_duration_last_month", "LIVE duration (hours) last month"]) ||
        getNumber(latest, ["LIVE duration last month"]);
      const validDaysLastMonth = getNumber(latest, ["valid_days_last_month", "Valid go LIVE days last month"]);
      const followersLastMonth = getNumber(latest, [
        "new_followers_last_month",
        "followers_last_month",
        "New followers last month",
      ]);
      const liveStreamsLastMonth = getNumber(latest, ["live_streams_last_month", "LIVE streams last month"]);
      const diamondsChange =
        getNumber(latest, ["diamonds_vs_last_month", "Diamonds - vs. last month"]) ||
        getChangePercent(diamonds, diamondsLastMonth);
      const liveHoursChange =
        getNumber(latest, ["live_hours_vs_last_month", "LIVE duration - vs. last month"]) ||
        getChangePercent(liveHours, liveHoursLastMonth);
      const validDaysChange =
        getNumber(latest, ["valid_days_vs_last_month", "Valid go LIVE days - vs. last month"]) ||
        getChangePercent(validDays, validDaysLastMonth);
      const followersChange =
        getNumber(latest, ["followers_vs_last_month", "New followers - vs. last month"]) ||
        getChangePercent(newFollowers, followersLastMonth);
      const liveStreamsChange =
        getNumber(latest, ["live_streams_vs_last_month", "LIVE streams - vs. last month"]) ||
        getChangePercent(liveStreams, liveStreamsLastMonth);
      const health = getHealthBreakdown(creatorRows, windowDates);
      const daysSinceJoining = Math.max(
        ...creatorRows.map((row) => getNumber(row, ["days_since_joining", "Days since joining"])),
        0
      );
      const activeDataDays = Math.max(
        creatorRows.filter(
          (row) =>
            getDurationHours(row, ["live_hours", "LIVE duration"]) > 0 ||
            getNumber(row, ["diamonds", "Diamonds"]) > 0
        ).length,
        1
      );
      const monthlyHealth = getHealthBreakdown(
        rollingCreatorRows,
        Array.from(new Set(rollingCreatorRows.map((row) => row.stat_date)))
          .sort((a, b) => a.localeCompare(b))
          .slice(-30),
        "monthly"
      );
      const dailyPoints = rollingCreatorRows.slice(-30).map(getDailyPoint);
      const base = {
        key,
        id: getText(latest, ["creator_id", "Creator ID"], key),
        username: getUsername(latest),
        email: getText(latest, ["creator_email", "Creator email"], "No email"),
        group: groupValue,
        agency: agencyValue,
        managerRaw,
        managerLabel: getManagerLabel(managerRaw, groupValue),
        graduationStatus: getText(latest, ["graduation_status", "Graduation status"], "Unknown"),
        tierStatus: getText(latest, ["tier_status", "Tier status"], "Unknown"),
        sourceStatus: getText(latest, ["status", "Status"], ""),
        diamonds,
        liveHours,
        validDays,
        liveStreams,
        matches: creatorRows.reduce((sum, row) => sum + getNumber(row, ["matches", "Matches"]), 0),
        newFollowers,
        daysSinceJoining,
        diamondsLastMonth,
        liveHoursLastMonth,
        validDaysLastMonth,
        followersLastMonth,
        liveStreamsLastMonth,
        diamondsFromMatches: creatorRows.reduce(
          (sum, row) => sum + getNumber(row, ["diamonds_from_matches", "Diamonds from matches"]),
          0
        ),
        diamondsFromMultiguest: creatorRows.reduce(
          (sum, row) => sum + getNumber(row, ["diamonds_from_multiguest", "Diamonds from multi-guest"]),
          0
        ),
        diamondsFromMultiguestHost: creatorRows.reduce(
          (sum, row) =>
            sum + getNumber(row, ["diamonds_from_multiguest_host", "Diamonds from multi-guest (as host)"]),
          0
        ),
        diamondsFromMultiguestGuest: creatorRows.reduce(
          (sum, row) =>
            sum + getNumber(row, ["diamonds_from_multiguest_guest", "Diamonds from multi-guest (as guest)"]),
          0
        ),
        diamondsChange,
        liveHoursChange,
        validDaysChange,
        followersChange,
        liveStreamsChange,
        dph: 0,
        dailyAverageDiamonds: diamonds / activeDataDays,
        isNewCreator: daysSinceJoining > 0 && daysSinceJoining <= 14,
        healthWindowDays: health.healthWindowDays,
        liveAppearDays: health.liveAppearDays,
        oneHourDays: health.oneHourDays,
        twoHourDays: health.twoHourDays,
        healthWindowHours: health.healthWindowHours,
        healthWindowMatches: health.healthWindowMatches,
        healthWindowFollowers: health.healthWindowFollowers,
        healthBreakdown: health.healthBreakdown,
        monthlyHealthScore: monthlyHealth.healthScore,
        monthlyHealthStatus: getHealthStatus(monthlyHealth.healthScore, diamonds),
        monthlyHealthBreakdown: monthlyHealth.healthBreakdown,
        dailyPoints,
        latestDate: latest.stat_date,
      };

      base.dph = base.liveHours > 0 ? base.diamonds / base.liveHours : 0;
      const healthScore = health.healthScore;

      const summary = {
        ...base,
        healthScore,
        healthStatus: getHealthStatus(healthScore, base.diamonds),
      };

      return {
        ...summary,
        creatorTags: getCreatorTags(summary),
      };
    })
    .sort((a, b) => b.diamonds - a.diamonds);
}

function buildInsights(creator: CreatorSummary) {
  const insights: string[] = [];
  const diamondsChange = creator.diamondsChange;
  const hoursChange = creator.liveHoursChange;
  const followersChange = creator.followersChange;

  insights.push(`${creator.oneHourDays}/${creator.healthWindowDays} valid one-hour live days completed.`);
  insights.push(`${formatHours(creator.healthWindowHours)} live hours completed.`);
  insights.push(`${formatNumber(creator.healthWindowMatches)} battles completed.`);
  insights.push(`${formatNumber(creator.healthWindowFollowers)} new followers gained.`);

  if (creator.diamondsLastMonth) {
    insights.push(
      `Diamonds are ${diamondsChange >= 0 ? "up" : "down"} ${formatPercent(
        Math.abs(diamondsChange)
      )} compared with last month.`
    );
  }

  if (Math.abs(hoursChange) < 5 && diamondsChange < -15) {
    insights.push("Hours are stable but diamonds are dropping, so gifting quality may need attention.");
  } else if (creator.liveHoursLastMonth) {
    insights.push(
      `Live hours are ${hoursChange >= 0 ? "up" : "down"} ${formatPercent(
        Math.abs(hoursChange)
      )} compared with last month.`
    );
  }

  if (creator.matches <= 0) insights.push("Battles are very low, which may be limiting battle diamonds.");
  if (creator.liveHours >= 20 && creator.dph < 1000) {
    insights.push("Creator has high hours but low diamonds per hour.");
  }
  if (followersChange < 0) insights.push("Followers are down compared with last month.");
  if (!insights.length) insights.push("Creator performance is steady for the current filters.");

  return insights;
}

function buildProfileInsights(
  stats: {
    diamonds: number;
    liveHours: number;
    validDays: number;
    liveStreams: number;
    matches: number;
    newFollowers: number;
    dph: number;
  },
  points: CreatorDailyPoint[],
  range: "week" | "month"
) {
  const label = range === "week" ? "Last 7 days" : "Last 30 days";
  const shortLiveDays = points.filter((point) => point.liveHours > 0 && point.liveHours < 1);
  const insights = [
    `${label}: ${formatNumber(stats.diamonds)} diamonds from ${formatHours(stats.liveHours)} live hours.`,
    `${formatNumber(stats.validDays)} valid one-hour live days from ${formatNumber(stats.liveStreams)} live appearances.`,
    `${formatNumber(stats.matches)} battles completed, averaging ${formatNumber(
      stats.liveHours > 0 ? stats.matches / stats.liveHours : 0
    )} battles per live hour.`,
    `${formatNumber(stats.newFollowers)} new followers gained with ${formatNumber(
      stats.dph
    )} DPH (diamonds per hour).`,
  ];

  if (shortLiveDays.length) {
    insights.push(
      `${formatNumber(shortLiveDays.length)} live appearance${
        shortLiveDays.length === 1 ? "" : "s"
      } finished under one hour. These earn the appearance points, but they do not count as valid live days until they reach one full hour.`
    );
  }

  return insights;
}

function buildCreatorReportActions(creator: CreatorSummary) {
  const actions: string[] = [];

  if (creator.oneHourDays < creator.healthWindowDays) {
    actions.push("Push for a consistent daily live routine.");
  }
  if (creator.oneHourDays === creator.healthWindowDays && creator.healthWindowHours < 14) {
    actions.push("You are showing up daily. Next target: push more sessions closer to two hours.");
  } else if (creator.healthWindowHours < creator.oneHourDays) {
    actions.push("Start by making each live at least one full hour.");
  } else if (creator.healthWindowHours < 20) {
    actions.push("Build towards a stronger weekly total by extending the shorter live sessions.");
  }
  if (creator.healthWindowMatches < 70) {
    actions.push("Add more battles to increase battle rhythm and battle diamonds.");
  }
  if (creator.dph < 1000) {
    actions.push("Focus on better battle selection and stronger gifting moments.");
  }
  if (creator.healthWindowFollowers < 100) {
    actions.push("Network with new creators and battle larger rooms to reach new followers.");
  }
  if (!actions.length) {
    actions.push("Keep the same routine and set one stretch target for the next week.");
  }

  return actions;
}

function buildCreatorReportTips(creator: CreatorSummary) {
  const tips: { title: string; description: string }[] = [];
  const shortLiveDays = creator.dailyPoints
    .slice(-7)
    .filter((point) => point.liveHours > 0 && point.liveHours < 1);

  if (creator.oneHourDays < creator.healthWindowDays) {
    tips.push({
      title: "Build a reliable live routine",
      description:
        "Aim for at least five valid live days each week. A valid live day means staying live for at least one full hour.",
    });
  }

  if (shortLiveDays.length) {
    tips.push({
      title: "Stop short live sessions",
      description: `${shortLiveDays.length} live ${
        shortLiveDays.length === 1 ? "day was" : "days were"
      } under one hour. These appearances help slightly, but they do not count as proper live days until they hit the full hour.`,
    });
  }

  if (creator.oneHourDays === creator.healthWindowDays && creator.healthWindowHours < 14) {
    tips.push({
      title: "Turn daily lives into stronger sessions",
      description:
        "You are showing up consistently. The next step is pushing more sessions closer to two hours so the weekly total becomes more powerful.",
    });
  } else if (creator.healthWindowHours < creator.oneHourDays) {
    tips.push({
      title: "Make each live count",
      description:
        "Short lives make it harder to build strong weekly results. Start with a simple target of one full hour whenever you go live.",
    });
  } else if (creator.healthWindowHours < 20) {
    tips.push({
      title: "Grow your weekly live hours",
      description:
        "Set a minimum session target before you go live. Ten to fifteen hours is a solid base, but twenty hours gives you a much stronger growth week.",
    });
  }

  if (creator.healthWindowMatches < 70) {
    tips.push({
      title: "Add more quality battles",
      description:
        "Battle volume helps create more gifting moments. Aim to build towards around ten strong battles per live day with creators who keep the room active.",
    });
  }

  if (creator.dph < 1000) {
    tips.push({
      title: "Improve diamonds per hour",
      description:
        "Focus on better battle choices, stronger moments in the room, and keeping energy high during the parts of the live where supporters are most active.",
    });
  }

  if (creator.healthWindowFollowers < 100) {
    tips.push({
      title: "Reach new audiences",
      description:
        "Network with new creators and battle larger rooms with more viewers. The right rooms can help more people discover you while you are live.",
    });
  }

  if (!tips.length) {
    tips.push({
      title: "Keep the routine strong",
      description:
        "Your weekly pattern is in a good place. Keep the consistency and set one stretch goal for the next report.",
    });
  }

  return tips;
}

function buildCreatorReportWins(creator: CreatorSummary) {
  const wins: { title: string; description: string }[] = [];

  if (creator.oneHourDays >= 5) {
    wins.push({
      title: "&#9989; Strong live consistency",
      description: `${creator.oneHourDays}/${creator.healthWindowDays} tracked days included a valid one-hour live session, which gives the week a solid base.`,
    });
  }
  if (creator.healthWindowHours >= 20) {
    wins.push({
      title: "&#9201; Excellent weekly hours",
      description: `${formatHours(creator.healthWindowHours)} hours streamed this week. That is a strong activity level to build from.`,
    });
  } else if (creator.healthWindowHours >= 10) {
    wins.push({
      title: "&#9201; Good weekly hours",
      description: `${formatHours(creator.healthWindowHours)} hours streamed this week. Keep pushing sessions closer to two hours.`,
    });
  }
  if (creator.healthWindowMatches >= 70) {
    wins.push({
      title: "&#9876; Strong battle volume",
      description: `${formatNumber(creator.healthWindowMatches)} battles this week. Battle activity is a key part of creating more gifting moments.`,
    });
  }
  if (creator.dph >= 1500) {
    wins.push({
      title: "&#128142; Strong diamonds per hour",
      description: `${formatNumber(creator.dph)} DPH shows the live time is converting well into diamonds.`,
    });
  }
  if (creator.healthWindowFollowers >= 100) {
    wins.push({
      title: "&#128200; Strong follower growth",
      description: `${formatNumber(creator.healthWindowFollowers)} new followers this week shows discovery is moving in the right direction.`,
    });
  }

  if (!wins.length) {
    wins.push({
      title: "&#9989; Week completed",
      description: "There is useful data from this week. The next step is building stronger habits from the improvement points below.",
    });
  }

  return wins.slice(0, 4);
}

function reportToneClass(status: HealthStatus) {
  if (status === "Elite") return "elite";
  if (status === "Healthy") return "healthy";
  if (status === "Needs Attention") return "attention";
  if (status === "Low Performance") return "performance";
  return "quality";
}

function getCreatorReportScoreLabel(status: HealthStatus) {
  if (status === "Elite") return "Elite";
  if (status === "Healthy") return "High Quality";
  return "";
}

function buildScoreImprovementTips(creator: CreatorSummary) {
  const tips: string[] = [];
  const breakdown = creator.healthBreakdown;

  if (breakdown.liveDays < 35) {
    tips.push(
      `Live day validation: ${35 - Math.round(breakdown.liveDays)} more points available. A creator earns 3 points for appearing live and 2 extra points for completing the full hour. Check whether they are missing live days or ending lives before one hour.`
    );
  }
  if (breakdown.liveHours < 30) {
    tips.push(
      `Live hours: ${30 - Math.round(breakdown.liveHours)} more points available. They need ${formatHours(Math.max(20 - creator.healthWindowHours, 0))} more live hours to reach the 20 hour weekly target.`
    );
  }
  if (breakdown.matches < 10) {
    tips.push(
      `Battles: ${10 - Math.round(breakdown.matches)} more points available. They need ${formatNumber(Math.max(70 - creator.healthWindowMatches, 0))} more battles to reach the 70 battle weekly target.`
    );
  }
  if (breakdown.dph < 25) {
    tips.push(
      `DPH (diamonds per hour): ${25 - Math.round(breakdown.dph)} more points available. Improve room choice, battle quality, confidence, gifting prompts and viewer conversion to earn stronger quality creator points.`
    );
  }

  if (!tips.length) tips.push("This creator is already close to the maximum score.");

  return tips;
}

function buildHealthScoreRows(creator: CreatorSummary) {
  const breakdown = creator.healthBreakdown;
  const missingHours = Math.max(20 - creator.healthWindowHours, 0);
  const missingBattles = Math.max(70 - creator.healthWindowMatches, 0);
  const missingLiveAppearDays = Math.max(creator.healthWindowDays - creator.liveAppearDays, 0);
  const missingFullHourDays = Math.max(creator.liveAppearDays - creator.oneHourDays, 0);
  const liveDayImprovement =
    Math.round(breakdown.liveDays) >= 35
      ? "Full live day validation is achieved. Maintain the routine: keep appearing live and completing the full hour."
      : `This is to improve score points. A creator gets 3 points for coming on live, then 2 extra points for completing the full hour. Check whether they need ${formatNumber(missingLiveAppearDays)} more live day appearances and whether ${formatNumber(missingFullHourDays)} live day(s) need to reach the full hour.`;
  const liveHoursImprovement =
    missingHours <= 0
      ? "20 weekly live hours is achieved. Maintain it and keep session length consistent."
      : `They need ${formatHours(missingHours)} more live hours to reach the 20 hour weekly target and unlock more live hour points.`;
  const battlesImprovement =
    missingBattles <= 0
      ? "70 weekly battles is achieved. Maintain the battle rhythm and keep battle quality strong."
      : `They need ${formatNumber(missingBattles)} more battles to reach the 70 battle weekly target and unlock more battle points.`;
  const dphImprovement =
    Math.round(breakdown.dph) >= 25
      ? "Strong DPH quality creator points achieved. Keep it up and maintain the same quality rooms, gifting moments and conversion."
      : "Improve DPH quality creator points by choosing better rooms, improving battle quality, confidence, gifting prompts and viewer conversion.";

  return [
    {
      area: "Live day validation",
      earned: Math.round(breakdown.liveDays),
      max: 35,
      available: Math.max(35 - Math.round(breakdown.liveDays), 0),
      improvement: liveDayImprovement,
    },
    {
      area: "Live hours",
      earned: Math.round(breakdown.liveHours),
      max: 30,
      available: Math.max(30 - Math.round(breakdown.liveHours), 0),
      improvement: liveHoursImprovement,
    },
    {
      area: "Battles",
      earned: Math.round(breakdown.matches),
      max: 10,
      available: Math.max(10 - Math.round(breakdown.matches), 0),
      improvement: battlesImprovement,
    },
    {
      area: "DPH (diamonds per hour)",
      earned: Math.round(breakdown.dph),
      max: 25,
      available: Math.max(25 - Math.round(breakdown.dph), 0),
      improvement: dphImprovement,
    },
  ];
}

function getTopHealthScoreOpportunity(creator: CreatorSummary) {
  const opportunities = buildHealthScoreRows(creator).filter((row) => row.available > 0);
  return opportunities.sort((a, b) => b.available - a.available)[0];
}

function buildCreatorHealthScoreBreakdownTable(creator: CreatorSummary) {
  return buildCreatorHealthScoreRows(creator)
    .map((row) => {
      const area = escapeHtml(row.area);
      const improvement = escapeHtml(row.improvement);

      return `<tr>
        <td>${area}</td>
        <td>${formatNumber(row.earned)}/${formatNumber(row.max)}</td>
        <td>${formatNumber(row.available)}</td>
        <td>${improvement}</td>
      </tr>`;
    })
    .join("");
}

function buildManagerActions(creator: CreatorSummary) {
  const actions: string[] = [];

  if (creator.oneHourDays < creator.healthWindowDays) {
    actions.push("Set a daily live expectation and check whether missed days have a clear reason.");
  }
  if (creator.healthWindowHours < 20) {
    actions.push("Coach the creator toward longer planned sessions rather than short reactive lives.");
  }
  if (creator.healthWindowMatches < 70) {
    actions.push("Review battle volume and help the creator find better battle opportunities.");
  }
  if (creator.dph < 1000) {
    actions.push("Review battle quality, room choice and gifting moments to improve DPH (diamonds per hour).");
  }
  if (creator.healthWindowFollowers < 100) {
    actions.push("Push discovery activity: better battle partners, stronger networking and more visible rooms.");
  }

  actions.push(`Set a clear check-in plan for ${creator.username} with ${creator.managerLabel}.`);
  actions.push("Prioritise the weakest score area first: live days, live hours, battles, or DPH (diamonds per hour).");

  return actions;
}

function buildCreatorHealthScoreRows(creator: CreatorSummary) {
  const healthRows = buildHealthScoreRows(creator);
  const guidance: Record<string, string> = {
    "Live day validation":
      "To improve your points, increase the number of days you go LIVE for at least one full hour. Aim for 5 strong live days each week.",
    "Live hours":
      "To improve your points, increase your total live time by planning longer sessions and avoiding short stop-start lives.",
    Battles:
      "To improve your points, increase your battle volume and choose stronger battle partners who help your room stay active.",
    "DPH (diamonds per hour)":
      "To improve your points, raise your diamonds per hour with better room choice, stronger gifting moments and clearer viewer prompts.",
  };

  return healthRows.map((row) => ({
    ...row,
    improvement: guidance[row.area] ?? row.improvement,
  }));
}

function buildManagerFocusDetail(creator: CreatorSummary) {
  const focus: string[] = [];
  const missedDays = Math.max(creator.healthWindowDays - creator.oneHourDays, 0);
  const hoursGap = Math.max(20 - creator.healthWindowHours, 0);
  const battlesGap = Math.max(70 - creator.healthWindowMatches, 0);

  if (creator.healthScore <= 0) {
    const monthlyLiveText =
      creator.liveHours > 0 || creator.liveStreams > 0
        ? `There is some recent live data (${formatHours(creator.liveHours)}h / ${formatNumber(creator.liveStreams)} streams), but nothing useful in the current weekly health window.`
        : "There is no useful live data in the latest 7-day window.";

    return [
      `Immediate reach-out needed: ${creator.username} has a 0 health score because they have not been going live, so there is no performance data to work with.`,
      `${monthlyLiveText} The manager needs to find out why they are inactive, whether they are actually going to start again, and decide whether this creator should remain a focus for the agency.`,
      "Minimum restart target: get them back to 5 live days per week and 20 live hours per week before judging battles, DPH or growth.",
    ];
  }

  if (missedDays > 0) {
    if (creator.oneHourDays >= 6) {
      focus.push(
        `Live routine is strong: ${creator.oneHourDays}/${creator.healthWindowDays} days live. The focus is simply fitting in the final day where possible so daily live becomes the normal routine.`
      );
    } else if (creator.oneHourDays === 5) {
      focus.push(
        `Live routine is decent but can be stronger: ${creator.oneHourDays}/${creator.healthWindowDays} days live. Keep the five-day base, then try to add one extra planned day.`
      );
    } else {
      focus.push(
        `Live routine is inconsistent: only ${creator.oneHourDays}/${creator.healthWindowDays} days live. Put them on a simple weekly schedule, confirm which days they can commit to, and check missed days have a real reason.`
      );
    }
  }
  if (hoursGap > 0) {
    const target =
      creator.healthWindowHours < creator.oneHourDays
        ? "start with a minimum one-hour live every time they go on"
        : "push their shorter sessions closer to two hours";
    focus.push(
      `Hours are holding the score down: ${formatHours(creator.healthWindowHours)}h this week, ${formatHours(hoursGap)}h short of the 20h high-performance target. Put them on a simple schedule and ${target}.`
    );
  }
  if (battlesGap > 0) {
    focus.push(
      `Battle volume needs work: ${formatNumber(creator.healthWindowMatches)} battles this week, ${formatNumber(battlesGap)} short of the 70 battle target. Coach them on finding creators to battle, joining active rooms, introducing themselves properly and building repeat battle partners.`
    );
  }
  if (creator.dph < 1000) {
    focus.push(
      `DPH is low at ${formatNumber(creator.dph)}. Check the basics: lighting, sound, camera angle, background, confidence on camera, whether they are entertaining, how they speak to viewers, gifting prompts and whether they are choosing rooms that can actually convert into diamonds.`
    );
  }
  if (creator.diamondsFromMatches <= 0 && creator.healthWindowMatches > 0) {
    focus.push(
      `Battles are not showing diamond value yet. Review whether they are battling the right creators, explaining battles properly to viewers, keeping energy high during battles and asking for support clearly.`
    );
  }
  if (creator.diamonds < 5000 && creator.healthWindowHours > 5) {
    focus.push(
      `They are putting in some time but not converting it into diamonds. Watch a recent live, check confidence on camera, room energy, conversation quality and whether they are giving viewers a reason to stay and gift.`
    );
  }
  if (creator.healthWindowFollowers < 50) {
    focus.push(
      `Follower growth is weak with ${formatNumber(creator.healthWindowFollowers)} new followers. They may not be networking enough or reaching new rooms. Push battles with larger or more active creators, better first impressions and stronger viewer engagement in the first 30 seconds.`
    );
  }
  if (creator.healthScore >= 85 || creator.dailyAverageDiamonds >= 2000) {
    focus.push(
      `Opportunity creator: performance is strong enough to consider tournaments, campaigns, extra exposure or a manager check-in focused on scaling what is already working.`
    );
  }

  if (!focus.length) {
    focus.push("Keep the current routine stable and set one stretch target: more quality battles, stronger DPH or one extra high-value session this week.");
  }

  return focus;
}

function getScoreMovementReason(creator: CreatorSummary, previousScore: number | null, change: number | null) {
  if (previousScore === null || change === null) return "No previous-week comparison available yet.";
  const direction = change > 0 ? "up" : change < 0 ? "down" : "stable";
  const mainIssue = buildManagerFocusDetail(creator)[0];

  if (direction === "up") {
    return `Up ${formatNumber(change)} points. The current focus is to protect the routine: ${mainIssue}`;
  }
  if (direction === "down") {
    return `Down ${formatNumber(Math.abs(change))} points. The likely pressure point is: ${mainIssue}`;
  }

  return `Stable week-on-week. Push one clear improvement area next: ${mainIssue}`;
}

function buildManagerHealthTrend(
  allRows: CreatorStat[],
  managerSummary: ManagerHealthSummary
): ManagerHealthTrendPoint[] {
  const creatorKeys = new Set(managerSummary.creators.map((creator) => creator.key));
  const dates = Array.from(new Set(allRows.filter(isAquaRow).map((row) => row.stat_date)))
    .sort((a, b) => a.localeCompare(b))
    .slice(-30);

  return dates.map((date) => {
    const rowsUpToDate = allRows.filter(
      (row) => isAquaRow(row) && row.stat_date <= date && creatorKeys.has(getUsername(row).toLowerCase())
    );
    const summaries = buildCreatorSummaries(rowsUpToDate).filter(
      (creator) => creatorKeys.has(creator.key) && isTeamHealthScoreCreator(creator)
    );
    const score =
      summaries.length > 0
        ? summaries.reduce((sum, creator) => sum + creator.healthScore, 0) / summaries.length
        : 0;

    return { date, score };
  });
}

function buildManagerTrendChartSvg(points: ManagerHealthTrendPoint[]) {
  const width = 920;
  const height = 300;
  const left = 58;
  const right = 24;
  const top = 24;
  const bottom = 54;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const yTicks = [0, 20, 40, 60, 80, 100];
  const safePoints = points.length ? points : [{ date: "", score: 0 }];
  const xFor = (index: number) =>
    left + (safePoints.length === 1 ? chartWidth : (index / (safePoints.length - 1)) * chartWidth);
  const yFor = (score: number) => top + chartHeight - (Math.max(0, Math.min(100, score)) / 100) * chartHeight;
  const path = safePoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(1)} ${yFor(point.score).toFixed(1)}`)
    .join(" ");
  const labels = safePoints
    .map((point, index) => {
      const showEvery = Math.max(1, Math.ceil(safePoints.length / 8));
      if (index !== 0 && index !== safePoints.length - 1 && index % showEvery !== 0) return "";
      return `<text x="${xFor(index).toFixed(1)}" y="${height - 18}" text-anchor="middle" font-size="11" fill="#64748b">${escapeHtml(
        point.date.slice(5)
      )}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Manager team health trend">
    <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="#f8fbff" />
    ${yTicks
      .map((tick) => {
        const y = yFor(tick);
        return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#dbeafe" stroke-width="1" />
          <text x="${left - 12}" y="${y + 4}" text-anchor="end" font-size="12" fill="#64748b">${tick}</text>`;
      })
      .join("")}
    <line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" stroke="#94a3b8" stroke-width="2" />
    <line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" stroke="#94a3b8" stroke-width="2" />
    <path d="${path}" fill="none" stroke="#0284c7" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    ${safePoints
      .map(
        (point, index) =>
          `<circle cx="${xFor(index).toFixed(1)}" cy="${yFor(point.score).toFixed(1)}" r="4" fill="#0369a1" />`
      )
      .join("")}
    ${labels}
  </svg>`;
}

function getWeeklyTargetText(creator: CreatorSummary) {
  const liveDaysGap = Math.max(5 - creator.oneHourDays, 0);
  const hoursGap = Math.max(20 - creator.healthWindowHours, 0);

  if (creator.healthScore <= 0) {
    return "Restart target: start going live again, then build towards 5 live days and 20 live hours per week.";
  }

  if (liveDaysGap <= 0 && hoursGap <= 0) {
    return "Weekly target hit: 5+ live days and 20+ live hours. Next focus is battle quality, DPH and growth.";
  }

  const parts = [];
  if (liveDaysGap > 0) parts.push(`${liveDaysGap} more live day${liveDaysGap === 1 ? "" : "s"}`);
  if (hoursGap > 0) parts.push(`${formatHours(hoursGap)} more live hours`);

  return `Weekly target gap: ${parts.join(" and ")} to reach 5 live days and 20 live hours.`;
}

function getFriendlyDate(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function buildWeeklyReportRows(creator: CreatorSummary) {
  return creator.dailyPoints.slice(-7).map((point) => ({
    date: getFriendlyDate(point.date),
    wentLive: point.liveHours > 0,
    hours: formatHours(point.liveHours),
    diamonds: formatNumber(point.diamonds),
    matches: formatNumber(point.matches),
    followers: formatNumber(point.newFollowers),
  }));
}

function buildCreatorReportHtml({
  creator,
  agencyLogo,
  weekRows,
}: {
  creator: CreatorSummary;
  agencyLogo: string;
  weekRows: ReturnType<typeof buildWeeklyReportRows>;
}) {
  const tips = buildCreatorReportTips(creator);
  const wins = buildCreatorReportWins(creator);
  const toneClass = reportToneClass(creator.healthStatus);
  const weeklyPoints = creator.dailyPoints.slice(-7);
  const weeklyDiamonds = weeklyPoints.reduce((sum, point) => sum + point.diamonds, 0);
  const weeklyHours = weeklyPoints.reduce((sum, point) => sum + point.liveHours, 0);
  const weeklyLiveDays = weeklyPoints.filter((point) => point.liveHours > 0).length;
  const weeklyMatches = weeklyPoints.reduce((sum, point) => sum + point.matches, 0);
  const weeklyDph = weeklyHours > 0 ? weeklyDiamonds / weeklyHours : 0;
  const averageSessionLength = weeklyLiveDays > 0 ? weeklyHours / weeklyLiveDays : weeklyHours;
  const bestDay = [...weeklyPoints]
    .sort((a, b) => b.diamonds - a.diamonds)[0];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${creator.username} - Weekly Creator Report</title>
  <style>
    @font-face { font-family: Norwester; src: url("${window.location.origin}/fonts/Norwester.otf") format("opentype"); }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #020817;
      color: #eaf6ff;
      font-family: Arial, sans-serif;
    }
    main {
      width: 980px;
      height: 1742px;
      margin: 0 auto;
      padding: 34px;
      overflow: hidden;
      background:
        linear-gradient(180deg, rgba(14, 165, 233, .14), transparent 360px),
        radial-gradient(circle at 85% 0%, rgba(37, 99, 235, .28), transparent 280px),
        #020817;
    }
    .hero {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 28px;
      align-items: center;
      min-height: 190px;
      border: 1px solid rgba(125, 211, 252, .22);
      background: linear-gradient(135deg, rgba(14, 165, 233, .18), rgba(15, 23, 42, .72));
      border-radius: 24px;
      padding: 28px;
      box-shadow: 0 24px 80px rgba(2, 132, 199, .12);
    }
    .eyebrow { color: #38bdf8; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; font-size: 13px; }
    h1 { font-family: Norwester, Impact, sans-serif; font-size: 58px; line-height: .9; margin: 10px 0 6px; color: white; letter-spacing: .02em; }
    h2 { margin: 18px 0 10px; color: #bae6fd; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }
    .meta { color: #8fb7d4; font-size: 14px; }
    .logo { width: 190px; max-height: 126px; object-fit: contain; filter: drop-shadow(0 18px 28px rgba(56, 189, 248, .18)); }
    .score { margin-top: 16px; display: inline-flex; align-items: baseline; gap: 8px; border: 1px solid rgba(56, 189, 248, .35); background: rgba(8, 47, 73, .62); border-radius: 16px; padding: 11px 15px; }
    .score strong { font-size: 30px; color: #7dd3fc; }
    .score.elite { border-color: rgba(192, 132, 252, .6); background: rgba(88, 28, 135, .5); }
    .score.elite strong { color: #d8b4fe; }
    .score.healthy { border-color: rgba(52, 211, 153, .6); background: rgba(6, 78, 59, .48); }
    .score.healthy strong { color: #6ee7b7; }
    .score.attention { border-color: rgba(251, 146, 60, .65); background: rgba(124, 45, 18, .52); }
    .score.attention strong { color: #fdba74; }
    .score.performance { border-color: rgba(56, 189, 248, .6); background: rgba(8, 47, 73, .58); }
    .score.performance strong { color: #7dd3fc; }
    .score.quality { border-color: rgba(248, 113, 113, .65); background: rgba(127, 29, 29, .52); }
    .score.quality strong { color: #fca5a5; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
    .card { border: 1px solid rgba(125, 211, 252, .18); background: rgba(15, 23, 42, .86); border-radius: 16px; padding: 13px; }
    .card .label { color: #8fb7d4; font-size: 12px; }
    .card .value { margin-top: 8px; font-size: 24px; font-weight: 900; color: #38bdf8; }
    .card.diamonds .value { color: #facc15; }
    .card.hours .value { color: #38bdf8; }
    .card.days .value { color: #34d399; }
    .card.battles .value { color: #f472b6; }
    .wide { border: 1px solid rgba(125, 211, 252, .18); background: rgba(15, 23, 42, .78); border-radius: 20px; padding: 18px; margin-top: 14px; }
    .week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 9px; }
    .day { border: 2px solid rgba(125, 211, 252, .28); background: linear-gradient(180deg, rgba(8, 47, 73, .72), rgba(2, 6, 23, .7)); border-radius: 16px; padding: 12px 9px; min-height: 132px; box-shadow: inset 0 1px 0 rgba(255,255,255,.06); }
    .day .name { color: white; font-size: 14px; font-weight: 900; line-height: 1.15; }
    .day .status { margin: 9px 0 6px; font-size: 31px; line-height: 1; }
    .day .hours { color: #7dd3fc; font-size: 20px; font-weight: 900; margin-bottom: 5px; }
    .day .small { color: #c6e3f7; font-size: 12px; font-weight: 700; line-height: 1.35; }
    .tips { display: grid; gap: 9px; }
    .tip { border-left: 5px solid #38bdf8; background: rgba(8, 47, 73, .48); border-radius: 14px; padding: 12px 14px; }
    .tip.good { border-left-color: #22c55e; background: rgba(6, 78, 59, .46); }
    .tip strong { display: block; color: white; margin-bottom: 5px; font-size: 15px; }
    .tip span { color: #b6d5e8; font-size: 12px; line-height: 1.34; }
    .tier-card { border: 1px solid rgba(125, 211, 252, .22); background: linear-gradient(135deg, rgba(14, 165, 233, .14), rgba(15, 23, 42, .82)); border-radius: 20px; padding: 20px; margin-top: 14px; }
    .tier-card strong { display: block; color: white; font-size: 28px; margin-bottom: 6px; }
    .tier-card span { color: #bae6fd; font-size: 14px; line-height: 1.45; }
    .formula { border: 1px solid rgba(250, 204, 21, .58); background: linear-gradient(135deg, rgba(113, 63, 18, .72), rgba(15, 23, 42, .86)); border-radius: 16px; padding: 14px 16px; font-size: 15px; font-weight: 900; color: #fef3c7; box-shadow: 0 0 30px rgba(250, 204, 21, .1); }
    .formula b { color: #facc15; }
    .formula span { display: block; margin-top: 6px; color: #fde68a; font-size: 12px; }
    .score-table { width: 100%; border-collapse: collapse; border: 1px solid rgba(125, 211, 252, .18); background: rgba(15, 23, 42, .78); border-radius: 20px; overflow: hidden; }
    .score-table th { color: #bae6fd; background: rgba(8, 47, 73, .82); font-size: 11px; text-transform: uppercase; letter-spacing: .06em; text-align: left; padding: 9px; }
    .score-table td { border-top: 1px solid rgba(125, 211, 252, .14); color: #d9efff; font-size: 12px; line-height: 1.3; padding: 9px; }
    .score-table td:nth-child(2) { color: #7dd3fc; font-weight: 900; white-space: nowrap; }
    .score-table td:nth-child(3) { color: #facc15; font-weight: 900; white-space: nowrap; }
    footer { margin-top: 18px; color: #4f7895; font-size: 12px; text-align: center; }
    @media (max-width: 760px) {
      main { width: 100%; height: auto; padding: 24px; }
      .grid { grid-template-columns: repeat(2, 1fr); }
      .week { grid-template-columns: 1fr; }
      .hero { grid-template-columns: 1fr; }
      .logo { width: 170px; }
      h1 { font-size: 44px; }
    }
  </style>
</head>
<body>
<main>
  <section class="hero">
    <div>
      <div class="eyebrow">Weekly Performance Report</div>
      <h1>@${creator.username}</h1>
      <div class="meta">${getCreatorMetaLine(creator)} &bull; ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
      <div class="score ${toneClass}"><strong>${creator.healthScore}</strong><span>/100 weekly performance${getCreatorReportScoreLabel(creator.healthStatus) ? ` &bull; ${getCreatorReportScoreLabel(creator.healthStatus)}` : ""}</span></div>
    </div>
    ${agencyLogo ? `<img class="logo" src="${agencyLogo}" alt="Aqua logo" />` : ""}
  </section>

  <section class="grid">
    <div class="card diamonds"><div class="label">&#128142; Weekly Diamonds</div><div class="value">${formatNumber(weeklyDiamonds)}</div></div>
    <div class="card hours"><div class="label">&#9201; Weekly Hours</div><div class="value">${formatHours(weeklyHours)}h</div></div>
    <div class="card days"><div class="label">&#9989; LIVE Days This Week</div><div class="value">${formatNumber(weeklyLiveDays)}</div></div>
    <div class="card battles"><div class="label">&#9876; Weekly Battles</div><div class="value">${formatNumber(weeklyMatches)}</div></div>
  </section>

  <h2>Health Score Points</h2>
  <table class="score-table">
    <tr><th>Score Area</th><th>Points Earned</th><th>More Points Available</th><th>How To Improve</th></tr>
    ${buildCreatorHealthScoreBreakdownTable(creator)}
  </table>

  <h2>Weekly Live Breakdown</h2>
  <section class="week">
    ${weekRows
      .map(
        (row) => `<div class="day">
          <div class="name">${row.date}</div>
          <div class="status">${row.wentLive ? "&#10003;" : "&#10005;"}</div>
          <div class="hours">${row.hours}h</div>
          <div class="small">${row.diamonds} diamonds</div>
          <div class="small">${row.matches} battles</div>
        </div>`
      )
      .join("")}
  </section>

  <h2>What You Did Well</h2>
  <section class="tips">
    ${wins
      .map((win) => `<div class="tip good"><strong>${win.title}</strong><span>${win.description}</span></div>`)
      .join("")}
  </section>

  <h2>What To Improve Next</h2>
  <section class="tips">
    ${tips
      .slice(0, 5)
      .map((tip) => `<div class="tip"><strong>${tip.title}</strong><span>${tip.description}</span></div>`)
      .join("")}
  </section>

  <h2>Winning Pattern</h2>
  <section class="formula">
    &#127942; <b>Power Pattern:</b> Go LIVE consistently &bull; Push stronger session length &bull; Add more quality battles
    <span>Average live day: ${formatHours(averageSessionLength)}h &bull; Weekly DPH: ${formatNumber(weeklyDph)} &bull; Best day: ${bestDay ? getFriendlyDate(bestDay.date) : "Not enough data"}</span>
  </section>

  <footer>Keep pushing every live session.</footer>
</main>
</body>
</html>`;
}

function MetricCard({
  label,
  value,
  previous,
  suffix = "",
}: {
  label: string;
  value: string;
  previous?: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      {typeof previous === "number" ? (
        <p className="mt-1 text-xs text-slate-400">
          Previous: {suffix}
          {formatNumber(previous)}
        </p>
      ) : null}
    </div>
  );
}

function ComparisonChart({
  points,
  selectedMetrics,
  onToggleMetric,
}: {
  points: CreatorDailyPoint[];
  selectedMetrics: ChartMetricKey[];
  onToggleMetric: (metric: ChartMetricKey) => void;
}) {
  const activeMetrics = CHART_METRICS.filter((metric) => selectedMetrics.includes(metric.key));
  const primaryMetric = activeMetrics[0];
  const primaryValues = primaryMetric
    ? points.map((point) => safeNumber(point[primaryMetric.key]))
    : [];
  const primaryMax = Math.max(...primaryValues, 1);
  const primaryMin = Math.min(...primaryValues, 0);
  const width = 820;
  const height = 300;
  const chartTop = 62;
  const chartBottom = 242;
  const chartLeft = 78;
  const chartRight = 650;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div>
          <p className="text-sm font-black uppercase text-slate-700">Chart Metrics</p>
          <div className="mt-3 space-y-2">
            {CHART_METRICS.map((metric) => (
              <label key={metric.key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                <input
                  checked={selectedMetrics.includes(metric.key)}
                  onChange={() => onToggleMetric(metric.key)}
                  type="checkbox"
                />
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: metric.color }} />
                {metric.label}
              </label>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[820px]">
            {[0, 1, 2, 3, 4].map((line) => {
              const y = chartTop + ((chartBottom - chartTop) / 4) * line;
              const tickValue = primaryMax - ((primaryMax - primaryMin) / 4) * line;
              return (
                <g key={line}>
                  <text x={chartLeft - 10} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">
                    {primaryMetric ? primaryMetric.format(tickValue) : ""}
                  </text>
                  <line
                    x1={chartLeft}
                    x2={chartRight}
                    y1={y}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {activeMetrics.map((metric) => {
              const values = points.map((point) => safeNumber(point[metric.key]));
              const max = Math.max(...values, 1);
              const min = Math.min(...values, 0);
              const range = Math.max(max - min, 1);
              const linePoints = values
                .map((value, index) => {
                  const x =
                    points.length <= 1
                      ? chartLeft
                      : chartLeft + (index / (points.length - 1)) * (chartRight - chartLeft);
                  const y = chartBottom - ((value - min) / range) * (chartBottom - chartTop);
                  return `${x},${y}`;
                })
                .join(" ");

              return (
                <g key={metric.key}>
                  <text x={chartRight + 12} y={16 + activeMetrics.indexOf(metric) * 16} fill={metric.color} fontSize="11" fontWeight="700">
                    {metric.format(min)} - {metric.format(max)}
                  </text>
                  <polyline
                    fill="none"
                    points={linePoints}
                    stroke={metric.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                  />
                  <text x={chartLeft} y={16 + activeMetrics.indexOf(metric) * 16} fill={metric.color} fontSize="12" fontWeight="700">
                    {metric.label}: {values.length ? metric.format(values[values.length - 1]) : "0"}
                  </text>
                </g>
              );
            })}

            {points.map((point, index) => {
              const x =
                points.length <= 1
                  ? chartLeft
                  : chartLeft + (index / (points.length - 1)) * (chartRight - chartLeft);
              const label = String(point.date).slice(5);

              return (
                <g key={point.date}>
                  <line x1={x} x2={x} y1={chartBottom} y2={chartBottom + 5} stroke="#94a3b8" />
                  <text x={x} y={chartBottom + 22} textAnchor="middle" fill="#64748b" fontSize="11">
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

function AgencyHealthTrendChart({ points }: { points: AgencyHealthTrendPoint[] }) {
  const width = 760;
  const height = 260;
  const chartTop = 28;
  const chartBottom = 205;
  const chartLeft = 62;
  const chartRight = 720;
  const scores = points.map((point) => point.score);
  const max = Math.max(...scores, 100);
  const min = Math.min(...scores, 0);
  const range = Math.max(max - min, 1);
  const linePoints = points
    .map((point, index) => {
      const x =
        points.length <= 1
          ? chartLeft
          : chartLeft + (index / (points.length - 1)) * (chartRight - chartLeft);
      const y = chartBottom - ((point.score - min) / range) * (chartBottom - chartTop);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-xl font-black uppercase text-sky-900">Aqua Health Score Trend</h3>
          <p className="text-sm text-slate-500">
            Average Aqua health score for creators from day 4 onward.
          </p>
        </div>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
          {points.length ? `${formatNumber(points[points.length - 1].score)}/100 latest` : "No trend yet"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px]">
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = chartBottom - ((tick - min) / range) * (chartBottom - chartTop);
            return (
              <g key={tick}>
                <text x={chartLeft - 10} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">
                  {tick}
                </text>
                <line x1={chartLeft} x2={chartRight} y1={y} y2={y} stroke="#e2e8f0" />
              </g>
            );
          })}

          <line x1={chartLeft} x2={chartLeft} y1={chartTop} y2={chartBottom} stroke="#94a3b8" />
          <line x1={chartLeft} x2={chartRight} y1={chartBottom} y2={chartBottom} stroke="#94a3b8" />

          {linePoints ? (
            <polyline fill="none" points={linePoints} stroke="#0284c7" strokeLinecap="round" strokeWidth="4" />
          ) : null}

          {points.map((point, index) => {
            const x =
              points.length <= 1
                ? chartLeft
                : chartLeft + (index / (points.length - 1)) * (chartRight - chartLeft);
            const y = chartBottom - ((point.score - min) / range) * (chartBottom - chartTop);
            const label = point.date.split("-").slice(1).join("/");

            return (
              <g key={point.date}>
                <circle cx={x} cy={y} r="4" fill="#0284c7" />
                <text x={x} y={chartBottom + 22} textAnchor="middle" fill="#64748b" fontSize="11">
                  {label}
                </text>
                <text x={x} y={y - 10} textAnchor="middle" fill="#075985" fontSize="11" fontWeight="700">
                  {formatNumber(point.score)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function CreatorListPanel({
  title,
  creators,
  tone,
}: {
  title: string;
  creators: CreatorSummary[];
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black uppercase">{title}</h3>
        <span className="text-sm font-black">{creators.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {creators.slice(0, 8).map((creator) => (
          <div key={`${title}-${creator.key}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm">
            <span className="truncate font-bold">{creator.username}</span>
            <span className="shrink-0 text-slate-500">{creator.healthScore}/100</span>
          </div>
        ))}
        {!creators.length ? <p className="text-sm text-slate-400">None found.</p> : null}
      </div>
    </div>
  );
}

function buildReportHtml(creator: CreatorSummary, reportType: "creator" | "internal") {
  const insights = buildInsights(creator);
  const agencyLogo =
    reportType === "creator" && creator.agency === "Aqua"
      ? `${window.location.origin}/aqua-logo.png`
      : "";
  const title =
    reportType === "creator"
      ? `${creator.username} - Weekly Creator Report`
      : `${creator.username} Internal Data Report`;
  const actions =
    reportType === "creator"
      ? buildCreatorReportActions(creator)
      : buildManagerActions(creator);
  const improvementTips = buildScoreImprovementTips(creator);
  const weekRows = buildWeeklyReportRows(creator);
  const weeklyPoints = creator.dailyPoints.slice(-7);
  const weeklyDiamonds = weeklyPoints.reduce((sum, point) => sum + point.diamonds, 0);
  const weeklyHours = weeklyPoints.reduce((sum, point) => sum + point.liveHours, 0);
  const weeklyLiveDays = weeklyPoints.filter((point) => point.liveHours > 0).length;
  const weeklyMatches = weeklyPoints.reduce((sum, point) => sum + point.matches, 0);
  const weeklyMatchDiamonds = weeklyPoints.reduce((sum, point) => {
    const share = creator.matches > 0 ? point.matches / creator.matches : 0;
    return sum + creator.diamondsFromMatches * share;
  }, 0);
  const weeklyFollowers = weeklyPoints.reduce((sum, point) => sum + point.newFollowers, 0);
  const rows = [
    [
      "Weekly performance",
      reportType === "creator"
        ? `${creator.healthScore}/100`
        : `${creator.healthScore}/100 ${creator.healthStatus}`,
    ],
    ["Weekly target", getWeeklyTargetText(creator)],
    ["Weekly diamonds", formatNumber(weeklyDiamonds)],
    ["Weekly live hours", formatHours(weeklyHours)],
    ["Weekly live days", formatNumber(weeklyLiveDays)],
    ["Weekly battles", formatNumber(weeklyMatches)],
    ["Weekly diamonds from battles", formatNumber(weeklyMatchDiamonds)],
    ["Weekly new followers", formatNumber(weeklyFollowers)],
  ];
  const creatorHtml =
    reportType === "creator"
      ? buildCreatorReportHtml({
          creator,
          agencyLogo,
          weekRows,
        })
      : "";
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; color: #102033; background: #eef7ff; }
    main { max-width: 900px; margin: 0 auto; background: white; min-height: 100vh; padding: 40px; border-top: 8px solid #0ea5e9; }
    h1 { margin-bottom: 4px; color: #075985; }
    h2 { color: #0369a1; }
    .report-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
    .agency-logo { max-height: 72px; max-width: 180px; object-fit: contain; }
    table { border-collapse: collapse; width: 100%; margin: 24px 0; }
    td { border: 1px solid #d8e8f5; padding: 10px; }
    td:first-child { font-weight: 700; background: #eff8ff; width: 240px; color: #075985; }
    .tick { color: #047857; font-weight: 800; }
    .cross { color: #b91c1c; font-weight: 800; }
    li { margin: 8px 0; }
    .note { color: #555; }
  </style>
</head>
<body>
<main>
  <div class="report-header">
    <div>
      <h1>${title}</h1>
      <p class="note">${getCreatorMetaLine(creator)}</p>
    </div>
    ${agencyLogo ? `<img class="agency-logo" src="${agencyLogo}" alt="Aqua logo" />` : ""}
  </div>
  <table>${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join("")}</table>
  <h2>Health score points</h2>
  <table>
    <tr><td>Score area</td><td>Points earned / more available / improvement route</td></tr>
    ${buildHealthScoreRows(creator)
      .map(
        (row) =>
          `<tr><td>${escapeHtml(row.area)}</td><td><strong>${formatNumber(row.earned)}/${formatNumber(row.max)}</strong> earned. <strong>${formatNumber(row.available)}</strong> more points available. ${escapeHtml(row.improvement)}</td></tr>`
      )
      .join("")}
  </table>
  <h2>Weekly breakdown</h2>
  <table>
    <tr><td>Day</td><td>Live result</td><td>Hours</td><td>Diamonds</td><td>Battles</td><td>Followers</td></tr>
    ${weekRows
      .map(
        (row) =>
          `<tr><td>${row.date}</td><td>${
            row.wentLive
              ? '<span class="tick">&#10003;</span>'
              : '<span class="cross">&#10005;</span>'
          }</td><td>${row.hours}</td><td>${row.diamonds}</td><td>${row.matches}</td><td>${row.followers}</td></tr>`
      )
      .join("")}
  </table>
  ${
    reportType === "internal"
      ? `<h2>Points still available</h2><ul>${improvementTips
          .map((tip) => `<li>${tip}</li>`)
          .join("")}</ul>`
      : ""
  }
  <h2>Insights</h2>
  <ul>${insights.map((insight) => `<li>${insight}</li>`).join("")}</ul>
  <h2>${reportType === "creator" ? "Next week target" : "Recommended manager actions"}</h2>
  <ul>${actions.map((action) => `<li>${action}</li>`).join("")}</ul>
  </main>
</body>
</html>`;
  return reportType === "creator" ? creatorHtml : html;
}

async function waitForReportAssets(doc: Document) {
  const fonts = doc.fonts;
  if (fonts) {
    await fonts.ready;
  }

  await Promise.all(
    Array.from(doc.images).map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    })
  );
}

async function renderCreatorReportToPngBlob(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "980px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("Could not create report renderer.");

    doc.open();
    doc.write(html);
    doc.close();

    await waitForReportAssets(doc);

    const report = doc.querySelector("main") as HTMLElement | null;
    if (!report) throw new Error("Could not find report content.");

    const height = Math.ceil(report.scrollHeight);
    iframe.style.height = `${height}px`;

    const blob = await toBlob(report, {
      cacheBust: true,
      pixelRatio: 2,
      width: 980,
      height,
      style: {
        margin: "0",
        maxWidth: "980px",
        width: "980px",
      },
    });

    if (!blob) throw new Error("Could not render report image.");
    return blob;
  } finally {
    iframe.remove();
  }
}

async function downloadReport(creator: CreatorSummary, reportType: "creator" | "internal") {
  const finalHtml = buildReportHtml(creator, reportType);
  const blob =
    reportType === "creator"
      ? await renderCreatorReportToPngBlob(finalHtml)
      : new Blob([finalHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  link.href = url;
  link.download = `${creator.username}-${reportType === "creator" ? "weekly-creator-report" : "internal-data-report"}-${timestamp}.${reportType === "creator" ? "png" : "html"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadTeamCreatorReports(managerSummary: ManagerHealthSummary) {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const zip = new JSZip();
  const folderName = `${managerSummary.manager.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-creator-reports-${timestamp}`;
  const folder = zip.folder(folderName);

  for (const creator of managerSummary.creators.filter(isTeamHealthScoreCreator)) {
    const safeUsername = creator.username.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();
    const reportBlob = await renderCreatorReportToPngBlob(buildReportHtml(creator, "creator"));
    folder?.file(`${safeUsername}-weekly-creator-report.png`, reportBlob);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${folderName}.zip`);
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadManagerReport(
  managerSummary: ManagerHealthSummary,
  movementItems: WeeklyHealthComparison[],
  agencyAverageScore: number,
  managerTrend: ManagerHealthTrendPoint[]
) {
  const healthScoreCreators = managerSummary.creators.filter(isTeamHealthScoreCreator);
  const creatorsForStats = healthScoreCreators;
  const strongestCreators = [...creatorsForStats].sort((a, b) => b.healthScore - a.healthScore).slice(0, 8);
  const belowAgencyAverageCreators = [...creatorsForStats]
    .filter((creator) => creator.healthScore < agencyAverageScore)
    .sort((a, b) => a.healthScore - b.healthScore);
  const improvingCreators = movementItems.filter((item) => item.change !== null && item.change > 10);
  const decliningCreators = movementItems.filter((item) => item.change !== null && item.change < -10);
  const stableCreators = movementItems.filter(
    (item) => item.change !== null && item.change >= -10 && item.change <= 10
  );
  const thirtyDayAverage = managerSummary.thirtyDayAverageScore;
  const trendChange =
    managerTrend.length > 1 ? managerTrend[managerTrend.length - 1].score - managerTrend[0].score : 0;
  const movementChanges = movementItems
    .map((item) => item.change)
    .filter((change): change is number => change !== null);
  const sevenDayMovement =
    movementChanges.length > 0
      ? movementChanges.reduce((sum, change) => sum + change, 0) / movementChanges.length
      : 0;
  const reportDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lastSevenDiamonds = managerSummary.creators.reduce((sum, creator) => sum + getLastSevenDiamonds(creator), 0);
  const lastSevenHours = managerSummary.creators.reduce((sum, creator) => sum + getLastSevenHours(creator), 0);
  const lastSevenBattles = managerSummary.creators.reduce((sum, creator) => sum + getLastSevenMatches(creator), 0);
  const lastThirtyDiamonds = managerSummary.creators.reduce(
    (sum, creator) => sum + creator.dailyPoints.reduce((pointSum, point) => pointSum + point.diamonds, 0),
    0
  );
  const lastThirtyHours = managerSummary.creators.reduce(
    (sum, creator) => sum + creator.dailyPoints.reduce((pointSum, point) => pointSum + point.liveHours, 0),
    0
  );
  const lastThirtyBattles = managerSummary.creators.reduce(
    (sum, creator) => sum + creator.dailyPoints.reduce((pointSum, point) => pointSum + point.matches, 0),
    0
  );
  const averageDph = lastSevenHours > 0 ? lastSevenDiamonds / lastSevenHours : 0;
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(managerSummary.manager)} - Manager Team Health Report</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #102033; background: #eef7ff; }
    main { max-width: 1120px; margin: 0 auto; min-height: 100vh; background: white; padding: 40px; border-top: 8px solid #0284c7; }
    h1 { margin: 0; color: #082f49; font-size: 34px; }
    h2 { margin-top: 34px; color: #075985; font-size: 22px; }
    .muted { color: #64748b; }
    .hero { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
    .score-row { display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 12px; min-width: 420px; }
    .score { border: 1px solid #bae6fd; background: #e0f2fe; color: #075985; border-radius: 18px; padding: 18px 22px; text-align: right; }
    .score strong { display: block; font-size: 42px; line-height: 1; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 28px; }
    .summary-section { margin-top: 28px; border: 1px solid #dbeafe; border-radius: 18px; padding: 18px; background: #fbfdff; }
    .summary-title { margin: 0 0 12px; color: #075985; font-size: 13px; font-weight: 900; text-transform: uppercase; }
    .summary-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 18px; }
    .summary-columns .summary-section { margin-top: 0; }
    .section-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .card { border: 1px solid #dbeafe; background: #f8fbff; border-radius: 16px; padding: 16px; }
    .label { color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .value { margin-top: 8px; color: #0f172a; font-size: 24px; font-weight: 900; }
    .value.elite-value { color: #7e22ce; }
    .value.good { color: #047857; }
    .value.warn { color: #c2410c; }
    .value.performance-value { color: #0369a1; }
    .value.bad { color: #b91c1c; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
    th { background: #e0f2fe; color: #075985; text-align: left; padding: 10px; border: 1px solid #bae6fd; }
    td { padding: 10px; border: 1px solid #dbeafe; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fbff; }
    .pill { display: inline-block; border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 800; }
    .elite { background: #f3e8ff; color: #7e22ce; }
    .healthy { background: #dcfce7; color: #047857; }
    .attention { background: #ffedd5; color: #c2410c; }
    .performance { background: #e0f2fe; color: #0369a1; }
    .quality { background: #fee2e2; color: #b91c1c; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .panel { border: 1px solid #dbeafe; border-radius: 18px; padding: 18px; background: #f8fbff; }
    .creator-action-row td { padding: 0 10px 16px; background: white !important; border-top: 0; }
    .creator-action-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .creator-action-box { border: 1px solid #dbeafe; background: #f8fbff; border-radius: 14px; padding: 12px 14px; line-height: 1.45; }
    .creator-action-title { color: #075985; font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 5px; }
    ul { margin: 10px 0 0; padding-left: 20px; }
    li { margin: 7px 0; }
    @media print {
      body { background: white; }
      main { max-width: none; border-top: 0; }
      .panel, .card, table { break-inside: avoid; }
    }
  </style>
</head>
<body>
<main>
  <section class="hero">
    <div>
      <p class="label">Manager Team Health Report</p>
      <h1>${escapeHtml(managerSummary.manager)}</h1>
      <p class="muted">${reportDate} &bull; Aqua Creator Intelligence</p>
    </div>
    <div class="score-row">
      <div class="score">
        <span class="label">7-Day Team Health</span>
        <strong>${formatNumber(managerSummary.averageScore)}</strong>
        <span>/100 average</span>
      </div>
      <div class="score">
        <span class="label">30-Day Team Health</span>
        <strong>${formatNumber(thirtyDayAverage)}</strong>
        <span>/100 average</span>
      </div>
    </div>
  </section>

  <section class="summary-section">
    <h2 class="summary-title">Team Snapshot</h2>
    <div class="section-cards">
      <div class="card"><div class="label">Creators</div><div class="value">${formatNumber(managerSummary.totalCreators)}</div></div>
      <div class="card"><div class="label">New Creators</div><div class="value">${formatNumber(managerSummary.newCreators)}</div></div>
      <div class="card"><div class="label">30-Day Health Score</div><div class="value">${formatNumber(managerSummary.thirtyDayAverageScore)}</div></div>
      <div class="card"><div class="label">7-Day Movement</div><div class="value ${sevenDayMovement >= 0 ? "good" : "bad"}">${sevenDayMovement >= 0 ? "+" : ""}${formatNumber(sevenDayMovement)}</div></div>
      <div class="card"><div class="label">30-Day Movement</div><div class="value ${trendChange >= 0 ? "good" : "bad"}">${trendChange >= 0 ? "+" : ""}${formatNumber(trendChange)}</div></div>
    </div>
  </section>

  <section class="summary-columns">
    <div class="summary-section">
      <h2 class="summary-title">Last 7 Days</h2>
      <div class="section-cards">
        <div class="card"><div class="label">Diamonds</div><div class="value">${formatNumber(lastSevenDiamonds)}</div></div>
        <div class="card"><div class="label">Hours</div><div class="value">${formatHours(lastSevenHours)}h</div></div>
        <div class="card"><div class="label">Battles</div><div class="value">${formatNumber(lastSevenBattles)}</div></div>
        <div class="card"><div class="label">DPH</div><div class="value">${formatNumber(averageDph)}</div></div>
      </div>
    </div>
    <div class="summary-section">
      <h2 class="summary-title">Last 30 Days</h2>
      <div class="section-cards">
        <div class="card"><div class="label">Last 30 Diamonds</div><div class="value">${formatNumber(lastThirtyDiamonds)}</div></div>
        <div class="card"><div class="label">Last 30 Hours</div><div class="value">${formatHours(lastThirtyHours)}h</div></div>
        <div class="card"><div class="label">Last 30 Battles</div><div class="value">${formatNumber(lastThirtyBattles)}</div></div>
      </div>
    </div>
  </section>
  <h2>30-Day Manager Health Trend</h2>
  <section class="panel">
    <p class="muted">Daily average team health for this manager over the latest 30 uploaded days.</p>
    ${buildManagerTrendChartSvg(managerTrend)}
  </section>

  <h2>Team Mix</h2>
  <section class="grid">
    <div class="card"><div class="label">Elite</div><div class="value elite-value">${formatNumber(managerSummary.elite)}</div></div>
    <div class="card"><div class="label">Healthy</div><div class="value good">${formatNumber(managerSummary.healthy)}</div></div>
    <div class="card"><div class="label">Needs Attention</div><div class="value warn">${formatNumber(managerSummary.needsAttention)}</div></div>
    <div class="card"><div class="label">Low Performance</div><div class="value performance-value">${formatNumber(managerSummary.lowPerformance)}</div></div>
    <div class="card"><div class="label">Low Quality</div><div class="value bad">${formatNumber(managerSummary.lowQuality)}</div></div>
  </section>

  <h2>Manager Action Summary</h2>
  <section class="panel">
    <ul>
      <li>Move the lowest scoring creators first. They are having the biggest negative impact on the team average.</li>
      <li>Target creators below 50 for live-day consistency, weekly hours and battle rhythm before chasing DPH.</li>
      <li>Protect healthy and elite creators by keeping their routine stable, then use them as examples for the team.</li>
      <li>Use the week-on-week movement section to decide who needs urgent manager follow-up and who needs their routine protected.</li>
    </ul>
  </section>

  <h2>Health Score Improvement Map</h2>
  <section class="panel">
    <p class="muted">This shows where each creator's health score came from and where the manager can still win more points.</p>
    <table>
      <tr>
        <th>Creator</th>
        <th>Total</th>
        <th>Live Days</th>
        <th>Hours</th>
        <th>Battles</th>
        <th>DPH</th>
        <th>Biggest Points Available</th>
        <th>Manager Improvement Route</th>
      </tr>
      ${managerSummary.creators
        .map((creator) => {
          const rows = buildHealthScoreRows(creator);
          const opportunity = getTopHealthScoreOpportunity(creator);

          return `<tr>
            <td><strong>${escapeHtml(creator.username)}</strong></td>
            <td>${formatNumber(creator.healthScore)}/100</td>
            <td>${formatNumber(rows[0].earned)}/${formatNumber(rows[0].max)}</td>
            <td>${formatNumber(rows[1].earned)}/${formatNumber(rows[1].max)}</td>
            <td>${formatNumber(rows[2].earned)}/${formatNumber(rows[2].max)}</td>
            <td>${formatNumber(rows[3].earned)}/${formatNumber(rows[3].max)}</td>
            <td>${opportunity ? `${escapeHtml(opportunity.area)}: ${formatNumber(opportunity.available)} pts` : "No major gap"}</td>
            <td>${escapeHtml(opportunity?.improvement || "Keep the current routine stable and set one stretch target.")}</td>
          </tr>`;
        })
        .join("")}
    </table>
  </section>

  <h2>Week-On-Week Movement</h2>
  <section class="grid">
    <div class="card"><div class="label">Improving</div><div class="value good">${formatNumber(improvingCreators.length)}</div></div>
    <div class="card"><div class="label">Stable</div><div class="value">${formatNumber(stableCreators.length)}</div></div>
    <div class="card"><div class="label">Declining</div><div class="value bad">${formatNumber(decliningCreators.length)}</div></div>
  </section>
  <table>
    <tr><th>Creator</th><th>Movement</th><th>Reason / Focus</th></tr>
    ${movementItems
      .filter((item) => item.change !== null)
      .sort((a, b) => (a.change ?? 0) - (b.change ?? 0))
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.creator.username)}</td><td>${formatNumber(item.previousScore ?? 0)} to ${formatNumber(
            item.creator.healthScore
          )} (${item.change && item.change > 0 ? "+" : ""}${formatNumber(item.change ?? 0)})</td><td>${escapeHtml(
            getScoreMovementReason(item.creator, item.previousScore, item.change)
          )}</td></tr>`
      )
      .join("")}
  </table>

  <section class="two-col">
    <div>
      <h2>Biggest Contributors</h2>
      <div class="panel">
        <table>
          <tr><th>Creator</th><th>Score</th><th>Why</th></tr>
          ${strongestCreators
            .map(
              (creator) =>
                `<tr><td>${escapeHtml(creator.username)}</td><td>${formatNumber(creator.healthScore)}/100</td><td>${escapeHtml(
                  creator.creatorTags.slice(0, 3).join(", ") || "Strong weekly performance"
                )}</td></tr>`
            )
            .join("")}
        </table>
      </div>
    </div>
    <div>
      <h2>Bringing The Average Down</h2>
      <div class="panel">
        <p class="muted">Only creators below the current Aqua agency average of ${formatNumber(agencyAverageScore)}/100 are shown here.</p>
        <table>
          <tr><th>Creator</th><th>Score</th><th>First Fix</th></tr>
          ${belowAgencyAverageCreators
            .map((creator) => {
              const firstFix = buildManagerFocusDetail(creator)[0] || "Review weekly activity and set one clear target.";
              return `<tr><td>${escapeHtml(creator.username)}</td><td>${formatNumber(creator.healthScore)}/100</td><td>${escapeHtml(firstFix)}</td></tr>`;
            })
            .join("")}
          ${
            belowAgencyAverageCreators.length
              ? ""
              : `<tr><td colspan="3">No creators in this manager team are currently below the Aqua agency average.</td></tr>`
          }
        </table>
      </div>
    </div>
  </section>

  <h2>Full Creator Detail</h2>
  <table>
    <tr>
      <th>Creator</th>
      <th>Status</th>
      <th>7-Day Score</th>
      <th>30-Day Score</th>
      <th>Score Contribution</th>
      <th>Live Days</th>
      <th>Last 7 Hours</th>
      <th>Last 7 Battles</th>
      <th>Last 7 DPH</th>
      <th>Last 7 Diamonds</th>
      <th>Last 30 Hours</th>
      <th>Last 30 Battles</th>
      <th>Last 30 Diamonds</th>
    </tr>
    ${managerSummary.creators
      .map((creator) => {
        const statusClass = reportToneClass(creator.healthStatus);
        const contribution =
          !isTeamHealthScoreCreator(creator) || !creatorsForStats.length
            ? "Not scored yet"
            : `${formatNumber(creator.healthScore / creatorsForStats.length)} avg pts`;
        const focus = buildManagerFocusDetail(creator).slice(0, 2).join(" ");
        const creatorLastSevenHours = getLastSevenHours(creator);
        const creatorLastSevenMatches = getLastSevenMatches(creator);
        const creatorLastSevenDiamonds = getLastSevenDiamonds(creator);
        const creatorLastSevenDph = getLastSevenDph(creator);
        const creatorLastThirtyHours = creator.dailyPoints.reduce((sum, point) => sum + point.liveHours, 0);
        const creatorLastThirtyMatches = creator.dailyPoints.reduce((sum, point) => sum + point.matches, 0);
        const creatorLastThirtyDiamonds = creator.dailyPoints.reduce((sum, point) => sum + point.diamonds, 0);
        const opportunity = getTopHealthScoreOpportunity(creator);

        return `<tr>
          <td><strong>${escapeHtml(creator.username)}</strong><br><span class="muted">${escapeHtml(creator.tierStatus)}</span></td>
          <td><span class="pill ${statusClass}">${escapeHtml(creator.healthStatus)}</span></td>
          <td>${formatNumber(creator.healthScore)}/100</td>
          <td>${formatNumber(creator.monthlyHealthScore)}/100</td>
          <td>${contribution}</td>
          <td>${formatNumber(creator.oneHourDays)}/${formatNumber(creator.healthWindowDays)}</td>
          <td>${formatHours(creatorLastSevenHours)}h</td>
          <td>${formatNumber(creatorLastSevenMatches)}</td>
          <td>${formatNumber(creatorLastSevenDph)}</td>
          <td>${formatNumber(creatorLastSevenDiamonds)}</td>
          <td>${formatHours(creatorLastThirtyHours)}h</td>
          <td>${formatNumber(creatorLastThirtyMatches)}</td>
          <td>${formatNumber(creatorLastThirtyDiamonds)}</td>
        </tr>
        <tr class="creator-action-row">
          <td colspan="13">
            <div class="creator-action-grid">
              <div class="creator-action-box"><div class="creator-action-title">Weekly Target</div>${escapeHtml(getWeeklyTargetText(creator))}</div>
              <div class="creator-action-box"><div class="creator-action-title">Manager Focus</div>${escapeHtml(focus || "Keep monitoring weekly performance.")}</div>
              <div class="creator-action-box"><div class="creator-action-title">Health Score Points</div>${
                opportunity
                  ? `${escapeHtml(opportunity.area)} has ${formatNumber(opportunity.available)} points still available. ${escapeHtml(opportunity.improvement)}`
                  : "No major score gap. Protect consistency and set one stretch target."
              }</div>
            </div>
          </td>
        </tr>`;
      })
      .join("")}
  </table>
</main>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${managerSummary.manager.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-manager-team-health-${timestamp}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type CreatorIntelligenceDashboardProps = {
  lockedManagerUsername?: string;
};

export default function CreatorIntelligenceDashboard({
  lockedManagerUsername = "",
}: CreatorIntelligenceDashboardProps) {
  const normalizedLockedManager = lockedManagerUsername.trim().toLowerCase();
  const lockedManagerDisplayName = normalizedLockedManager
    ? getManagerDisplayName(normalizedLockedManager)
    : "";
  const [manager, setManager] = useState("All Managers");
  const [graduationStatus, setGraduationStatus] = useState("All Graduation");
  const [tierStatus, setTierStatus] = useState("All Tiers");
  const [healthStatus, setHealthStatus] = useState("All Health");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = useMemo(() => deferredSearch.trim().toLowerCase(), [deferredSearch]);
  const [rows, setRows] = useState<CreatorStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCreatorKey, setSelectedCreatorKey] = useState("");
  const [manualFocusCreatorKeys, setManualFocusCreatorKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const savedKeys = window.localStorage.getItem(MANUAL_FOCUS_STORAGE_KEY);
      const parsedKeys = savedKeys ? JSON.parse(savedKeys) : [];
      return Array.isArray(parsedKeys) ? parsedKeys.filter((key) => typeof key === "string") : [];
    } catch {
      return [];
    }
  });
  const [expandedManager, setExpandedManager] = useState("");
  const [floatingProfileOpen, setFloatingProfileOpen] = useState(false);
  const [profileRange, setProfileRange] = useState<"week" | "month">("week");
  const [selectedChartMetrics, setSelectedChartMetrics] = useState<ChartMetricKey[]>([
    "diamonds",
    "liveHours",
    "matches",
  ]);

  useEffect(() => {
    window.localStorage.setItem(MANUAL_FOCUS_STORAGE_KEY, JSON.stringify(manualFocusCreatorKeys));
  }, [manualFocusCreatorKeys]);

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
      setLoading(true);

      try {
        const batches = await Promise.all([
          fetchRows("creator_daily_stats", DATA_START_DATE, LEGACY_TABLE_END_DATE),
          fetchRows("aqua_daily_stats", AQUA_TABLE_START_DATE, OPEN_ENDED_DATA_DATE),
        ]);
        setRows(batches.flat());
      } catch (error) {
        console.error(error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const uploadedDates = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.stat_date)))
        .sort((a, b) => a.localeCompare(b)),
    [rows]
  );
  const latestUploadedDate = uploadedDates[uploadedDates.length - 1] || "";
  const rollingSevenDateSet = useMemo(
    () => new Set(uploadedDates.slice(-7)),
    [uploadedDates]
  );
  const rollingThirtyDateSet = useMemo(
    () => new Set(uploadedDates.slice(-30)),
    [uploadedDates]
  );
  const lastSevenRows = useMemo(
    () => rows.filter((row) => rollingSevenDateSet.has(row.stat_date)),
    [rollingSevenDateSet, rows]
  );
  const lastThirtyRows = useMemo(
    () => rows.filter((row) => rollingThirtyDateSet.has(row.stat_date)),
    [rollingThirtyDateSet, rows]
  );

  const allSummaries = useMemo(
    () => buildCreatorSummaries(lastSevenRows, lastThirtyRows),
    [lastSevenRows, lastThirtyRows]
  );
  const aquaRows = useMemo(() => lastSevenRows.filter(isAquaRow), [lastSevenRows]);
  const rollingAquaRows = useMemo(() => lastThirtyRows.filter(isAquaRow), [lastThirtyRows]);
  const latestAquaDate = useMemo(() => {
    const dates = aquaRows.map((row) => row.stat_date).sort((a, b) => a.localeCompare(b));
    return dates[dates.length - 1] || "";
  }, [aquaRows]);
  const activeAquaCreatorKeys = useMemo(() => {
    const latestRows = latestAquaDate
      ? aquaRows.filter((row) => row.stat_date === latestAquaDate)
      : aquaRows;

    return new Set(latestRows.map((row) => getUsername(row).toLowerCase()));
  }, [aquaRows, latestAquaDate]);
  const aquaSummaries = useMemo(
    () =>
      allSummaries.filter(
        (creator) =>
          creator.agency === "Aqua" &&
          activeAquaCreatorKeys.has(creator.key) &&
          (!normalizedLockedManager ||
            isManagerMatch(`${creator.managerRaw} ${creator.managerLabel}`, normalizedLockedManager))
      ),
    [activeAquaCreatorKeys, allSummaries, normalizedLockedManager]
  );

  const managers = useMemo(() => {
    const values = new Set(aquaSummaries.map((item) => item.managerLabel).filter(Boolean));
    return ["All Managers", ...Array.from(values).sort()];
  }, [aquaSummaries]);

  const activeManager = normalizedLockedManager
    ? "All Managers"
    : managers.includes(manager)
      ? manager
      : "All Managers";

  const graduationStatuses = useMemo(() => {
    const values = new Set(aquaSummaries.map((item) => item.graduationStatus).filter(Boolean));
    return ["All Graduation", ...Array.from(values).sort()];
  }, [aquaSummaries]);

  const tierStatuses = useMemo(() => {
    const coreTiers = Array.from({ length: 10 }, (_, index) => `Tier ${index + 1}`);
    const uploadedTiers = Array.from(
      new Set(aquaSummaries.map((item) => item.tierStatus).filter(Boolean))
    ).filter((item) => !coreTiers.some((tier) => tier.toLowerCase() === item.toLowerCase()));
    return ["All Tiers", ...coreTiers, ...uploadedTiers.sort()];
  }, [aquaSummaries]);

  const filteredCreators = useMemo(() => {
    return aquaSummaries.filter((creator) => {
      const managerMatch = activeManager === "All Managers" || creator.managerLabel === activeManager;
      const graduationMatch =
        graduationStatus === "All Graduation" || creator.graduationStatus === graduationStatus;
      const tierMatch =
        tierStatus === "All Tiers" || creator.tierStatus.toLowerCase() === tierStatus.toLowerCase();
      const healthMatch = healthStatus === "All Health" || creator.healthStatus === healthStatus;
      const haystack = [
        creator.username,
        creator.email,
        creator.agency,
        creator.group,
        creator.managerLabel,
        creator.managerRaw,
        creator.graduationStatus,
        creator.tierStatus,
      ]
        .join(" ")
        .toLowerCase();
      const searchMatch = !normalizedSearch || haystack.includes(normalizedSearch);

      return (
        managerMatch &&
        graduationMatch &&
        tierMatch &&
        healthMatch &&
        searchMatch
      );
    });
  }, [
    aquaSummaries,
    graduationStatus,
    healthStatus,
    activeManager,
    normalizedSearch,
    tierStatus,
  ]);

  const matureFilteredCreators = useMemo(
    () => filteredCreators.filter(isTeamHealthScoreCreator),
    [filteredCreators]
  );

  const managerHealthSummaries = useMemo<ManagerHealthSummary[]>(() => {
    const managerFilteredCreators = aquaSummaries.filter((creator) => {
      const graduationMatch =
        graduationStatus === "All Graduation" || creator.graduationStatus === graduationStatus;
      const tierMatch =
        tierStatus === "All Tiers" || creator.tierStatus.toLowerCase() === tierStatus.toLowerCase();
      const healthMatch = healthStatus === "All Health" || creator.healthStatus === healthStatus;
      const haystack = [
        creator.username,
        creator.agency,
        creator.group,
        creator.managerLabel,
        creator.managerRaw,
        creator.graduationStatus,
        creator.tierStatus,
      ]
        .join(" ")
        .toLowerCase();
      const searchMatch = !normalizedSearch || haystack.includes(normalizedSearch);

      return graduationMatch && tierMatch && healthMatch && searchMatch;
    });
    const grouped = new Map<string, CreatorSummary[]>();

    for (const creator of managerFilteredCreators) {
      const managerName = creator.managerLabel || "Unassigned";
      grouped.set(managerName, [...(grouped.get(managerName) || []), creator]);
    }

    return Array.from(grouped.entries())
      .map(([managerName, creators]) => {
        const matureCreators = creators.filter(isTeamHealthScoreCreator);
        const scoreBase = matureCreators;
        const averageScore =
          scoreBase.length > 0
            ? scoreBase.reduce((sum, creator) => sum + creator.healthScore, 0) / scoreBase.length
            : 0;
        const thirtyDayAverageScore =
          scoreBase.length > 0
            ? scoreBase.reduce((sum, creator) => sum + creator.monthlyHealthScore, 0) / scoreBase.length
            : 0;

        return {
          manager: managerName,
          creators: creators.sort((a, b) => a.healthScore - b.healthScore),
          totalCreators: creators.length,
          matureCreators: matureCreators.length,
          newCreators: creators.filter((creator) => creator.isNewCreator).length,
          averageScore,
          thirtyDayAverageScore,
          elite: matureCreators.filter((creator) => creator.healthStatus === "Elite").length,
          healthy: matureCreators.filter((creator) => creator.healthStatus === "Healthy").length,
          needsAttention: matureCreators.filter((creator) => creator.healthStatus === "Needs Attention").length,
          lowPerformance: matureCreators.filter((creator) => creator.healthStatus === "Low Performance").length,
          lowQuality: matureCreators.filter((creator) => creator.healthStatus === "Low Quality").length,
        };
      })
      .sort((a, b) => a.averageScore - b.averageScore);
  }, [aquaSummaries, graduationStatus, healthStatus, normalizedSearch, tierStatus]);

  const managerGrowthSummaries = useMemo(
    () =>
      managerHealthSummaries
        .map((managerSummary) => {
          const trend = buildManagerHealthTrend(lastThirtyRows, managerSummary);
          const first = trend[0]?.score ?? 0;
          const latest = trend[trend.length - 1]?.score ?? 0;
          const change = trend.length > 1 ? latest - first : 0;
          const percentChange = first > 0 ? (change / first) * 100 : latest > 0 ? 100 : 0;
          const currentWeekPoints = trend.slice(-7);
          const previousWeekPoints = trend.slice(-14, -7);
          const currentWeekAverage =
            currentWeekPoints.length > 0
              ? currentWeekPoints.reduce((sum, point) => sum + point.score, 0) / currentWeekPoints.length
              : 0;
          const previousWeekAverage =
            previousWeekPoints.length > 0
              ? previousWeekPoints.reduce((sum, point) => sum + point.score, 0) / previousWeekPoints.length
              : 0;
          const weekChange =
            currentWeekPoints.length > 0 && previousWeekPoints.length > 0
              ? currentWeekAverage - previousWeekAverage
              : 0;
          const weekPercentChange =
            previousWeekAverage > 0
              ? (weekChange / previousWeekAverage) * 100
              : currentWeekAverage > 0
                ? 100
                : 0;

          return {
            managerSummary,
            trend,
            first,
            latest,
            change,
            percentChange,
            currentWeekAverage,
            previousWeekAverage,
            weekChange,
            weekPercentChange,
          };
        })
        .sort((a, b) => b.weekPercentChange - a.weekPercentChange),
    [lastThirtyRows, managerHealthSummaries]
  );

  const newCreators = useMemo(
    () =>
      filteredCreators
        .filter((creator) => creator.isNewCreator)
        .sort((a, b) => b.dailyAverageDiamonds - a.dailyAverageDiamonds),
    [filteredCreators]
  );

  const hiddenPotentialCreators = useMemo(
    () =>
      newCreators.filter(
        (creator) =>
          creator.dailyAverageDiamonds >= 1200 ||
          creator.dph >= 1000 ||
          creator.healthScore >= 70
      ),
    [newCreators]
  );

  const inactiveNewCreators = useMemo(
    () =>
      newCreators.filter(
        (creator) =>
          creator.daysSinceJoining >= 3 &&
          creator.diamonds <= 0 &&
          creator.liveHours <= 0 &&
          creator.healthWindowHours <= 0
      ),
    [newCreators]
  );

  const focusCreators = useMemo(
    () => {
      const lowPerformance = matureFilteredCreators
        .filter((creator) => creator.healthStatus === "Low Performance")
        .sort((a, b) => a.healthScore - b.healthScore);
      const needsAttention = matureFilteredCreators
        .filter((creator) => creator.healthStatus === "Needs Attention")
        .sort((a, b) => a.healthScore - b.healthScore);
      const lowQuality = matureFilteredCreators
        .filter((creator) => creator.healthStatus === "Low Quality")
        .sort((a, b) => b.healthScore - a.healthScore);
      const lowQualityFocusLimit = Math.ceil(lowQuality.length * 0.1);
      const healthy = matureFilteredCreators
        .filter((creator) => creator.healthStatus === "Healthy")
        .sort((a, b) => a.healthScore - b.healthScore);

      return [
        ...lowQuality.slice(0, lowQualityFocusLimit),
        ...lowPerformance,
        ...needsAttention,
        ...healthy,
      ];
    },
    [matureFilteredCreators]
  );

  const manualFocusCreators = useMemo(
    () =>
      manualFocusCreatorKeys
        .map((key) => aquaSummaries.find((creator) => creator.key === key))
        .filter(Boolean) as CreatorSummary[],
    [aquaSummaries, manualFocusCreatorKeys]
  );
  const manualFocusAlertCount = useMemo(
    () =>
      manualFocusCreators.filter((creator) =>
        getFocusDailyStatus(creator, latestAquaDate || creator.latestDate).some((day) => day.missed)
      ).length,
    [latestAquaDate, manualFocusCreators]
  );

  const lowQualityCreators = useMemo(
    () =>
      matureFilteredCreators
        .filter((creator) => creator.healthStatus === "Low Quality")
        .sort((a, b) => b.healthScore - a.healthScore),
    [matureFilteredCreators]
  );

  const totals = useMemo(() => {
    const totalDiamonds = filteredCreators.reduce((sum, row) => sum + row.diamonds, 0);
    const totalHours = filteredCreators.reduce((sum, row) => sum + row.liveHours, 0);
    const totalMatches = filteredCreators.reduce((sum, row) => sum + row.matches, 0);
    const totalFollowers = filteredCreators.reduce((sum, row) => sum + row.newFollowers, 0);
    const averageThirtyDayHealth =
      matureFilteredCreators.length > 0
        ? matureFilteredCreators.reduce((sum, row) => sum + row.monthlyHealthScore, 0) /
          matureFilteredCreators.length
        : 0;

    return {
      totalCreators: filteredCreators.length,
      newCreators: newCreators.length,
      elite: matureFilteredCreators.filter((row) => row.healthStatus === "Elite").length,
      healthy: matureFilteredCreators.filter((row) => row.healthStatus === "Healthy").length,
      needsAttention: matureFilteredCreators.filter((row) => row.healthStatus === "Needs Attention").length,
      lowPerformance: matureFilteredCreators.filter((row) => row.healthStatus === "Low Performance").length,
      lowQuality: matureFilteredCreators.filter((row) => row.healthStatus === "Low Quality").length,
      averageThirtyDayHealth,
      averageDph: totalHours > 0 ? totalDiamonds / totalHours : 0,
      totalDiamonds,
      totalHours,
      totalMatches,
      totalFollowers,
    };
  }, [filteredCreators, matureFilteredCreators, newCreators.length]);

  const agencyHealthTrend = useMemo<AgencyHealthTrendPoint[]>(() => {
    const dates = Array.from(new Set(rollingAquaRows.map((row) => row.stat_date))).sort((a, b) =>
      a.localeCompare(b)
    ).slice(-30);

    return dates.map((date) => {
      const rowsUpToDate = rollingAquaRows.filter(
        (row) => row.stat_date <= date && activeAquaCreatorKeys.has(getUsername(row).toLowerCase())
      );
      const matureCreators = buildCreatorSummaries(rowsUpToDate).filter(
        (creator) => creator.agency === "Aqua" && isTeamHealthScoreCreator(creator)
      );
      const average =
        matureCreators.length > 0
          ? matureCreators.reduce((sum, creator) => sum + creator.healthScore, 0) /
            matureCreators.length
          : 0;

      return {
        date,
        score: Math.round(average),
        creators: matureCreators.length,
      };
    });
  }, [activeAquaCreatorKeys, rollingAquaRows]);

  const weeklyHealthComparison = useMemo<WeeklyHealthComparison[]>(() => {
    if (!latestAquaDate) return [];

    const uploadedDates = Array.from(new Set(rollingAquaRows.map((row) => row.stat_date))).sort((a, b) =>
      a.localeCompare(b)
    );
    const previousUploadedDates = uploadedDates.slice(-14, -7);
    const previousUploadedDateSet = new Set(previousUploadedDates);
    const previousRows = rollingAquaRows.filter(
      (row) =>
        previousUploadedDateSet.has(row.stat_date) &&
        activeAquaCreatorKeys.has(getUsername(row).toLowerCase())
    );
    const previousSummaries = buildCreatorSummaries(previousRows).filter(
      (creator) => creator.agency === "Aqua" && isTeamHealthScoreCreator(creator)
    );
    const previousByCreator = new Map(
      previousSummaries.map((creator) => [creator.key, creator.healthScore])
    );

    return matureFilteredCreators
      .map((creator) => {
        const previousScore = previousByCreator.get(creator.key) ?? null;

        return {
          creator,
          previousScore,
          change: previousScore === null ? null : creator.healthScore - previousScore,
        };
      })
      .sort((a, b) => {
        const aChange = a.change ?? -999;
        const bChange = b.change ?? -999;
        return aChange - bChange;
      });
  }, [activeAquaCreatorKeys, rollingAquaRows, latestAquaDate, matureFilteredCreators]);

  const improvingCreators = useMemo(
    () =>
      weeklyHealthComparison
        .filter((item) => item.change !== null && item.change > 10)
        .sort((a, b) => (b.change ?? 0) - (a.change ?? 0)),
    [weeklyHealthComparison]
  );

  const notImprovingCreators = useMemo(
    () =>
      weeklyHealthComparison
        .filter((item) => item.change !== null && item.change < -10)
        .sort((a, b) => (a.change ?? 0) - (b.change ?? 0)),
    [weeklyHealthComparison]
  );

  const stableCreators = useMemo(
    () =>
      weeklyHealthComparison
        .filter((item) => item.change !== null && item.change >= -10 && item.change <= 10)
        .sort((a, b) => (a.change ?? 0) - (b.change ?? 0)),
    [weeklyHealthComparison]
  );

  const managerMovementSummaries = useMemo(
    () =>
      managerHealthSummaries.map((managerSummary) => {
        const movementItems = weeklyHealthComparison.filter(
          (item) => item.creator.managerLabel === managerSummary.manager && item.change !== null
        );
        const improving = movementItems.filter((item) => (item.change ?? 0) > 10).length;
        const declining = movementItems.filter((item) => (item.change ?? 0) < -10).length;
        const stable = movementItems.filter(
          (item) => (item.change ?? 0) >= -10 && (item.change ?? 0) <= 10
        ).length;
        const [improvingPercent, decliningPercent, stablePercent] = getRoundedPercentages([
          improving,
          declining,
          stable,
        ]);

        return {
          manager: managerSummary.manager,
          totalCreators: movementItems.length,
          improving,
          declining,
          stable,
          improvingPercent,
          decliningPercent,
          stablePercent,
        };
      }),
    [managerHealthSummaries, weeklyHealthComparison]
  );

  const latestGraduationUploadCount = useMemo(() => {
    const uploadedDatesWithActivity = Array.from(new Set(rollingAquaRows
      .filter(
        (row) =>
          getNumber(row, ["diamonds", "Diamonds"]) > 0 ||
          getDurationHours(row, ["live_hours", "LIVE duration"]) > 0 ||
          getNumber(row, ["matches", "Matches"]) > 0
      )
      .map((row) => row.stat_date)));

    return uploadedDatesWithActivity.length;
  }, [rollingAquaRows]);

  const graduationTrackerRows = useMemo<GraduationTrackerRow[]>(() => {
    const activeThirtyDayCount = Math.min(latestGraduationUploadCount, 30);
    const targetToDate = (GRADUATION_TARGET / 30) * activeThirtyDayCount;
    const remainingDays = Math.max(30 - activeThirtyDayCount, 0);

    return filteredCreators
      .filter(
        (creator) =>
          creator.diamonds >= MINIMUM_TRACKER_DIAMONDS &&
          isGraduationEligibleStatus(creator.graduationStatus)
      )
      .map((creator) => {
        const remainingDiamonds = Math.max(GRADUATION_TARGET - creator.diamonds, 0);
        const avgNeededPerDay =
          remainingDays > 0 ? remainingDiamonds / remainingDays : remainingDiamonds;
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
  }, [filteredCreators, latestGraduationUploadCount]);

  const groupedCreators = useMemo(
    () => {
      const coreGroups = [
        { title: "Low Performance", status: "Low Performance" as HealthStatus, creators: matureFilteredCreators.filter((creator) => creator.healthStatus === "Low Performance") },
        { title: "Low Quality", status: "Low Quality" as HealthStatus, creators: matureFilteredCreators.filter((creator) => creator.healthStatus === "Low Quality") },
        { title: "Needs Attention", status: "Needs Attention" as HealthStatus, creators: matureFilteredCreators.filter((creator) => creator.healthStatus === "Needs Attention") },
        { title: "Healthy", status: "Healthy" as HealthStatus, creators: matureFilteredCreators.filter((creator) => creator.healthStatus === "Healthy") },
        { title: "Elite", status: "Elite" as HealthStatus, creators: matureFilteredCreators.filter((creator) => creator.healthStatus === "Elite") },
      ];

      if (healthStatus !== "All Health") {
        return coreGroups.filter((groupItem) => groupItem.status === healthStatus);
      }

      return coreGroups;
    },
    [matureFilteredCreators, healthStatus]
  );
  const visibleCreators = useMemo(
    () => groupedCreators.flatMap((groupItem) => groupItem.creators),
    [groupedCreators]
  );
  const activeSelectedCreatorKey =
    filteredCreators.find((creator) => creator.key === selectedCreatorKey)?.key ||
    visibleCreators[0]?.key ||
    filteredCreators[0]?.key ||
    "";
  const selectedCreator = filteredCreators.find(
    (creator) => creator.key === activeSelectedCreatorKey
  );
  const selectedProfilePoints = selectedCreator
    ? profileRange === "week"
      ? selectedCreator.dailyPoints.slice(-7)
      : selectedCreator.dailyPoints
    : [];
  const selectedProfileStats = selectedCreator
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
            ? selectedProfilePoints.filter((point) => point.liveHours >= 1).length
            : selectedCreator.validDays,
        liveStreams:
          profileRange === "week"
            ? selectedProfilePoints.filter((point) => point.liveHours > 0).length
            : selectedCreator.liveStreams,
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
  const selectedInsights =
    selectedProfileStats && selectedCreator
      ? buildProfileInsights(selectedProfileStats, selectedProfilePoints, profileRange)
      : [];
  const selectedCreatorIsFocused = selectedCreator
    ? manualFocusCreatorKeys.includes(selectedCreator.key)
    : false;

  function selectCreator(creatorKey: string) {
    setSelectedCreatorKey(creatorKey);
    setFloatingProfileOpen(true);
  }

  function addCreatorToFocus(creatorKey: string) {
    setManualFocusCreatorKeys((currentKeys) =>
      currentKeys.includes(creatorKey) ? currentKeys : [...currentKeys, creatorKey]
    );
  }

  function removeCreatorFromFocus(creatorKey: string) {
    setManualFocusCreatorKeys((currentKeys) => currentKeys.filter((key) => key !== creatorKey));
  }

  function copyWhatsAppText(title: string, lines: string[]) {
    const text = [title, ...lines].join("\n\n");
    void navigator.clipboard.writeText(text);
  }

  function buildManagerGroupedWhatsAppLines<T>(
    items: T[],
    getManager: (item: T) => string,
    getCreatorName: (item: T) => string,
    buildCreatorLines: (item: T) => string[]
  ) {
    const grouped = new Map<string, T[]>();

    for (const item of items) {
      const manager = getPlainManagerName(getManager(item) || "Unassigned") || "Unassigned";
      grouped.set(manager, [...(grouped.get(manager) ?? []), item]);
    }

    return Array.from(grouped.entries())
      .sort(([managerA], [managerB]) => managerA.localeCompare(managerB))
      .map(([manager, managerItems]) =>
        [
          manager,
          ...managerItems
            .sort((a, b) => getCreatorName(a).localeCompare(getCreatorName(b)))
            .map((item) => buildCreatorLines(item).join("\n")),
        ].join("\n")
      );
  }

  function copyNewCreatorsText() {
    copyWhatsAppText(
      "New Aqua Creators",
      newCreators.length
        ? buildManagerGroupedWhatsAppLines(
            newCreators,
            (creator) => creator.managerLabel,
            (creator) => creator.username,
            (creator) => [
              `- ${creator.username}`,
              `  Days since joining: ${formatNumber(creator.daysSinceJoining)}`,
              `  Diamonds: ${formatNumber(creator.diamonds)}`,
            ]
          )
        : ["No new creators found for the current filters."]
    );
  }

  function copyHiddenPotentialText() {
    copyWhatsAppText(
      "High Potential Aqua Creators",
      hiddenPotentialCreators.length
        ? buildManagerGroupedWhatsAppLines(
            hiddenPotentialCreators,
            (creator) => creator.managerLabel,
            (creator) => creator.username,
            (creator) => [
              `- ${creator.username}`,
              `  Days since joining: ${formatNumber(creator.daysSinceJoining)}`,
              `  Diamonds: ${formatNumber(creator.diamonds)}`,
              `  DPH: ${formatNumber(creator.dph)}`,
            ]
          )
        : ["No hidden potential creators found for the current filters."]
    );
  }

  function copyGraduationPaceText() {
    const graduationPaceCreators = graduationTrackerRows.filter((creator) => creator.pacePercent >= 70);
    copyWhatsAppText(
      "Aqua Graduation Progress",
      graduationPaceCreators.length
        ? buildManagerGroupedWhatsAppLines(
            graduationPaceCreators,
            (creator) => creator.manager,
            (creator) => creator.username,
            (creator) => [
              `- ${creator.username}`,
              `  Diamonds: ${formatNumber(creator.diamonds)}`,
              `  Progress: ${formatPercent(creator.progressPercent)}`,
            ]
          )
        : ["No creators are currently over 70% graduation pace for these filters."]
    );
  }

  function copyImprovingCreatorsText() {
    copyWhatsAppText(
      "Aqua Creators Improving",
      improvingCreators.length
        ? buildManagerGroupedWhatsAppLines(
            improvingCreators,
            (item) => item.creator.managerLabel,
            (item) => item.creator.username,
            (item) => [
              `- ${item.creator.username}`,
              `  Health score: ${formatNumber(item.previousScore ?? 0)} to ${formatNumber(item.creator.healthScore)}`,
              `  Last 7 days increase: ${formatNumber(item.change ?? 0)} points`,
            ]
          )
        : ["No improving creators found for the current filters."]
    );
  }

  function copyNotImprovingCreatorsText() {
    copyWhatsAppText(
      "Aqua Creators Declining",
      notImprovingCreators.length
        ? buildManagerGroupedWhatsAppLines(
            notImprovingCreators,
            (item) => item.creator.managerLabel,
            (item) => item.creator.username,
            (item) => [
              `- ${item.creator.username}`,
              `  Health score: ${formatNumber(item.previousScore ?? 0)} to ${formatNumber(item.creator.healthScore)}`,
              `  Last 7 days drop: ${formatNumber(Math.abs(item.change ?? 0))} points`,
            ]
          )
        : ["No declining creators found for the current filters."]
    );
  }

  function copyManagerMovementText() {
    copyWhatsAppText(
      "Aqua Manager Creator Movement",
      managerMovementSummaries.length
        ? managerMovementSummaries.map((item) =>
            [
              `${getPlainManagerName(item.manager)}`,
              `Total creators: ${formatNumber(item.totalCreators)}`,
              `${item.improvingPercent}% of creators are improving`,
              `${item.decliningPercent}% of creators are declining`,
              `${item.stablePercent}% of creators are stable`,
            ].join("\n")
          )
        : ["No manager movement data found for the current filters."]
    );
  }

  function toggleChartMetric(metric: ChartMetricKey) {
    setSelectedChartMetrics((current) => {
      if (current.includes(metric)) {
        return current.length > 1 ? current.filter((item) => item !== metric) : current;
      }

      return [...current, metric];
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 text-center md:pl-40">
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/" className="text-sm font-bold text-sky-700 hover:text-sky-600">
                Back home
              </Link>
              <Link href="/creator-intelligence/upload" className="text-sm font-bold text-sky-700 hover:text-sky-600">
                Upload Aqua stats
              </Link>
            </div>
            <Image
              src="/aqua-logo.png"
              alt="Aqua"
              width={240}
              height={120}
              className="mx-auto mt-3 h-20 w-auto object-contain md:h-28"
              priority
            />
            <h1 className="mt-2 text-4xl font-black uppercase text-sky-950 md:text-6xl">
              {normalizedLockedManager ? `${lockedManagerDisplayName} Team Intelligence` : "Creator Intelligence"}
            </h1>
            <p className="mx-auto mt-2 max-w-3xl text-sm text-slate-500 md:text-base">
              {normalizedLockedManager
                ? "Manager-only creator health tracker with the same Aqua reports, filters, graduation tracking and new creator performance views."
                : "Aqua-only creator health tracker with manager focus, graduation tracking, new creator performance and report views."}
            </p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
            {loading ? "Loading creator data..." : `${formatNumber(rows.length)} uploaded rows loaded`}
          </div>
        </div>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
            This page is locked to Aqua creators and always uses the latest uploaded data: last 7 days for weekly stats, last 30 days for trends and 30-day scores.
            {latestUploadedDate ? ` Latest upload: ${latestUploadedDate}.` : ""}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {normalizedLockedManager ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase text-slate-500">Manager</p>
                <p className="mt-2 text-sm font-black text-slate-950">{lockedManagerDisplayName}</p>
              </div>
            ) : (
              <label className="text-xs font-bold uppercase text-slate-500">
                Manager
                <select
                  value={activeManager}
                  onChange={(event) => setManager(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
                >
                  {managers.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="text-xs font-bold uppercase text-slate-500">
              Health
              <select
                value={healthStatus}
                onChange={(event) => setHealthStatus(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {["All Health", "Elite", "Healthy", "Needs Attention", "Low Performance", "Low Quality"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold uppercase text-slate-500">
              Search
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Creator..."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950 placeholder:text-slate-300"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold uppercase text-slate-500">
              Graduation
              <select
                value={graduationStatus}
                onChange={(event) => setGraduationStatus(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {graduationStatuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold uppercase text-slate-500">
              Tier
              <select
                value={tierStatus}
                onChange={(event) => setTierStatus(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
              >
                {tierStatuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total creators" value={formatNumber(totals.totalCreators)} />
          <MetricCard
            label="Average 7-day health score"
            value={
              agencyHealthTrend.length
                ? `${formatNumber(agencyHealthTrend[agencyHealthTrend.length - 1].score)}/100`
                : "0/100"
            }
          />
          <MetricCard label="Average 30-day health score" value={`${formatNumber(totals.averageThirtyDayHealth)}/100`} />
          <MetricCard label="Low performance creators" value={formatNumber(totals.lowPerformance)} />
          <MetricCard label="Low quality creators" value={formatNumber(totals.lowQuality)} />
          <MetricCard label="Needs attention" value={formatNumber(totals.needsAttention)} />
          <MetricCard label="Healthy creators" value={formatNumber(totals.healthy)} />
          <MetricCard label="Elite creators" value={formatNumber(totals.elite)} />
          <MetricCard label="New creators" value={formatNumber(totals.newCreators)} />
          <MetricCard label="Average DPH (diamonds per hour)" value={formatNumber(totals.averageDph)} />
          <MetricCard label="Total diamonds" value={formatNumber(totals.totalDiamonds)} />
          <MetricCard label="Total live hours" value={formatHours(totals.totalHours)} />
          <MetricCard label="Total battles" value={formatNumber(totals.totalMatches)} />
          <MetricCard label="Total new followers" value={formatNumber(totals.totalFollowers)} />
        </section>

        <section className="mb-6">
          <AgencyHealthTrendChart points={agencyHealthTrend} />
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-black uppercase text-sky-900">Manager Growth Leaderboard</h2>
              <p className="mt-1 text-sm text-slate-500">
                Week-by-week movement plus 30-day movement by manager.
              </p>
            </div>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
              {formatNumber(managerGrowthSummaries.length)} managers tracked
            </span>
          </div>

          <div className="grid gap-3">
            {managerGrowthSummaries.map((item, index) => (
              <div
                key={`manager-growth-${item.managerSummary.manager}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400">#{index + 1}</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">{item.managerSummary.manager}</h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      Week: {formatNumber(item.previousWeekAverage)}/100 to {formatNumber(item.currentWeekAverage)}/100
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-sm font-black ${
                      item.weekChange > 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : item.weekChange < 0
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {item.weekChange > 0 ? "+" : ""}
                    {formatNumber(item.weekChange)} pts weekly
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full ${
                      item.weekChange > 0 ? "bg-emerald-500" : item.weekChange < 0 ? "bg-red-500" : "bg-slate-300"
                    }`}
                    style={{ width: `${Math.min(Math.abs(item.weekPercentChange), 100)}%` }}
                  />
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                  <p>
                    <span className="font-black text-slate-700">Week-by-week:</span>{" "}
                    {item.weekChange > 0
                      ? `up ${formatPercent(Math.abs(item.weekPercentChange))}`
                      : item.weekChange < 0
                        ? `down ${formatPercent(Math.abs(item.weekPercentChange))}`
                        : "no movement"}
                  </p>
                  <p>
                    <span className="font-black text-slate-700">30-day:</span>{" "}
                    {formatNumber(item.first)}/100 to {formatNumber(item.latest)}/100 (
                    {item.change > 0 ? "+" : ""}
                    {formatNumber(item.change)} pts)
                  </p>
                </div>
              </div>
            ))}
            {!managerGrowthSummaries.length ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No manager growth data found for these filters.
              </p>
            ) : null}
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-black uppercase text-sky-900">Manager Team Health</h2>
              <p className="mt-1 text-sm text-slate-500">
                Team average by manager, with new creators counted separately from scored creators.
              </p>
            </div>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
              {formatNumber(managerHealthSummaries.length)} managers
            </span>
          </div>

          <div className="grid gap-3">
            {managerHealthSummaries.map((managerSummary) => {
              const scoreWidth = Math.min(Math.max(managerSummary.averageScore, 0), 100);

              return (
                <div
                  key={managerSummary.manager}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 ${
                    activeManager === managerSummary.manager
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-slate-950">{managerSummary.manager}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {formatNumber(managerSummary.totalCreators)} creators /{" "}
                        {formatNumber(managerSummary.matureCreators)} scored /{" "}
                        {formatNumber(managerSummary.newCreators)} new
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-black ${
                          managerSummary.averageScore >= 70
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : managerSummary.averageScore >= 50
                              ? "border-orange-200 bg-orange-50 text-orange-700"
                              : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        7-day {formatNumber(managerSummary.averageScore)}/100
                      </span>
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-black text-sky-700">
                        30-day {formatNumber(managerSummary.thirtyDayAverageScore)}/100
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="h-3 overflow-hidden rounded-full bg-white">
                      <div
                        className={`h-full ${
                          managerSummary.averageScore >= 70
                            ? "bg-emerald-500"
                            : managerSummary.averageScore >= 50
                              ? "bg-orange-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${scoreWidth}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      Team average across scored creators
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-purple-50 p-2 font-bold text-purple-700">
                      <p>{formatNumber(managerSummary.elite)}</p>
                      <p className="mt-1 text-[10px] uppercase">Elite</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-2 font-bold text-emerald-700">
                      <p>{formatNumber(managerSummary.healthy)}</p>
                      <p className="mt-1 text-[10px] uppercase">Healthy</p>
                    </div>
                    <div className="rounded-xl bg-orange-50 p-2 font-bold text-orange-700">
                      <p>{formatNumber(managerSummary.needsAttention)}</p>
                      <p className="mt-1 text-[10px] uppercase">Attention</p>
                    </div>
                    <div className="rounded-xl bg-sky-50 p-2 font-bold text-sky-700">
                      <p>{formatNumber(managerSummary.lowPerformance)}</p>
                      <p className="mt-1 text-[10px] uppercase">Low Perf</p>
                    </div>
                    <div className="rounded-xl bg-red-50 p-2 font-bold text-red-700">
                      <p>{formatNumber(managerSummary.lowQuality)}</p>
                      <p className="mt-1 text-[10px] uppercase">Low Qual</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedManager((current) =>
                          current === managerSummary.manager ? "" : managerSummary.manager
                        )
                      }
                      className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-700 hover:bg-sky-50"
                    >
                      {expandedManager === managerSummary.manager ? "Hide Team" : "View Team"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setManager(managerSummary.manager)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                    >
                      Filter Page
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadManagerReport(
                          managerSummary,
                          weeklyHealthComparison.filter(
                            (item) => item.creator.managerLabel === managerSummary.manager
                          ),
                          agencyHealthTrend.length
                            ? agencyHealthTrend[agencyHealthTrend.length - 1].score
                            : 0,
                          managerGrowthSummaries.find(
                            (item) => item.managerSummary.manager === managerSummary.manager
                          )?.trend || buildManagerHealthTrend(lastThirtyRows, managerSummary)
                        )
                      }
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                    >
                      Download Manager Report
                    </button>
                    <button
                      type="button"
                      onClick={() => void downloadTeamCreatorReports(managerSummary)}
                      className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-black text-purple-700 hover:bg-purple-100"
                    >
                      Download All Creator Reports
                    </button>
                  </div>

                  {expandedManager === managerSummary.manager ? (
                    <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
                      {[...managerSummary.creators].sort((a, b) => b.healthScore - a.healthScore).map((creator) => (
                        <button
                          key={`manager-team-${managerSummary.manager}-${creator.key}`}
                          type="button"
                          onClick={() => selectCreator(creator.key)}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left hover:border-sky-200 hover:bg-sky-50"
                        >
                          <span>
                            <span className="block font-black text-slate-950">{creator.username}</span>
                            <span className="block text-xs text-slate-500">{creator.healthStatus}</span>
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses(creator.healthStatus)}`}>
                            {creator.healthScore}/100
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {!managerHealthSummaries.length ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No manager health data found for these filters.
            </p>
          ) : null}
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-black uppercase text-sky-900">Manager Creator Movement</h2>
              <p className="mt-1 text-sm text-slate-500">
                Creator movement split by manager. Stable is within 10 health score points either way.
              </p>
            </div>
            <button
              type="button"
              onClick={copyManagerMovementText}
              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-sky-700 hover:bg-sky-100"
            >
              Copy WhatsApp Text
            </button>
          </div>

          <div className="grid gap-3">
            {managerMovementSummaries.map((item) => (
              <div
                key={`manager-movement-${item.manager}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{item.manager}</h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {formatNumber(item.totalCreators)} creators with weekly movement data
                    </p>
                  </div>
                  <div className="grid gap-2 text-center sm:grid-cols-3 lg:min-w-[520px]">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-2xl font-black text-emerald-700">{item.improvingPercent}%</p>
                      <p className="mt-1 text-[10px] font-black uppercase text-emerald-700">
                        Improving ({formatNumber(item.improving)})
                      </p>
                    </div>
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                      <p className="text-2xl font-black text-red-700">{item.decliningPercent}%</p>
                      <p className="mt-1 text-[10px] font-black uppercase text-red-700">
                        Declining ({formatNumber(item.declining)})
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-2xl font-black text-slate-700">{item.stablePercent}%</p>
                      <p className="mt-1 text-[10px] font-black uppercase text-slate-600">
                        Stable ({formatNumber(item.stable)})
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!managerMovementSummaries.length ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No manager movement data found for these filters.
              </p>
            ) : null}
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-black uppercase text-sky-900">Focus</h2>
              <p className="mt-1 text-sm text-slate-500">
                Creators you manually add from the floating profile. Red means they missed the day or went live for less than one hour.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                {formatNumber(manualFocusCreators.length)} focused
              </span>
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                {formatNumber(manualFocusAlertCount)} need check
              </span>
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Creator</th>
                  <th className="p-3">Manager</th>
                  <th className="p-3">Last 3 Days</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {manualFocusCreators.map((creator) => {
                  const focusDays = getFocusDailyStatus(creator, latestAquaDate || creator.latestDate);
                  const needsCheck = focusDays.some((day) => day.missed);

                  return (
                    <tr
                      key={`manual-focus-${creator.key}`}
                      className={`border-t border-slate-100 ${needsCheck ? "bg-red-50/60" : "bg-white"}`}
                    >
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => selectCreator(creator.key)}
                          className="text-left font-black text-slate-950 hover:text-sky-700"
                        >
                          {creator.username}
                        </button>
                        <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(creator)}</p>
                      </td>
                      <td className="p-3 text-slate-600">{creator.managerLabel}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {focusDays.map((day) => (
                            <div
                              key={`${creator.key}-${day.date}`}
                              className={`min-w-24 rounded-xl border px-3 py-2 ${
                                day.missed
                                  ? "border-red-200 bg-red-100 text-red-800"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
                              }`}
                            >
                              <p className="text-[10px] font-black uppercase">{formatShortDate(day.date)}</p>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                                <div
                                  className={day.missed ? "h-full bg-red-500" : "h-full bg-emerald-500"}
                                  style={{ width: `${Math.min((day.liveHours / 3) * 100, 100)}%` }}
                                />
                              </div>
                              <p className="mt-1 text-xs font-black">{formatHours(day.liveHours)}h</p>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${
                            needsCheck
                              ? "border-red-200 bg-red-100 text-red-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {needsCheck ? "Check in" : "On track"}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => removeCreatorFromFocus(creator.key)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          Remove Focus
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!manualFocusCreators.length ? (
                  <tr>
                    <td className="p-4 text-slate-500" colSpan={5}>
                      No creators added yet. Open any creator profile and choose Add Creator To Focus.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-3xl font-black uppercase text-sky-900">Manager Focus Queue</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Uses the selected manager filter. Priority order is the top 10% most fixable Low Quality creators, then Low Performance, Needs Attention, and Healthy.
                </p>
              </div>
              <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                {formatNumber(focusCreators.length)}
              </span>
            </div>

            <div className="max-h-[760px] overflow-y-auto pr-2">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {focusCreators.map((creator) => (
                <button
                  key={`focus-${creator.key}`}
                  type="button"
                  onClick={() => selectCreator(creator.key)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-sky-300 hover:bg-sky-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{creator.username}</p>
                      <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(creator)}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses(creator.healthStatus)}`}>
                      {creator.healthStatus} {creator.healthScore}/100
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    Focus: {creator.creatorTags.slice(0, 3).join(", ") || "Build consistency"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Diamonds: {formatNumber(creator.diamonds)}
                  </p>
                </button>
              ))}
              </div>
              {!focusCreators.length ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No creators found for the manager focus queue in these filters.
                </p>
              ) : null}
            </div>
        </section>

        {selectedCreator ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-sky-700">Selected Creator Profile</p>
                <h2 className="mt-1 text-3xl font-black text-slate-950 md:text-5xl">
                  {selectedCreator.username}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {getCreatorMetaLine(selectedCreator)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${statusClasses(
                    selectedCreator.healthStatus
                  )}`}
                >
                  Weekly performance {selectedCreator.healthScore}/100 {selectedCreator.healthStatus}
                </span>
                <span
                  className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${statusClasses(
                    selectedCreator.monthlyHealthStatus
                  )}`}
                >
                  30-day performance {selectedCreator.monthlyHealthScore}/100 {selectedCreator.monthlyHealthStatus}
                </span>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-3">
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(["week", "month"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setProfileRange(range)}
                    className={`rounded-lg px-4 py-2 text-sm font-black capitalize ${
                      profileRange === range
                        ? "bg-sky-600 text-white"
                        : "text-slate-500 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {range === "week" ? "Last 7 days" : "Last 30 days"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => downloadReport(selectedCreator, "creator")}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
              >
                Download Creator Report
              </button>
              <button
                type="button"
                onClick={() => downloadReport(selectedCreator, "internal")}
                className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-700 hover:bg-sky-100"
              >
                Download Internal Data Report
              </button>
            </div>

            {selectedProfileStats ? (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard
                label="Diamonds"
                value={formatNumber(selectedProfileStats.diamonds)}
                previous={selectedCreator.diamondsLastMonth}
              />
              <MetricCard
                label="Live hours"
                value={formatHours(selectedProfileStats.liveHours)}
                previous={selectedCreator.liveHoursLastMonth}
              />
              <MetricCard
                label="Valid days"
                value={formatNumber(selectedProfileStats.validDays)}
                previous={selectedCreator.validDaysLastMonth}
              />
              <MetricCard
                label="Live streams"
                value={formatNumber(selectedProfileStats.liveStreams)}
                previous={selectedCreator.liveStreamsLastMonth}
              />
              <MetricCard label="Battles" value={formatNumber(selectedProfileStats.matches)} />
              <MetricCard
                label="Battle diamonds"
                value={formatNumber(selectedCreator.diamondsFromMatches)}
              />
              <MetricCard label="New followers" value={formatNumber(selectedProfileStats.newFollowers)} />
              <MetricCard label="DPH (diamonds per hour)" value={formatNumber(selectedProfileStats.dph)} />
              <MetricCard label="Graduation" value={selectedCreator.graduationStatus} />
              <MetricCard label="Tier" value={selectedCreator.tierStatus} />
            </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-xl font-black uppercase text-sky-900">Health Score Breakdown</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <MetricCard
                  label="Live day validation"
                  value={`${Math.round(selectedCreator.healthBreakdown.liveDays)}/35`}
                />
                <MetricCard
                  label="Live hours"
                  value={`${Math.round(selectedCreator.healthBreakdown.liveHours)}/30`}
                />
                <MetricCard
                  label="Battles"
                  value={`${Math.round(selectedCreator.healthBreakdown.matches)}/10`}
                />
                <MetricCard
                  label="DPH (diamonds per hour)"
                  value={`${Math.round(selectedCreator.healthBreakdown.dph)}/25`}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedCreator.creatorTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-xl font-black uppercase text-sky-900">Creator Charts</h3>
              <div className="mt-4">
                <ComparisonChart
                  points={selectedProfilePoints}
                  selectedMetrics={selectedChartMetrics}
                  onToggleMetric={toggleChartMetric}
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-xl font-black uppercase text-sky-900">Creator Insights</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {selectedInsights.map((insight) => (
                  <div key={insight} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}


        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-sky-950">Weekly Health Movement</h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest uploaded week compared with the previous week. Uses the selected manager filter and includes creators from day 4 onward.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {formatNumber(improvingCreators.length)} improving
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                {formatNumber(stableCreators.length)} stable
              </span>
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                {formatNumber(notImprovingCreators.length)} declining
              </span>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <div>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-black uppercase text-emerald-700">Improving</h3>
                <button
                  type="button"
                  onClick={copyImprovingCreatorsText}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-700 hover:bg-emerald-100"
                >
                  Copy WhatsApp Text
                </button>
              </div>
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-2">
                {improvingCreators.map((item) => (
                  <button
                    key={`improving-${item.creator.key}`}
                    type="button"
                    onClick={() => selectCreator(item.creator.key)}
                    className="w-full rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-left hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{item.creator.username}</p>
                        <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(item.creator)}</p>
                        <p className="mt-1 text-xs font-bold text-slate-600">
                          Manager: {getPlainManagerName(item.creator.managerLabel)}
                        </p>
                      </div>
                      <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-black text-emerald-700">
                        +{formatNumber(item.change ?? 0)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatNumber(item.previousScore ?? 0)} to {formatNumber(item.creator.healthScore)} health score
                    </p>
                  </button>
                ))}
                {!improvingCreators.length ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No improving creators found for these filters.
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-black uppercase text-slate-700">Stable</h3>
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-2">
                {stableCreators.map((item) => (
                  <button
                    key={`stable-${item.creator.key}`}
                    type="button"
                    onClick={() => selectCreator(item.creator.key)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-sky-200 hover:bg-sky-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{item.creator.username}</p>
                        <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(item.creator)}</p>
                        <p className="mt-1 text-xs font-bold text-slate-600">
                          Manager: {getPlainManagerName(item.creator.managerLabel)}
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
                        {formatNumber(item.change ?? 0)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatNumber(item.previousScore ?? 0)} to {formatNumber(item.creator.healthScore)} health score
                    </p>
                  </button>
                ))}
                {!stableCreators.length ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No stable creators found for these filters.
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-black uppercase text-red-700">Declining</h3>
                <button
                  type="button"
                  onClick={copyNotImprovingCreatorsText}
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-700 hover:bg-red-100"
                >
                  Copy WhatsApp Text
                </button>
              </div>
              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-2">
                {notImprovingCreators.map((item) => (
                  <button
                    key={`not-improving-${item.creator.key}`}
                    type="button"
                    onClick={() => selectCreator(item.creator.key)}
                    className="w-full rounded-xl border border-red-100 bg-red-50/60 p-3 text-left hover:border-red-200 hover:bg-red-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{item.creator.username}</p>
                        <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(item.creator)}</p>
                        <p className="mt-1 text-xs font-bold text-slate-600">
                          Manager: {getPlainManagerName(item.creator.managerLabel)}
                        </p>
                      </div>
                      <span className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-red-700">
                        {formatNumber(item.change ?? 0)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatNumber(item.previousScore ?? 0)} to {formatNumber(item.creator.healthScore)} health score
                    </p>
                  </button>
                ))}
                {!notImprovingCreators.length ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No declining creators found for these filters.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-red-700">Low Quality List</h2>
              <p className="mt-1 text-sm text-slate-500">
                Below 50 score and under 5,000 diamonds. The highest-scoring 10% are surfaced in the manager focus queue because they are closest to being moved up.
              </p>
            </div>
            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
              {formatNumber(lowQualityCreators.length)}
            </span>
          </div>

          <div className="max-h-[360px] overflow-y-auto pr-2">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {lowQualityCreators.map((creator) => (
                <button
                  key={`low-quality-${creator.key}`}
                  type="button"
                  onClick={() => selectCreator(creator.key)}
                  className="rounded-xl border border-red-100 bg-red-50/60 p-3 text-left hover:border-red-200 hover:bg-red-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{creator.username}</p>
                      <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(creator)}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-red-700">
                      {creator.healthScore}/100
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {!lowQualityCreators.length ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No Low Quality creators in these filters.
              </p>
            ) : null}
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-sky-950">Health Tracker</h2>
              <p className="mt-1 text-sm text-slate-500">
                Last seven uploaded days. Below 50 with 5,000+ diamonds is Low Performance; below 50 under 5,000 diamonds is Low Quality.
              </p>
            </div>
            <p className="text-sm font-bold text-slate-500">
              {formatNumber(matureFilteredCreators.length)} scored creators
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {(["Elite", "Healthy", "Needs Attention", "Low Performance", "Low Quality"] as HealthStatus[]).map((status) => {
              const count = matureFilteredCreators.filter((creator) => creator.healthStatus === status).length;
              const selected = healthStatus === status;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setHealthStatus(selected ? "All Health" : status)}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                    selected
                      ? "border-sky-400 bg-sky-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/70"
                  }`}
                >
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses(status)}`}>
                    {status}
                  </span>
                  <p className="mt-4 text-4xl font-black text-slate-950">{formatNumber(count)}</p>
                  <p className="mt-1 text-xs font-bold uppercase text-slate-400">Creators</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {filteredCreators.length ? (
              groupedCreators
                .map((groupItem) => (
                  <div key={groupItem.status} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses(groupItem.status)}`}>
                        {groupItem.title}
                      </span>
                      <span className="text-sm font-bold text-slate-500">
                        Showing all {formatNumber(groupItem.creators.length)}
                      </span>
                    </div>

                    <div className="grid max-h-[720px] gap-2 overflow-y-auto p-3 pr-2">
                      {groupItem.creators
                        .sort((a, b) => a.healthScore - b.healthScore)
                        .map((creator) => {
                          const selected = creator.key === activeSelectedCreatorKey;

                          return (
                            <button
                              key={creator.key}
                              type="button"
                              onClick={() => selectCreator(creator.key)}
                            className={`rounded-xl border p-4 text-left transition hover:border-sky-300 hover:bg-sky-50 ${
                                selected
                                  ? "border-sky-400 bg-sky-50"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-black text-slate-950">{creator.username}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {getCreatorMetaLine(creator)}
                                  </p>
                                </div>
                                <span className="text-lg font-black text-sky-800">{creator.healthScore}</span>
                              </div>
                              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                                <div>
                                  <p className="text-slate-400">Live days</p>
                                  <p className="font-bold">
                                    {creator.oneHourDays}/{creator.healthWindowDays} days
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400">Hours</p>
                                  <p className="font-bold">{formatHours(creator.healthWindowHours)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">Battles</p>
                                  <p className="font-bold">{formatNumber(creator.healthWindowMatches)}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      {!groupItem.creators.length ? (
                        <p className="p-4 text-sm text-slate-400">No creators in this bucket.</p>
                      ) : null}
                    </div>
                  </div>
                ))
            ) : (
              <div className="rounded-2xl border border-slate-200 p-4 text-slate-500">
                No creator data found for these filters.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase text-sky-950">Aqua Graduation Tracker</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tracks eligible Aqua creators towards {formatNumber(GRADUATION_TARGET)} diamonds across the latest 30 uploaded days.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyGraduationPaceText}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
              >
                Copy WhatsApp Text
              </button>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">
                30-day target pace: {formatNumber((GRADUATION_TARGET / 30) * Math.min(latestGraduationUploadCount, 30))}
              </div>
            </div>
          </div>

          <div className="mb-4 grid gap-4 md:grid-cols-4">
            <MetricCard label="Tracker creators" value={formatNumber(graduationTrackerRows.length)} />
            <MetricCard
              label="Graduated"
              value={formatNumber(graduationTrackerRows.filter((creator) => creator.status === "gold").length)}
            />
            <MetricCard
              label="On target"
              value={formatNumber(graduationTrackerRows.filter((creator) => creator.status === "green").length)}
            />
            <MetricCard label="Minimum entry" value={formatNumber(MINIMUM_TRACKER_DIAMONDS)} />
          </div>

          <div className="max-h-[620px] overflow-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
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
                  <tr key={`graduation-${creator.username}`} className="border-t border-slate-100">
                    <td className="p-3 font-black text-slate-950">{creator.username}</td>
                    <td className="p-3 text-slate-600">{creator.manager}</td>
                    <td className="p-3">{formatNumber(creator.daysSinceJoining)}</td>
                    <td className="p-3 font-bold text-sky-800">{formatNumber(creator.diamonds)}</td>
                    <td className="p-3">
                      <div className="h-3 w-36 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full ${graduationProgressClasses(creator.status)}`}
                          style={{ width: `${creator.progressPercent}%` }}
                        />
                      </div>
                      <span className="mt-1 block text-xs text-slate-500">
                        {formatPercent(creator.progressPercent)}
                      </span>
                    </td>
                    <td className="p-3">{formatPercent(creator.pacePercent)}</td>
                    <td className="p-3">{formatNumber(creator.remainingDiamonds)}</td>
                    <td className="p-3">{formatNumber(creator.remainingDays)}</td>
                    <td className="p-3 font-bold text-slate-800">{formatNumber(creator.avgNeededPerDay)}</td>
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
                      No eligible Aqua graduation creators found for these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black uppercase text-sky-900">New Creators</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Creators 14 days in or less are shown here. From day 4 onward they are also included in health scores.
                </p>
              </div>
              <button
                type="button"
                onClick={copyNewCreatorsText}
                className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
              >
                Copy WhatsApp Text
              </button>
            </div>
            {inactiveNewCreators.length ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                <h3 className="text-sm font-black uppercase text-red-700">Needs removal check</h3>
                <p className="mt-1 text-xs text-red-600">
                  New creators who are 3+ days in with no live hours and no diamonds.
                </p>
                <div className="mt-3 grid gap-2">
                  {inactiveNewCreators.map((creator) => (
                    <button
                      key={`inactive-new-${creator.key}`}
                      type="button"
                      onClick={() => selectCreator(creator.key)}
                      className="flex items-center justify-between rounded-xl border border-red-100 bg-white px-3 py-2 text-left hover:border-red-200"
                    >
                      <span className="font-bold text-red-900">{creator.username}</span>
                      <span className="text-xs font-black text-red-700">
                        Day {formatNumber(creator.daysSinceJoining)} / 0 diamonds
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-5 grid gap-3">
              {newCreators.slice(0, 12).map((creator) => (
                <button
                  key={`new-${creator.key}`}
                  type="button"
                  onClick={() => selectCreator(creator.key)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-sky-300 hover:bg-sky-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">{creator.username}</p>
                      <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(creator)}</p>
                    </div>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                      Day {formatNumber(creator.daysSinceJoining)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400">Avg diamonds/day</p>
                      <p className="font-bold">{formatNumber(creator.dailyAverageDiamonds)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">DPH (diamonds per hour)</p>
                      <p className="font-bold">{formatNumber(creator.dph)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Health</p>
                      <p className="font-bold">{creator.healthScore}/100</p>
                    </div>
                  </div>
                </button>
              ))}
              {!newCreators.length ? <p className="text-sm text-slate-400">No new creators in these filters.</p> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black uppercase text-emerald-700">Hidden Potential</h2>
                <p className="mt-1 text-sm text-slate-500">
                  New creators already showing strong early diamonds, DPH (diamonds per hour) or health signals.
                </p>
              </div>
              <button
                type="button"
                onClick={copyHiddenPotentialText}
                className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
              >
                Copy WhatsApp Text
              </button>
            </div>
            <div className="mt-5">
              <CreatorListPanel
                title="High Performing New Creators"
                creators={hiddenPotentialCreators}
                tone="border-emerald-100 bg-emerald-50 text-emerald-800"
              />
            </div>
          </div>
        </section>

        {selectedCreator ? (
          <>
            <button
              type="button"
              onClick={() => setFloatingProfileOpen(true)}
              className="fixed bottom-6 right-6 z-40 rounded-full border border-sky-200 bg-sky-600 px-5 py-4 text-sm font-black text-white shadow-2xl hover:bg-sky-700"
            >
              Profile
            </button>
            {floatingProfileOpen ? (
              <aside className="fixed right-6 top-24 z-50 w-[min(420px,calc(100vw-48px))] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-sky-700">Quick Creator Profile</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedCreator.username}</h2>
                    <p className="mt-1 text-xs text-slate-500">{getCreatorMetaLine(selectedCreator)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFloatingProfileOpen(false)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <MetricCard
                    label="Weekly performance"
                    value={`${selectedCreator.healthScore}/100`}
                  />
                  <MetricCard label="Status" value={selectedCreator.healthStatus} />
                  <MetricCard label="Last 7 diamonds" value={formatNumber(getLastSevenDiamonds(selectedCreator))} />
                  <MetricCard label="Last 7 hours" value={formatHours(getLastSevenHours(selectedCreator))} />
                  <MetricCard label="Last 7 battles" value={formatNumber(getLastSevenMatches(selectedCreator))} />
                  <MetricCard label="Last 7 DPH" value={formatNumber(getLastSevenDph(selectedCreator))} />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      selectedCreatorIsFocused
                        ? removeCreatorFromFocus(selectedCreator.key)
                        : addCreatorToFocus(selectedCreator.key)
                    }
                    className={`rounded-xl border px-4 py-3 text-sm font-black ${
                      selectedCreatorIsFocused
                        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {selectedCreatorIsFocused ? "Remove Focus" : "Add Creator To Focus"}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadReport(selectedCreator, "creator")}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100"
                  >
                    Download Creator Report
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadReport(selectedCreator, "internal")}
                    className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-700 hover:bg-sky-100"
                  >
                    Download Internal Data Report
                  </button>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-black uppercase text-slate-700">Manager Focus</h3>
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    {buildManagerFocusDetail(selectedCreator)
                      .slice(0, 3)
                      .map((focus) => (
                        <li key={focus}>{focus}</li>
                      ))}
                  </ul>
                </div>
              </aside>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
