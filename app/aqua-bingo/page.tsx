"use client";

import { useEffect, useMemo, useState } from "react";

type Difficulty = "hard" | "medium" | "easy" | "proof";

type Tile = {
  id: number;
  text: string;
  difficulty: Difficulty;
  isCenter?: boolean;
};

const STORAGE_KEY = "aqua_bingo_checked_ids_v10";

/* ===== BOARD ===== */

const BOARD: Tile[] = [
  { id: 1, text: "Lose a battle by 50,000 points", difficulty: "hard" },
  { id: 2, text: "15,000 match diamonds in 1 day", difficulty: "hard" },
  { id: 3, text: "Gain 100 new followers", difficulty: "hard" },
  { id: 4, text: "Win 15 matches total", difficulty: "hard" },
  { id: 5, text: "100 matches played total", difficulty: "hard" },

  { id: 6, text: "Gain 50 new followers", difficulty: "medium" },
  { id: 7, text: "25,000 total diamonds", difficulty: "hard" },
  { id: 8, text: "📸 Screenshot 45+ badge in live", difficulty: "proof" },
  { id: 9, text: "8,000 diamonds from boxes", difficulty: "hard" },
  { id: 10, text: "Valid live day", difficulty: "medium" },

  { id: 11, text: "120 matches played total", difficulty: "hard" },
  { id: 12, text: "📸 Silent live 5 minutes (screen recording)", difficulty: "proof" },
  { id: 13, text: "25 HOURS live total", difficulty: "hard", isCenter: true },
  { id: 14, text: "📸 Screenshot max boxes filled (multi-guest)", difficulty: "proof" },
  { id: 15, text: "📸 Screenshot “🐬” in name or bio", difficulty: "proof" },

  { id: 16, text: "📸 Screenshot 15 win streak", difficulty: "proof" },
  { id: 17, text: "📸 Screenshot live with 250,000+ likes", difficulty: "proof" },
  { id: 18, text: "30 matches played", difficulty: "medium" },
  { id: 19, text: "25,000 total diamonds", difficulty: "hard" },
  { id: 20, text: "Win 20 matches total", difficulty: "hard" },

  { id: 21, text: "30,000 total diamonds", difficulty: "hard" },
  { id: 22, text: "Gain 150 new followers", difficulty: "hard" },
  { id: 23, text: "15 valid live days", difficulty: "hard" },
  { id: 24, text: "10,000 match diamonds in 1 day", difficulty: "hard" },
  { id: 25, text: "100 matches played total (separate period)", difficulty: "hard" },
];

/* ===== helpers ===== */

function readIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => Number.isFinite(x));
  } catch {
    return [];
  }
}

function writeIds(ids: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

function tagClass(d: Difficulty) {
  if (d === "hard") return "bingo-tag tag-hard";
  if (d === "medium") return "bingo-tag tag-med";
  if (d === "easy") return "bingo-tag tag-easy";
  return "bingo-tag tag-proof";
}

function tagText(d: Difficulty) {
  if (d === "hard") return "HARD";
  if (d === "medium") return "MED";
  if (d === "easy") return "EASY";
  return "PROOF";
}

/* ===== page ===== */

export default function AquaBingoPage() {
  const [checked, setChecked] = useState<number[]>([]);

  useEffect(() => {
    setChecked(readIds());
  }, []);

  useEffect(() => {
    writeIds(checked);
  }, [checked]);

  const checkedSet = useMemo(() => new Set(checked), [checked]);

  const toggle = (id: number) => {
    setChecked((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return Array.from(s).sort((a, b) => a - b);
    });
  };

  const reset = () => setChecked([]);

  return (
    <main className="bingo-wrapper">
      <div className="bingo-header">
        <div
          style={{
            textAlign: "center",
            fontSize: "clamp(42px, 8vw, 84px)",
            fontWeight: 1000,
            letterSpacing: "0.08em",
            lineHeight: 1.05,
            marginBottom: 18,
            background: "linear-gradient(90deg, #2de0ff, #7cf6ff, #b8fbff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow:
              "0 0 12px rgba(45,224,255,0.8), 0 0 28px rgba(45,224,255,0.55), 0 0 60px rgba(0,200,255,0.35)",
          }}
        >
          AQUA BINGO
        </div>

        <div className="bingo-title">Complete challenges. Get lines. Win prizes.</div>

        <div className="bingo-sub">
          <b>Completed:</b> {checked.length}/25
        </div>
      </div>

      <section className="bingo-grid-card">
        <div className="bingo-grid">
          {BOARD.map((t) => {
            const done = checkedSet.has(t.id);
            const tileClass =
              "bingo-tile" + (done ? " done" : "") + (t.isCenter ? " bingo-center" : "");

            return (
              <div
                key={t.id}
                className={tileClass}
                onClick={() => toggle(t.id)}
                role="button"
                aria-pressed={done}
              >
                <div className={tagClass(t.difficulty)}>{tagText(t.difficulty)}</div>
                <div className="bingo-text">{t.text}</div>
                <div className="bingo-foot">
                  <span>#{t.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bingo-panels">
        <div className="bingo-panel">
          <h2>Rules</h2>
          <ul>
            <li>
              <b>Match diamond challenges</b> must be completed in one day (00:00–23:59 UK).
            </li>
            <li>
              <b>Screenshot / screen-record challenges</b>: keep proof, only send when you hit a result.
            </li>
            <li>
              <b>Only message the owner</b> when you complete 1 line, 2 lines, or the full board.
            </li>
            <li>
              Send proof to: <b>JamesInTune</b>.
            </li>
            <li>
              You must complete the card yourself. Screenshot your board in colour if needed.
            </li>
          </ul>

          <button
            onClick={reset}
            className="admin-button"
            style={{ marginTop: 14, width: "fit-content" }}
          >
            Reset my board
          </button>
        </div>

        <div className="bingo-panel">
          <h2>Prizes</h2>

          <div className="bingo-prize">
            <div className="label">🥇 First to 1 line</div>
            <div className="value">5,000 coins</div>
          </div>

          <div className="bingo-prize">
            <div className="label">🥈 First to 2 lines</div>
            <div className="value">10,000 coins</div>
          </div>

          <div className="bingo-prize">
            <div className="label">🥉 First to full board</div>
            <div className="value">TikTok Universe</div>
          </div>

          <div style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
            Aqua Bingo is ongoing — first completions win.
          </div>
        </div>
      </section>
    </main>
  );
}
