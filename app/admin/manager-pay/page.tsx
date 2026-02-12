// app/admin/manager-pay/page.tsx
import fs from "fs";
import path from "path";
import type { CSSProperties } from "react";

import { creators } from "@/data/creators";
import { MANAGERS, CREATOR_TO_MANAGER } from "@/data/manager-assignments";
import ManagerPayClient, {
  type ManagerPayRow,
  type ManagerPayCreatorRow,
} from "./ManagerPayClient";

export const runtime = "nodejs";

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

type GraduationType = "M0.5" | "M1" | "M2" | "M1R" | "OTHER";

type ManagerGraduationsFile = {
  month: string; // YYYY-MM
  managers: Array<{
    manager: string;
    counts: Partial<Record<GraduationType, number>>;
  }>;
};

type ActivenessEvent = {
  date: string; // YYYY-MM-DD
  username: string;
  type: string;
  points?: number;
};

type MonthlyActivenessFile = {
  month: string; // YYYY-MM
  events: ActivenessEvent[];
};

/* ===================== CONSTANTS ===================== */

// Diamonds -> USD
const USD_PER_1K_DIAMONDS = 1.5; // $1.50 per 1k diamonds
const RATE_MULTIPLIER = 0.7; // your 0.7 rate
const USD_PER_1K_EFFECTIVE = USD_PER_1K_DIAMONDS * RATE_MULTIPLIER; // $1.05 per 1k
const USD_PER_DIAMOND = USD_PER_1K_EFFECTIVE / 1000; // $0.00105 per diamond

// Manager pay %
const DEFAULT_MANAGER_PAY_PCT = 0.4;
const MANAGER_PAY_PCT_OVERRIDE: Record<string, number> = {
  James: 1.0,
};

// Graduation bonus amounts (flat)
const GRAD_PAYOUT_USD: Record<GraduationType, number> = {
  "M0.5": 105,
  M1: 210,
  M2: 700,
  M1R: 168,
  OTHER: 0,
};

/* ===================== HELPERS ===================== */

function safeNum(n: unknown) {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function todayKeyUTC() {
  return new Date().toISOString().slice(0, 10);
}

function monthKeyUTC(d: Date) {
  return d.toISOString().slice(0, 7);
}

function lastMonthKeyUTCFromToday() {
  const t = new Date(todayKeyUTC() + "T00:00:00Z");
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth(); // 0-11
  const prev = new Date(Date.UTC(y, m - 1, 1));
  return monthKeyUTC(prev);
}

function readJsonIfExists<T>(absPath: string): T | null {
  if (!fs.existsSync(absPath)) return null;
  try {
    const raw = fs.readFileSync(absPath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function fmtUSD(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function normKey(s: string) {
  return String(s ?? "").trim().toLowerCase();
}

/* ===================== PAGE ===================== */

export default function ManagerPayPage() {
  const historyDir = path.join(process.cwd(), "public", "history");
  const creatorsDir = path.join(process.cwd(), "public", "creators");

  // ✅ LAST MONTH (UTC)
  const mk = lastMonthKeyUTCFromToday(); // YYYY-MM

  // Manager-level graduations file
  const managerGraduationsPath = path.join(
    process.cwd(),
    "public",
    "admin",
    `graduations-managers-${mk}.json`
  );
  const mgrGradsFile = readJsonIfExists<ManagerGraduationsFile>(managerGraduationsPath);

  const mgrGradCountsByManagerNorm: Record<string, Partial<Record<GraduationType, number>>> = {};
  const managersInGradFile: string[] = [];

  if (Array.isArray(mgrGradsFile?.managers)) {
    for (const m of mgrGradsFile!.managers) {
      const name = String(m?.manager ?? "");
      const nk = normKey(name);
      if (!nk) continue;
      mgrGradCountsByManagerNorm[nk] = m.counts ?? {};
      managersInGradFile.push(name);
    }
  }

  // Optional: activeness file (safe if missing)
  const activenessPath = path.join(process.cwd(), "public", "admin", `activeness-${mk}.json`);
  const activenessFile = readJsonIfExists<MonthlyActivenessFile>(activenessPath);
  const activenessEvents = Array.isArray(activenessFile?.events) ? activenessFile!.events : [];

  // Precompute creator monthly totals (last month)
  const creatorMonthly: Record<string, { diamonds: number; hours: number; validDays: number }> = {};

  for (const c of creators) {
    const username = c.username;

    const filePath = path.join(historyDir, `${username}.json`);
    const hf = readJsonIfExists<HistoryFile>(filePath);
    const entries = Array.isArray(hf?.entries) ? hf!.entries : [];

    const monthHistory = entries.filter((e) => e?.date?.startsWith(mk));

    let diamonds = 0;
    let hours = 0;
    let validDays = 0;

    for (const e of monthHistory) {
      diamonds += safeNum(e.daily);
      const h = safeNum(e.hours);
      hours += h;
      if (h >= 1) validDays += 1;
    }

    creatorMonthly[username] = { diamonds, hours, validDays };
  }

  const getAvatar = (username: string) => {
    const jpgPath = path.join(creatorsDir, `${username}.jpg`);
    return fs.existsSync(jpgPath)
      ? `/creators/${username}.jpg`
      : "/branding/default-avatar.png";
  };

  // Build manager -> creators list
  const managerToCreators = new Map<string, string[]>();
  for (const c of creators) {
    const username = c.username;
    const manager = CREATOR_TO_MANAGER[username] ?? "James";
    const list = managerToCreators.get(manager) ?? [];
    list.push(username);
    managerToCreators.set(manager, list);
  }

  // Build a stable manager list (THIS is what we pass to the client dropdown)
  const managersStable = Array.from(
    new Set([
      "All",
      ...MANAGERS,
      ...Array.from(managerToCreators.keys()),
      ...Object.keys(MANAGER_PAY_PCT_OVERRIDE),
      "James",
    ])
  ).filter(Boolean);

  const managerRows: ManagerPayRow[] = [];

  for (const manager of managersStable.filter((m) => m !== "All")) {
    const usernames = (managerToCreators.get(manager) ?? [])
      .slice()
      .sort((a, b) => a.localeCompare(b));

    const payPct =
      MANAGER_PAY_PCT_OVERRIDE[manager] ?? DEFAULT_MANAGER_PAY_PCT;

    // Creator breakdown (revenue share only)
    const creatorRows: ManagerPayCreatorRow[] = usernames.map((u) => {
      const m = creatorMonthly[u] ?? { diamonds: 0, hours: 0, validDays: 0 };
      const revenueUSD = m.diamonds * USD_PER_DIAMOND;
      const managerPayUSD = revenueUSD * payPct;

      return {
        username: u,
        avatarSrc: getAvatar(u),
        diamonds: m.diamonds,
        hours: m.hours,
        validDays: m.validDays,
        revenueUSD,
        managerPayUSD,
      };
    });

    const teamDiamonds = creatorRows.reduce((acc, r) => acc + r.diamonds, 0);
    const teamRevenueUSD = teamDiamonds * USD_PER_DIAMOND;
    const revenueBasedPayUSD = teamRevenueUSD * payPct;

    // Graduations (manager-level)
    const gradCounts =
      mgrGradCountsByManagerNorm[normKey(manager)] ?? {};
    let graduationBonusUSD = 0;

    for (const [k, v] of Object.entries(gradCounts)) {
      const type = (k as GraduationType) ?? "OTHER";
      const count = safeNum(v);
      graduationBonusUSD += count * (GRAD_PAYOUT_USD[type] ?? 0);
    }

    const graduationTotal = Object.values(gradCounts).reduce(
      (a, n) => a + safeNum(n),
      0
    );

    // Activeness (optional)
    const teamActs = activenessEvents.filter(
      (e) => usernames.includes(e.username) && e.date?.startsWith(mk)
    );
    const activenessCount = teamActs.length;
    const activenessPoints = teamActs.reduce(
      (acc, e) => acc + safeNum(e.points),
      0
    );

    const totalPayUSD = revenueBasedPayUSD + graduationBonusUSD;

    managerRows.push({
      manager,
      payPct,
      creatorCount: usernames.length,

      teamDiamonds,
      teamRevenueUSD,

      revenueBasedPayUSD,
      graduationBonusUSD,
      totalPayUSD,

      graduationTotal,
      graduationByType: gradCounts as Record<string, number>,

      activenessCount,
      activenessPoints,

      creators: creatorRows.sort((a, b) => b.diamonds - a.diamonds),
    });
  }

  managerRows.sort((a, b) => b.totalPayUSD - a.totalPayUSD);

  const monthLabel = new Date(mk + "-01T00:00:00Z").toLocaleString("default", {
    month: "long",
  });
  const year = Number(mk.slice(0, 4));

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
    maxWidth: 1250,
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
    textShadow:
      "0 0 12px rgba(45,224,255,0.65), 0 0 28px rgba(45,224,255,0.25)",
    margin: 0,
  };

  const sub: CSSProperties = {
    marginTop: 6,
    fontSize: 13,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.4,
  };

  const note: CSSProperties = {
    marginTop: 10,
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.5,
  };

  const debugBox: CSSProperties = {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    fontSize: 12,
    color: "rgba(255,255,255,0.80)",
    lineHeight: 1.5,
  };

  return (
    <main style={page}>
      <div style={wrap}>
        <section style={card}>
          <h1 style={title}>💸 Manager Pay</h1>
          <div style={sub}>
            Month: <b style={{ color: "#7cf6ff" }}>{monthLabel} {year}</b> •{" "}
            <b style={{ color: "#7cf6ff" }}>Last month</b>
          </div>

          <div style={note}>
            <div>
              Revenue rate:{" "}
              <b style={{ color: "#7cf6ff" }}>{fmtUSD(USD_PER_1K_EFFECTIVE)}</b>{" "}
              per 1,000 diamonds (
              <b style={{ color: "#7cf6ff" }}>
                ${USD_PER_DIAMOND.toFixed(6)}
              </b>{" "}
              per diamond)
            </div>
            <div>
              Default manager pay:{" "}
              <b style={{ color: "#7cf6ff" }}>40%</b> • Override:{" "}
              <b style={{ color: "#7cf6ff" }}>James 100%</b>
            </div>
          </div>

          <div style={debugBox}>
            <div>
              <b style={{ color: "#7cf6ff" }}>Debug</b>
            </div>
            <div>
              Month key used: <b style={{ color: "#7cf6ff" }}>{mk}</b>
            </div>
            <div>
              Graduation file expected:{" "}
              <b style={{ color: "#7cf6ff" }}>{`/public/admin/graduations-managers-${mk}.json`}</b>
            </div>
            <div>
              Graduation file status:{" "}
              <b style={{ color: "#7cf6ff" }}>
                {fs.existsSync(managerGraduationsPath) ? "FOUND" : "MISSING"}
              </b>
            </div>
            <div>
              Managers inside grad file:{" "}
              <b style={{ color: "#7cf6ff" }}>
                {managersInGradFile.length ? managersInGradFile.join(", ") : "NONE / NOT READ"}
              </b>
            </div>
          </div>
        </section>

        <ManagerPayClient monthKey={mk} rows={managerRows} managers={managersStable} />
      </div>
    </main>
  );
}
