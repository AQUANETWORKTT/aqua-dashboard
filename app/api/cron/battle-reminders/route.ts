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
  manager: string | null;
  creator: string | null;
  opponent: string | null;
  battle_date: string | null;
  battle_time: string | null;
  reminder_sent_at: string | null;
};

type PushSubscriptionRow = {
  id: string;
  manager: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type ManagerNotificationSetting = {
  manager: string | null;
  enabled: boolean | null;
  scope: "mine" | "all" | string | null;
  minutes_before: number | null;
};

function normaliseManager(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function parseBattleDateTime(battleDate: string | null, battleTime: string | null) {
  if (!battleDate || !battleTime) return null;

  const cleanDate = String(battleDate).trim();
  const cleanTime = String(battleTime).trim();

  const date = new Date(`${cleanDate}T${cleanTime}:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function minutesUntil(date: Date) {
  return Math.max(0, Math.round((date.getTime() - Date.now()) / 60000));
}

function isBattleDueForSetting(battle: BattleReminder, setting: ManagerNotificationSetting) {
  const battleDateTime = parseBattleDateTime(battle.battle_date, battle.battle_time);

  if (!battleDateTime) return false;

  const minutesBefore = Number(setting.minutes_before || 5);
  const targetSendTime = new Date(battleDateTime.getTime() - minutesBefore * 60 * 1000);

  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  return targetSendTime >= fiveMinutesAgo && targetSendTime <= fiveMinutesFromNow;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: battles, error: battlesError } = await supabase
      .from("battle_reminders")
      .select("id, manager, creator, opponent, battle_date, battle_time, reminder_sent_at")
      .is("reminder_sent_at", null);

    if (battlesError) {
      return NextResponse.json({ error: battlesError.message }, { status: 500 });
    }

    const { data: settings, error: settingsError } = await supabase
      .from("manager_notification_settings")
      .select("manager, enabled, scope, minutes_before")
      .eq("enabled", true);

    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    const enabledSettings = ((settings || []) as ManagerNotificationSetting[]).filter(
      (setting) => normaliseManager(setting.manager)
    );

    if (enabledSettings.length === 0) {
      return NextResponse.json({
        success: true,
        checked: battles?.length || 0,
        due: 0,
        sent: 0,
        failed: 0,
        marked_sent: 0,
        message: "No managers have notifications enabled.",
      });
    }

    const dueItems: {
      battle: BattleReminder;
      setting: ManagerNotificationSetting;
      notifyManager: string;
    }[] = [];

    for (const battle of (battles || []) as BattleReminder[]) {
      const battleManager = normaliseManager(battle.manager);

      for (const setting of enabledSettings) {
        const settingManager = normaliseManager(setting.manager);
        const scope = setting.scope === "all" ? "all" : "mine";

        if (scope === "mine" && battleManager !== settingManager) {
          continue;
        }

        if (!isBattleDueForSetting(battle, setting)) {
          continue;
        }

        dueItems.push({
          battle,
          setting,
          notifyManager: settingManager,
        });
      }
    }

    if (dueItems.length === 0) {
      return NextResponse.json({
        success: true,
        checked: battles?.length || 0,
        enabled_managers: enabledSettings.length,
        due: 0,
        sent: 0,
        failed: 0,
        marked_sent: 0,
        message: "No battle reminders due for current settings.",
      });
    }

    const notificationManagers = Array.from(
      new Set(dueItems.map((item) => item.notifyManager).filter(Boolean))
    );

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("manager_push_subscriptions")
      .select("id, manager, endpoint, p256dh, auth")
      .in("manager", notificationManagers);

    if (subscriptionsError) {
      return NextResponse.json({ error: subscriptionsError.message }, { status: 500 });
    }

    const webPush = getWebPush();

    let sent = 0;
    let failed = 0;
    const sentBattleIds = new Set<string>();

    for (const item of dueItems) {
      const battle = item.battle;
      const notifyManager = item.notifyManager;
      const battleDateTime = parseBattleDateTime(battle.battle_date, battle.battle_time);
      const mins = battleDateTime ? minutesUntil(battleDateTime) : Number(item.setting.minutes_before || 5);

      const managerSubscriptions = ((subscriptions || []) as PushSubscriptionRow[]).filter(
        (sub) => normaliseManager(sub.manager) === notifyManager
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
        url: `/dashboard/${notifyManager}/notifications`,
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
          sentBattleIds.add(battle.id);
        } catch {
          failed += 1;

          await supabase
            .from("manager_push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    }

    if (sentBattleIds.size > 0) {
      await supabase
        .from("battle_reminders")
        .update({
          reminder_sent_at: new Date().toISOString(),
        })
        .in("id", Array.from(sentBattleIds));
    }

    return NextResponse.json({
      success: true,
      checked: battles?.length || 0,
      enabled_managers: enabledSettings.length,
      due: dueItems.length,
      sent,
      failed,
      marked_sent: sentBattleIds.size,
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