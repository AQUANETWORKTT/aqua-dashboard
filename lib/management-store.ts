// lib/management-store.ts

import { get, has } from "@vercel/edge-config";
import {
  DEFAULT_MANAGEMENT_DATA,
  type ManagementData,
} from "./management-schema";

const ITEM_KEY = "managementData"; // stored inside Edge Config as one JSON item

export async function getManagementData(): Promise<ManagementData> {
  try {
    // If item doesn't exist yet, fall back to defaults
    const exists = await has(ITEM_KEY);
    if (!exists) return DEFAULT_MANAGEMENT_DATA;

    const data = await get<ManagementData>(ITEM_KEY);
    if (data && Array.isArray(data.managers) && Array.isArray(data.meetings)) {
      return data;
    }
    return DEFAULT_MANAGEMENT_DATA;
  } catch {
    // If EDGE_CONFIG isn't set locally, still render defaults
    return DEFAULT_MANAGEMENT_DATA;
  }
}

/**
 * NOTE:
 * Edge Config writes are NOT done here.
 * Writes are done through the Vercel REST API in /api/management/save.
 */
export async function setManagementData(_next: ManagementData) {
  throw new Error(
    "setManagementData is not used with Edge Config. Use /api/management/save."
  );
}
