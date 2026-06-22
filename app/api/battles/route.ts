import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BattleAction = "request" | "accept";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL;
  const serviceRoleKey = process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function cleanUsername(username: unknown) {
  return String(username || "")
    .replace(/^@/, "")
    .trim()
    .toLowerCase();
}

function battleAt(date: string, time: string) {
  return `${date}T${time}:00`;
}

function avatarProxyUrl(avatar: string) {
  return `/api/tiktok-avatar-image?url=${encodeURIComponent(avatar)}`;
}

async function fetchTikTokAvatar(username: string) {
  if (!username) return "";

  try {
    const refreshKey = Date.now();
    const response = await fetch(
      `https://www.tiktok.com/@${username}?_t=${refreshKey}`,
      {
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    );

    const html = await response.text();
    const match =
      html.match(/"avatarLarger":"(.*?)"/) ||
      html.match(/"avatarMedium":"(.*?)"/) ||
      html.match(/"avatarThumb":"(.*?)"/);

    if (!match) return "";

    const avatar = match[1]
      .replace(/\\u002F/g, "/")
      .replace(/\\u0026/g, "&");

    return avatarProxyUrl(avatar);
  } catch {
    return "";
  }
}

async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.BATTLE_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("creator_battles")
      .select("*")
      .in("status", ["available", "accepted"])
      .order("battle_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ battles: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load battles." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const action = String(body.action || "") as BattleAction;
    const username = cleanUsername(body.username);

    if (!username) {
      return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
    }

    if (action === "request") {
      const date = String(body.date || "");
      const time = String(body.time || "");
      const estimatedScore = String(body.estimatedScore || "").trim();

      if (!date || !time || !estimatedScore) {
        return NextResponse.json(
          { error: "Date, time and estimated score are required." },
          { status: 400 }
        );
      }

      const requesterAvatar = await fetchTikTokAvatar(username);
      const row = {
        id: crypto.randomUUID(),
        requester_username: username,
        requester_avatar: requesterAvatar,
        battle_date: date,
        battle_time: time,
        battle_at: battleAt(date, time),
        estimated_score: estimatedScore,
        status: "available",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("creator_battles")
        .insert(row)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ battle: data });
    }

    if (action === "accept") {
      const battleId = String(body.battleId || "");

      if (!battleId) {
        return NextResponse.json({ error: "Battle missing." }, { status: 400 });
      }

      const { data: existing, error: existingError } = await supabase
        .from("creator_battles")
        .select("*")
        .eq("id", battleId)
        .single();

      if (existingError || !existing) {
        return NextResponse.json({ error: "Battle not found." }, { status: 404 });
      }

      if (existing.status !== "available") {
        return NextResponse.json(
          { error: "This battle has already been accepted." },
          { status: 409 }
        );
      }

      if (cleanUsername(existing.requester_username) === username) {
        return NextResponse.json(
          { error: "You cannot accept your own battle." },
          { status: 400 }
        );
      }

      const accepterAvatar = await fetchTikTokAvatar(username);

      const { data, error } = await supabase
        .from("creator_battles")
        .update({
          accepter_username: username,
          accepter_avatar: accepterAvatar,
          status: "accepted",
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", battleId)
        .eq("status", "available")
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await sendTelegramMessage(
        [
          "CONFIRMED BATTLE",
          "",
          `Creator 1: @${existing.requester_username}`,
          `Creator 2: @${username}`,
          `Date: ${existing.battle_date}`,
          `Time: ${existing.battle_time}`,
          `Estimated score: ${existing.estimated_score}`,
        ].join("\n")
      );

      return NextResponse.json({ battle: data });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Battle action failed." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const adminCode = req.headers.get("x-battles-admin-code");
    const expectedCode = process.env.BATTLES_ADMIN_CODE || "FALCON44";

    if (adminCode !== expectedCode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Battle id missing." }, { status: 400 });
    }

    const { error } = await supabase
      .from("creator_battles")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Battle delete failed." },
      { status: 500 }
    );
  }
}
