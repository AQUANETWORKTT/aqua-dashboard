import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const date = form.get("date")?.toString() || "";
    const time = form.get("time")?.toString() || "";
    const creatorUsername = form.get("creator_username")?.toString() || "";

    // ⬇⬇ AUTO SET CREATOR AGENCY
    const creatorAgency = "Aqua Agency";

    const opponentAgency = form.get("opponent_agency")?.toString() || "";
    const opponentName = form.get("opponent_name")?.toString() || "";
    const notes = form.get("notes")?.toString() || "";

    const imageFile = form.get("opponent_image") as File | null;

    let opponentImageUrl = "";

    // Save opponent image
    if (imageFile) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const fileName = `${randomUUID()}-${imageFile.name}`;
      const uploadPath = path.join(process.cwd(), "public", "battles", fileName);

      fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
      fs.writeFileSync(uploadPath, buffer);

      opponentImageUrl = `/battles/${fileName}`;
    }

    const filePath = path.join(process.cwd(), "data", "arranged-battles.json");
    const existing = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, "utf8"))
      : [];

    const battle = {
      id: randomUUID(),
      date,
      time,
      creatorUsername,
      creatorAgency, // ⬅⬅ ADD HERE
      opponentAgency,
      opponentName,
      opponentImageUrl,
      notes,
    };

    existing.push(battle);
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));

    return NextResponse.json({ success: true, battle });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
