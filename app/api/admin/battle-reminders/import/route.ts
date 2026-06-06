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
        battle_time: battle.battleTime,
        creator: battle.creator,
        opponent: battle.opponent || null,
        manager: battle.manager,
        agency: battle.agency || null,
        requested_time: battle.requestedTime || null,
        range_text: battle.range || null,
        confirmed: battle.confirmed || null,
        duplicate_key: battle.duplicateKey,
        status: "scheduled",
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