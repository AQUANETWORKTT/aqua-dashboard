// app/api/management/get/route.ts

import { NextResponse } from "next/server";
import { getManagementData } from "@/lib/management-store";

export const runtime = "nodejs";

export async function GET() {
  const data = await getManagementData();
  return NextResponse.json({ ok: true, data });
}
