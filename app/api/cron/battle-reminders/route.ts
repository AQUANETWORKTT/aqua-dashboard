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
  let cleanTime = String(battleTime).trim();

  if (/^\d{1,2}:\d{2}$/.test(cleanTime)) {
    cleanTime = `${cleanTime}:00`;
  }

  const date = new Date(`${cleanDate}T${cleanTime}+01:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function minutesUntil(date: Date) {
  return Math.max(0, Math.round((date.getTime() - Date.now()) / 60000));
}

function getDueCheck(battle: BattleReminder, setting: ManagerNotificationSetting) {
  const battleDateTime = parseBattleDateTime(battle.battle_date, battle.battle_time);

  if (!battleDateTime) {
    return {
      due: false,
      reason: "Could not parse battle date/time",
      battleDateTime: null,
      targetSendTime: null,
      now: new Date().toISOString(),
    };
  }

  const minutesBefore = Number(setting.minutes_before || 5);
  const targetSendTime = new Date(battleDateTime.getTime() - minutesBefore * 60 * 1000);

  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);

  const due = targetSendTime >= tenMinutesAgo && targetSendTime <= twoMinutesFromNow;

  return {
    due,
    reason: due ? "Due now" : "Not inside reminder window",
    battleDateTime: battleDateTime.toISOString(),
    targetSendTime: targetSendTime.toISOString(),
    now: now.toISOString(),
    minutesBefore,
  };
}

function isFinishedMoreThanTenMinutesAgo(battle: BattleReminder) {
  const battleDateTime = parseBattleDateTime(battle.battle_date, battle.battle_time);

  if (!battleDateTime) return false;

  const tenMinutesAfterBattle = new Date(battleDateTime.getTime() + 10 * 60 * 1000);

  return tenMinutesAfterBattle <= new Date();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const debug = url.searchParams.get("debug") === "1";

    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: allBattles, error: allBattlesError } = await supabase
      .from("battle_reminders")
      .select("id, manager, creator, opponent, battle_date, battle_time, reminder_sent_at");

    if (allBattlesError) {
      return NextResponse.json({ error: allBattlesError.message }, { status: 500 });
    }

    const expiredBattleIds = ((allBattles || []) as BattleReminder[])
      .filter((battle) => isFinishedMoreThanTenMinutesAgo(battle))
      .map((battle) => battle.id);

    if (expiredBattleIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("battle_reminders")
        .delete()
        .in("id", expiredBattleIds);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    }

    const battles = ((allBattles || []) as BattleReminder[]).filter(
      (battle) =>
        !expiredBattleIds.includes(battle.id) &&
        !battle.reminder_sent_at
    );

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

    const debugRows: any[] = [];

    if (enabledSettings.length === 0) {
      return NextResponse.json({
        success: true,
        checked: battles.length,
        deleted_expired: expiredBattleIds.length,
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

    for (const battle of battles) {
      const battleManager = normaliseManager(battle.manager);

      for (const setting of enabledSettings) {
        const settingManager = normaliseManager(setting.manager);
        const scope = setting.scope === "all" ? "all" : "mine";

        const managerMatches = scope === "all" || battleManager === settingManager;
        const dueCheck = getDueCheck(battle, setting);

        if (debug) {
          debugRows.push({
            battle_id: battle.id,
            battle_manager: battleManager,
            setting_manager: settingManager,
            scope,
            managerMatches,
            battle_date: battle.battle_date,
            battle_time: battle.battle_time,
            creator: battle.creator,
            opponent: battle.opponent,
            dueCheck,
          });
        }

        if (!managerMatches) continue;
        if (!dueCheck.due) continue;

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
        checked: battles.length,
        deleted_expired: expiredBattleIds.length,
        enabled_managers: enabledSettings.length,
        due: 0,
        sent: 0,
        failed: 0,
        marked_sent: 0,
        message: "No battle reminders due for current settings.",
        debug: debug ? debugRows : undefined,
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
      const mins = battleDateTime
        ? minutesUntil(battleDateTime)
        : Number(item.setting.minutes_before || 5);

      const managerSubscriptions = ((subscriptions || []) as PushSubscriptionRow[]).filter(
        (sub) => normaliseManager(sub.manager) === notifyManager
      );

      if (managerSubscriptions.length === 0) continue;

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
      checked: battles.length,
      deleted_expired: expiredBattleIds.length,
      enabled_managers: enabledSettings.length,
      due: dueItems.length,
      sent,
      failed,
      marked_sent: sentBattleIds.size,
      debug: debug ? debugRows : undefined,
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