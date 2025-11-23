import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

// IMPORTANT — Calendar reads from /history/*
// so we save files in /public/history
const HISTORY_DIR = path.join(process.cwd(), "public", "history");

const CREATORS_TS = path.join(DATA_DIR, "creators.ts");

// Escape usernames for TS writing
function esc(str: string) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// DAILY (diamonds + hours)
function parseDailyFile(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const header = rows[0];
  if (!header) throw new Error("Daily file missing header row.");

  const userCol = header.findIndex((h) =>
    String(h || "").toLowerCase().includes("username")
  );
  if (userCol === -1) throw new Error("Daily file missing username column.");

  const out: any = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const username = String(r[userCol] || "").trim();
    if (!username) continue;

    out[username] = {
      daily: Number(r[7]) || 0,
      hours: Number(r[8]) || 0,
    };
  }

  return out;
}

// LIFETIME (diamonds + hours)
function parseLifetimeFile(buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const header = rows[0];
  if (!header) throw new Error("Lifetime file missing header row.");

  const userCol = header.findIndex((h) =>
    String(h || "").toLowerCase().includes("username")
  );
  if (userCol === -1) throw new Error("Lifetime file missing username column.");

  const out: any = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    const username = String(r[userCol] || "").trim();
    if (!username) continue;

    out[username] = {
      lifetime: Number(r[7]) || 0,
      lifetimeHours: Number(r[8]) || 0,
    };
  }

  return out;
}

export async function POST(req: Request) {
  try {
    // Password protection
    const password = req.headers.get("x-admin-password");
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const statsDate = form.get("statsDate");
    const dailyFile = form.get("dailyFile");
    const lifetimeFile = form.get("lifetimeFile");

    if (!statsDate || !(dailyFile instanceof File) || !(lifetimeFile instanceof File)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const dateISO = new Date(String(statsDate)).toISOString().slice(0, 10);

    const dailyBuf = Buffer.from(await dailyFile.arrayBuffer());
    const lifetimeBuf = Buffer.from(await lifetimeFile.arrayBuffer());

    const dailyData = parseDailyFile(dailyBuf);
    const lifetimeData = parseLifetimeFile(lifetimeBuf);

    const merged = new Map();

    // Merge daily
    for (const u of Object.keys(dailyData)) {
      merged.set(u, {
        daily: dailyData[u].daily,
        hours: dailyData[u].hours,
        lifetime: 0,
        lifetimeHours: 0,
      });
    }

    // Merge lifetime
    for (const u of Object.keys(lifetimeData)) {
      const base = merged.get(u) || {
        daily: 0,
        hours: 0,
        lifetime: 0,
        lifetimeHours: 0,
      };
      base.lifetime = lifetimeData[u].lifetime;
      base.lifetimeHours = lifetimeData[u].lifetimeHours;
      merged.set(u, base);
    }

    // Ensure directories exist
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR);

    // Write creators.ts
    const creatorsContent =
      `// AUTO-GENERATED\nexport const creators = [\n` +
      Array.from(merged.entries())
        .map(([u, d]) =>
          `  { username: "${esc(u)}", daily: ${d.daily}, lifetime: ${d.lifetime} }`
        )
        .join(",\n") +
      `\n];`;

    fs.writeFileSync(CREATORS_TS, creatorsContent, "utf8");

    // Write/update history per creator
    for (const [username, d] of merged.entries()) {
      const safe = esc(username).replace(/[<>:"/\\|?*]/g, "_");
      const file = path.join(HISTORY_DIR, `${safe}.json`);

      let history = { username, entries: [] };
      if (fs.existsSync(file)) {
        try {
          const raw = fs.readFileSync(file, "utf8");
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.entries)) history = parsed;
        } catch {
          // reset on error
        }
      }

      // Remove existing entry for same date
      history.entries = history.entries.filter((e) => e.date !== dateISO);

      // Add new entry
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
    console.error("IMPORT ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
