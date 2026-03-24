"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.username) {
      setError("Login failed. Check your username and password.");
      return;
    }

    router.replace(`/dashboard/${data.username}`);
    router.refresh();
  }

  return (
    <main className="login-wrapper">
      <div className="login-card">
        <img src="/aqua-logo.png" className="login-logo" alt="Aqua Agency" />

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

          <input
            type="password"
            className="login-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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