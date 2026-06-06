"use client";

import { useState } from "react";

type ReminderScope = "mine" | "all";
type ReminderMinutes = "5" | "10" | "15" | "30";

export default function ManagerBattleNotificationsPage() {
  const [enabled, setEnabled] = useState(false);
  const [scope, setScope] = useState<ReminderScope>("mine");
  const [minutes, setMinutes] = useState<ReminderMinutes>("5");

  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-red-500/20 bg-zinc-950 p-5 shadow-2xl shadow-red-950/40">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-400">
            Atlas Creator Network
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Battle Notifications
          </h1>

          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            Configure battle reminders for your device. Notifications will be
            connected later once the battle system is live.
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Enable Reminders</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Turn battle reminders on or off for this device.
              </p>
            </div>

            <button
              onClick={() => setEnabled((value) => !value)}
              className={
                enabled
                  ? "rounded-2xl bg-red-500 px-5 py-3 font-black text-white transition-all"
                  : "rounded-2xl bg-zinc-800 px-5 py-3 font-black text-zinc-300 transition-all"
              }
            >
              {enabled ? "Enabled" : "Disabled"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-bold">Reminder Type</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setScope("mine")}
              className={
                scope === "mine"
                  ? "rounded-2xl border border-red-500 bg-red-500 p-4 text-left font-bold text-white transition-all"
                  : "rounded-2xl border border-zinc-800 bg-black p-4 text-left font-bold text-zinc-200 transition-all"
              }
            >
              My Battles Only
              <span className="mt-1 block text-sm font-normal opacity-80">
                Only notify me for battles assigned to my manager account.
              </span>
            </button>

            <button
              onClick={() => setScope("all")}
              className={
                scope === "all"
                  ? "rounded-2xl border border-red-500 bg-red-500 p-4 text-left font-bold text-white transition-all"
                  : "rounded-2xl border border-zinc-800 bg-black p-4 text-left font-bold text-zinc-200 transition-all"
              }
            >
              All Battles
              <span className="mt-1 block text-sm font-normal opacity-80">
                Notify me for every battle uploaded into the system.
              </span>
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-bold">Reminder Time</h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["5", "10", "15", "30"] as ReminderMinutes[]).map((option) => (
              <button
                key={option}
                onClick={() => setMinutes(option)}
                className={
                  minutes === option
                    ? "rounded-2xl bg-red-500 px-4 py-4 font-black text-white transition-all"
                    : "rounded-2xl border border-zinc-800 bg-black px-4 py-4 font-black text-zinc-300 transition-all"
                }
              >
                {option} mins
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-red-500/20 bg-red-950/20 p-5">
          <h2 className="text-xl font-bold text-red-300">
            Current Configuration
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl bg-black/50 p-3">
              <span className="text-zinc-400">Status:</span>{" "}
              <span
                className={
                  enabled
                    ? "font-bold text-green-400"
                    : "font-bold text-red-400"
                }
              >
                {enabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="rounded-xl bg-black/50 p-3">
              <span className="text-zinc-400">Notifications:</span>{" "}
              <span className="font-bold text-white">
                {scope === "mine" ? "My Battles Only" : "All Battles"}
              </span>
            </div>

            <div className="rounded-xl bg-black/50 p-3">
              <span className="text-zinc-400">Reminder Time:</span>{" "}
              <span className="font-bold text-white">
                {minutes} minutes before
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}