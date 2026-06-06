import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingBattle = {
  battleDateText: string;
  battleTime: string;
  creator: string;
  opponent?: string;
  manager: string;
  agency?: string;
  requestedTime?: string;
  range?: string;
  confirmed?: string;
  duplicateKey: string;
};

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

export async function POST(req: Request) {
  try {

    const body = await req.json();
    const battles = Array.isArray(body?.battles) ? body.battles : [];

    if (battles.length === 0) {
      return NextResponse.json(
        { error: "No battles received." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const rows = battles
      .filter((battle: IncomingBattle) => {
        return battle.creator && battle.manager && battle.battleTime;
      })
      .map((battle: IncomingBattle) => ({
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
        { error: "No valid battles to save." },
        { status: 400 }
      );
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("battle_reminders")
      .select("duplicate_key")
      .in(
        "duplicate_key",
        rows.map((row: { duplicate_key: string }) => row.duplicate_key)
      );

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    const existingKeys = new Set(
      (existingRows || []).map((row) => row.duplicate_key)
    );

    const newRows = rows.filter((row) => !existingKeys.has(row.duplicate_key));
    const duplicateRows = rows.filter((row) =>
      existingKeys.has(row.duplicate_key)
    );

    if (newRows.length > 0) {
      const { error: insertError } = await supabase
        .from("battle_reminders")
        .insert(newRows);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: `Saved ${newRows.length} battles. Skipped ${duplicateRows.length} duplicates.`,
      saved: newRows.length,
      duplicates: duplicateRows.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Import failed." },
      { status: 500 }
    );
  }
}