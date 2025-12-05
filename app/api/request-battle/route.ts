import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    console.log("🟦 Request received");

    const form = await req.formData();
    const tiktok_username = form.get("tiktok_username");
    const availability = form.get("availability");

    console.log("Username:", tiktok_username);
    console.log("Availability:", availability);

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    console.log("Token exists?", !!token);
    console.log("Chat ID exists?", !!chatId);

    if (!token || !chatId) {
      console.error("Missing environment variables.");
      return NextResponse.json({ error: "Missing env" }, { status: 500 });
    }

    const text = `New request from ${tiktok_username}: ${availability}`;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    console.log("Sending Telegram message...");

    const result = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    const response = await result.json();
    console.log("Telegram response:", response);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("TELEGRAM ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
