"use client";

import { useState } from "react";

export default function BannedHelpPage() {
  const [tiktokId, setTiktokId] = useState("");
  const [reason, setReason] = useState("");
  const [length, setLength] = useState("");
  const [manager, setManager] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSuccess("");
    setError("");

    const res = await fetch("/api/banned-help", {
      method: "POST",
      body: JSON.stringify({
        tiktokId,
        reason,
        length,
        manager,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("Something went wrong sending your request.");
      return;
    }

    setSuccess("Your ban request has been sent to Aqua Support.");
    setTiktokId("");
    setReason("");
    setLength("");
    setManager("");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#02040a",
        color: "white",
        display: "flex",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#03101a",
          padding: "24px",
          borderRadius: "14px",
          border: "1px solid #2de0ff44",
          boxShadow: "0 0 12px rgba(45, 224, 255, 0.15)",
        }}
      >
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            marginBottom: "8px",
            color: "#2de0ff",
          }}
        >
          Ban Help Request
        </h1>

        <p style={{ fontSize: "14px", color: "#c0cbd1", marginBottom: "20px" }}>
          Fill out this form if your TikTok account was banned and you need Aqua support
          to review your ban.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* TikTok ID */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", color: "#b7c8d1" }}>
              TikTok @
            </label>
            <input
              style={{
                width: "100%",
                padding: "10px",
                background: "#0a1c27",
                border: "1px solid #2de0ff33",
                borderRadius: "8px",
                color: "white",
              }}
              value={tiktokId}
              onChange={(e) => setTiktokId(e.target.value)}
              required
            />
          </div>

          {/* Reason for Ban */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", color: "#b7c8d1" }}>
              Reason for Ban
            </label>
            <input
              style={{
                width: "100%",
                padding: "10px",
                background: "#0a1c27",
                border: "1px solid #2de0ff33",
                borderRadius: "8px",
                color: "white",
              }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          {/* Length of Ban */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", color: "#b7c8d1" }}>
              Length of Ban
            </label>
            <input
              style={{
                width: "100%",
                padding: "10px",
                background: "#0a1c27",
                border: "1px solid #2de0ff33",
                borderRadius: "8px",
                color: "white",
              }}
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="24h, 7 days, permanent..."
              required
            />
          </div>

          {/* Manager */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", color: "#b7c8d1" }}>
              Manager (Who Recruited You)
            </label>
            <input
              style={{
                width: "100%",
                padding: "10px",
                background: "#0a1c27",
                border: "1px solid #2de0ff33",
                borderRadius: "8px",
                color: "white",
              }}
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <button
            disabled={submitting}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              background: submitting ? "#2de0ff88" : "#2de0ff",
              color: "#02040a",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {submitting ? "Submitting..." : "Submit Ban Request"}
          </button>

          {success && <p style={{ color: "#2dff7a", fontSize: "14px" }}>{success}</p>}
          {error && <p style={{ color: "#ff4d4d", fontSize: "14px" }}>{error}</p>}
        </form>
      </div>
    </main>
  );
}
