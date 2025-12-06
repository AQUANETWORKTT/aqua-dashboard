"use client";

import { creators } from "@/data/creators";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPointsPage() {
  const [points, setPoints] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState("");
  const [value, setValue] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // ✅ LOAD existing points from Supabase
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("points_adjustments")
        .select("username, points");

      if (error) {
        console.error(error);
        return;
      }

      const map: Record<string, number> = {};
      data.forEach((row) => {
        map[row.username] = row.points;
      });

      setPoints(map);
    }

    load();
  }, []);

  // ✅ When creator selected, populate input
  useEffect(() => {
    if (!selected) return;
    setValue(points[selected] ?? 0);
  }, [selected, points]);

  // ✅ SAVE to Supabase
  async function save() {
    if (!selected) return;

    setSaving(true);

    const { error } = await supabase
      .from("points_adjustments")
      .upsert({
        username: selected,
        points: value,
      });

    setSaving(false);

    if (error) {
      alert(error.message);
    } else {
      setPoints({ ...points, [selected]: value });
      alert("Points saved ✅");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#02040a",
        color: "#e7f9ff",
        padding: "40px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          background: "#03101a",
          borderRadius: 16,
          padding: 28,
          border: "1px solid rgba(45,224,255,.35)",
          boxShadow: "0 0 18px rgba(45,224,255,.25)",
        }}
      >
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 24,
            background: "linear-gradient(90deg,#2de0ff,#7be8ff)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Admin • Points Adjuster
        </h1>

        {/* Creator Select */}
        <label style={{ fontWeight: 600 }}>Creator</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{
            width: "100%",
            marginTop: 6,
            marginBottom: 20,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#02040a",
            color: "#e7f9ff",
            border: "1px solid rgba(45,224,255,.35)",
            outline: "none",
          }}
        >
          <option value="">Select a creator…</option>
          {creators.map((c) => (
            <option key={c.username} value={c.username}>
              {c.username}
            </option>
          ))}
        </select>

        {/* Points Input */}
        {selected && (
          <>
            <label style={{ fontWeight: 600 }}>
              Incentive Points (lifetime)
            </label>

            <input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              style={{
                width: "100%",
                marginTop: 6,
                marginBottom: 10,
                padding: "12px 14px",
                borderRadius: 10,
                background: "#02040a",
                color: "#e7f9ff",
                border: "1px solid rgba(45,224,255,.35)",
                outline: "none",
                fontSize: 18,
              }}
            />

            <p
              style={{
                fontSize: 13,
                opacity: 0.7,
                marginBottom: 18,
              }}
            >
              This value is added on top of calculated incentive points.
              Negative numbers are allowed.
            </p>

            <button
              onClick={save}
              disabled={saving}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 16,
                background:
                  "linear-gradient(90deg,#2de0ff,#7be8ff,#2de0ff)",
                color: "#02141b",
                border: "none",
                cursor: "pointer",
                opacity: saving ? 0.7 : 1,
                boxShadow: "0 0 10px rgba(45,224,255,.5)",
              }}
            >
              {saving ? "Saving…" : "Save Adjustment"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
