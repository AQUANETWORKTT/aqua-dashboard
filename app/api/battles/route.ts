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

function getOrdinal(day: number) {
  if (day > 3 && day < 21) return `${day}th`;

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function formatTelegramDate(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);

  if (Number.isNaN(date.getTime())) return dateValue;

  const month = date.toLocaleDateString("en-GB", { month: "long" });
  return `${getOrdinal(date.getDate())} of ${month}`;
}

function formatTelegramTime(timeValue: string) {
  const [hourRaw = "0", minuteRaw = "0"] = String(timeValue || "00:00").split(":");
  const date = new Date(2000, 0, 1, Number(hourRaw), Number(minuteRaw));

  if (Number.isNaN(date.getTime())) return timeValue;

  return date
    .toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace("am", "a.m.")
    .replace("pm", "p.m.")
    .replace("AM", "a.m.")
    .replace("PM", "p.m.");
}

function formatTelegramScore(scoreValue: unknown) {
  const score = Number(String(scoreValue || "").replace(/,/g, ""));

  if (!Number.isFinite(score) || score <= 0) return String(scoreValue || "");
  if (score % 1000 === 0) return `${score / 1000}K`;

  return `${Number((score / 1000).toFixed(1))}K`;
}

function avatarProxyUrl(avatar: string) {
  return `/api/tiktok-avatar-image?url=${encodeURIComponent(avatar)}`;
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  };
}

async function getCreatorManager(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  username: string
) {
  const clean = cleanUsername(username);

  const { data: login } = await supabase
    .from("creator_logins")
    .select("manager")
    .eq("username", clean)
    .maybeSingle();

  if (login?.manager) return String(login.manager);

  const { data: stats } = await supabase
    .from("creator_monthly_stats")
    .select("manager")
    .eq("username", clean)
    .order("stats_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return stats?.manager ? String(stats.manager) : "Unknown";
}

async function fetchTikTokAvatar(username: string) {
  if (!username) return "";

  try {
    const refreshKey = Date.now();
    const randomKey = Math.random();
    const response = await fetch(
      `https://www.tiktok.com/@${username}?_t=${refreshKey}&_r=${randomKey}`,
      {
        method: "GET",
        cache: "no-store",
        next: { revalidate: 0 },
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

function hasUsableAvatar(value: unknown) {
  const avatar = String(value || "").trim();
  return avatar && !avatar.includes("/creators/default.jpg");
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

    const battles = await Promise.all(
      (data || []).map(async (battle) => {
        let requesterAvatar = battle.requester_avatar;
        let accepterAvatar = battle.accepter_avatar;

        if (!hasUsableAvatar(requesterAvatar)) {
          requesterAvatar = await fetchTikTokAvatar(battle.requester_username);
        }

        if (battle.accepter_username && !hasUsableAvatar(accepterAvatar)) {
          accepterAvatar = await fetchTikTokAvatar(battle.accepter_username);
        }

        return {
          ...battle,
          requester_avatar: requesterAvatar,
          accepter_avatar: accepterAvatar,
        };
      })
    );

    return NextResponse.json({ battles }, { headers: noStoreHeaders() });
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

      const requesterManager = await getCreatorManager(
        supabase,
        existing.requester_username
      );
      const accepterManager = await getCreatorManager(supabase, username);

      await sendTelegramMessage(
        [
          "CONFIRMED BATTLE",
          "",
          `Creator 1: @${existing.requester_username}`,
          `Manager: ${requesterManager}`,
          "",
          `Creator 2: @${username}`,
          `Manager: ${accepterManager}`,
          "",
          `Date: ${formatTelegramDate(existing.battle_date)}`,
          `Time: ${formatTelegramTime(existing.battle_time)}`,
          `Estimated score: ${formatTelegramScore(existing.estimated_score)}`,
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
    const expectedCode = process.env.BATTLES_ADMIN_CODE || "FALCON";

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
