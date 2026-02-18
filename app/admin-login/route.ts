// app/api/management/admin-login/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const COOKIE_NAME = "aqua_management_admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const key = body?.key?.toString?.() ?? "";

  const adminKey = process.env.MANAGEMENT_ADMIN_KEY || "";

  if (!adminKey) {
    return NextResponse.json(
      { ok: false, error: "Missing MANAGEMENT_ADMIN_KEY env var." },
      { status: 500 }
    );
  }

  if (key !== adminKey) {
    return NextResponse.json({ ok: false, error: "Invalid key." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // httpOnly cookie so it's not accessible from JS
  res.cookies.set(COOKIE_NAME, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 days
  });

  return res;
}
