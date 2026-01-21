// app/admin/improvements/page.tsx
import fs from "fs";
import path from "path";
import type { CSSProperties } from "react";
import { creators } from "@/data/creators";
import { MANAGERS, CREATOR_TO_MANAGER } from "@/data/manager-assignments";
import ImprovementsClient, { type ClientRow } from "./ImprovementsClient";

/* ===================== TYPES ===================== */

type HistoryEntry = {
  date: string; // YYYY-MM-DD
  daily: number;
  lifetime: number;
  hours?: number;
};

type HistoryFile = {
  username: string;
  entries: HistoryEntry[];
};

type Status = "ON_TRACK" | "NEEDS_FOCUS" | "INACTIVE";

/* ===================== CONSTANTS ===================== */

const TARGET_DAYS = 15;
const TARGET_HOURS = 40;

const NEXT_LEVEL_DAYS = 20;
const NEXT_LEVEL_HOURS = 60;

const SHOW_SINCE_LIVE_IF_OVER_DAYS = 4;

/* ===================== HELPERS ===================== */

function safeNum(n: unknown) {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function parseDateUTC(d: string) {
  return new Date(d + "T00:00:00Z");
}

function daysBetweenUTC(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

function todayKeyUTC() {
  return new Date().toISOString().slice(0, 10);
}

function monthKeyUTCFromToday() {
  return todayKeyUTC().slice(0, 7);
}

/* ===================== PAGE ===================== */

export default function ImprovementsPage() {
  const historyDir = path.join(process.cwd(), "public", "history");
  const creatorsDir = path.join(process.cwd(), "public", "creators");

  const mk = monthKeyUTCFromToday();
  const todayUTCDateOnly = parseDateUTC(todayKeyUTC());

  const rows: ClientRow[] = creators.map((c) => {
    const username = c.username;

    // Avatar fallback
    const jpgPath = path.join(creatorsDir, `${username}.jpg`);
    const avatarSrc = fs.existsSync(jpgPath)
      ? `/creators/${username}.jpg`
      : "/branding/default-avatar.png";

    // Read history
    const filePath = path.join(historyDir, `${username}.json`);
    let entries: HistoryEntry[] = [];

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const j = JSON.parse(raw) as HistoryFile;
        entries = Array.isArray(j?.entries) ? j.entries : [];
      } catch {
        entries = [];
      }
    }

    const monthHistory = entries.filter((e) => e?.date?.startsWith(mk));

    let monthDiamonds = 0;
    let monthHours = 0;
    let validDays = 0;
    let underHourDays = 0;

    for (const e of monthHistory) {
      monthDiamonds += safeNum(e.daily);
      const hrs = safeNum(e.hours);
      monthHours += hrs;

      if (hrs >= 1) validDays++;
      if (hrs > 0 && hrs < 1) underHourDays++;
    }

    // Last live date
    const lastLive = [...entries].reverse().find((e) => safeNum(e.hours) > 0);
    const lastLiveDate = lastLive?.date;
    const daysSinceLastLive = lastLiveDate
      ? daysBetweenUTC(todayUTCDateOnly, parseDateUTC(lastLiveDate))
      : undefined;

    // Status
    const isInactive = validDays === 0 && monthHours === 0;
    const isOnTrack = validDays >= TARGET_DAYS && monthHours >= TARGET_HOURS;

    const status: Status = isInactive
      ? "INACTIVE"
      : isOnTrack
      ? "ON_TRACK"
      : "NEEDS_FOCUS";

    // Manager (default James)
    const manager = CREATOR_TO_MANAGER[username] ?? "James";

    return {
      username,
      monthDiamonds,
      monthHours,
      validDays,
      underHourDays,
      lastLiveDate,
      daysSinceLastLive,
      status,
      avatarSrc,
      manager,
    };
  });

  // Sort groups: ON_TRACK -> NEEDS_FOCUS -> INACTIVE
  const statusRank: Record<Status, number> = {
    ON_TRACK: 0,
    NEEDS_FOCUS: 1,
    INACTIVE: 2,
  };

  rows.sort((a, b) => {
    const sr = statusRank[a.status] - statusRank[b.status];
    if (sr !== 0) return sr;
    if (b.validDays !== a.validDays) return b.validDays - a.validDays;
    if (b.monthHours !== a.monthHours) return b.monthHours - a.monthHours;
    if (b.monthDiamonds !== a.monthDiamonds) return b.monthDiamonds - a.monthDiamonds;
    return a.username.localeCompare(b.username);
  });

  const now = new Date();
  const monthLabel = now.toLocaleString("default", { month: "long" });
  const year = now.getFullYear();

  /* ===================== STYLES ===================== */

  const page: CSSProperties = {
    minHeight: "100vh",
    padding: "20px 14px",
    color: "white",
    background:
      "radial-gradient(1200px 600px at 20% 0%, rgba(45,224,255,0.18), rgba(0,0,0,0) 55%)," +
      "radial-gradient(1000px 700px at 90% 20%, rgba(45,224,255,0.10), rgba(0,0,0,0) 55%)," +
      "linear-gradient(180deg, #020b14, #041826 55%, #020b14)",
  };

  const wrap: CSSProperties = {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  };

  const card: CSSProperties = {
    borderRadius: 18,
    padding: 16,
    background: "rgba(6, 27, 43, 0.75)",
    border: "1px solid rgba(45,224,255,0.28)",
    boxShadow: "0 0 28px rgba(45,224,255,0.12)",
    backdropFilter: "blur(6px)",
  };

  const title: CSSProperties = {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "0.03em",
    color: "#7cf6ff",
    textShadow: "0 0 12px rgba(45,224,255,0.65), 0 0 28px rgba(45,224,255,0.25)",
    margin: 0,
  };

  const sub: CSSProperties = {
    marginTop: 6,
    fontSize: 13,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.4,
  };

  const mobileCSS = `
    .aqua-table-row { display: grid; }
    @media (max-width: 760px) {
      .aqua-table-head { display: none !important; }
      .aqua-table-row {
        grid-template-columns: 1fr !important;
        gap: 10px !important;
        padding: 14px !important;
      }
      .aqua-cell-center {
        justify-content: space-between !important;
        text-align: left !important;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.04);
      }
      .aqua-cell-center::before {
        content: attr(data-label);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(124,246,255,0.85);
        margin-right: 10px;
      }
      .aqua-creator {
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(45,224,255,0.18);
        background: rgba(45,224,255,0.04);
      }
      .aqua-bars { width: 100% !important; }
    }
  `;

  return (
    <main style={page}>
      <style dangerouslySetInnerHTML={{ __html: mobileCSS }} />

      <div style={wrap}>
        <section style={card}>
          <h1 style={title}>🌊 Aqua Improvements</h1>
          <div style={sub}>
            Month: <b style={{ color: "#7cf6ff" }}>{monthLabel} {year}</b> •{" "}
            <b style={{ color: "#7cf6ff" }}>Most on-track → least</b>
          </div>
        </section>

        <ImprovementsClient
          rows={rows}
          managers={MANAGERS}
          targetDays={TARGET_DAYS}
          targetHours={TARGET_HOURS}
          nextLevelDays={NEXT_LEVEL_DAYS}
          nextLevelHours={NEXT_LEVEL_HOURS}
          showSinceLiveIfOverDays={SHOW_SINCE_LIVE_IF_OVER_DAYS}
        />
      </div>
    </main>
  );
}
