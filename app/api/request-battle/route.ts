"use client";

import { useState } from "react";

export default function AdminUploadPage() {
  // -----------------------------------------------------------
  // EXISTING: STATS UPLOAD STATE
  // -----------------------------------------------------------
  const [password, setPassword] = useState("");
  const [statsDate, setStatsDate] = useState("");
  const [dailyFile, setDailyFile] = useState<File | null>(null);
  const [lifetimeFile, setLifetimeFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // -----------------------------------------------------------
  // NEW: ARRANGED BATTLE STATE
  // -----------------------------------------------------------
  const [battleDate, setBattleDate] = useState("");
  const [battleTime, setBattleTime] = useState("");
  const [creatorUsername, setCreatorUsername] = useState("");
  const [opponentAgency, setOpponentAgency] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [opponentImage, setOpponentImage] = useState<File | null>(null);
  const [battleNotes, setBattleNotes] = useState("");
  const [battleStatus, setBattleStatus] = useState<string | null>(null);

  // -----------------------------------------------------------
  // UPLOAD STATS HANDLER
  // -----------------------------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const form = new FormData();
    form.append("statsDate", statsDate);
    form.append("dailyFile", dailyFile!);
    form.append("lifetimeFile", lifetimeFile!);

    setLoading(true);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "x-admin-password": password },
        body: form,
      });

      const json = await res.json().catch(() => ({}));
      setStatus(res.ok ? `✅ ${json.message}` : `❌ ${json.error}`);
    } catch (err: any) {
      setStatus(`❌ ${err.message}`);
    }

    setLoading(false);
  }

  // -----------------------------------------------------------
  // UPLOAD ARRANGED BATTLE HANDLER
  // -----------------------------------------------------------
  async function handleBattleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBattleStatus(null);

    const form = new FormData();
    form.append("date", battleDate);
    form.append("time", battleTime);
    form.append("creator_username", creatorUsername);
    form.append("opponent_agency", opponentAgency);
    form.append("opponent_name", opponentName);
    form.append("notes", battleNotes);
    if (opponentImage) form.append("opponent_image", opponentImage);

    try {
      const res = await fetch("/api/admin/upload-battle", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setBattleStatus("❌ " + json.error);
      } else {
        setBattleStatus("✅ Battle added successfully!");

        // Clear fields after success
        setBattleDate("");
        setBattleTime("");
        setCreatorUsername("");
        setOpponentAgency("");
        setOpponentName("");
        setOpponentImage(null);
        setBattleNotes("");
      }
    } catch (err: any) {
      setBattleStatus("❌ " + err.message);
    }
  }

  // -----------------------------------------------------------
  // PAGE UI
  // -----------------------------------------------------------
  return (
    <main className="admin-wrapper">
      <div className="admin-card">

        {/* ====================================================== */}
        {/* STATS UPLOAD SECTION                                  */}
        {/* ====================================================== */}

        <h1 className="admin-title">Admin · Upload Stats</h1>
        <p className="admin-sub">
          Upload your <strong>Daily</strong> and <strong>Lifetime</strong> Excel sheets.
        </p>

        <form onSubmit={handleSubmit} className="admin-form">

          <label className="admin-label">
            Admin Password
            <input
              type="password"
              className="admin-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="admin-label">
            Stats Date
            <input
              type="date"
              className="admin-input"
              value={statsDate}
              onChange={(e) => setStatsDate(e.target.value)}
            />
          </label>

          <label className="admin-label">
            Daily File (.xlsx)
            <input
              type="file"
              className="admin-input-file"
              accept=".xlsx,.xls"
              onChange={(e) => setDailyFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <label className="admin-label">
            Lifetime File (.xlsx)
            <input
              type="file"
              className="admin-input-file"
              accept=".xlsx,.xls"
              onChange={(e) => setLifetimeFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <button className="admin-button" disabled={loading}>
            {loading ? "Uploading…" : "Upload Stats"}
          </button>

          {status && (
            <p
              className={`admin-status ${
                status.startsWith("✅") ? "success" : "error"
              }`}
            >
              {status}
            </p>
          )}
        </form>

        {/* ====================================================== */}
        {/* ARRANGED BATTLE CREATOR SECTION                       */}
        {/* ====================================================== */}

        <form onSubmit={handleBattleSubmit} style={{ marginTop: "45px" }}>
          <h2 className="glow-text" style={{ marginBottom: "10px" }}>
            Add New Arranged Battle
          </h2>

          <label className="admin-label">
            Battle Date
            <input
              type="date"
              className="admin-input"
              value={battleDate}
              onChange={(e) => setBattleDate(e.target.value)}
              required
            />
          </label>

          <label className="admin-label">
            Battle Time
            <input
              type="time"
              className="admin-input"
              value={battleTime}
              onChange={(e) => setBattleTime(e.target.value)}
              required
            />
          </label>

          <label className="admin-label">
            Creator Username
            <input
              type="text"
              className="admin-input"
              value={creatorUsername}
              onChange={(e) => setCreatorUsername(e.target.value)}
              required
            />
          </label>

          <label className="admin-label">
            Opponent Agency
            <input
              type="text"
              className="admin-input"
              value={opponentAgency}
              onChange={(e) => setOpponentAgency(e.target.value)}
              required
            />
          </label>

          <label className="admin-label">
            Opponent Name
            <input
              type="text"
              className="admin-input"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              required
            />
          </label>

          <label className="admin-label">
            Opponent Image
            <input
              type="file"
              className="admin-input-file"
              accept="image/*"
              onChange={(e) => setOpponentImage(e.target.files?.[0] ?? null)}
              required
            />
          </label>

          <label className="admin-label">
            Notes (optional)
            <textarea
              className="admin-input"
              value={battleNotes}
              onChange={(e) => setBattleNotes(e.target.value)}
            />
          </label>

          <button className="admin-button" style={{ marginTop: "12px" }}>
            Save Battle
          </button>

          {battleStatus && (
            <p
              className={`admin-status ${
                battleStatus.startsWith("✅") ? "success" : "error"
              }`}
            >
              {battleStatus}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
