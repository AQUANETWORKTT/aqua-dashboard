import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const FILE = path.join(process.cwd(), "data", "points-adjustments.json");

export async function GET() {
  if (!fs.existsSync(FILE)) {
    return NextResponse.json({});
  }

  const json = JSON.parse(fs.readFileSync(FILE, "utf8"));
  return NextResponse.json(json);
}
