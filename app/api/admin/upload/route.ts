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
