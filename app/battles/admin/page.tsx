"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const ADMIN_CODE = "FALCON";
const ADMIN_CODE_STORAGE_KEY = "battles_admin_code";

type Battle = {
  id: string;
  requester_username: string;
  accepter_username: string | null;
  battle_date: string;
  battle_time: string;
  estimated_score: string;
  status: "available" | "accepted";
};

function formatBattleTime(date: string, time: string) {
  const [hour = "0", minute = "0"] = String(time || "00:00").split(":");
  const value = new Date(`${date}T${hour.padStart(2, "0")}:${minute}:00`);

  return value.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BattlesAdminPage() {
  const [code, setCode] = useState("");
  const [hasAccess, setHasAccess] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("battles_admin_access") === "true"
  );
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const availableBattles = useMemo(
    () => battles.filter((battle) => battle.status === "available"),
    [battles]
  );

  const upcomingBattles = useMemo(
    () => battles.filter((battle) => battle.status === "accepted"),
    [battles]
  );

  const loadBattles = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/battles", { cache: "no-store" });
    const json = await res.json();

    if (!res.ok) {
      setMessage(json.error || "Could not load battles.");
      setBattles([]);
    } else {
      setBattles(json.battles || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess) {
      queueMicrotask(() => {
        loadBattles();
      });
    }
  }, [hasAccess, loadBattles]);

  function unlockAdmin(e: React.FormEvent) {
    e.preventDefault();

    if (code.trim() !== ADMIN_CODE) {
      setMessage("Wrong admin code.");
      return;
    }

    localStorage.setItem("battles_admin_access", "true");
    localStorage.setItem(ADMIN_CODE_STORAGE_KEY, code.trim());
    setHasAccess(true);
    setMessage("");
    loadBattles();
  }

  async function removeBattle(battle: Battle) {
    const name = battle.accepter_username
      ? `@${battle.requester_username} vs @${battle.accepter_username}`
      : `@${battle.requester_username}'s request`;

    if (!window.confirm(`Remove ${name}?`)) return;

    setDeletingId(battle.id);
    setMessage("");

    const res = await fetch(`/api/battles?id=${encodeURIComponent(battle.id)}`, {
      method: "DELETE",
      headers: {
        "x-battles-admin-code":
          localStorage.getItem(ADMIN_CODE_STORAGE_KEY) || ADMIN_CODE,
      },
    });

    const json = await res.json();
    setDeletingId(null);

    if (!res.ok) {
      setMessage(json.error || "Could not remove battle.");
      return;
    }

    setMessage("Battle removed.");
    await loadBattles();
  }

  if (!hasAccess) {
    return (
      <main className="adminPage center">
        <form onSubmit={unlockAdmin} className="accessCard">
          <h1>Battles Admin</h1>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Admin code"
          />
          <button type="submit">Unlock</button>
          {message ? <p>{message}</p> : null}
        </form>
        <AdminStyles />
      </main>
    );
  }

  return (
    <main className="adminPage">
      <section className="adminHero">
        <div>
          <span>Battle Control</span>
          <h1>Battles Admin</h1>
        </div>
        <button onClick={loadBattles} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </section>

      {message ? <div className="message">{message}</div> : null}

      <section className="statsGrid">
        <div>
          <span>Available</span>
          <strong>{availableBattles.length}</strong>
        </div>
        <div>
          <span>Upcoming</span>
          <strong>{upcomingBattles.length}</strong>
        </div>
      </section>

      <BattleList
        title="Battles Available"
        battles={availableBattles}
        deletingId={deletingId}
        onRemove={removeBattle}
      />

      <BattleList
        title="Upcoming Battles"
        battles={upcomingBattles}
        deletingId={deletingId}
        onRemove={removeBattle}
      />

      <AdminStyles />
    </main>
  );
}

function BattleList({
  title,
  battles,
  deletingId,
  onRemove,
}: {
  title: string;
  battles: Battle[];
  deletingId: string | null;
  onRemove: (battle: Battle) => void;
}) {
  return (
    <section className="listBlock">
      <h2>{title}</h2>

      <div className="battleRows">
        {battles.length ? (
          battles.map((battle) => (
            <article key={battle.id} className="battleRow">
              <div className="battleMain">
                <strong>
                  @{battle.requester_username}
                  {battle.accepter_username ? ` vs @${battle.accepter_username}` : ""}
                </strong>
                <span>{formatBattleTime(battle.battle_date, battle.battle_time)}</span>
              </div>

              <div className="score">{battle.estimated_score}</div>

              <button
                className="removeButton"
                onClick={() => onRemove(battle)}
                disabled={deletingId === battle.id}
              >
                {deletingId === battle.id ? "Removing..." : "Remove"}
              </button>
            </article>
          ))
        ) : (
          <div className="empty">Nothing here.</div>
        )}
      </div>
    </section>
  );
}

function AdminStyles() {
  return (
    <style jsx global>{`
      .adminPage {
        min-height: 100vh;
        padding: 24px 14px 126px;
        display: grid;
        align-content: start;
        gap: 18px;
        background:
          radial-gradient(circle at top, rgba(45, 224, 255, 0.18), transparent 34%),
          linear-gradient(180deg, #020617, #030712 58%, #000);
        color: white;
        font-family: "Trebuchet MS", Verdana, sans-serif;
      }

      .center {
        place-items: center;
        align-content: center;
      }

      .accessCard,
      .adminHero,
      .statsGrid,
      .message,
      .battleRow,
      .empty {
        width: min(100%, 980px);
        margin: 0 auto;
        border: 1px solid rgba(45, 224, 255, 0.22);
        border-radius: 22px;
        background:
          radial-gradient(circle at top, rgba(45, 224, 255, 0.16), transparent 42%),
          rgba(7, 17, 31, 0.94);
        box-shadow: 0 0 28px rgba(45, 224, 255, 0.1);
      }

      .accessCard {
        max-width: 420px;
        display: grid;
        gap: 14px;
        padding: 22px;
      }

      .adminHero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 22px;
      }

      .adminHero span {
        color: #7cf6ff;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      h1,
      h2 {
        margin: 0;
        font-family: Impact, Haettenschweiler, "Arial Black", sans-serif;
        line-height: 0.92;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        text-shadow:
          0 4px 0 rgba(0, 0, 0, 0.55),
          0 0 24px rgba(45, 224, 255, 0.62);
      }

      h1 {
        font-size: clamp(42px, 9vw, 78px);
      }

      h2 {
        width: min(100%, 980px);
        margin: 0 auto;
        font-size: 34px;
      }

      input {
        width: 100%;
        min-width: 0;
        color: white;
        background: rgba(0, 0, 0, 0.28);
        border: 1px solid rgba(124, 246, 255, 0.24);
        border-radius: 14px;
        padding: 14px 12px;
        font-size: 16px;
        font-weight: 900;
        outline: none;
      }

      input:focus {
        border-color: rgba(124, 246, 255, 0.72);
        box-shadow: 0 0 18px rgba(45, 224, 255, 0.24);
      }

      button {
        border: 0;
        border-radius: 14px;
        padding: 12px 16px;
        color: #021019;
        background: linear-gradient(135deg, #7cf6ff, #2de0ff 62%, #fff);
        font-weight: 900;
        text-transform: uppercase;
        cursor: pointer;
        box-shadow: 0 0 18px rgba(45, 224, 255, 0.3);
      }

      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .message {
        padding: 12px 14px;
        color: #7cf6ff;
        font-weight: 900;
      }

      .statsGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1px;
        overflow: hidden;
      }

      .statsGrid div {
        display: grid;
        gap: 6px;
        padding: 18px;
        background: rgba(255, 255, 255, 0.035);
      }

      .statsGrid span {
        color: rgba(255, 255, 255, 0.64);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .statsGrid strong {
        color: #7cf6ff;
        font-size: 34px;
        line-height: 1;
      }

      .listBlock {
        display: grid;
        gap: 12px;
      }

      .battleRows {
        display: grid;
        gap: 10px;
      }

      .battleRow {
        display: grid;
        grid-template-columns: 1fr auto auto;
        gap: 12px;
        align-items: center;
        padding: 14px;
      }

      .battleMain {
        display: grid;
        gap: 5px;
        min-width: 0;
      }

      .battleMain strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 17px;
      }

      .battleMain span,
      .score {
        color: rgba(255, 255, 255, 0.68);
        font-size: 13px;
        font-weight: 800;
      }

      .score {
        border-radius: 999px;
        padding: 7px 9px;
        background: rgba(255, 255, 255, 0.055);
      }

      .removeButton {
        border: 1px solid rgba(255, 77, 77, 0.42);
        color: #fff;
        background: rgba(255, 77, 77, 0.14);
        box-shadow: none;
      }

      .empty {
        padding: 16px;
        color: rgba(255, 255, 255, 0.62);
        font-weight: 800;
      }

      @media (max-width: 680px) {
        .adminHero,
        .battleRow {
          grid-template-columns: 1fr;
        }

        .statsGrid {
          grid-template-columns: 1fr;
        }

        .battleMain strong {
          white-space: normal;
        }
      }
    `}</style>
  );
}
