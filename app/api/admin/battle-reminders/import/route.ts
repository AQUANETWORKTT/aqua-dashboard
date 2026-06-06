import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL;
  const serviceRoleKey = process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

function parseBattleDate(dateText: string) {
  const text = String(dateText || "").toUpperCase().trim();

  const match = text.match(
    /(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s+(\d+)(ST|ND|RD|TH)\s+([A-Z]+)/
  );

  if (!match) return null;

  const day = Number(match[2]);

  const months: Record<string, number> = {
    JANUARY: 1,
    FEBRUARY: 2,
    MARCH: 3,
    APRIL: 4,
    MAY: 5,
    JUNE: 6,
    JULY: 7,
    AUGUST: 8,
    SEPTEMBER: 9,
    OCTOBER: 10,
    NOVEMBER: 11,
    DECEMBER: 12,
  };

  const month = months[match[4]];

  if (!month || !day) return null;

  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

function normaliseManagerName(manager: string) {
  const clean = String(manager || "").trim().toLowerCase();

  const map: Record<string, string> = {
    alf: "alfie",
    alfie: "alfie",
    james: "james",
    ellie: "ellie",
    dylan: "dylan",
    jay: "jay",
    vitali: "vitali",
    harry: "harry",
    chloe: "chloe",
    jade: "jade",
    teddie: "teddie",
    teddy: "teddie",
    millie: "millie",
    chris: "chris",
    matt: "chris",
  };

  return map[clean] || clean;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const battles = Array.isArray(body?.battles) ? body.battles : [];

    if (battles.length === 0) {
      return NextResponse.json(
        {
          error: "No battles received.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = getSupabaseAdmin();

    const rows = battles
      .filter((battle: any) => {
        return battle.creator && battle.manager && battle.battleTime;
      })
      .map((battle: any) => ({
        battle_date_text: battle.battleDateText,
        battle_date: parseBattleDate(battle.battleDateText),
        battle_time: battle.battleTime,
        creator: battle.creator,
        opponent: battle.opponent || null,
        manager: normaliseManagerName(battle.manager),
        agency: battle.agency || null,
        requested_time: battle.requestedTime || null,
        range_text: battle.range || null,
        confirmed: battle.confirmed || null,
        duplicate_key: battle.duplicateKey,
        status: "scheduled",
        reminder_sent_at: null,
        updated_at: new Date().toISOString(),
      }));

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid battles to save.",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } = await supabase
      .from("battle_reminders")
      .upsert(rows, {
        onConflict: "duplicate_key",
      })
      .select();

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
      success: true,
      imported: data?.length || 0,
      message: `Saved ${data?.length || 0} battles.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Import failed.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Battle reminders import route is working.",
  });
}