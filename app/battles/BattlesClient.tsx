"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

export default function BattlesClient({ user }: { user: string | null }) {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [estimatedScore, setEstimatedScore] = useState("");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const posterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const availableBattles = battles.filter((battle) => battle.status === "available");
  const acceptedBattles = battles.filter((battle) => battle.status === "accepted");

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
  }, []);

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
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#020617",
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `aqua-battle-${battle.requester_username}-vs-${battle.accepter_username}.png`;
      link.click();
      setStatus("Poster downloaded.");
    } catch {
      setStatus("Poster download failed. Try again in a moment.");
    }

    setBusyId(null);
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
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="timeControl">
            <span>Time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </label>
          <label className="scoreControl">
            <span>Score</span>
            <input
              value={estimatedScore}
              onChange={(e) => setEstimatedScore(e.target.value)}
              placeholder="e.g. 50k diamonds"
              required
            />
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
                  avatar={battle.requester_avatar}
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
                <div
                  className="poster"
                  ref={(el) => {
                    posterRefs.current[battle.id] = el;
                  }}
                >
                  <div className="posterTop">AQUA BATTLE</div>
                  <div className="posterFaces">
                    <PosterAvatar
                      username={battle.requester_username}
                      avatar={battle.requester_avatar}
                    />
                    <div className="versus">VS</div>
                    <PosterAvatar
                      username={battle.accepter_username || ""}
                      avatar={battle.accepter_avatar}
                    />
                  </div>
                  <div className="posterNames">
                    @{battle.requester_username} vs @{battle.accepter_username}
                  </div>
                  <div className="posterTime">
                    {displayDate(battle.battle_date)} - {displayTime(battle.battle_time)}
                  </div>
                </div>

                <div className="acceptedInfo">
                  <div className="acceptedCreators">
                    <CreatorBlock
                      username={battle.requester_username}
                      avatar={battle.requester_avatar}
                    />
                    <span>VS</span>
                    <CreatorBlock
                      username={battle.accepter_username || ""}
                      avatar={battle.accepter_avatar}
                    />
                  </div>
                  <div className="battleMeta wide">
                    <strong>{displayDate(battle.battle_date)}</strong>
                    <span>{displayTime(battle.battle_time)}</span>
                    <span>{battle.estimated_score}</span>
                  </div>
                  <button
                    onClick={() => downloadPoster(battle)}
                    disabled={busyId === battle.id}
                  >
                    {busyId === battle.id ? "Preparing..." : "Get Poster"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="emptyText">Accepted battles will appear here.</p>
          )}
        </div>
      </section>

      <style jsx>{`
        .battlePage {
          min-height: 100vh;
          padding: 24px 14px 128px;
          background:
            radial-gradient(circle at top, rgba(45, 224, 255, 0.18), transparent 34%),
            linear-gradient(180deg, #020617, #030712 58%, #000);
          color: white;
          font-family: Arial, sans-serif;
          --display-font: Impact, Haettenschweiler, "Arial Black", sans-serif;
          --body-font: "Trebuchet MS", Verdana, sans-serif;
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
          background: rgba(8, 18, 35, 0.94);
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
            linear-gradient(180deg, rgba(9, 24, 46, 0.98), rgba(4, 10, 24, 0.98));
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

        input {
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

        input:focus {
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
          display: grid;
          grid-template-columns: 210px 1fr;
          gap: 14px;
          align-items: center;
          padding: 14px;
        }

        .acceptedCreators {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .acceptedCreators > span {
          color: #2de0ff;
          font-size: 18px;
          font-weight: 900;
        }

        .poster {
          width: 210px;
          aspect-ratio: 9 / 16;
          position: relative;
          overflow: hidden;
          border-radius: 14px;
          background:
            linear-gradient(rgba(0, 6, 18, 0.14), rgba(0, 6, 18, 0.42)),
            url("/posters/aqua-battle/background.png") center / cover,
            linear-gradient(180deg, #023047, #020617);
          border: 1px solid rgba(45, 224, 255, 0.35);
          display: grid;
          grid-template-rows: auto 1fr auto auto;
          padding: 18px 12px;
        }

        .posterTop {
          text-align: center;
          font-size: 18px;
          font-weight: 900;
          color: white;
          text-shadow: 0 0 12px rgba(45, 224, 255, 0.85);
        }

        .posterFaces {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 8px;
          align-items: center;
        }

        .versus {
          color: #2de0ff;
          font-size: 22px;
          font-weight: 900;
          text-shadow: 0 0 12px rgba(45, 224, 255, 0.95);
        }

        .posterNames,
        .posterTime {
          text-align: center;
          font-weight: 900;
          text-transform: uppercase;
          text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
        }

        .posterNames {
          font-size: 12px;
        }

        .posterTime {
          margin-top: 8px;
          color: #7cf6ff;
          font-size: 13px;
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
            justify-items: center;
          }

          .acceptedInfo {
            width: 100%;
          }

          .acceptedCreators {
            justify-content: space-between;
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
      <img src={avatar || "/creators/default.jpg"} alt={username} />
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

function PosterAvatar({
  username,
  avatar,
}: {
  username: string;
  avatar: string | null;
}) {
  return (
    <div className="posterAvatar">
      <img src={avatar || "/creators/default.jpg"} alt={username} />
      <span>@{username}</span>
      <style jsx>{`
        .posterAvatar {
          min-width: 0;
          display: grid;
          gap: 6px;
          justify-items: center;
        }

        img {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(124, 246, 255, 0.95);
          box-shadow: 0 0 18px rgba(45, 224, 255, 0.55);
          background: rgba(255, 255, 255, 0.1);
        }

        span {
          max-width: 78px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 9px;
          font-weight: 900;
          color: white;
          text-shadow: 0 0 8px rgba(0, 0, 0, 0.9);
        }
      `}</style>
    </div>
  );
}
