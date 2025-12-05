import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function DELETE(_: Request, { params }: any) {
  const id = params.id;

  const battleFile = path.join(process.cwd(), "data/battles", `${id}.json`);
  if (!fs.existsSync(battleFile)) {
    return NextResponse.json({ error: "Battle not found" }, { status: 404 });
  }

  // Read JSON to know which images to delete
  const battle = JSON.parse(fs.readFileSync(battleFile, "utf8"));

  // Delete battle JSON file
  fs.unlinkSync(battleFile);

  // Delete images if they exist
  const leftImage = path.join(process.cwd(), "public", battle.left.image);
  const rightImage = path.join(process.cwd(), "public", battle.right.image);

  if (fs.existsSync(leftImage)) fs.unlinkSync(leftImage);
  if (fs.existsSync(rightImage)) fs.unlinkSync(rightImage);

  return NextResponse.json({ success: true });
}
