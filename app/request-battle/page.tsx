"use client";

import { useState } from "react";

export default function RequestBattlePage() {
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const form = new FormData(e.target as HTMLFormElement);

    const res = await fetch("/api/request-battle", {
      method: "POST",
      body: form,
    });

    const json = await res.json();
    if (!res.ok) {
      setStatus("❌ " + json.error);
    } else {
      setStatus("✅ Request submitted successfully!");
      (e.target as HTMLFormElement).reset();
    }
  }

  return (
    <main
      style={{
        maxWidth: "650px",
        margin: "40px auto",
        padding: "25px",
        background: "#03101a",
        borderRadius: "18px",
        border: "1px solid rgba(45,224,255,0.25)",
        boxShadow: "0 0 24px rgba(45,224,255,0.15)",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <h1 className="glow-text" style={{ textAlign: "center", marginBottom: "10px" }}>
        Request a Battle
      </h1>

      <p style={{ textAlign: "center", marginBottom: "20px", color: "#8ad6ff" }}>
        Fill this out and Aqua Agency will contact you with available times.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <input
          name="tiktok_username"
          className="input"
          placeholder="Your TikTok Username"
          required
        />

        <textarea
          name="availability"
          className="input"
          placeholder="What days/times are you available?"
          rows={4}
          required
        />

        <button
          type="submit"
          style={{
            padding: "12px 20px",
            background: "#2de0ff",
            borderRadius: "12px",
            border: "none",
            fontSize: "17px",
            color: "#011016",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 0 14px rgba(45,224,255,0.6)",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Submit Request
        </button>
      </form>

      {status && (
        <p
          style={{
            textAlign: "center",
            marginTop: "14px",
            color: status.startsWith("✅") ? "#2de0ff" : "#ff5c5c",
            fontWeight: "600",
          }}
        >
          {status}
        </p>
      )}
    </main>
  );
}
