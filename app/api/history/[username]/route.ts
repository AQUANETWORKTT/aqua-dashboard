import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;

  try {
    const data = await import(`../../../../data/history/${username}.json`);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "History not found" },
      { status: 404 }
    );
  }
}
