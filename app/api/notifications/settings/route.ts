import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const manager = normaliseManager(url.searchParams.get("manager"));

    if (!manager) {
      return NextResponse.json(
        { error: "Manager is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("manager_notification_settings")
      .select("*")
      .eq("manager", manager)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      settings:
        data || {
          manager,
          enabled: false,
          scope: "mine",
          minutes_before: 5,
        },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load settings",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const manager = normaliseManager(body.manager);
    const enabled = Boolean(body.enabled);
    const scope = body.scope === "all" ? "all" : "mine";

    const allowedMinutes = [5, 10, 15, 30];
    const minutesBefore = allowedMinutes.includes(
      Number(body.minutes_before)
    )
      ? Number(body.minutes_before)
      : 5;

    if (!manager) {
      return NextResponse.json(
        { error: "Manager is required." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("manager_notification_settings")
      .upsert(
        {
          manager,
          enabled,
          scope,
          minutes_before: minutesBefore,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "manager",
        }
      );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      manager,
      enabled,
      scope,
      minutes_before: minutesBefore,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save settings",
      },
      { status: 500 }
    );
  }
}