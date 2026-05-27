import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export async function POST(req: Request) {
  try {
    const {
      manager,
      imageCount,
      points,
      possibleDuplicate,
      duplicateFileNames,
    } = await req.json();

    const message =
      `📤 *NEW MANAGER UPLOAD*\n\n` +
      `👤 Manager: ${manager}\n` +
      `📸 Images: ${imageCount}\n` +
      `⭐ Points Pending: ${points}\n` +
      `⚠️ Duplicate Flag: ${possibleDuplicate ? "Yes" : "No"}\n` +
      `${
        possibleDuplicate && duplicateFileNames?.length
          ? `\nDuplicate Files:\n${duplicateFileNames.map((n: string) => `- ${n}`).join("\n")}`
          : ""
      }`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: true }, { status: 500 });
  }
}