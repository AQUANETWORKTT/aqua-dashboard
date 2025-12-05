import { NextResponse } from "next/server";

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

    // Save request into a file OR console for now
    console.log("New battle request:", {
      tiktok_username,
      availability,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
