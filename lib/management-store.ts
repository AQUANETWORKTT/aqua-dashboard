// lib/management-store.ts
//
// ✅ Reads managementData using the Vercel REST API (same store your Save writes to)
// This avoids relying on EDGE_CONFIG SDK/env (which is why your portals weren’t seeing updates).

import {
  DEFAULT_MANAGEMENT_DATA,
  type ManagementData,
} from "./management-schema";

const ITEM_KEY = "managementData";

export async function getManagementData(): Promise<ManagementData> {
  const edgeConfigId = process.env.EDGE_CONFIG_ID || "";
  const token = process.env.VERCEL_ACCESS_TOKEN || "";
  const teamId = process.env.VERCEL_TEAM_ID || "";

  // If these aren't set, we can't read from the store → fall back to defaults
  if (!edgeConfigId || !token) return DEFAULT_MANAGEMENT_DATA;

  try {
    const url = new URL(
      `https://api.vercel.com/v1/edge-config/${edgeConfigId}/item/${ITEM_KEY}`
    );
    if (teamId) url.searchParams.set("teamId", teamId);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      // ensure Next doesn't cache this request
      cache: "no-store",
    });

    if (!res.ok) return DEFAULT_MANAGEMENT_DATA;

    const json = (await res.json().catch(() => null)) as
      | { key: string; value: any }
      | null;

    const data = json?.value as ManagementData | undefined;

    if (data && Array.isArray(data.managers) && Array.isArray(data.meetings)) {
      return data;
    }

    return DEFAULT_MANAGEMENT_DATA;
  } catch {
    return DEFAULT_MANAGEMENT_DATA;
  }
}
