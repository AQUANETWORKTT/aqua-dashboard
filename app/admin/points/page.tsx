"use client";

import { useEffect, useState } from "react";
import { creators } from "@/data/creators";

// Types
type HistoryEntry = {
  date: string;
  daily?: number;
  hours?: number;
};

type HistoryFile = {
  username: string;
  entries: HistoryEntry[];
};

type AdjustmentResponse = {
  username: string;
  adjustment: number;
};

// ---------- POINT RULES (matches leaderboard) ----------

// Diamond points
function diamondPoints(daily: number) {
  if (daily < 1000) return 0;

  let pts = 10; // first 1k
  const extra = Math.floor((daily - 1000) / 1000);
  pts += extra * 2;
  return pts;
}

// Hours + valid day
function hourPoints(hours: number) {
  let pts = Math.floor(hours) * 3;
  if (hours >= 1) pts += 3;
  return pts;
}

// Streak rules
function streakPoints(days: number) {
  if (days >= 30) return 150;
  if (days >= 20) return 100;
  if (days >= 10) return 50;
  if (days >= 5) return 25;
  if (days >= 3) return 15;
  return 0;
}

// Compute streak
function computeStreak(entries: HistoryEntry[]) {
  if (!entries.length) return 0;

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1));

  const last = sorted[sorted.length - 1];
  const todayKey = new Date().toISOString().split("T")[0];
  const lastHours = last.hours ?? 0;

  if (last.date === todayKey && lastHours < 1) {
    return computeStreak(sorted.slice(0, -1));
  }

  if (lastHours < 1) return 0;

  let streak = 1;
  let prev = new Date(last.date + "T00:00:00Z");

  for (let i = sorted.length - 2; i >= 0; i--) {
    const e = sorted[i];
    const d = new Date(e.date + "T00:00:00Z");

    const diff = (prev.getTime() - d.getTime()) / 86400000;
    if (diff >= 0.5 && diff <= 1.5 && (e.hours ?? 0) >= 1) {
      streak++;
      prev = d;
    } else break;
  }

  return streak;
}

export default function AdminPointsPage() {
  const [selectedUser, setSelectedUser] = useState(creators[0]?.username ?? "");
  const [manualAdjustment, setManualAdjustment] = useState(0);
  const [systemPoints, setSystemPoints] = useState(0);
  const [deltaInput, setDeltaInput] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Load manual adjustment
  useEffect(() => {
    if (!selectedUser) return;

    async function loadAdjustment() {
      try {
        const res = await fetch(
          `/api/points-adjustments?username=${selectedUser}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        setManualAdjustment(json.adjustment ?? 0);
      } catch {
        setManualAdjustment(0);
      }
    }

    loadAdjustment();
  }, [selectedUser]);

  // Load user data and compute *system* points (Dec 1 onward)
  useEffect(() => {
    if (!selectedUser) return;

    async function loadHistory() {
      try {
        const res = await fetch(`/history/${selectedUser}.json`, {
          cache: "no-store",
        });

        if (!res.ok) {
          setSystemPoints(0);
          return;
        }

        const json = (await res.json()) as HistoryFile;
        const entries =
          json.entries?.filter((e) => e.date >= "2025-12-01") ?? [];

        let diamondsPts = 0;
        let hourPts = 0;
        let validPts = 0;

        // Calculate daily top 5 bonuses (global)
        const datesSet = new Set(entries.map((e) => e.date));
        const dates = [...datesSet];

        let top5Pts = 0;

        for (const d of dates) {
          // load all creators for that day:
          const dailyAll = [];

          for (const c of creators) {
            try {
              const r = await fetch(`/history/${c.username}.json`);
              if (!r.ok) continue;
              const j = await r.json();
              const ex = j.entries?.find((e: any) => e.date === d);
              if (ex) dailyAll.push({ username: c.username, daily: ex.daily ?? 0 });
            } catch {}
          }

          dailyAll.sort((a, b) => b.daily - a.daily);
          const top = dailyAll.slice(0, 5);

          const idx = top.findIndex((x) => x.username === selectedUser);
          if (idx === 0) top5Pts += 25;
          if (idx === 1) top5Pts += 20;
          if (idx === 2) top5Pts += 15;
          if (idx === 3) top5Pts += 10;
          if (idx === 4) top5Pts += 5;
        }

        // Normal scoring
        for (const e of entries) {
          const dPts = diamondPoints(e.daily ?? 0);
          const hPts = Math.floor(e.hours ?? 0) * 3;
          const vPts = (e.hours ?? 0) >= 1 ? 3 : 0;

          diamondsPts += dPts;
          hourPts += hPts;
          validPts += vPts;
        }

        const streak = computeStreak(entries);
        const streakPts = streakPoints(streak);

        const total =
          diamondsPts + hourPts + validPts + top5Pts + streakPts;

        setSystemPoints(total);
      } catch {
        setSystemPoints(0);
      }
    }

    loadHistory();
  }, [selectedUser]);

  // Apply adjustment
  async function apply(e: any) {
    e.preventDefault();
    setStatus("");

    const delta = Number(deltaInput);
    if (!delta || !Number.isFinite(delta)) {
      setStatus("Enter a valid number.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/points-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: selectedUser, delta }),
      });

      const json = await res.json();
      if (!res.ok) {
        setStatus(json.error || "Error applying adjustment.");
        return;
      }

      setManualAdjustment(json.newAdjustment ?? 0);
      setDeltaInput("");
      setStatus(
        `Updated: ${json.appliedDelta > 0 ? "+" : ""}${json.appliedDelta} applied.`
      );
    } catch {
      setStatus("Error applying changes.");
    } finally {
      setLoading(false);
    }
  }

  const finalBalance = systemPoints + manualAdjustment;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 16px",
        background: "#02040a",
        color: "#e7f9ff",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          padding: "28px",
          background: "#03101a",
          borderRadius: "16px",
          border: "1px solid rgba(45,224,255,0.4)",
          boxShadow: "0 0 20px rgba(45,224,255,0.25)",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            marginBottom: "16px",
            background: "linear-gradient(90deg,#2de0ff,#7be8ff)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Aqua Admin – Points Manager
        </h1>

        {/* Creator selection */}
        <div style={{ marginBottom: "18px" }}>
          <label>Select Creator:</label>
          <select
            style={{
              display: "block",
              marginTop: "6px",
              padding: "8px 10px",
              width: "100%",
              borderRadius: "8px",
              background: "#020915",
              color: "#e7f9ff",
              border: "1px solid rgba(45,224,255,0.5)",
            }}
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            {creators.map((c) => (
              <option key={c.username}>{c.username}</option>
            ))}
          </select>
        </div>

        {/* LIVE BALANCE PREVIEW */}
        <div
          style={{
            padding: "16px",
            borderRadius: "10px",
            background: "rgba(45,224,255,0.05)",
            border: "1px solid rgba(45,224,255,0.3)",
            marginBottom: "20px",
          }}
        >
          <div style={{ marginBottom: "6px", fontSize: "14px" }}>
            <strong>{selectedUser}</strong> – Current Balance:
          </div>

          <div style={{ fontSize: "30px", fontWeight: 800 }}>
            {finalBalance}
            <span style={{ fontSize: "14px", marginLeft: "6px" }}>
              pts available
            </span>
          </div>

          <div style={{ marginTop: "10px", fontSize: "13px", opacity: 0.8 }}>
            System points: {systemPoints}  
            <br />
            Manual adjustment: {manualAdjustment > 0 ? "+" : ""}
            {manualAdjustment}
          </div>
        </div>

        {/* Apply adjustment */}
        <form onSubmit={apply}>
          <label>Adjust by (negative = spend):</label>
          <input
            type="number"
            value={deltaInput}
            onChange={(e) => setDeltaInput(e.target.value)}
            placeholder="-500"
            style={{
              marginTop: "6px",
              marginBottom: "12px",
              padding: "8px 10px",
              width: "100%",
              borderRadius: "8px",
              background: "#020915",
              color: "#e7f9ff",
              border: "1px solid rgba(45,224,255,0.5)",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 16px",
              borderRadius: "999px",
              border: "none",
              width: "100%",
              background: "linear-gradient(90deg,#2de0ff,#7be8ff)",
              fontWeight: 700,
              color: "#02141b",
            }}
          >
            {loading ? "Saving..." : "Apply Change"}
          </button>
        </form>

        {status && (
          <p style={{ marginTop: "12px", fontSize: "14px" }}>{status}</p>
        )}
      </div>
    </main>
  );
}
