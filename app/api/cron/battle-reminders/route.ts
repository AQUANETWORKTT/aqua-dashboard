import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWebPush } from "@/lib/web-push";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL!,
  process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY!
);

type BattleReminder = {
  id: string;
  manager: string;
  creator: string | null;
  opponent: string | null;
  day: string | null;
  battle_time: string | null;
  reminder_sent_at: string | null;
};

type PushSubscriptionRow = {
  id: string;
  manager: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function normaliseManager(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function parseBattleDateTime(day: string | null, battleTime: string | null) {
  if (!day || !battleTime) return null;

  const cleanDay = day.trim();
  const cleanTime = battleTime.trim();

  const date = new Date(`${cleanDay} ${cleanTime}`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function minutesUntil(date: Date) {
  return Math.round((date.getTime() - Date.now()) / 60000);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000);

    const { data: battles, error: battlesError } = await supabase
      .from("battle_reminders")
      .select("id, manager, creator, opponent, day, battle_time, reminder_sent_at")
      .is("reminder_sent_at", null);

    if (battlesError) {
      return NextResponse.json({ error: battlesError.message }, { status: 500 });
    }

    const dueBattles = (battles || []).filter((battle: BattleReminder) => {
      const battleDate = parseBattleDateTime(battle.day, battle.battle_time);
      if (!battleDate) return false;

      return battleDate >= now && battleDate <= twentyMinutesFromNow;
    });

    if (dueBattles.length === 0) {
      return NextResponse.json({
        success: true,
        checked: battles?.length || 0,
        sent: 0,
        message: "No battle reminders due.",
      });
    }

    const managers = Array.from(
      new Set(dueBattles.map((battle) => normaliseManager(battle.manager)).filter(Boolean))
    );

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("manager_push_subscriptions")
      .select("id, manager, endpoint, p256dh, auth")
      .in("manager", managers);

    if (subscriptionsError) {
      return NextResponse.json({ error: subscriptionsError.message }, { status: 500 });
    }

    const webPush = getWebPush();

    let sent = 0;
    let failed = 0;
    const sentBattleIds: string[] = [];

    for (const battle of dueBattles) {
      const manager = normaliseManager(battle.manager);
      const battleDate = parseBattleDateTime(battle.day, battle.battle_time);
      const mins = battleDate ? minutesUntil(battleDate) : 20;

      const managerSubscriptions = (subscriptions || []).filter(
        (sub: PushSubscriptionRow) => normaliseManager(sub.manager) === manager
      );

      if (managerSubscriptions.length === 0) {
        continue;
      }

      const title = "Aqua Battle Reminder";
      const body = `${battle.creator || "Your creator"} vs ${
        battle.opponent || "opponent"
      } starts in about ${mins} minutes.`;

      const payload = JSON.stringify({
        title,
        body,
        url: `/dashboard/${manager}/notifications`,
      });

      for (const sub of managerSubscriptions) {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );

          sent += 1;
        } catch {
          failed += 1;

          await supabase
            .from("manager_push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }

      sentBattleIds.push(battle.id);
    }

    if (sentBattleIds.length > 0) {
      await supabase
        .from("battle_reminders")
        .update({
          reminder_sent_at: new Date().toISOString(),
        })
        .in("id", sentBattleIds);
    }

    return NextResponse.json({
      success: true,
      checked: battles?.length || 0,
      due: dueBattles.length,
      sent,
      failed,
      marked_sent: sentBattleIds.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Cron failed",
      },
      { status: 500 }
    );
  }
}