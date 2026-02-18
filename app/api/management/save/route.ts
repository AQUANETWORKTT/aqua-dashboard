// app/api/management/save/route.ts

import { NextResponse } from "next/server";
import type { ManagementData } from "@/lib/management-schema";

export const runtime = "nodejs";

const ITEM_KEY = "managementData";

export async function POST(req: Request) {
  const edgeConfigId = process.env.EDGE_CONFIG_ID || "";
  const token = process.env.VERCEL_ACCESS_TOKEN || "";
  const teamId = process.env.VERCEL_TEAM_ID || "";

  if (!edgeConfigId) {
    return NextResponse.json(
      { ok: false, error: "Missing EDGE_CONFIG_ID env var." },
      { status: 500 }
    );
  }
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing VERCEL_ACCESS_TOKEN env var." },
      { status: 500 }
    );
  }

  const next = (await req.json().catch(() => null)) as ManagementData | null;

  if (!next || !Array.isArray(next.managers) || !Array.isArray(next.meetings)) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 }
    );
  }

  // stamp updated time server-side
  next.updatedAtISO = new Date().toISOString();

  try {
    const url = new URL(
      `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`
    );
    if (teamId) url.searchParams.set("teamId", teamId);

    // PATCH /v1/edge-config/{edgeConfigId}/items
    // Body: { items: [{ operation: "upsert", key, value }] }
    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            operation: "upsert",
            key: ITEM_KEY,
            value: next,
          },
        ],
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            json?.error?.message ||
            json?.message ||
            `Vercel API error (${res.status})`,
        },
        { status: 500 }
      );
    }

    // Edge Config propagation can take a few seconds globally
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Save failed." },
      { status: 500 }
    );
  }
}
