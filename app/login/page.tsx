"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your creator username.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.username) {
        setError("Login failed. Check your username and password.");
        setLoading(false);
        return;
      }

      router.replace(`/dashboard/${data.username}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "16px 18px",
    borderRadius: 16,
    marginBottom: 14,
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(45,224,255,0.28)",
    color: "#fff",
    outline: "none",
    fontSize: 15,
    fontWeight: 700,
    boxShadow:
      "inset 0 0 16px rgba(45,224,255,0.08), 0 0 18px rgba(45,224,255,0.12)",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, rgba(0,180,255,0.18), transparent 34%), linear-gradient(180deg, #020617 0%, #030712 58%, #000 100%)",
        fontFamily: "'Orbitron', 'Rajdhani', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 30,
          padding: 28,
          background:
            "linear-gradient(180deg, rgba(7,17,31,0.94), rgba(3,7,18,0.97))",
          border: "1px solid rgba(45,224,255,0.22)",
          boxShadow:
            "inset 0 0 28px rgba(45,224,255,0.04), 0 0 36px rgba(0,180,255,0.12)",
        }}
      >
        <h1
          style={{
            margin: "0 0 24px",
            textAlign: "center",
            fontSize: "clamp(34px, 8vw, 56px)",
            lineHeight: 0.95,
            fontWeight: 900,
            color: "#fff",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            textShadow:
              "0 0 8px rgba(45,224,255,0.9), 0 0 26px rgba(45,224,255,0.45)",
          }}
        >
          Creator Login
        </h1>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="TikTok username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Password (username1)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={{ ...inputStyle, marginBottom: 0 }}
          />

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 14,
                background: "rgba(255,77,77,0.08)",
                border: "1px solid rgba(255,77,77,0.22)",
                color: "#ff7a7a",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 18,
              padding: "16px 18px",
              borderRadius: 16,
              border: "1px solid rgba(45,224,255,0.38)",
              background:
                "linear-gradient(90deg, rgba(45,224,255,0.92), rgba(124,246,255,0.92))",
              color: "#001018",
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1,
              boxShadow: "0 0 26px rgba(45,224,255,0.22)",
            }}
          >
            {loading ? "Entering..." : "Enter Dashboard"}
          </button>
        </form>
      </div>
    </main>
  );
}