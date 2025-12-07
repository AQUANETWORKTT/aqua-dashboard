"use client";

import { creators } from "@/data/creators";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPointsPage() {
  const [points, setPoints] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState("");
  const [value, setValue] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ LOAD incentive_extras
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("incentive_extras")
        .select("username, points");

      if (error) {
        setError(error.message);
        return;
      }

      const map: Record<string, number> = {};
      data?.forEach((row) => {
        map[row.username] = row.points;
      });

      setPoints(map);
    }

    load();
  }, []);

  // ✅ Fill input when creator selected
  useEffect(() => {
    if (!selected) return;
    setValue(points[selected] ?? 0);
  }, [selected, points]);

  // ✅ SAVE extras
  async function save() {
    if (!selected) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("incentive_extras")
      .upsert(
        { username: selected, points: value },
        { onConflict: "username" }
      );

    setSaving(false);

    if (error) {
      setError(error.message);
    } else {
      setPoints({ ...points, [selected]: value });
      alert("Graduations / extras saved ✅");
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: 40 }}>
      <h1>Admin • Graduations & Extras</h1>

      {error && (
        <div style={{ color: "red", marginBottom: 12 }}>
          {error}
        </div>
      )}

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Select creator</option>
        {creators.map((c) => (
          <option key={c.username} value={c.username}>
            {c.username}
          </option>
        ))}
      </select>

      {selected && (
        <>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
          <button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save extras"}
          </button>
        </>
      )}
    </main>
  );
}
