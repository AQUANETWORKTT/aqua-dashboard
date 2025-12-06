import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const FILE = path.join(process.cwd(), "data", "points-adjustments.json");

export async function POST(req: Request) {
  const json = await req.json();
  fs.writeFileSync(FILE, JSON.stringify(json, null, 2));
  return NextResponse.json({ ok: true });
}
