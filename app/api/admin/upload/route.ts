import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars. Add NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL and SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY to Vercel."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

function parseNumber(value: any): number {
  if (value == null) return 0;

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseHours(value: any): number {
  if (value == null) return 0;

  const str = String(value).trim();
  if (!str) return 0;

  if (!Number.isNaN(Number(str))) {
    return Number(str);
  }

  if (/h|m|s/i.test(str)) {
    let hours = 0;

    const hMatch = str.match(/(\d+(?:\.\d+)?)\s*h/i);
    const mMatch = str.match(/(\d+(?:\.\d+)?)\s*m/i);
    const sMatch = str.match(/(\d+(?:\.\d+)?)\s*s/i);

    if (hMatch) hours += Number(hMatch[1]);
    if (mMatch) hours += Number(mMatch[1]) / 60;
    if (sMatch) hours += Number(sMatch[1]) / 3600;

    return Number(hours.toFixed(2));
  }

  if (str.includes(":")) {
    const parts = str.split(":").map(Number);

    if (parts.length === 3) {
      const [h, m, s] = parts;
      return Number((h + m / 60 + s / 3600).toFixed(2));
    }

    if (parts.length === 2) {
      const [h, m] = parts;
      return Number((h + m / 60).toFixed(2));
    }
  }

  if (str.toLowerCase().includes("min")) {
    return Number((parseFloat(str) / 60).toFixed(2));
  }

  return 0;
}

function getMonthKey(statsDate: string) {
  return statsDate.slice(0, 7);
}

function cleanUsername(value: any) {
  return String(value ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function normaliseKey(key: string) {
  return key
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_'"’`]/g, "");
}

function getValue(row: any, keys: string[]) {
  const rowKeys = Object.keys(row);

  for (const wanted of keys) {
    const exact = row[wanted];

    if (exact !== undefined && exact !== null && exact !== "") {
      return exact;
    }

    const wantedClean = normaliseKey(wanted);
    const matchedKey = rowKeys.find((key) => normaliseKey(key) === wantedClean);

    if (matchedKey) {
      const value = row[matchedKey];

      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }

  return null;
}

function getCreatorStatus(row: any) {
  const diamonds = parseNumber(getValue(row, ["Diamonds"]));
  const hours = parseHours(getValue(row, ["LIVE duration", "Live duration"]));
  const validDays = parseNumber(
    getValue(row, ["Valid go LIVE days", "Valid live days"])
  );
  const followers = parseNumber(getValue(row, ["New followers"]));
  const daysJoined = parseNumber(getValue(row, ["Days since joining"]));
  const matchDiamonds = parseNumber(
    getValue(row, ["Diamonds from matches"])
  );

  if (daysJoined <= 7 && hours < 1) {
    return "Needs First Live";
  }

  if (
    daysJoined <= 14 &&
    diamonds >= 10000 &&
    hours >= 10 &&
    followers >= 100
  ) {
    return "High Potential";
  }

  if (matchDiamonds >= 5000) {
    return "Battle Performer";
  }

  if (hours >= 25 && diamonds < 5000) {
    return "Doing Hours, Low Diamonds";
  }

  if (hours < 5 && validDays < 3) {
    return "Needs Focus";
  }

  return "Active";
}

function parseCreatorStatsFile(buffer: Buffer, statsDate: string) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];

  if (!sheetName) {
    throw new Error("No sheet found in Excel file.");
  }

  const ws = wb.Sheets[sheetName];

  const rows: any[] = XLSX.utils.sheet_to_json(ws, {
    defval: null,
  });

  const monthKey = getMonthKey(statsDate);

  return rows
    .map((row) => {
      const creatorId = String(
        getValue(row, ["Creator ID", "Creator id", "CreatorID"]) ?? ""
      ).trim();

      if (!creatorId) return null;

      const username = cleanUsername(
        getValue(row, [
          "Creator's username",
          "Creators username",
          "Creator username",
          "Username",
        ])
      );

      return {
        creator_id: creatorId,
        username,

        manager: String(
          getValue(row, [
            "Creator Network manager",
            "Creator network manager",
            "Manager",
          ]) ?? ""
        ).trim(),

        join_time: String(
          getValue(row, ["Join time", "Join Time"]) ?? ""
        ).trim(),

        days_since_joining: parseNumber(
          getValue(row, ["Days since joining"])
        ),

        diamonds: parseNumber(getValue(row, ["Diamonds"])),

        live_duration_hours: parseHours(
          getValue(row, ["LIVE duration", "Live duration", "Duration"])
        ),

        valid_go_live_days: parseNumber(
          getValue(row, ["Valid go LIVE days", "Valid live days"])
        ),

        new_followers: parseNumber(getValue(row, ["New followers"])),

        live_streams: parseNumber(
          getValue(row, ["LIVE streams", "Live streams"])
        ),

        matches: parseNumber(getValue(row, ["Matches"])),

        diamonds_from_matches: parseNumber(
          getValue(row, ["Diamonds from matches"])
        ),

        graduation_status: String(
          getValue(row, ["Graduation status"]) ?? ""
        ).trim(),

        tier_status: String(
          getValue(row, ["Tier status"]) ?? ""
        ).trim(),

        creator_status: getCreatorStatus(row),

        month_key: monthKey,
        stats_date: statsDate,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const password = req.headers.get("x-admin-password");

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "ADMIN_PASSWORD is missing from env vars." },
        { status: 500 }
      );
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const form = await req.formData();

    const statsDate = form.get("statsDate")?.toString();
    const creatorStatsFile = form.get("creatorStatsFile") as File | null;

    if (!statsDate || !creatorStatsFile) {
      return NextResponse.json(
        {
          error: "Missing stats date or creator stats file.",
        },
        { status: 400 }
      );
    }

    const dateISO = new Date(statsDate).toISOString().slice(0, 10);
    const buffer = Buffer.from(await creatorStatsFile.arrayBuffer());

    const creatorRows = parseCreatorStatsFile(buffer, dateISO);

    if (creatorRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid creators found. Check the Excel has a Creator ID column.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("creator_monthly_stats")
      .upsert(creatorRows, {
        onConflict: "creator_id,month_key",
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Imported ${creatorRows.length} creators for ${dateISO}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Upload failed.",
      },
      { status: 500 }
    );
  }
}
