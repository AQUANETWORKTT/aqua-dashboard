"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ADMIN_CODE = "FALCON";

export default function ManagerAdminAccessPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleAccess = () => {
    const cleanCode = code.trim();

    if (!cleanCode) {
      setError("Enter admin code.");
      return;
    }

    if (cleanCode !== ADMIN_CODE) {
      setError("Invalid admin code.");
      return;
    }

    localStorage.setItem("manager_admin_access", "true");
    router.push("/manager/admin/review");
  };

  return (
    <section className="manager-login-page">
      <div className="manager-login-stack">
        <div className="manager-login-card">
          <div className="manager-form">
            <label className="manager-label manager-label-glow">
              Enter Admin Code
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                placeholder=""
                className="manager-input"
              />
            </label>

            {error ? <p className="manager-message">{error}</p> : null}

            <button onClick={handleAccess} className="manager-button">
              Continue
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}