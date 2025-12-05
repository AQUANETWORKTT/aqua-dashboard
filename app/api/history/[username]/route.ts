import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: { username: string } }
) {
  const { username } = context.params;

  // Load history JSON file
  try {
    const filePath = `./data/history/${username}.json`;
    const data = await import(`../../../../data/history/${username}.json`);

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "History not found" },
      { status: 404 }
    );
  }
}
