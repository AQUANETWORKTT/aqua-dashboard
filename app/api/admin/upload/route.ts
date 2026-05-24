"use client";

import { useState } from "react";

export default function AdminUploadPage() {
  const [password, setPassword] = useState("");
  const [statsDate, setStatsDate] = useState("");
  const [creatorStatsFile, setCreatorStatsFile] = useState<File | null>(null);
  const [statsStatus, setStatsStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleStatsSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!creatorStatsFile) {
      setStatsStatus("❌ Please choose a creator stats Excel file.");
      return;
    }

    setUploading(true);
    setStatsStatus("Uploading…");

    const form = new FormData();
    form.append("statsDate", statsDate);
    form.append("creatorStatsFile", creatorStatsFile);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "x-admin-password": password,
        },
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
      setStatsStatus(`❌ ${err.message || "Upload failed."}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="admin-wrapper">
      <div className="admin-card">
        <h1 className="admin-title">Upload Monthly Stats</h1>

        <p className="admin-subtitle">
          Upload the TikTok monthly creator export. This updates your Supabase
          creator_monthly_stats table, so it works from the public deployed app.
        </p>

        <form onSubmit={handleStatsSubmit} className="admin-form">
          <label className="admin-label">
            Admin Password
            <input
              className="admin-input"
              type="password"
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
              required
              value={statsDate}
              onChange={(e) => setStatsDate(e.target.value)}
            />
          </label>

          <label className="admin-label">
            Creator Stats Excel
            <input
              className="admin-input-file"
              type="file"
              accept=".xlsx,.xls"
              required
              onChange={(e) =>
                setCreatorStatsFile(e.target.files?.[0] ?? null)
              }
            />
          </label>

          <p
            style={{
              marginTop: -8,
              marginBottom: 8,
              fontSize: "0.92rem",
              opacity: 0.8,
              lineHeight: 1.5,
            }}
          >
            Required columns include Creator ID, Creator&apos;s username,
            Creator Network manager, Diamonds, LIVE duration, Valid go LIVE
            days, New followers, LIVE streams, Matches, and Diamonds from
            matches.
          </p>

          <button className="admin-button" disabled={uploading}>
            {uploading ? "Uploading…" : "Upload Stats"}
          </button>

          {statsStatus && <p className="admin-status">{statsStatus}</p>}
        </form>
      </div>
    </main>
  );
}
