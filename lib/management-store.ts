// lib/management-store.ts

import fs from "fs";
import path from "path";
import {
  DEFAULT_MANAGEMENT_DATA,
  type ManagementData,
} from "./management-schema";

const FILE_PATH = path.join(process.cwd(), "data", "management-data.json");

export async function getManagementData(): Promise<ManagementData> {
  try {
    if (!fs.existsSync(FILE_PATH)) return DEFAULT_MANAGEMENT_DATA;

    const raw = fs.readFileSync(FILE_PATH, "utf8");
    const json = JSON.parse(raw) as ManagementData;

    if (
      json &&
      Array.isArray(json.managers) &&
      Array.isArray(json.meetings) &&
      typeof json.updatedAtISO === "string"
    ) {
      return json;
    }

    return DEFAULT_MANAGEMENT_DATA;
  } catch {
    return DEFAULT_MANAGEMENT_DATA;
  }
}
