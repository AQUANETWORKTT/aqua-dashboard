import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_DIR = path.join(DATA_DIR, "history");
const CREATORS_TS = path.join(DATA_DIR, "creators.ts");

// Read XLSX file with DAILY data (diamonds + hours)
function parseDailyFile(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
  });

  const HEADER = rows[0];
  if (!HEADER) throw new Error("Daily file missing header row.");

  const userCol = HEADER.findIndex((h) =>
    String(h || "").toLowerCase().includes("username")
  );
  if (userCol === -1) throw new Error("Daily file missing username column.");

  const dailyDiamondsCol = 7; // H
  const dailyHoursCol = 8; // I

  const out: Record<
    string,
    { daily: number; dailyHours: number }
  > = {};

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const username = String(r[userCol] ?? "").trim();
    if (!username) continue;

    out[username] = {
      daily: Number(r[dailyDiamondsCol]) || 0,
      dailyHours: Number(r[dailyHoursCol]) || 0,
    };
  }

  return out;
}

// Read XLSX file with LIFETIME data (lifetime diamonds + lifetime hours)
function parseLifetimeFile(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
  });

  const HEADER = rows[0];
  if (!HEADER) throw new Error("Lifetime file missing header row.");

  const userCol = HEADER.findIndex((h) =>
    String(h || "").toLowerCase().includes("username")
  );
  if (userCol === -1) throw new Error("Lifetime file missing username column.");

  const lifetimeDiamondsCol = 7; // H
  const lifetimeHoursCol = 8; // I

  const out: Record<
    string,
    { lifetime: number; lifetimeHours: number }
  > = {};

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const username = String(r[userCol] ?? "").trim();
    if (!username) continue;

    out[username] = {
      lifetime: Number(r[lifetimeDiamondsCol]) || 0,
      lifetimeHours: Number(r[lifetimeHoursCol]) || 0,
    };
  }

  return out;
}

export async function POST(req: Request) {
  try {
    // Password check
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

    const dateISO = new Date(String(statsDate))
      .toISOString()
      .slice(0, 10);

    // parse buffers
    const dailyBuf = Buffer.from(await dailyFile.arrayBuffer());
    const lifetimeBuf = Buffer.from(await lifetimeFile.arrayBuffer());

    const dailyData = parseDailyFile(dailyBuf);
    const lifetimeData = parseLifetimeFile(lifetimeBuf);

    // merge both
    const merged = new Map<
      string,
      { daily: number; hours: number; lifetime: number; lifetimeHours: number }
    >();

    for (const username of Object.keys(dailyData)) {
      merged.set(username, {
        daily: dailyData[username].daily,
        hours: dailyData[username].dailyHours,
        lifetime: 0,
        lifetimeHours: 0,
      });
    }

    for (const username of Object.keys(lifetimeData)) {
      const base = merged.get(username) || {
        daily: 0,
        hours: 0,
        lifetime: 0,
        lifetimeHours: 0,
      };

      base.lifetime = lifetimeData[username].lifetime;
      base.lifetimeHours = lifetimeData[username].lifetimeHours;

      merged.set(username, base);
    }

    // ensure directories exist
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR);

    // write creators.ts
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

    // write each creator's history
    for (const [username, d] of merged.entries()) {
      const safe = username.replace(/[<>:"/\\|?*]/g, "_");
      const historyFile = path.join(HISTORY_DIR, `${safe}.json`);

      let history = { username, entries: [] as any[] };

      if (fs.existsSync(historyFile)) {
        history = JSON.parse(fs.readFileSync(historyFile, "utf8"));
      }

      // remove existing entry for the date
      history.entries = history.entries.filter((e) => e.date !== dateISO);

      // add new entry
      history.entries.push({
        date: dateISO,
        daily: d.daily,
        hours: d.hours,
        lifetime: d.lifetime,
        lifetimeHours: d.lifetimeHours,
      });

      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf8");
    }

    return NextResponse.json({
      message: `Imported ${merged.size} creators for ${dateISO}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
