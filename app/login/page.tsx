"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your creator username.");
      return;
    }

    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ username }),
    });

    const data = await res.json();

    if (!res.ok || !data.username) {
      setError("Login failed. Make sure your creator username is correct.");
      return;
    }

    // Redirect using the REAL canonical username
    router.push(`/dashboard/${data.username}`);
  }

  return (
    <main className="login-wrapper">
      <div className="login-card">
        <img
          src="/aqua-logo.png"
          className="login-logo"
          alt="Aqua Agency"
        />

        <h1 className="login-title">Creator Login</h1>
        <p className="login-subtext">Access your diamonds, streaks & stats.</p>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            className="login-input"
            placeholder="Your TikTok username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          {error && <p className="login-error">{error}</p>}

          <button className="login-button" type="submit">
            Enter Dashboard
          </button>
        </form>
      </div>
    </main>
  );
}
