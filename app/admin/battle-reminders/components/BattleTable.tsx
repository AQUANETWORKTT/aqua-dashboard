"use client";

import { useMemo, useState } from "react";

export type ParsedBattle = {
  id: string;
  battleDateText: string;
  creator: string;
  manager: string;
  range?: string;
  creatorUrl?: string;
  requestedTime?: string;
  opponent: string;
  opponentUrl?: string;
  battleTime: string;
  agency?: string;
  confirmed?: string;
  duplicateKey?: string;
  isDuplicate?: boolean;
  notification_status?: "READY" | "DUE" | "SENT" | "EXPIRED" | string;
};

type BattleTableProps = {
  battles: ParsedBattle[];
};

function getDayNumber(text: string) {
  const match = String(text || "").match(/(\d+)/);
  return match ? Number(match[1]) : 999;
}

function getTimeValue(time: string) {
  const [hours, minutes] = String(time || "99:99")
    .split(":")
    .map((value) => Number(value));

  return (
    (Number.isFinite(hours) ? hours : 99) * 60 +
    (Number.isFinite(minutes) ? minutes : 99)
  );
}

function getStatusStyles(status: string) {
  switch (status) {
    case "SENT":
      return "bg-blue-500/20 text-blue-300";
    case "DUE":
      return "bg-yellow-500/20 text-yellow-300";
    case "EXPIRED":
      return "bg-zinc-500/20 text-zinc-300";
    case "READY":
    default:
      return "bg-green-500/20 text-green-300";
  }
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

  const counts = useMemo(() => {
    return sortedBattles.reduce(
      (acc, battle) => {
        const status = String(battle.notification_status || "READY").toUpperCase();

        if (status === "DUE") acc.due += 1;
        else if (status === "SENT") acc.sent += 1;
        else if (status === "EXPIRED") acc.expired += 1;
        else acc.ready += 1;

        return acc;
      },
      {
        ready: 0,
        due: 0,
        sent: 0,
        expired: 0,
      }
    );
  }, [sortedBattles]);

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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <h2 className="text-2xl font-black text-white">Battle Table</h2>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <div className="rounded-xl border border-zinc-800 bg-black px-4 py-2">
            <span className="text-zinc-500">Total:</span>{" "}
            <span className="font-black text-white">{battles.length}</span>
          </div>

          <div className="rounded-xl border border-green-500/20 bg-green-950/20 px-4 py-2">
            <span className="text-green-300">Ready:</span>{" "}
            <span className="font-black text-white">{counts.ready}</span>
          </div>

          <div className="rounded-xl border border-yellow-500/20 bg-yellow-950/20 px-4 py-2">
            <span className="text-yellow-300">Due:</span>{" "}
            <span className="font-black text-white">{counts.due}</span>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 px-4 py-2">
            <span className="text-blue-300">Sent:</span>{" "}
            <span className="font-black text-white">{counts.sent}</span>
          </div>

          <div className="rounded-xl border border-zinc-700 bg-black px-4 py-2">
            <span className="text-zinc-400">Expired:</span>{" "}
            <span className="font-black text-white">{counts.expired}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Battle Time</th>
              <th className="px-3 py-2">Creator</th>
              <th className="px-3 py-2">Opponent</th>
              <th className="px-3 py-2">Manager</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {sortedBattles.map((battle) => {
              const status = String(battle.notification_status || "READY").toUpperCase();

              return (
                <tr key={battle.id} className="bg-black text-zinc-100">
                  <td className="rounded-l-2xl px-3 py-4">
                    {battle.battleDateText}
                  </td>

                  <td className="px-3 py-4 font-black text-red-400">
                    {battle.battleTime}
                  </td>

                  <td className="px-3 py-4 font-bold">@{battle.creator}</td>

                  <td className="px-3 py-4">@{battle.opponent}</td>

                  <td className="px-3 py-4">{battle.manager}</td>

                  <td className="px-3 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${getStatusStyles(
                        status
                      )}`}
                    >
                      {status}
                    </span>
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
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-3 lg:hidden">
        {sortedBattles.map((battle) => {
          const status = String(battle.notification_status || "READY").toUpperCase();

          return (
            <div
              key={battle.id}
              className="rounded-2xl border border-zinc-800 bg-black p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">
                    {battle.battleDateText}
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    @{battle.creator}
                  </p>

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
                  <p className="text-xs text-zinc-500">Status</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-black ${getStatusStyles(
                      status
                    )}`}
                  >
                    {status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => deleteBattle(battle.id)}
                disabled={deletingId === battle.id}
                className="mt-3 w-full rounded-xl bg-red-500 py-3 font-black text-white disabled:opacity-50"
              >
                {deletingId === battle.id ? "Deleting..." : "Delete Battle"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}