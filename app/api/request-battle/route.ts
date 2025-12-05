import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const filePath = path.join(dataDir, "battle-requests.json");

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

    // Ensure /data folder exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    // Ensure the file exists
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf8");
    }

    // Load existing data
    const raw = fs.readFileSync(filePath, "utf8");
    const existing = JSON.parse(raw);

    // Build new request object
    const newRequest = {
      id: crypto.randomUUID(),
      tiktok_username,
      availability,
      date: new Date().toISOString(),
    };

    // Add request
    existing.push(newRequest);

    // Save file
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
