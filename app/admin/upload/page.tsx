"use client";

import { useState } from "react";

export default function AdminUploadPage() {
  const [password, setPassword] = useState("");
  const [statsDate, setStatsDate] = useState("");
  const [dailyFile, setDailyFile] = useState<File | null>(null);
  const [lifetimeFile, setLifetimeFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        headers: {
          "x-admin-password": password,
        },
        body: form,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(`❌ ${json.error || "Upload failed"}`);
      } else {
        setStatus(`✅ ${json.message}`);
      }
    } catch (err: any) {
      setStatus(`❌ ${err.message}`);
    }

    setLoading(false);
  }

  return (
    <main className="admin-wrapper">
      <div className="admin-card">

        <h1 className="admin-title">Admin · Upload Stats</h1>
        <p className="admin-sub">
          Upload your <strong>Daily</strong> and <strong>Lifetime</strong> Excel
          sheets. This updates all creators + calendars.
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
            Daily File (.xlsx – diamonds + hours)
            <input
              type="file"
              className="admin-input-file"
              accept=".xlsx,.xls"
              onChange={(e) => setDailyFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <label className="admin-label">
            Lifetime File (.xlsx – lifetime + hours)
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
            <p className={`admin-status ${status.startsWith("✅") ? "success" : "error"}`}>
              {status}
            </p>
          )}

        </form>
      </div>
    </main>
  );
}
