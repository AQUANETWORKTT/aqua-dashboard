import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const HISTORY_DIR = path.join(process.cwd(), "public", "history");
const CREATORS_TS = path.join(process.cwd(), "data", "creators.ts");

// -----------------------------------------------------
// SMART HOURS PARSER — Supports ALL TikTok formats
// -----------------------------------------------------
function parseHours(value: any): number {
  if (value == null) return 0;

  const str = String(value).trim();
  if (!str) return 0;

  // Case: pure number "5" or "5.5"
  if (!isNaN(Number(str))) {
    return Number(str);
  }

  // Case: TikTok format "74h 58m 31s"
  if (/h|m|s/i.test(str)) {
    let hours = 0;
    const hMatch = str.match(/(\d+)\s*h/i);
    const mMatch = str.match(/(\d+)\s*m/i);
    const sMatch = str.match(/(\d+)\s*s/i);

    if (hMatch) hours += Number(hMatch[1]);
    if (mMatch) hours += Number(mMatch[1]) / 60;
    if (sMatch) hours += Number(sMatch[1]) / 3600;

    return hours;
  }

  // Case: HH:MM:SS
  if (str.includes(":")) {
    const parts = str.split(":").map(Number);
    if (parts.length === 3) {
      const [h, m, s] = parts;
      return h + m / 60 + s / 3600;
    }
    if (parts.length === 2) {
      const [h, m] = parts;
      return h + m / 60;
    }
  }

  // Case: "90 min"
  if (str.toLowerCase().includes("min")) {
    const mins = parseFloat(str);
    return mins / 60;
  }

  return 0;
}

// -----------------------------------------------------
// Parse DAILY Excel
// -----------------------------------------------------
function parseDailyFile(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const HEADER = rows[0];
  if (!HEADER) throw new Error("Daily file missing header row.");

  const usernameCol = HEADER.findIndex((h) =>
    String(h).toLowerCase().includes("username")
  );
  if (usernameCol === -1) throw new Error("Daily file missing username column.");

  const dailyDiamondsCol = 7; // Original working columns
  const dailyHoursCol = 8;

  const out: Record<string, { daily: number; hours: number }> = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const username = String(row[usernameCol] ?? "").trim();
    if (!username) continue;

    out[username] = {
      daily: Number(row[dailyDiamondsCol]) || 0,
      hours: parseHours(row[dailyHoursCol]),
    };
  }

  return out;
}

// -----------------------------------------------------
// Parse LIFETIME Excel
// -----------------------------------------------------
function parseLifetimeFile(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const HEADER = rows[0];
  if (!HEADER) throw new Error("Lifetime file missing header row.");

  const usernameCol = HEADER.findIndex((h) =>
    String(h).toLowerCase().includes("username")
  );
  if (usernameCol === -1) throw new Error("Lifetime file missing username column.");

  const lifetimeDiamondsCol = 7;
  const lifetimeHoursCol = 8;

  const out: Record<string, { lifetime: number; lifetimeHours: number }> = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const username = String(row[usernameCol] ?? "").trim();
    if (!username) continue;

    out[username] = {
      lifetime: Number(row[lifetimeDiamondsCol]) || 0,
      lifetimeHours: parseHours(row[lifetimeHoursCol]),
    };
  }

  return out;
}

// -----------------------------------------------------
// POST — Import Stats
// -----------------------------------------------------
export async function POST(req: Request) {
  try {
    const password = req.headers.get("x-admin-password");
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const statsDate = form.get("statsDate")?.toString();
    const dailyFile = form.get("dailyFile") as File | null;
    const lifetimeFile = form.get("lifetimeFile") as File | null;

    if (!statsDate || !dailyFile || !lifetimeFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const dateISO = new Date(statsDate).toISOString().slice(0, 10);

    const dailyBuf = Buffer.from(await dailyFile.arrayBuffer());
    const lifetimeBuf = Buffer.from(await lifetimeFile.arrayBuffer());

    const dailyData = parseDailyFile(dailyBuf);
    const lifetimeData = parseLifetimeFile(lifetimeBuf);

    const merged = new Map<
      string,
      { daily: number; hours: number; lifetime: number; lifetimeHours: number }
    >();

    // Merge DAILY first
    for (const username of Object.keys(dailyData)) {
      merged.set(username, {
        daily: dailyData[username].daily,
        hours: dailyData[username].hours,
        lifetime: 0,
        lifetimeHours: 0,
      });
    }

    // Merge lifetime data
    for (const username of Object.keys(lifetimeData)) {
      const base =
        merged.get(username) || { daily: 0, hours: 0, lifetime: 0, lifetimeHours: 0 };
      base.lifetime = lifetimeData[username].lifetime;
      base.lifetimeHours = lifetimeData[username].lifetimeHours;
      merged.set(username, base);
    }

    fs.mkdirSync(HISTORY_DIR, { recursive: true });

    // Write creators.ts
    const creatorsContent = `// AUTO-GENERATED
export const creators = [
${Array.from(merged.entries())
  .map(
    ([username, d]) =>
      `  { username: "${username}", daily: ${d.daily}, lifetime: ${d.lifetime} }`
  )
  .join(",\n")}
];`;

    fs.writeFileSync(CREATORS_TS, creatorsContent, "utf8");

    // Write user history files
    for (const [username, d] of merged.entries()) {
      const safe = username.replace(/[<>:"/\\|?*]/g, "_");
      const filePath = path.join(HISTORY_DIR, `${safe}.json`);

      let history = { username, entries: [] as any[] };
      if (fs.existsSync(filePath)) {
        history = JSON.parse(fs.readFileSync(filePath, "utf8"));
      }

      history.entries = history.entries.filter((e) => e.date !== dateISO);

      history.entries.push({
        date: dateISO,
        daily: d.daily,
        hours: d.hours,
        lifetime: d.lifetime,
        lifetimeHours: d.lifetimeHours,
      });

      fs.writeFileSync(filePath, JSON.stringify(history, null, 2), "utf8");
    }

    return NextResponse.json({
      message: `Imported ${merged.size} creators for ${dateISO}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
