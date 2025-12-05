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
    const opponentAgency = form.get("opponent_agency")?.toString() || "";
    const opponentName = form.get("opponent_name")?.toString() || "";
    const notes = form.get("notes")?.toString() || "";

    const opponentImage = form.get("opponent_image") as File | null;
    const posterImage = form.get("poster_image") as File | null;

    let opponentImageUrl = "";
    let posterUrl = "";

    // ---------------------------
    // SAVE OPPONENT IMAGE
    // ---------------------------
    if (opponentImage) {
      const buffer = Buffer.from(await opponentImage.arrayBuffer());
      const fileName = `${randomUUID()}-${opponentImage.name}`;
      const uploadPath = path.join(process.cwd(), "public", "battles", fileName);

      fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
      fs.writeFileSync(uploadPath, buffer);

      opponentImageUrl = `/battles/${fileName}`;
    }

    // ---------------------------
    // SAVE POSTER IMAGE
    // ---------------------------
    if (posterImage) {
      const buffer = Buffer.from(await posterImage.arrayBuffer());
      const fileName = `${randomUUID()}-${posterImage.name}`;
      const uploadPath = path.join(process.cwd(), "public", "battle-posters", fileName);

      fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
      fs.writeFileSync(uploadPath, buffer);

      posterUrl = `/battle-posters/${fileName}`;
    }

    // ---------------------------
    // SAVE TO JSON FILE
    // ---------------------------
    const filePath = path.join(process.cwd(), "data", "arranged-battles.json");
    const existing = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, "utf8"))
      : [];

    const battle = {
      id: randomUUID(),
      date,
      time,
      creatorUsername,
      opponentAgency,
      opponentName,
      opponentImageUrl,
      posterUrl,
      notes,
    };

    existing.push(battle);

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));

    return NextResponse.json({ success: true, battle });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
