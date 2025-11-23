import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Invalid username" },
        { status: 400 }
      );
    }

    const clean = username.trim().toLowerCase();

    const res = NextResponse.json({ success: true });

    // FORCE overwrite cookie
    res.cookies.set({
      name: "aqua_user",
      value: clean,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;

  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
