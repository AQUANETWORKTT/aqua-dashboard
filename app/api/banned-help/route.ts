import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export async function POST(req: Request) {
  try {
    const { tiktokId, reason, length, manager } = await req.json();

    const message =
      `🚨 *BAN HELP REQUEST*\n\n` +
      `📱 TikTok: @${tiktokId}\n` +
      `❗ Reason: ${reason}\n` +
      `⏳ Length: ${length}\n` +
      `👤 Manager: ${manager}\n`;

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: true }, { status: 500 });
  }
}
