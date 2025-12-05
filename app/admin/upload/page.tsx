"use client";

import { useState } from "react";

export default function AdminUploadPage() {
  const [password, setPassword] = useState("");

  // -------------------------------
  // STATS STATE
  // -------------------------------
  const [statsDate, setStatsDate] = useState("");
  const [dailyFile, setDailyFile] = useState<File | null>(null);
  const [lifetimeFile, setLifetimeFile] = useState<File | null>(null);
  const [statsStatus, setStatsStatus] = useState<string | null>(null);

  // -------------------------------
  // BATTLE STATE
  // -------------------------------
  const [battleDate, setBattleDate] = useState("");
  const [battleTime, setBattleTime] = useState("");
  const [creatorUsername, setCreatorUsername] = useState("");
  const [opponentAgency, setOpponentAgency] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [opponentImage, setOpponentImage] = useState<File | null>(null);
  const [posterImage, setPosterImage] = useState<File | null>(null);
  const [battleNotes, setBattleNotes] = useState("");
  const [battleStatus, setBattleStatus] = useState<string | null>(null);

  // ------------------------------------------------
  // SUBMIT STATS
  // ------------------------------------------------
  async function handleStatsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatsStatus("Uploading…");

    const form = new FormData();
    form.append("statsDate", statsDate);
    if (dailyFile) form.append("dailyFile", dailyFile);
    if (lifetimeFile) form.append("lifetimeFile", lifetimeFile);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "x-admin-password": password },
        body: form,
      });

      const json = await res.json();

      if (res.ok && json.message) {
        setStatsStatus(`✅ ${json.message}`);
      } else if (json.error) {
        setStatsStatus(`❌ ${json.error}`);
      } else {
        setStatsStatus("❌ Unexpected server response.");
      }
    } catch (err: any) {
      setStatsStatus("❌ " + err.message);
    }
  }

  // ------------------------------------------------
  // SUBMIT BATTLE
  // ------------------------------------------------
  async function handleBattleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBattleStatus("Uploading…");

    const form = new FormData();
    form.append("date", battleDate);
    form.append("time", battleTime);
    form.append("creator_username", creatorUsername);
    form.append("opponent_agency", opponentAgency);
    form.append("opponent_name", opponentName);
    form.append("notes", battleNotes);

    if (opponentImage) form.append("opponent_image", opponentImage);
    if (posterImage) form.append("poster_image", posterImage);

    try {
      const res = await fetch("/api/admin/upload-battle", {
        method: "POST",
        headers: { "x-admin-password": password },
        body: form,
      });

      const json = await res.json();
      if (res.ok) {
        setBattleStatus("✅ Battle added!");
      } else if (json.error) {
        setBattleStatus(`❌ ${json.error}`);
      } else {
        setBattleStatus("❌ Unexpected server response.");
      }
    } catch (err: any) {
      setBattleStatus("❌ " + err.message);
    }
  }

  return (
    <main className="admin-wrapper">
      <div className="admin-card">

        {/* ---------------- STATS UPLOAD ---------------- */}
        <h1 className="admin-title">Upload Stats</h1>

        <form onSubmit={handleStatsSubmit} className="admin-form">

          <label className="admin-label">
            Admin Password
            <input
              className="admin-input"
              type="password"
              name="adminPassword"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="admin-label">
            Stats Date
            <input
              className="admin-input"
              type="date"
              name="statsDate"
              required
              value={statsDate}
              onChange={(e) => setStatsDate(e.target.value)}
            />
          </label>

          <label className="admin-label">
            Daily Excel
            <input
              className="admin-input-file"
              type="file"
              name="dailyFile"
              accept=".xlsx,.xls"
              required
              onChange={(e) => setDailyFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <label className="admin-label">
            Lifetime Excel
            <input
              className="admin-input-file"
              type="file"
              name="lifetimeFile"
              accept=".xlsx,.xls"
              required
              onChange={(e) => setLifetimeFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <button className="admin-button">Upload Stats</button>

          {statsStatus && <p className="admin-status">{statsStatus}</p>}
        </form>

        {/* ---------------- BATTLE UPLOAD ---------------- */}
        <h2 className="glow-text" style={{ marginTop: 40 }}>Add Arranged Battle</h2>

        <form onSubmit={handleBattleSubmit} className="admin-form">

          <label className="admin-label">
            Date
            <input
              className="admin-input"
              type="date"
              name="battleDate"
              required
              value={battleDate}
              onChange={(e) => setBattleDate(e.target.value)}
            />
          </label>

          <label className="admin-label">
            Time
            <input
              className="admin-input"
              type="time"
              name="battleTime"
              required
              value={battleTime}
              onChange={(e) => setBattleTime(e.target.value)}
            />
          </label>

          <label className="admin-label">
            Creator Username
            <input
              className="admin-input"
              name="creatorUsername"
              required
              value={creatorUsername}
              onChange={(e) => setCreatorUsername(e.target.value)}
            />
          </label>

          <label className="admin-label">
            Opponent Agency
            <input
              className="admin-input"
              name="opponentAgency"
              required
              value={opponentAgency}
              onChange={(e) => setOpponentAgency(e.target.value)}
            />
          </label>

          <label className="admin-label">
            Opponent Name
            <input
              className="admin-input"
              name="opponentName"
              required
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
            />
          </label>

          <label className="admin-label">
            Opponent Image
            <input
              className="admin-input-file"
              type="file"
              name="opponentImage"
              accept="image/*"
              required
              onChange={(e) => setOpponentImage(e.target.files?.[0] ?? null)}
            />
          </label>

          <label className="admin-label">
            Battle Poster
            <input
              className="admin-input-file"
              type="file"
              name="posterImage"
              accept="image/*"
              onChange={(e) => setPosterImage(e.target.files?.[0] ?? null)}
            />
          </label>

          <label className="admin-label">
            Notes
            <textarea
              className="admin-input"
              name="notes"
              value={battleNotes}
              onChange={(e) => setBattleNotes(e.target.value)}
            />
          </label>

          <button className="admin-button">Save Battle</button>

          {battleStatus && <p className="admin-status">{battleStatus}</p>}
        </form>

      </div>
    </main>
  );
}
