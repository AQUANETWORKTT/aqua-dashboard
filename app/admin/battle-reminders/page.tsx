"use client";

import { useEffect, useMemo, useState } from "react";
import BattlePasteBox from "./components/BattlePasteBox";
import BattleTable, { ParsedBattle } from "./components/BattleTable";

function cleanUsername(value: string) {
  const text = String(value || "").trim();

  if (!text) return "";

  const atMatch = text.match(/tiktok\.com\/@([^/?\s]+)/i);
  if (atMatch?.[1]) return atMatch[1].trim().replace(/^@/, "").toLowerCase();

  return text.replace(/^@/, "").toLowerCase();
}

function parseBattleRows(rawText: string): ParsedBattle[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const columns = line.split(/\t+/).map((item) => item.trim());

    const battleDateText = columns[0] || "";
    const creator = cleanUsername(columns[1] || "");
    const manager = columns[2] || "";
    const range = columns[3] || "";
    const creatorUrl = columns[4] || "";
    const requestedTime = columns[5] || "";
    const opponentUrl = columns[6] || "";
    const battleTime = columns[7] || "";
    const agency = columns[8] || "";
    const confirmed = columns[9] || "";
    const opponent = cleanUsername(opponentUrl);

    const duplicateKey = [
      battleDateText.toLowerCase(),
      creator.toLowerCase(),
      opponent.toLowerCase(),
      battleTime,
      index,
    ].join("|");

    return {
      id: `${index}-${creator}-${opponent}-${battleTime}`,
      battleDateText,
      creator,
      manager,
      range,
      creatorUrl,
      requestedTime,
      opponent,
      opponentUrl,
      battleTime,
      agency,
      confirmed,
      duplicateKey,
      isDuplicate: false,
      notification_status: "READY",
    };
  });
}

export default function BattleRemindersAdminPage() {
  const [rawText, setRawText] = useState("");
  const [battles, setBattles] = useState<ParsedBattle[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [loadingBattles, setLoadingBattles] = useState(true);
  const [message, setMessage] = useState("");

  const parsedBattles = useMemo(() => parseBattleRows(rawText), [rawText]);

  async function loadBattles() {
    try {
      setLoadingBattles(true);

      const res = await fetch("/api/admin/battle-reminders/list", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load battles.");
      }

      const mappedBattles: ParsedBattle[] = (data.battles || []).map(
        (battle: any) => ({
          id: battle.id,
          battleDateText: battle.battle_date_text || battle.battle_date || "",
          creator: battle.creator || "",
          manager: battle.manager || "",
          range: battle.range_text || "",
          creatorUrl: "",
          requestedTime: battle.requested_time || "",
          opponent: battle.opponent || "",
          opponentUrl: "",
          battleTime: battle.battle_time || "",
          agency: battle.agency || "",
          confirmed: battle.confirmed || "",
          duplicateKey: battle.duplicate_key || "",
          isDuplicate: false,
          notification_status: battle.notification_status || "READY",
        })
      );

      setBattles(mappedBattles);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to load battles.");
    } finally {
      setLoadingBattles(false);
    }
  }

  useEffect(() => {
    loadBattles();

    const timer = window.setInterval(() => {
      loadBattles();
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  async function handleImport() {
    setMessage("");

    if (parsedBattles.length === 0) {
      setMessage("Paste at least one battle row first.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/admin/battle-reminders/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          battles: parsedBattles,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Import failed.");
      }

      await loadBattles();
      setRawText("");

      setMessage(
        data.message ||
          `Imported ${data.imported || parsedBattles.length} battles.`
      );
    } catch (err: any) {
      setMessage(err.message || "Import failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAll() {
    const confirmed = window.confirm(
      "Are you sure you want to delete ALL battle reminders? This cannot be undone."
    );

    if (!confirmed) return;

    const secondConfirm = window.confirm(
      "Final check: this will remove every battle reminder from Supabase."
    );

    if (!secondConfirm) return;

    setDeletingAll(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/battle-reminders/delete-all", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Delete all failed.");
      }

      setBattles([]);
      setMessage(data.message || `Deleted ${data.deleted || 0} battles.`);
      await loadBattles();
    } catch (err: any) {
      setMessage(err.message || "Delete all failed.");
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-red-500/20 bg-zinc-950 p-5 shadow-2xl shadow-red-950/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-400">
                AQUA Creator Network
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Battle Reminders Admin
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
                Paste battle rows, save them to Supabase, and track reminder
                status.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={deletingAll || loadingBattles || battles.length === 0}
              className="rounded-2xl bg-red-600 px-5 py-3 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingAll ? "Deleting..." : "Delete All Battles"}
            </button>
          </div>
        </section>

        <BattlePasteBox
          value={rawText}
          onChange={setRawText}
          onImport={handleImport}
          rowCount={parsedBattles.length}
          duplicateCount={0}
        />

        {saving && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-950/20 p-4 font-bold text-yellow-300">
            Saving battles...
          </div>
        )}

        {deletingAll && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 font-bold text-red-300">
            Deleting all battles...
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 font-bold text-red-300">
            {message}
          </div>
        )}

        {loadingBattles ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center text-zinc-400">
            Loading battles...
          </div>
        ) : (
          <BattleTable battles={battles.length > 0 ? battles : parsedBattles} />
        )}
      </div>
    </main>
  );
}