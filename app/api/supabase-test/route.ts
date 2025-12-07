export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    supabaseUrl:
      process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40) ?? "MISSING",
  });
}
