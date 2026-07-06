import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL;
  const serviceRoleKey = process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function parseNumber(value: any): number {
  if (value == null) return 0;
  const n = Number(String(value).replace(/,/g, "").replace(/%/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function parseHours(value: any): number {
  if (value == null) return 0;

  const str = String(value).trim();
  if (!str) return 0;

  if (!Number.isNaN(Number(str))) return Number(str);

  if (str.includes(":")) {
    const parts = str.split(":").map(Number);

    if (parts.length === 3) {
      return Number((parts[0] + parts[1] / 60 + parts[2] / 3600).toFixed(2));
    }

    if (parts.length === 2) {
      return Number((parts[0] + parts[1] / 60).toFixed(2));
    }
  }

  const h = str.match(/(\d+(?:\.\d+)?)h/i);
  const m = str.match(/(\d+(?:\.\d+)?)m/i);

  let total = 0;
  if (h) total += Number(h[1]);
  if (m) total += Number(m[1]) / 60;

  return Number(total.toFixed(2));
}

function cleanUsername(value: any) {
  return String(value ?? "").trim().replace(/^@/, "").toLowerCase();
}

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/\s+/g, "").replace(/[_'"`’]/g, "");
}

function getValue(row: Record<string, any>, keys: string[]) {
  const rowKeys = Object.keys(row);

  for (const wanted of keys) {
    if (row[wanted] !== undefined && row[wanted] !== null && row[wanted] !== "") {
      return row[wanted];
    }

    const matchedKey = rowKeys.find(
      (k) => normalizeKey(k) === normalizeKey(wanted)
    );

    if (
      matchedKey &&
      row[matchedKey] !== undefined &&
      row[matchedKey] !== null &&
      row[matchedKey] !== ""
    ) {
      return row[matchedKey];
    }
  }

  return null;
}

function getCreatorStatus(row: Record<string, any>) {
  const diamonds = parseNumber(getValue(row, ["Diamonds"]));
  const hours = parseHours(getValue(row, ["LIVE duration", "Live duration"]));
  const validDays = parseNumber(
    getValue(row, ["Valid go LIVE days", "Valid live days"])
  );
  const followers = parseNumber(getValue(row, ["New followers"]));
  const daysJoined = parseNumber(getValue(row, ["Days since joining"]));
  const matchDiamonds = parseNumber(getValue(row, ["Diamonds from matches"]));

  if (daysJoined <= 7 && hours < 1) return "Needs First Live";
  if (daysJoined <= 14 && diamonds >= 10000 && hours >= 10 && followers >= 100) {
    return "High Potential";
  }
  if (matchDiamonds >= 5000) return "Battle Performer";
  if (hours >= 25 && diamonds < 5000) return "Doing Hours, Low Diamonds";
  if (hours < 5 && validDays < 3) return "Needs Focus";

  return "Active";
}

function parseCreatorStatsFile(buffer: Buffer, statsDate: string) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("No sheet found.");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(
    workbook.Sheets[sheetName],
    { defval: null }
  );

  const monthKey = statsDate.slice(0, 7);
  const parsedRows: any[] = [];

  for (const row of rows) {
    const creatorId = String(
      getValue(row, ["Creator ID", "Creator id", "CreatorID"]) ?? ""
    ).trim();

    if (!creatorId) continue;

    const username = cleanUsername(
      getValue(row, [
        "Creator's username",
        "Creators username",
        "Creator username",
        "Username",
      ])
    );

    parsedRows.push({
      creator_id: creatorId,
      username,
      manager: String(
        getValue(row, [
          "Creator Network manager",
          "Creator network manager",
          "Manager",
        ]) ?? ""
      ).trim(),
      join_time: String(getValue(row, ["Join time", "Join Time"]) ?? "").trim(),
      days_since_joining: parseNumber(getValue(row, ["Days since joining"])),
      diamonds: parseNumber(getValue(row, ["Diamonds"])),
      live_duration_hours: parseHours(
        getValue(row, ["LIVE duration", "Live duration", "Duration"])
      ),
      valid_go_live_days: parseNumber(
        getValue(row, ["Valid go LIVE days", "Valid live days"])
      ),
      new_followers: parseNumber(getValue(row, ["New followers"])),
      new_fans: parseNumber(getValue(row, ["New fans", "New fans from fan club", "new_fans"])),
      live_streams: parseNumber(getValue(row, ["LIVE streams", "Live streams"])),
      matches: parseNumber(getValue(row, ["Matches"])),
      diamonds_from_matches: parseNumber(getValue(row, ["Diamonds from matches"])),
      graduation_status: String(getValue(row, ["Graduation status"]) ?? "").trim(),
      tier_status: String(getValue(row, ["Tier status"]) ?? "").trim(),
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

    const password = req.headers.get("x-admin-password");

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const statsDate = form.get("statsDate")?.toString();
    const creatorStatsFile = form.get("creatorStatsFile") as File | null;

    if (!statsDate || !creatorStatsFile) {
      return NextResponse.json(
        { error: "Missing stats date or file." },
        { status: 400 }
      );
    }

    const dateISO = new Date(statsDate).toISOString().slice(0, 10);
    const buffer = Buffer.from(await creatorStatsFile.arrayBuffer());
    const creatorRows = parseCreatorStatsFile(buffer, dateISO);

    if (creatorRows.length === 0) {
      return NextResponse.json(
        { error: "No valid creators found." },
        { status: 400 }
      );
    }

    const { error: statsError } = await supabase
      .from("creator_monthly_stats")
      .upsert(creatorRows, {
        onConflict: "creator_id,month_key",
      });

    if (statsError) {
      return NextResponse.json({ error: statsError.message }, { status: 500 });
    }

    const loginRows = creatorRows
      .filter((creator) => creator.username)
      .map((creator) => ({
        username: creator.username,
        password: `${creator.username}1`,
        creator_id: creator.creator_id,
        manager: creator.manager,
        updated_at: new Date().toISOString(),
      }));

    if (loginRows.length > 0) {
      const { error: loginError } = await supabase
        .from("creator_logins")
        .upsert(loginRows, {
          onConflict: "username",
        });

      if (loginError) {
        return NextResponse.json(
          {
            error: `Stats uploaded, but login generation failed: ${loginError.message}`,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: `Imported ${creatorRows.length} creators for ${dateISO}. Generated/updated ${loginRows.length} logins.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Upload failed." },
      { status: 500 }
    );
  }
}