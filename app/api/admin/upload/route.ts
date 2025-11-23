import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_DIR = path.join(process.cwd(), "public", "history");
const CREATORS_TS = path.join(DATA_DIR, "creators.ts");

// escape usernames for TS
function esc(str: string) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// "4h 11m 32s" → 4.19 (hours)
function parseDurationToHours(raw: string): number {
  if (!raw || typeof raw !== "string") return 0;

  const h = parseInt(raw.match(/(\d+)h/)?.[1] || "0", 10);
  const m = parseInt(raw.match(/(\d+)m/)?.[1] || "0", 10);
  const s = parseInt(raw.match(/(\d+)s/)?.[1] || "0", 10);

  return h + m / 60 + s / 3600;
}

// DAILY file: per-day diamonds + hours
// uses columns:
//  - "Creator's username"
//  - "Diamonds"       → daily diamonds
//  - "LIVE duration"  → daily hours
function parseDaily(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
    defval: null,
  });

  const out: Record<
    string,
    { daily: number; hours: number }
  > = {};

  for (const row of rows) {
    const usernameRaw = row["Creator's username"];
    if (!usernameRaw) continue;

    const username = String(usernameRaw).trim();
    if (!username) continue;

    const diamondsRaw = row["Diamonds"];
    const durationRaw = row["LIVE duration"];

    const daily =
      Number(String(diamondsRaw ?? 0).replace(/,/g, "")) || 0;
    const hours = parseDurationToHours(String(durationRaw ?? ""));

    out[username] = { daily, hours };
  }

  return out;
}

// LIFETIME file: lifetime diamonds + lifetime hours
// uses same column names but represents totals
function parseLifetime(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
    defval: null,
  });

  const out: Record<
    string,
    { lifetime: number; lifetimeHours: number }
  > = {};

  for (const row of rows) {
    const usernameRaw = row["Creator's username"];
    if (!usernameRaw) continue;

    const username = String(usernameRaw).trim();
    if (!username) continue;

    const diamondsRaw = row["Diamonds"];
    const durationRaw = row["LIVE duration"];

    const lifetime =
      Number(String(diamondsRaw ?? 0).replace(/,/g, "")) || 0;
    const lifetimeHours = parseDurationToHours(String(durationRaw ?? ""));

    out[username] = { lifetime, lifetimeHours };
  }

  return out;
}

export async function POST(req: Request) {
  try {
    // password check
    const password = req.headers.get("x-admin-password");
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    // read form
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
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const dateISO = new Date(String(statsDate))
      .toISOString()
      .slice(0, 10);

    const dailyBuf = Buffer.from(await dailyFile.arrayBuffer());
    const lifetimeBuf = Buffer.from(await lifetimeFile.arrayBuffer());

    const dailyData = parseDaily(dailyBuf);
    const lifetimeData = parseLifetime(lifetimeBuf);

    // merge daily + lifetime
    const merged = new Map<
      string,
      {
        daily: number;
        hours: number;
        lifetime: number;
        lifetimeHours: number;
      }
    >();

    // base from daily
    for (const username of Object.keys(dailyData)) {
      merged.set(username, {
        daily: dailyData[username].daily,
        hours: dailyData[username].hours,
        lifetime: 0,
        lifetimeHours: 0,
      });
    }

    // overlay lifetime
    for (const username of Object.keys(lifetimeData)) {
      const base =
        merged.get(username) || {
          daily: 0,
          hours: 0,
          lifetime: 0,
          lifetimeHours: 0,
        };

      base.lifetime = lifetimeData[username].lifetime;
      base.lifetimeHours = lifetimeData[username].lifetimeHours;

      merged.set(username, base);
    }

    // ensure dirs
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(HISTORY_DIR))
      fs.mkdirSync(HISTORY_DIR, { recursive: true });

    // write creators.ts (for dashboard + leaderboard)
    const creatorsContent =
      `// AUTO-GENERATED. Do not edit by hand.\n` +
      `export const creators = [\n` +
      Array.from(merged.entries())
        .map(
          ([username, d]) =>
            `  { username: "${esc(
              username
            )}", daily: ${d.daily}, lifetime: ${d.lifetime} }`
        )
        .join(",\n") +
      `\n];\n`;

    fs.writeFileSync(CREATORS_TS, creatorsContent, "utf8");

    // write per-creator history used by calendar
    for (const [username, d] of merged.entries()) {
      const safe = username.replace(/[<>:"/\\|?*]/g, "_");
      const file = path.join(HISTORY_DIR, `${safe}.json`);

      let history: { username: string; entries: any[] } = {
        username,
        entries: [],
      };

      if (fs.existsSync(file)) {
        try {
          const raw = fs.readFileSync(file, "utf8");
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.entries)) {
            history = parsed;
          }
        } catch {
          // ignore corrupt file, start fresh
        }
      }

      // remove any existing record for this date
      history.entries = history.entries.filter(
        (e) => e.date !== dateISO
      );

      // add new entry
      history.entries.push({
        date: dateISO,
        daily: d.daily,
        hours: d.hours,
        lifetime: d.lifetime,
        lifetimeHours: d.lifetimeHours,
      });

      fs.writeFileSync(file, JSON.stringify(history, null, 2), "utf8");
    }

    return NextResponse.json({
      message: `Imported ${merged.size} creators for ${dateISO}`,
    });
  } catch (err: any) {
    console.error("UPLOAD ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
