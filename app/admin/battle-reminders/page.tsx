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

  const battles = lines.map((line, index) => {
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
    };
  });

  const countMap = new Map<string, number>();

  for (const battle of battles) {
    countMap.set(
      battle.duplicateKey,
      (countMap.get(battle.duplicateKey) || 0) + 1
    );
  }

  return battles.map((battle) => ({
    ...battle,
    isDuplicate: (countMap.get(battle.duplicateKey) || 0) > 1,
  }));
}

export default function BattleRemindersAdminPage() {
  const [rawText, setRawText] = useState("");
  const [battles, setBattles] = useState<ParsedBattle[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingBattles, setLoadingBattles] = useState(true);
  const [message, setMessage] = useState("");

  const parsedBattles = useMemo(() => parseBattleRows(rawText), [rawText]);

  const duplicateCount = parsedBattles.filter(
    (battle) => battle.isDuplicate
  ).length;

  async function loadBattles() {
    try {
      setLoadingBattles(true);

      const res = await fetch("/api/admin/battle-reminders/list");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load battles.");
      }

      const mappedBattles: ParsedBattle[] = (data.battles || []).map(
        (battle: any) => ({
          id: battle.id,
          battleDateText: battle.battle_date_text,
          creator: battle.creator,
          manager: battle.manager,
          range: battle.range_text || "",
          creatorUrl: "",
          requestedTime: battle.requested_time || "",
          opponent: battle.opponent || "",
          opponentUrl: "",
          battleTime: battle.battle_time,
          agency: battle.agency || "",
          confirmed: battle.confirmed || "",
          duplicateKey: battle.duplicate_key,
          isDuplicate: false,
        })
      );

      setBattles(mappedBattles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBattles(false);
    }
  }

  useEffect(() => {
    loadBattles();
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

  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-red-500/20 bg-zinc-950 p-5 shadow-2xl shadow-red-950/40">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-400">
            AQUA Creator Network
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Battle Reminders Admin
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
            Paste battle rows, preview them, check duplicates, then save them to
            Supabase for reminders.
          </p>
        </section>

        <BattlePasteBox
          value={rawText}
          onChange={setRawText}
          onImport={handleImport}
          rowCount={parsedBattles.length}
          duplicateCount={duplicateCount}
        />

        {saving && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-950/20 p-4 font-bold text-yellow-300">
            Saving battles...
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