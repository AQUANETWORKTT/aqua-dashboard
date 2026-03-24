import { NextResponse } from "next/server";
import { creators } from "@/data/creators";

function normalise(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Missing username or password" },
        { status: 400 }
      );
    }

    const cleanUsername = normalise(username);
    const cleanPassword = String(password).trim();

    const creator = creators.find(
      (c) => normalise(c.username) === cleanUsername
    );

    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const expectedPassword = `${cleanUsername}1`;

    if (cleanPassword !== expectedPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
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