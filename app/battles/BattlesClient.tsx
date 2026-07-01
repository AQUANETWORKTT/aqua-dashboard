"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { submissionsSupabase } from "@/lib/submissions-supabase";
import {
  BattlePoster,
  normalizePosterTemplate,
  type PosterTemplateJson,
} from "./BattlePoster";

type Battle = {
  id: string;
  requester_username: string;
  requester_avatar: string | null;
  accepter_username: string | null;
  accepter_avatar: string | null;
  battle_date: string;
  battle_time: string;
  battle_at: string;
  estimated_score: string;
  status: "available" | "accepted";
};

function displayDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function displayTime(time: string) {
  const [hour = "0", minute = "0"] = time.split(":");
  return new Date(2000, 0, 1, Number(hour), Number(minute)).toLocaleTimeString(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function buildDateOptions() {
  return Array.from({ length: 31 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const value = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    return { value, label };
  });
}

function buildTimeOptions() {
  const options: { value: string; label: string }[] = [];

  for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0"
    )}`;
    const label = new Date(2000, 0, 1, hour, minute).toLocaleTimeString(
      "en-GB",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );

    options.push({ value, label });
  }

  return options;
}

function buildScoreOptions() {
  const values = [1000, 3000, ...Array.from({ length: 20 }, (_, index) => (index + 1) * 5000)];

  return values.map((value) => {
    return {
      value: `${value}`,
      label: `${value / 1000}k`,
    };
  });
}

async function fetchTikTokAvatar(username: string) {
  if (!username) return "";

  try {
    const res = await fetch("/api/tiktok-avatar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    const json = await res.json();
    return json.avatar || "";
  } catch {
    return "";
  }
}

function resolveCreatorAvatar(username: string) {
  const fallbackSrc = "/creators/default.jpg";
  const localSrc = `/creators/${encodeURIComponent(username)}.jpg`;

  return new Promise<string>((resolve) => {
    const localImg = new window.Image();
    localImg.src = localSrc;
    localImg.onload = () => resolve(localSrc);
    localImg.onerror = async () => {
      const scrapedAvatar = await fetchTikTokAvatar(username);
      resolve(scrapedAvatar || fallbackSrc);
    };
  });
}

function formatName(raw: string) {
  return raw.replace("@", "").trim().toUpperCase();
}

function getMatchNameFontSize(raw: string) {
  const length = formatName(raw).length;

  if (length <= 10) return 28;
  if (length <= 14) return 24;
  if (length <= 18) return 20;
  if (length <= 24) return 16;
  return 13;
}

function getOrdinal(day: number) {
  if (day > 3 && day < 21) return `${day}TH`;

  switch (day % 10) {
    case 1:
      return `${day}ST`;
    case 2:
      return `${day}ND`;
    case 3:
      return `${day}RD`;
    default:
      return `${day}TH`;
  }
}

function formatPosterDate(raw: string) {
  if (!raw) return "";

  const date = new Date(`${raw}T12:00:00`);
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const monthName = date.toLocaleDateString("en-GB", { month: "long" });

  return `${weekday} ${getOrdinal(date.getDate())} ${monthName}`.toUpperCase();
}

function formatPosterTime(raw: string) {
  if (!raw) return "";

  let value = raw.trim().toLowerCase();
  value = value.replace(/\./g, "");
  value = value.replace(/\s+/g, " ");

  const match = value.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/);

  if (!match) return raw.toUpperCase();

  let hour = Number(match[1]);
  const minute = match[2] || "00";
  let period = match[3];

  if (!period) period = "pm";
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute}${period.toUpperCase()}`;
}

function cleanFileName(value: string) {
  return value
    .replaceAll(" ", "-")
    .replaceAll("/", "-")
    .replaceAll(":", "-")
    .replaceAll("—", "-")
    .replaceAll(",", "")
    .replaceAll("@", "");
}

export default function BattlesClient({ user }: { user: string | null }) {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [resolvedAvatars, setResolvedAvatars] = useState<Record<string, string>>({});
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [estimatedScore, setEstimatedScore] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [templateJson, setTemplateJson] = useState<PosterTemplateJson>(() =>
    normalizePosterTemplate(null)
  );
  const posterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const availableBattles = battles.filter((battle) => battle.status === "available");
  const acceptedBattles = battles.filter((battle) => battle.status === "accepted");
  const dateOptions = buildDateOptions();
  const timeOptions = buildTimeOptions();
  const scoreOptions = buildScoreOptions();

  function getResolvedAvatar(username: string | null | undefined, fallback?: string | null) {
    const cleanUsername = String(username || "").replace("@", "").trim().toLowerCase();
    return cleanUsername
      ? resolvedAvatars[cleanUsername] || fallback || "/creators/default.jpg"
      : "/creators/default.jpg";
  }

  async function loadBattles() {
    const res = await fetch("/api/battles", { cache: "no-store" });
    const json = await res.json();

    if (!res.ok) {
      setStatus(json.error || "Could not load battles.");
      return;
    }

    setBattles(json.battles || []);
  }

  useEffect(() => {
    loadBattles();
    loadPosterTemplate();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBattleAvatars() {
      const usernames = Array.from(
        new Set(
          battles
            .flatMap((battle) => [battle.requester_username, battle.accepter_username || ""])
            .map((name) => name.replace("@", "").trim().toLowerCase())
            .filter(Boolean)
        )
      ).filter((name) => !resolvedAvatars[name]);

      if (!usernames.length) return;

      const entries = await Promise.all(
        usernames.map(async (username) => [username, await resolveCreatorAvatar(username)] as const)
      );

      if (!cancelled) {
        setResolvedAvatars((current) => ({
          ...current,
          ...Object.fromEntries(entries),
        }));
      }
    }

    loadBattleAvatars();

    return () => {
      cancelled = true;
    };
  }, [battles, resolvedAvatars]);

  async function loadPosterTemplate() {
    const { data } = await submissionsSupabase
      .from("poster_templates_aqua")
      .select("background_url,template_json")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data?.template_json) {
      setTemplateJson(
        normalizePosterTemplate({
          ...(data.template_json as Partial<PosterTemplateJson>),
          backgroundUrl:
            (data.template_json as Partial<PosterTemplateJson>).backgroundUrl ||
            data.background_url ||
            undefined,
        })
      );
    }
  }

  async function requestBattle(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setStatus("Creating battle request...");

    const res = await fetch("/api/battles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "request",
        username: user,
        date,
        time,
        estimatedScore,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setStatus(json.error || "Could not request battle.");
      return;
    }

    setDate("");
    setTime("");
    setEstimatedScore("");
    setStatus("Battle request posted.");
    await loadBattles();
  }

  async function acceptBattle(battleId: string) {
    if (!user) return;

    setBusyId(battleId);
    setStatus("Accepting battle...");

    const res = await fetch("/api/battles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "accept",
        username: user,
        battleId,
      }),
    });

    const json = await res.json();
    setBusyId(null);

    if (!res.ok) {
      setStatus(json.error || "Could not accept battle.");
      return;
    }

    setStatus("Battle accepted.");
    await loadBattles();
  }

  async function downloadPoster(battle: Battle) {
    const node = posterRefs.current[battle.id];
    if (!node) return;

    setBusyId(battle.id);

    try {
      await document.fonts.ready;

      const images = Array.from(node.querySelectorAll("img"));
      const originalImageSrcs: Array<{ image: HTMLImageElement; src: string }> =
        [];

      for (const image of images) {
        originalImageSrcs.push({ image, src: image.src });

        if (
          image.src.includes("/api/tiktok-avatar-image") ||
          image.src.includes("tikcdn") ||
          image.src.includes("tiktok")
        ) {
          image.src = await imageToDataUrl(image.src);
        }
      }

      await waitForPosterImages(node);

      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#000000",
      });

      for (const item of originalImageSrcs) {
        item.image.src = item.src;
      }

      if (!blob) {
        setStatus("Poster download failed. Try again in a moment.");
        setBusyId(null);
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = cleanFileName(
        `${formatName(battle.requester_username)} VS ${formatName(
          battle.accepter_username || ""
        )} - ${formatPosterDate(battle.battle_date)} - ${formatPosterTime(
          battle.battle_time
        )}.png`
      );
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Poster downloaded.");
    } catch {
      setStatus("Poster download failed. Try again in a moment.");
    }

    setBusyId(null);
  }

  async function imageToDataUrl(src: string) {
    if (!src || src.startsWith("data:")) return src;

    try {
      const res = await fetch(src, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!res.ok) return src;

      const blob = await res.blob();

      return await new Promise<string>((resolve) => {
        const reader = new FileReader();

        reader.onloadend = () => {
          resolve(String(reader.result || src));
        };

        reader.onerror = () => {
          resolve(src);
        };

        reader.readAsDataURL(blob);
      });
    } catch {
      return src;
    }
  }

  async function waitForPosterImages(node: HTMLElement) {
    const images = Array.from(node.querySelectorAll("img"));

    await Promise.all(
      images.map((image) => {
        if (image.complete && image.naturalWidth > 0) return Promise.resolve();

        return new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        });
      })
    );

    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  if (!user) {
    return (
      <main className="battlePage centerPage">
        <section className="loginPanel">
          <h1>Creator Battles</h1>
          <p>Log in to request or accept a battle.</p>
          <Link href="/login" className="primaryButton">
            Creator Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="battlePage">
      <section className="battleHero">
        <h1>Creator Battles</h1>
        <div className="signedIn">@{user}</div>
      </section>

      <section className="requestPanel">
        <h2>Request Battle</h2>

        <form onSubmit={requestBattle} className="battleForm">
          <label className="dateControl">
            <span>Day</span>
            <select
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            >
              <option value="">Choose day</option>
              {dateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="timeControl">
            <span>Time</span>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            >
              <option value="">Choose time</option>
              {timeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="scoreControl">
            <span>Score</span>
            <select
              value={estimatedScore}
              onChange={(e) => setEstimatedScore(e.target.value)}
              required
            >
              <option value="">Choose score</option>
              {scoreOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Request</button>
        </form>
      </section>

      {status && <div className="statusLine">{status}</div>}

      <section className="battleSection">
        <h2>Battles Available</h2>
        <div className="battleGrid">
          {availableBattles.length ? (
            availableBattles.map((battle) => (
              <article key={battle.id} className="battleCard">
                <CreatorBlock
                  username={battle.requester_username}
                  avatar={getResolvedAvatar(battle.requester_username, battle.requester_avatar)}
                />
                <div className="battleMeta">
                  <strong>{displayDate(battle.battle_date)}</strong>
                  <span>{displayTime(battle.battle_time)}</span>
                  <span>{battle.estimated_score}</span>
                </div>
                <button
                  disabled={
                    busyId === battle.id || battle.requester_username === user
                  }
                  onClick={() => acceptBattle(battle.id)}
                >
                  {battle.requester_username === user
                    ? "Your Request"
                    : busyId === battle.id
                    ? "Accepting..."
                    : "Accept Battle"}
                </button>
              </article>
            ))
          ) : (
            <p className="emptyText">No open battles yet.</p>
          )}
        </div>
      </section>

      <section className="battleSection">
        <h2>Upcoming Battles</h2>
        <div className="acceptedList">
          {acceptedBattles.length ? (
            acceptedBattles.map((battle) => (
              <article key={battle.id} className="acceptedCard">
                <div className="hiddenPoster">
                  <BattlePoster
                    battleId={battle.id}
                    template={templateJson}
                    name1={formatName(battle.requester_username)}
                    name2={formatName(battle.accepter_username || "")}
                    image1={getResolvedAvatar(battle.requester_username, battle.requester_avatar)}
                    image2={getResolvedAvatar(battle.accepter_username, battle.accepter_avatar)}
                    date={formatPosterDate(battle.battle_date)}
                    time={formatPosterTime(battle.battle_time)}
                    posterRef={(el) => {
                      posterRefs.current[battle.id] = el;
                    }}
                  />
                </div>

                <div className="matchupVisual">
                  <img
                    src={getResolvedAvatar(battle.requester_username, battle.requester_avatar)}
                    alt=""
                    className="matchAvatar matchAvatarLeft"
                    onError={(event) => {
                      event.currentTarget.src = "/creators/default.jpg";
                    }}
                  />
                  <img
                    src={getResolvedAvatar(battle.accepter_username, battle.accepter_avatar)}
                    alt=""
                    className="matchAvatar matchAvatarRight"
                    onError={(event) => {
                      event.currentTarget.src = "/creators/default.jpg";
                    }}
                  />

                  <div className="matchCenter">
                    <div className="matchNames">
                      <span className="matchName" style={{ fontSize: getMatchNameFontSize(battle.requester_username) }}>
                        @{battle.requester_username}
                      </span>
                      <strong>VS</strong>
                      <span className="matchName" style={{ fontSize: getMatchNameFontSize(battle.accepter_username || "") }}>
                        @{battle.accepter_username}
                      </span>
                    </div>
                    <div className="matchTime">
                      <strong>{displayDate(battle.battle_date)}</strong>
                      <span>{displayTime(battle.battle_time)}</span>
                    </div>
                  </div>
                </div>

                <button
                  className="posterButton"
                  onClick={() => downloadPoster(battle)}
                  disabled={busyId === battle.id}
                >
                  {busyId === battle.id ? "Preparing..." : "Get Poster"}
                </button>
              </article>
            ))
          ) : (
            <p className="emptyText">Accepted battles will appear here.</p>
          )}
        </div>
      </section>

      <style jsx>{`
        .battlePage {
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          padding: 24px 14px 128px;
          background: #01040a;
          color: white;
          font-family: Arial, sans-serif;
          --display-font: Impact, Haettenschweiler, "Arial Black", sans-serif;
          --body-font: "Trebuchet MS", Verdana, sans-serif;
          overflow: hidden;
        }

        .battlePage::before {
          content: "";
          position: fixed;
          inset: -18px;
          z-index: -2;
          background: url("/race-to-atlantis/background.png") center top / cover no-repeat;
          filter: blur(3px) saturate(1.08) brightness(0.76);
          transform: scale(1.015);
        }

        .battlePage::after {
          content: "";
          position: fixed;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(circle at 50% 0%, rgba(56, 243, 255, 0.24), transparent 32%),
            linear-gradient(180deg, rgba(1, 10, 22, 0.36) 0%, rgba(1, 4, 10, 0.78) 48%, rgba(1, 4, 10, 0.92) 100%);
          pointer-events: none;
        }

        .centerPage {
          display: grid;
          place-items: center;
        }

        .loginPanel,
        .battleHero,
        .requestPanel,
        .battleSection {
          max-width: 1100px;
          margin: 0 auto 16px;
        }

        .loginPanel {
          text-align: center;
          padding: 28px;
          border: 1px solid rgba(45, 224, 255, 0.24);
          border-radius: 18px;
          background: rgba(8, 18, 35, 0.88);
        }

        h1,
        h2,
        p {
          margin-top: 0;
        }

        h1 {
          margin: 0;
          font-size: clamp(38px, 11vw, 86px);
          line-height: 0.95;
          text-transform: uppercase;
          font-family: var(--display-font);
          font-weight: 900;
          letter-spacing: 0.02em;
          color: #f8feff;
          -webkit-text-stroke: 1px rgba(124, 246, 255, 0.35);
          text-shadow:
            0 4px 0 rgba(0, 0, 0, 0.55),
            0 0 18px rgba(45, 224, 255, 0.72),
            0 0 36px rgba(45, 224, 255, 0.34);
        }

        h2 {
          margin: 0;
          font-size: clamp(26px, 7vw, 48px);
          line-height: 0.95;
          text-transform: uppercase;
          text-align: center;
          font-family: var(--display-font);
          letter-spacing: 0.03em;
          color: #ffffff;
          -webkit-text-stroke: 0.7px rgba(124, 246, 255, 0.28);
          text-shadow:
            0 3px 0 rgba(0, 0, 0, 0.55),
            0 0 10px rgba(45, 224, 255, 0.95),
            0 0 28px rgba(45, 224, 255, 0.45);
        }

        p {
          color: rgba(255, 255, 255, 0.68);
        }

        .signedIn,
        .statusLine {
          border: 1px solid rgba(45, 224, 255, 0.28);
          border-radius: 999px;
          padding: 9px 12px;
          color: #7cf6ff;
          background: rgba(45, 224, 255, 0.08);
          font-weight: 900;
        }

        .statusLine {
          max-width: 1100px;
          margin: 0 auto 16px;
          text-align: center;
          border-radius: 14px;
        }

        .requestPanel,
        .battleCard,
        .acceptedCard {
          border: 1px solid rgba(45, 224, 255, 0.2);
          border-radius: 18px;
          background: rgba(8, 18, 35, 0.94);
          box-shadow: 0 0 24px rgba(45, 224, 255, 0.08);
        }

        .requestPanel {
          position: relative;
          overflow: hidden;
          display: grid;
          gap: 18px;
          padding: 20px;
          background:
            radial-gradient(circle at 50% 0%, rgba(45, 224, 255, 0.24), transparent 40%),
            linear-gradient(180deg, rgba(9, 24, 46, 0.9), rgba(4, 10, 24, 0.9));
        }

        .requestPanel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            120deg,
            transparent,
            rgba(124, 246, 255, 0.12),
            transparent
          );
        }

        .battleHero {
          display: grid;
          place-items: center;
          gap: 12px;
          padding: 22px 0 10px;
          text-align: center;
        }

        .battleForm {
          display: grid;
          grid-template-columns: 1.1fr 0.85fr 1fr auto;
          gap: 12px;
          align-items: stretch;
          position: relative;
          z-index: 1;
        }

        label {
          position: relative;
          display: grid;
          gap: 8px;
          color: #7cf6ff;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          font-family: var(--body-font);
          letter-spacing: 0.08em;
          border: 1px solid rgba(45, 224, 255, 0.24);
          border-radius: 16px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.045);
          box-shadow: inset 0 0 18px rgba(45, 224, 255, 0.05);
        }

        input,
        select {
          width: 100%;
          min-width: 0;
          color: white;
          background: rgba(0, 0, 0, 0.28);
          border: 1px solid rgba(124, 246, 255, 0.18);
          border-radius: 12px;
          padding: 13px 11px;
          font-size: 15px;
          font-weight: 900;
          font-family: var(--body-font);
          outline: none;
        }

        select {
          appearance: none;
          background:
            linear-gradient(45deg, transparent 50%, #7cf6ff 50%) right 14px
              center / 7px 7px no-repeat,
            linear-gradient(135deg, #7cf6ff 50%, transparent 50%) right 9px
              center / 7px 7px no-repeat,
            rgba(0, 0, 0, 0.28);
        }

        input:focus,
        select:focus {
          border-color: rgba(124, 246, 255, 0.72);
          box-shadow: 0 0 18px rgba(45, 224, 255, 0.24);
        }

        button,
        .primaryButton {
          border: 0;
          border-radius: 16px;
          padding: 14px 18px;
          color: #011016;
          background: linear-gradient(135deg, #7cf6ff, #2de0ff 58%, #ffffff);
          font-weight: 900;
          font-family: var(--display-font);
          cursor: pointer;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          font-size: 18px;
          box-shadow:
            0 0 16px rgba(45, 224, 255, 0.38),
            inset 0 -2px 0 rgba(0, 0, 0, 0.24);
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .battleGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .battleCard {
          display: grid;
          gap: 12px;
          padding: 14px;
        }

        .battleMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          color: rgba(255, 255, 255, 0.76);
          font-size: 13px;
        }

        .battleMeta strong,
        .battleMeta span {
          border-radius: 999px;
          padding: 6px 8px;
          background: rgba(255, 255, 255, 0.06);
        }

        .wide {
          margin: 10px 0 14px;
        }

        .emptyText {
          margin: 0;
          padding: 16px;
          border: 1px dashed rgba(45, 224, 255, 0.24);
          border-radius: 14px;
        }

        .acceptedList {
          display: grid;
          gap: 14px;
        }

        .acceptedCard {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          min-height: 230px;
          display: grid;
          gap: 12px;
          place-items: center;
          padding: 18px;
          background:
            linear-gradient(120deg, rgba(45, 224, 255, 0.12), transparent 38%),
            linear-gradient(240deg, rgba(124, 246, 255, 0.12), transparent 38%),
            rgba(8, 18, 35, 0.88);
        }

        .hiddenPoster {
          position: fixed;
          left: -99999px;
          top: 0;
          width: 1080px;
          height: 1920px;
          pointer-events: none;
          opacity: 0;
          z-index: -1;
        }

        .matchupVisual {
          position: relative;
          z-index: 1;
          width: 100%;
          min-height: 194px;
          border: 1px solid rgba(124, 246, 255, 0.24);
          border-radius: 18px;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            linear-gradient(90deg, rgba(45, 224, 255, 0.09), rgba(255, 255, 255, 0.025), rgba(45, 224, 255, 0.09)),
            rgba(0, 0, 0, 0.2);
        }

        .matchupVisual::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(115deg, rgba(0, 0, 0, 0.72) 0%, transparent 42%),
            linear-gradient(245deg, rgba(0, 0, 0, 0.72) 0%, transparent 42%);
          z-index: 1;
          pointer-events: none;
        }

        .matchAvatar {
          position: absolute;
          top: -10%;
          width: 50%;
          height: 120%;
          object-fit: cover;
          opacity: 0.58;
          filter: blur(1.5px) saturate(1.15);
          transform: skewX(-10deg) scale(1.04);
          pointer-events: none;
        }

        .matchAvatarLeft {
          left: -8%;
          clip-path: polygon(0 0, 86% 0, 66% 100%, 0 100%);
        }

        .matchAvatarRight {
          right: -6%;
          clip-path: polygon(34% 0, 100% 0, 100% 100%, 16% 100%);
          transform: skewX(10deg) scale(1.02);
          object-position: center;
        }

        .matchCenter {
          position: relative;
          z-index: 2;
          pointer-events: none;
          width: min(100%, 620px);
          display: grid;
          justify-items: center;
          gap: 14px;
          text-align: center;
        }

        .matchNames {
          display: grid;
          align-items: center;
          justify-items: center;
          justify-content: center;
          gap: 7px;
          font-weight: 900;
          width: min(100%, 520px);
        }

        .matchNames span {
          display: block;
          width: 100%;
          max-width: min(76vw, 460px);
          white-space: nowrap;
          font-family: var(--display-font);
          line-height: 0.95;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: white;
          -webkit-text-stroke: 0.5px rgba(45, 224, 255, 0.32);
          text-shadow:
            0 3px 0 rgba(0, 0, 0, 0.82),
            0 0 14px rgba(45, 224, 255, 0.32);
        }

        .matchNames strong {
          color: #7cf6ff;
          font-family: var(--display-font);
          font-size: 38px;
          line-height: 0.8;
          text-shadow:
            0 3px 0 rgba(0, 0, 0, 0.7),
            0 0 18px rgba(45, 224, 255, 0.9);
        }

        .matchTime {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .matchTime strong,
        .matchTime span {
          border-radius: 999px;
          padding: 7px 10px;
          color: #eaffff;
          background: rgba(0, 0, 0, 0.44);
          border: 1px solid rgba(124, 246, 255, 0.22);
          font-size: 13px;
          font-weight: 900;
        }

        .posterButton {
          min-width: 142px;
          padding: 10px 14px;
          font-size: 15px;
          position: relative;
          z-index: 10;
          pointer-events: auto;
        }

        @media (max-width: 820px) {
          .battleHero,
          .requestPanel,
          .acceptedCard {
            grid-template-columns: 1fr;
          }

          .battleHero {
            display: grid;
          }

          .battleForm,
          .battleGrid {
            grid-template-columns: 1fr;
          }

          .requestPanel {
            padding: 18px 14px;
          }

          .acceptedCard {
            min-height: 260px;
          }
        }
      `}</style>
    </main>
  );
}

function CreatorBlock({
  username,
  avatar,
}: {
  username: string;
  avatar: string | null;
}) {
  return (
    <div className="creatorBlock">
      <img
        src={avatar || "/creators/default.jpg"}
        alt={username}
        onError={(event) => {
          event.currentTarget.src = "/creators/default.jpg";
        }}
      />
      <strong>@{username}</strong>
      <style jsx>{`
        .creatorBlock {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        img {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          object-fit: cover;
          border: 1px solid rgba(45, 224, 255, 0.34);
          background: rgba(255, 255, 255, 0.08);
        }

        strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          color: white;
        }
      `}</style>
    </div>
  );
}
