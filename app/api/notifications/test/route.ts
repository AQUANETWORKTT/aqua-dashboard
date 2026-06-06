import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWebPush } from "@/lib/web-push";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL!,
  process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY!
);

function normaliseManager(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const manager = normaliseManager(url.searchParams.get("manager"));

    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!manager) {
      return NextResponse.json(
        { error: "Missing manager. Add ?manager=james" },
        { status: 400 }
      );
    }

    const { data: subscriptions, error } = await supabase
      .from("manager_push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("manager", manager);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        sent: 0,
        message: `No push subscriptions found for ${manager}.`,
      });
    }

    const webPush = getWebPush();

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({
            title: "Aqua Test Notification",
            body: "If you can see this, notifications are working.",
            url: `/dashboard/${manager}/notifications`,
          })
        );

        sent += 1;
      } catch {
        failed += 1;
      }
    }

    return NextResponse.json({
      success: true,
      manager,
      subscriptions: subscriptions.length,
      sent,
      failed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Test notification failed",
      },
      { status: 500 }
    );
  }
}