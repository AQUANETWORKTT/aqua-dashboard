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

function parseBattleDateTime(battleDate: string | null, battleTime: string | null) {
  if (!battleDate || !battleTime) return null;

  const cleanDate = String(battleDate).trim();
  let cleanTime = String(battleTime).trim();

  if (/^\d{1,2}:\d{2}$/.test(cleanTime)) {
    cleanTime = `${cleanTime}:00`;
  }

  const date = new Date(`${cleanDate}T${cleanTime}+01:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function getBattleStatus(battle: any) {
  if (battle.reminder_sent_at) {
    return "SENT";
  }

  const battleDateTime = parseBattleDateTime(
    battle.battle_date,
    battle.battle_time
  );

  if (!battleDateTime) {
    return "READY";
  }

  const now = new Date();

  const fiveMinutesBefore = new Date(
    battleDateTime.getTime() - 5 * 60 * 1000
  );

  const tenMinutesAfter = new Date(
    battleDateTime.getTime() + 10 * 60 * 1000
  );

  if (now >= tenMinutesAfter) {
    return "EXPIRED";
  }

  if (now >= fiveMinutesBefore && now < battleDateTime) {
    return "DUE";
  }

  return "READY";
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("battle_reminders")
      .select("*")
      .order("battle_date", { ascending: true, nullsFirst: false })
      .order("battle_time", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const battles = (data || []).map((battle) => ({
      ...battle,
      notification_status: getBattleStatus(battle),
    }));

    const counts = battles.reduce(
      (acc, battle) => {
        const status = battle.notification_status || "READY";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      battles,
      counts: {
        ready: counts.READY || 0,
        due: counts.DUE || 0,
        sent: counts.SENT || 0,
        expired: counts.EXPIRED || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Failed to load battles.",
      },
      {
        status: 500,
      }
    );
  }
}