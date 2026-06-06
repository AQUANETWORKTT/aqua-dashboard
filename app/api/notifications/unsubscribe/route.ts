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
    const endpoint = String(body.endpoint || "").trim();

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint missing" }, { status: 400 });
    }

    const { error } = await supabase
      .from("manager_push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unsubscribe failed" },
      { status: 500 }
    );
  }
}