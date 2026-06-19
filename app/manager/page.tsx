"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const allowedUsers = [
  "james",
  "alfie",
  "dylan",
  "ellie",
  "vitali",
  "harry",
  "chloe",
  "mavis",
  "teddie",
  "millie",
  "chris",
];

const userKeys: Record<string, string> = {
  james: "J1",
  alfie: "A2",
  dylan: "D3",
  ellie: "E5",
  vitali: "V7",
  harry: "H9",
  chloe: "C10",
  mavis: "M13",
  teddie: "T14",
  millie: "M15",
  chris: "C16",
};

export default function ManagerLoginPage() {
  const [username, setUsername] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    const cleanUser = username.trim().toLowerCase();
    const cleanKey = keyValue.trim();

    if (!cleanUser || !cleanKey) {
      setError("Enter your username and key.");
      return;
    }

    if (!allowedUsers.includes(cleanUser)) {
      setError("Username not found.");
      return;
    }

    if (userKeys[cleanUser] !== cleanKey) {
      setError("Invalid key.");
      return;
    }

    localStorage.setItem("manager_logged_in", "true");
    localStorage.setItem("manager_username", cleanUser);

    router.push("/manager/portal");
  };

  return (
    <section className="manager-login-page">
      <div className="manager-login-stack">
        <div className="manager-login-card">
          <div className="manager-form">
            <label className="manager-label manager-label-glow">
              Username
              <input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder=""
                className="manager-input"
              />
            </label>

            <label className="manager-label manager-label-glow">
              Enter your key
              <input
                value={keyValue}
                onChange={(e) => {
                  setKeyValue(e.target.value);
                  setError("");
                }}
                placeholder=""
                className="manager-input"
              />
            </label>

            {error ? <p className="manager-message">{error}</p> : null}

            <button onClick={handleLogin} className="manager-button">
              Continue
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}