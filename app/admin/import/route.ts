import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_DIR = path.join(process.cwd(), "public", "history");
const CREATORS_TS = path.join(DATA_DIR, "creators.ts");

function esc(str: string) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function safeFilename(str: string) {
  return str.replace(/[<>:"/\\|?*]/g, "_");
}

function normalizeHeader(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function findHeaderIndex(header: any[], possibleNames: string[]) {
  return header.findIndex((h) => {
    const v = normalizeHeader(h);
    return possibleNames.some((name) => v.includes(name));
  });
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseDailyFile(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
  });

  const header = rows[0] || [];

  const userCol = findHeaderIndex(header, ["username", "user name", "creator"]);
  const dailyCol = findHeaderIndex(header, ["daily diamonds", "daily", "diamonds"]);
  const hoursCol = findHeaderIndex(header, ["hours", "live duration", "duration"]);
  const matchesCol = findHeaderIndex(header, ["matches", "battles"]);

  if (userCol === -1) {
    throw new Error("Could not find a username column in the daily file.");
  }

  const out: Record<
    string,
    {
      daily: number;
      hours: number;
      matches: number;
    }
  > = {};

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const username = String(r[userCol] || "").trim();
    if (!username) continue;

    out[username] = {
      daily: dailyCol !== -1 ? num(r[dailyCol]) : 0,
      hours: hoursCol !== -1 ? num(r[hoursCol]) : 0,
      matches: matchesCol !== -1 ? num(r[matchesCol]) : 0,
    };
  }

  return out;
}

function parseLifetimeFile(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
  });

  const header = rows[0] || [];

  const userCol = findHeaderIndex(header, ["username", "user name", "creator"]);
  const lifetimeCol = findHeaderIndex(header, ["lifetime diamonds", "lifetime"]);
  const lifetimeHoursCol = findHeaderIndex(header, [
    "lifetime hours",
    "total hours",
    "lifetime duration",
  ]);

  if (userCol === -1) {
    throw new Error("Could not find a username column in the lifetime file.");
  }

  const out: Record<
    string,
    {
      lifetime: number;
      lifetimeHours: number;
    }
  > = {};

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const username = String(r[userCol] || "").trim();
    if (!username) continue;

    out[username] = {
      lifetime: lifetimeCol !== -1 ? num(r[lifetimeCol]) : 0,
      lifetimeHours: lifetimeHoursCol !== -1 ? num(r[lifetimeHoursCol]) : 0,
    };
  }

  return out;
}

export async function POST(req: Request) {
  try {
    const password = req.headers.get("x-admin-password");
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const statsDate = form.get("statsDate");
    const dailyFile = form.get("dailyFile");
    const lifetimeFile = form.get("lifetimeFile");

    if (
      !statsDate ||
      !(dailyFile instanceof File) ||
      !(lifetimeFile instanceof File)
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const dateISO = new Date(String(statsDate)).toISOString().slice(0, 10);

    const dailyBuf = Buffer.from(await dailyFile.arrayBuffer());
    const lifetimeBuf = Buffer.from(await lifetimeFile.arrayBuffer());

    const dailyData = parseDailyFile(dailyBuf);
    const lifetimeData = parseLifetimeFile(lifetimeBuf);

    const merged = new Map<
      string,
      {
        daily: number;
        hours: number;
        matches: number;
        lifetime: number;
        lifetimeHours: number;
      }
    >();

    // Merge daily data first
    for (const u of Object.keys(dailyData)) {
      merged.set(u, {
        daily: dailyData[u].daily,
        hours: dailyData[u].hours,
        matches: dailyData[u].matches,
        lifetime: 0,
        lifetimeHours: 0,
      });
    }

    // Merge lifetime data
    for (const u of Object.keys(lifetimeData)) {
      const base = merged.get(u) || {
        daily: 0,
        hours: 0,
        matches: 0,
        lifetime: 0,
        lifetimeHours: 0,
      };

      base.lifetime = lifetimeData[u].lifetime;
      base.lifetimeHours = lifetimeData[u].lifetimeHours;
      merged.set(u, base);
    }

    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

    // creators.ts only needs current visible creator stats
    const creatorsContent =
      `// AUTO-GENERATED\nexport const creators = [\n` +
      Array.from(merged.entries())
        .map(
          ([u, d]) =>
            `  { username: "${esc(u)}", daily: ${d.daily}, lifetime: ${d.lifetime} }`
        )
        .join(",\n") +
      `\n];`;

    fs.writeFileSync(CREATORS_TS, creatorsContent, "utf8");

    // Write/update history per creator
    for (const [username, d] of merged.entries()) {
      const file = path.join(HISTORY_DIR, `${safeFilename(username)}.json`);

      let history: {
        username: string;
        entries: Array<{
          date: string;
          daily: number;
          hours: number;
          matches?: number;
          lifetime: number;
          lifetimeHours: number;
        }>;
      } = {
        username,
        entries: [],
      };

      if (fs.existsSync(file)) {
        try {
          const raw = fs.readFileSync(file, "utf8");
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.entries)) {
            history = parsed;
          }
        } catch {}
      }

      // Remove existing entry for same date
      history.entries = history.entries.filter((e) => e.date !== dateISO);

      // Add fresh entry
      history.entries.push({
        date: dateISO,
        daily: d.daily,
        hours: d.hours,
        matches: d.matches,
        lifetime: d.lifetime,
        lifetimeHours: d.lifetimeHours,
      });

      // Optional: keep entries sorted
      history.entries.sort((a, b) => a.date.localeCompare(b.date));

      fs.writeFileSync(file, JSON.stringify(history, null, 2), "utf8");
    }

    return NextResponse.json({
      message: `Imported ${merged.size} creators for ${dateISO}`,
    });
  } catch (err: any) {
    console.error("IMPORT ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}