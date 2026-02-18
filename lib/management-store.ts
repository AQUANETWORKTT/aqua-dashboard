// lib/management-store.ts

import { get } from "@vercel/edge-config";
import {
  DEFAULT_MANAGEMENT_DATA,
  type ManagementData,
} from "./management-schema";

const ITEM_KEY = "managementData";

export async function getManagementData(): Promise<ManagementData> {
  try {
    const data = await get<ManagementData>(ITEM_KEY);

    if (data && Array.isArray(data.managers) && Array.isArray(data.meetings)) {
      return data;
    }

    return DEFAULT_MANAGEMENT_DATA;
  } catch {
    // If EDGE_CONFIG isn't set or Edge Config isn't reachable, fall back to defaults
    return DEFAULT_MANAGEMENT_DATA;
  }
}
