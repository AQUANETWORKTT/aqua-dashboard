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
    <main className="banPage">
      <div className="banCard">
        <h1>Ban Help</h1>

        <form onSubmit={handleSubmit} className="banForm">
          <label>
            <span>TikTok @</span>
            <input
              value={tiktokId}
              onChange={(e) => setTiktokId(e.target.value)}
              required
            />
          </label>

          <label>
            <span>Reason</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </label>

          <label>
            <span>Length</span>
            <input
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="24h, 7 days, permanent..."
              required
            />
          </label>

          <label>
            <span>Manager</span>
            <input
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              required
            />
          </label>

          <button disabled={submitting}>
            {submitting ? "Sending..." : "Send Request"}
          </button>

          {success && <p className="success">{success}</p>}
          {error && <p className="error">{error}</p>}
        </form>
      </div>

      <style jsx>{`
        .banPage {
          min-height: 100vh;
          padding: 26px 14px 126px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at top, rgba(255, 77, 77, 0.16), transparent 32%),
            radial-gradient(circle at 50% 18%, rgba(45, 224, 255, 0.16), transparent 36%),
            linear-gradient(180deg, #020617, #030712 58%, #000);
          color: white;
          font-family: "Trebuchet MS", Verdana, sans-serif;
        }

        .banCard {
          width: min(100%, 520px);
          position: relative;
          overflow: hidden;
          display: grid;
          gap: 20px;
          padding: 22px;
          border-radius: 24px;
          border: 1px solid rgba(45, 224, 255, 0.24);
          background:
            radial-gradient(circle at 50% 0%, rgba(45, 224, 255, 0.22), transparent 42%),
            linear-gradient(180deg, rgba(9, 24, 46, 0.98), rgba(4, 10, 24, 0.98));
          box-shadow:
            0 0 30px rgba(45, 224, 255, 0.12),
            inset 0 0 22px rgba(255, 77, 77, 0.04);
        }

        h1 {
          margin: 0;
          text-align: center;
          font-family: Impact, Haettenschweiler, "Arial Black", sans-serif;
          font-size: clamp(46px, 13vw, 84px);
          line-height: 0.92;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: #ffffff;
          -webkit-text-stroke: 1px rgba(255, 77, 77, 0.34);
          text-shadow:
            0 4px 0 rgba(0, 0, 0, 0.58),
            0 0 18px rgba(255, 77, 77, 0.44),
            0 0 34px rgba(45, 224, 255, 0.32);
        }

        .banForm {
          display: grid;
          gap: 12px;
        }

        label {
          display: grid;
          gap: 8px;
          padding: 10px;
          border-radius: 16px;
          border: 1px solid rgba(45, 224, 255, 0.22);
          background: rgba(255, 255, 255, 0.045);
        }

        span {
          color: #7cf6ff;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        input {
          width: 100%;
          min-width: 0;
          padding: 13px 12px;
          border-radius: 12px;
          border: 1px solid rgba(124, 246, 255, 0.2);
          outline: none;
          color: white;
          background: rgba(0, 0, 0, 0.3);
          font-size: 15px;
          font-weight: 900;
        }

        input:focus {
          border-color: rgba(124, 246, 255, 0.72);
          box-shadow: 0 0 18px rgba(45, 224, 255, 0.22);
        }

        button {
          width: 100%;
          margin-top: 4px;
          padding: 15px 18px;
          border: 0;
          border-radius: 16px;
          color: #021019;
          background: linear-gradient(135deg, #ffb0b0, #ff4d4d 42%, #7cf6ff);
          font-family: Impact, Haettenschweiler, "Arial Black", sans-serif;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 0 18px rgba(255, 77, 77, 0.28);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .success,
        .error {
          margin: 0;
          padding: 11px 12px;
          border-radius: 12px;
          font-weight: 900;
          text-align: center;
        }

        .success {
          color: #4ade80;
          background: rgba(74, 222, 128, 0.1);
        }

        .error {
          color: #ff8a8a;
          background: rgba(255, 77, 77, 0.1);
        }
      `}</style>
    </main>
  );
}
