import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function normalise(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Missing username or password" },
        { status: 400 }
      );
    }

    const cleanUsername = normalise(String(username));
    const cleanPassword = String(password).trim();

    const { data: login, error } = await supabase
      .from("creator_logins")
      .select("username, password")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!login) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    if (login.password !== cleanPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const res = NextResponse.json({
      ok: true,
      username: login.username,
    });

    res.cookies.set("aqua_user", login.username, {
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}