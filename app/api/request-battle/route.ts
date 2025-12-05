import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "battle-requests.json");

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const tiktok_username = form.get("tiktok_username") as string;
    const availability = form.get("availability") as string;

    if (!tiktok_username || !availability) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    // Load existing requests or create empty array if none
    let existing: any[] = [];
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      existing = JSON.parse(raw);
    }

    // Build new request object
    const newRequest = {
      id: crypto.randomUUID(),
      tiktok_username,
      availability,
      date: new Date().toISOString(),
    };

    // Add to array
    existing.push(newRequest);

    // Save back to file
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf8");

    return NextResponse.json({ success: true, request: newRequest });
  } catch (err) {
    console.error("REQUEST BATTLE ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
