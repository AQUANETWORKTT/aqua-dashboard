// app/api/history/[username]/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const HISTORY_DIR = path.join(process.cwd(), "data", "history");

export async function GET(
  req: Request,
  { params }: { params: { username: string } }
) {
  try {
    const rawUsername = params.username;
    const safeName = rawUsername.replace(/[<>:"/\\|?*]+/g, "_");
    const filePath = path.join(HISTORY_DIR, `${safeName}.json`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        username: rawUsername,
        entries: [],
      });
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);
    return NextResponse.json(json);
  } catch (err: any) {
    console.error("History API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load history" },
      { status: 500 }
    );
  }
}
