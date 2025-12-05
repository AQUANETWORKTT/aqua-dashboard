import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const tiktok_username = form.get("tiktok_username") as string;
    const availability = form.get("availability") as string;

    if (!tiktok_username || !availability) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error("Missing Telegram bot config");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const text =
      `🟦 *New Battle Request*\n` +
      `👤 *Username:* ${tiktok_username}\n` +
      `🕒 *Availability:* ${availability}\n` +
      `📅 *Sent:* ${new Date().toLocaleString("en-GB")}`;

    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("REQUEST BATTLE ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
