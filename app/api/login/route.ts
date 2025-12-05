import { NextResponse } from "next/server";
import { creators } from "@/data/creators";

export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: "Missing username" }, { status: 400 });
    }

    const creator = creators.find(
      (c) => c.username.toLowerCase() === username.toLowerCase()
    );

    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    // Save canonical username into cookie
    const res = NextResponse.json({ ok: true, username: creator.username });
    res.cookies.set("aqua_user", creator.username, {
      secure: true,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });

    return res;

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
