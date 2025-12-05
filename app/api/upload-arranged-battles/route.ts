import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const BATTLES_FILE = path.join(DATA_DIR, "arranged-battles.json");

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const battles = rows.map((row: any, index: number) => {
      const date = String(row.date || "").trim();
      const time = String(row.time || "").trim();
      const creatorUsername = String(row.creator_username || "").trim();
      const creatorDisplay = String(row.creator_display || "").trim();
      const opponentAgency = String(row.opponent_agency || "").trim();
      const opponentName = String(row.opponent_name || "").trim();
      const opponentImageUrl = String(row.opponent_image_url || "").trim();
      const notes = String(row.notes || "").trim();

      return {
        id: `${date}_${creatorUsername || index}`,
        date,
        time,
        creatorUsername,
        creatorDisplay,
        opponentAgency,
        opponentName,
        opponentImageUrl,
        notes,
      };
    });

    fs.writeFileSync(BATTLES_FILE, JSON.stringify(battles, null, 2), "utf8");

    return NextResponse.json({ success: true, count: battles.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}
