import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(_: Request, { params }: any) {
  const file = path.join(process.cwd(), "data/battles", `${params.id}.json`);

  if (!fs.existsSync(file)) return NextResponse.json({ error: "Not found" });

  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return NextResponse.json(json);
}
