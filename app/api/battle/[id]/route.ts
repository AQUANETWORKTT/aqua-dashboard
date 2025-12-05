import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(_req: Request, context: { params: { id: string } }) {
  const { id } = context.params;

  const filePath = path.join(process.cwd(), "data/battles", `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  }

  const battle = JSON.parse(fs.readFileSync(filePath, "utf8"));

  return NextResponse.json(battle);
}
