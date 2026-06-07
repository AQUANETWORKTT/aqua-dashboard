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

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    const { error, count } = await supabase
      .from("battle_reminders")
      .delete({ count: "exact" })
      .not("id", "is", null);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: count || 0,
      message: `Deleted ${count || 0} battles.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Delete all failed.",
      },
      {
        status: 500,
      }
    );
  }
}