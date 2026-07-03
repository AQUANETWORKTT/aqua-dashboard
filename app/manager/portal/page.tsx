"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CreatorIntelligenceDashboard from "../../creator-intelligence/CreatorIntelligenceDashboard";

export default function ManagerPortalPage() {
  const router = useRouter();
  const [managerUsername] = useState(() => {
    if (typeof window === "undefined") return "";

    const loggedIn = localStorage.getItem("manager_logged_in");
    const user = localStorage.getItem("manager_username");

    return loggedIn === "true" && user ? user.toLowerCase().trim() : "";
  });

  useEffect(() => {
    if (!managerUsername) {
      router.push("/manager");
    }
  }, [managerUsername, router]);

  if (!managerUsername) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
          Loading manager portal...
        </div>
      </main>
    );
  }

  return <CreatorIntelligenceDashboard lockedManagerUsername={managerUsername} />;
}
