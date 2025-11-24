import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Invalid username format." },
        { status: 400 }
      );
    }

    const clean = username.trim().toLowerCase();

    // Check if file exists in /public/history
    const safe = clean.replace(/[<>:"/\\|?*]/g, "_");
    const filePath = path.join(process.cwd(), "public/history", `${safe}.json`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        {
          error:
            "Incorrect username. Please ensure it exactly matches your TikTok username — case sensitive.",
        },
        { status: 404 }
      );
    }

    // Success → set cookie
    const res = NextResponse.json({ success: true });

    res.cookies.set("aqua_user", clean, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    return res;
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
