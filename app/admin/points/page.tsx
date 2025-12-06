"use client";

import { useEffect, useState } from "react";
import { creators } from "@/data/creators";

export default function AdminPointsPage() {
  const [user, setUser] = useState(creators[0]?.username ?? "");
  const [delta, setDelta] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function applyAdjustment(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");

    const value = Number(delta);
    if (!Number.isFinite(value) || value === 0) {
      setStatus("Enter a valid non-zero number.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/points-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user,
          delta: value,
        }),
      });

      if (!res.ok) throw new Error();
      setDelta("");
      setStatus("Adjustment applied successfully.");
    } catch {
      setStatus("Error applying adjustment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "40px", color: "#e7f9ff" }}>
      <h1>Aqua Admin – Points Adjustment</h1>

      <label>Creator</label>
      <select
        value={user}
        onChange={(e) => setUser(e.target.value)}
        style={{ display: "block", marginBottom: "12px" }}
      >
        {creators.map((c) => (
          <option key={c.username}>{c.username}</option>
        ))}
      </select>

      <form onSubmit={applyAdjustment}>
        <label>Adjust Points (negative = spend)</label>
        <input
          type="number"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          style={{ display: "block", margin: "8px 0 12px" }}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Apply Adjustment"}
        </button>
      </form>

      {status && <p style={{ marginTop: "12px" }}>{status}</p>}
    </main>
  );
}
