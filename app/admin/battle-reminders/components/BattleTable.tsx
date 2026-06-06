"use client";

import { useMemo, useState } from "react";

export type ParsedBattle = {
  id: string;
  battleDateText: string;
  creator: string;
  manager: string;
  range: string;
  creatorUrl: string;
  requestedTime: string;
  opponent: string;
  opponentUrl: string;
  battleTime: string;
  agency: string;
  confirmed: string;
  duplicateKey: string;
  isDuplicate: boolean;
};

type BattleTableProps = {
  battles: ParsedBattle[];
};

function getDayNumber(text: string) {
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : 999;
}

function getTimeValue(time: string) {
  const [hours, minutes] = String(time || "99:99")
    .split(":")
    .map((value) => Number(value));

  return (Number.isFinite(hours) ? hours : 99) * 60 + (Number.isFinite(minutes) ? minutes : 99);
}

export default function BattleTable({ battles }: BattleTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedBattles = useMemo(() => {
    return [...battles].sort((a, b) => {
      const dayA = getDayNumber(a.battleDateText);
      const dayB = getDayNumber(b.battleDateText);

      if (dayA !== dayB) return dayA - dayB;

      return getTimeValue(a.battleTime) - getTimeValue(b.battleTime);
    });
  }, [battles]);

  async function deleteBattle(id: string) {
    const confirmed = window.confirm("Are you sure you want to delete this battle?");
    if (!confirmed) return;

    try {
      setDeletingId(id);

      const res = await fetch("/api/admin/battle-reminders/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Delete failed");
      }

      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  if (battles.length === 0) {
    return (
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-500">
        No battles found.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Battle Table</h2>

        <div className="rounded-xl border border-zinc-800 bg-black px-4 py-2">
          <span className="text-zinc-500">Battles:</span>{" "}
          <span className="font-black text-white">{battles.length}</span>
        </div>
      </div>

      <div className="mt-5 hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1100px] border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Creator</th>
              <th className="px-3 py-2">Opponent</th>
              <th className="px-3 py-2">Manager</th>
              <th className="px-3 py-2">Requested</th>
              <th className="px-3 py-2">Battle Time</th>
              <th className="px-3 py-2">Agency</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {sortedBattles.map((battle) => (
              <tr
                key={battle.id}
                className={
                  battle.isDuplicate
                    ? "bg-red-950/40 text-red-100"
                    : "bg-black text-zinc-100"
                }
              >
                <td className="rounded-l-2xl px-3 py-4">{battle.battleDateText}</td>
                <td className="px-3 py-4 font-bold">@{battle.creator}</td>
                <td className="px-3 py-4">@{battle.opponent}</td>
                <td className="px-3 py-4">{battle.manager}</td>
                <td className="px-3 py-4 text-zinc-500">{battle.requestedTime}</td>
                <td className="px-3 py-4 font-black text-red-400">{battle.battleTime}</td>
                <td className="px-3 py-4">{battle.agency}</td>

                <td className="px-3 py-4">
                  {battle.isDuplicate ? (
                    <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-300">
                      Duplicate
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-300">
                      Ready
                    </span>
                  )}
                </td>

                <td className="rounded-r-2xl px-3 py-4">
                  <button
                    onClick={() => deleteBattle(battle.id)}
                    disabled={deletingId === battle.id}
                    className="rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {deletingId === battle.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-3 lg:hidden">
        {sortedBattles.map((battle) => (
          <div
            key={battle.id}
            className={
              battle.isDuplicate
                ? "rounded-2xl border border-red-500/40 bg-red-950/40 p-4"
                : "rounded-2xl border border-zinc-800 bg-black p-4"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  {battle.battleDateText}
                </p>

                <p className="mt-1 text-lg font-black text-white">@{battle.creator}</p>
                <p className="text-sm text-zinc-400">vs @{battle.opponent}</p>
              </div>

              <span className="rounded-xl bg-red-500 px-3 py-2 text-sm font-black text-white">
                {battle.battleTime}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-zinc-950 p-3">
                <p className="text-xs text-zinc-500">Manager</p>
                <p className="font-bold text-white">{battle.manager}</p>
              </div>

              <div className="rounded-xl bg-zinc-950 p-3">
                <p className="text-xs text-zinc-500">Agency</p>
                <p className="font-bold text-white">{battle.agency}</p>
              </div>
            </div>

            <button
              onClick={() => deleteBattle(battle.id)}
              disabled={deletingId === battle.id}
              className="mt-3 w-full rounded-xl bg-red-500 py-3 font-black text-white"
            >
              {deletingId === battle.id ? "Deleting..." : "Delete Battle"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}