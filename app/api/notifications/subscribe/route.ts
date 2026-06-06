import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL!,
  process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const manager = String(body.manager || "").trim().toLowerCase();
    const subscription = body.subscription;

    if (!manager) {
      return NextResponse.json({ error: "Manager missing" }, { status: 400 });
    }

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
    }

    const userAgent = req.headers.get("user-agent") || null;

    const { error } = await supabase.from("manager_push_subscriptions").upsert(
      {
        manager,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Subscribe failed" },
      { status: 500 }
    );
  }
}