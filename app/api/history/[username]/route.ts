import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params;

    const filePath = path.join(process.cwd(), "public", "history", `${username}.json`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "User history not found" }, { status: 404 });
    }

    const data = fs.readFileSync(filePath, "utf8");
    return NextResponse.json(JSON.parse(data));

  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
