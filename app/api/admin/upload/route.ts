import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreatorMonthlyStatsRow = {
  creator_id: string;
  username: string;
  manager: string;
  join_time: string;
  days_since_joining: number;
  diamonds: number;
  live_duration_hours: number;
  valid_go_live_days: number;
  new_followers: number;
  live_streams: number;
  matches: number;
  diamonds_from_matches: number;
  graduation_status: string;
  tier_status: string;
  creator_status: string;
  month_key: string;
  stats_date: string;
  updated_at: string;
};

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars."
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

  if (str.includes(":")) {
    const parts = str.split(":").map(Number);

    if (parts.length === 3) {
      const [h, m, s] = parts;

      return Number(
        (h + m / 60 + s / 3600).toFixed(2)
      );
    }

    if (parts.length === 2) {
      const [h, m] = parts;

      return Number(
        (h + m / 60).toFixed(2)
      );
    }
  }

  const hMatch = str.match(/(\d+(?:\.\d+)?)h/i);
  const mMatch = str.match(/(\d+(?:\.\d+)?)m/i);

  let total = 0;

  if (hMatch) total += Number(hMatch[1]);
  if (mMatch) total += Number(mMatch[1]) / 60;

  return Number(total.toFixed(2));
}

function getMonthKey(date: string) {
  return date.slice(0, 7);
}

function cleanUsername(value: any) {
  return String(value ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function normalizeKey(key: string) {
  return key
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_'"`’]/g, "");
}

function getValue(
  row: Record<string, any>,
  keys: string[]
) {
  const rowKeys = Object.keys(row);

  for (const wanted of keys) {
    const exact = row[wanted];

    if (
      exact !== undefined &&
      exact !== null &&
      exact !== ""
    ) {
      return exact;
    }

    const normalizedWanted = normalizeKey(wanted);

    const matchedKey = rowKeys.find(
      (k) => normalizeKey(k) === normalizedWanted
    );

    if (matchedKey) {
      const value = row[matchedKey];

      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        return value;
      }
    }
  }

  return null;
}

function getCreatorStatus(
  row: Record<string, any>
) {
  const diamonds = parseNumber(
    getValue(row, ["Diamonds"])
  );

  const hours = parseHours(
    getValue(row, [
      "LIVE duration",
      "Live duration",
    ])
  );

  const validDays = parseNumber(
    getValue(row, [
      "Valid go LIVE days",
      "Valid live days",
    ])
  );

  const followers = parseNumber(
    getValue(row, ["New followers"])
  );

  const daysJoined = parseNumber(
    getValue(row, ["Days since joining"])
  );

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

function parseCreatorStatsFile(
  buffer: Buffer,
  statsDate: string
): CreatorMonthlyStatsRow[] {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("No sheet found.");
  }

  const worksheet = workbook.Sheets[sheetName];

  const rows =
    XLSX.utils.sheet_to_json<Record<string, any>>(
      worksheet,
      {
        defval: null,
      }
    );

  const monthKey = getMonthKey(statsDate);

  const parsedRows: CreatorMonthlyStatsRow[] = [];

  for (const row of rows) {
    const creatorId = String(
      getValue(row, [
        "Creator ID",
        "Creator id",
        "CreatorID",
      ]) ?? ""
    ).trim();

    if (!creatorId) continue;

    parsedRows.push({
      creator_id: creatorId,

      username: cleanUsername(
        getValue(row, [
          "Creator's username",
          "Creators username",
          "Creator username",
          "Username",
        ])
      ),

      manager: String(
        getValue(row, [
          "Creator Network manager",
          "Creator network manager",
          "Manager",
        ]) ?? ""
      ).trim(),

      join_time: String(
        getValue(row, [
          "Join time",
          "Join Time",
        ]) ?? ""
      ).trim(),

      days_since_joining: parseNumber(
        getValue(row, [
          "Days since joining",
        ])
      ),

      diamonds: parseNumber(
        getValue(row, ["Diamonds"])
      ),

      live_duration_hours: parseHours(
        getValue(row, [
          "LIVE duration",
          "Live duration",
          "Duration",
        ])
      ),

      valid_go_live_days: parseNumber(
        getValue(row, [
          "Valid go LIVE days",
          "Valid live days",
        ])
      ),

      new_followers: parseNumber(
        getValue(row, ["New followers"])
      ),

      live_streams: parseNumber(
        getValue(row, [
          "LIVE streams",
          "Live streams",
        ])
      ),

      matches: parseNumber(
        getValue(row, ["Matches"])
      ),

      diamonds_from_matches: parseNumber(
        getValue(row, [
          "Diamonds from matches",
        ])
      ),

      graduation_status: String(
        getValue(row, [
          "Graduation status",
        ]) ?? ""
      ).trim(),

      tier_status: String(
        getValue(row, ["Tier status"]) ?? ""
      ).trim(),

      creator_status: getCreatorStatus(row),

      month_key: monthKey,

      stats_date: statsDate,

      updated_at: new Date().toISOString(),
    });
  }

  return parsedRows;
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const password =
      req.headers.get("x-admin-password");

    if (
      password !== process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const form = await req.formData();

    const statsDate =
      form.get("statsDate")?.toString();

    const creatorStatsFile =
      form.get("creatorStatsFile") as
        | File
        | null;

    if (!statsDate || !creatorStatsFile) {
      return NextResponse.json(
        {
          error:
            "Missing stats date or file.",
        },
        {
          status: 400,
        }
      );
    }

    const dateISO = new Date(statsDate)
      .toISOString()
      .slice(0, 10);

    const buffer = Buffer.from(
      await creatorStatsFile.arrayBuffer()
    );

    const creatorRows =
      parseCreatorStatsFile(
        buffer,
        dateISO
      );

    if (creatorRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid creators found.",
        },
        {
          status: 400,
        }
      );
    }

    const { error } = await supabase
      .from("creator_monthly_stats")
      .upsert(creatorRows, {
        onConflict:
          "creator_id,month_key",
      });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      message: `Imported ${creatorRows.length} creators for ${dateISO}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err.message || "Upload failed.",
      },
      {
        status: 500,
      }
    );
  }
}