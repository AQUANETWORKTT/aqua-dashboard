"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar({ user }: { user: string | null }) {
  const pathname = usePathname();

  // Pages where navbar should NOT appear
  const hideOn = ["/login", "/"];

  if (!user) return null;
  if (hideOn.includes(pathname)) return null;

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "24px",
        padding: "14px 0",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 999,
      }}
    >
      <Link href="/leaderboard" className="aqua-link">Leaderboard</Link>
      <Link href="/" className="aqua-link">Home</Link>
      <Link href={`/dashboard/${user}`} className="aqua-link">Dashboard</Link>
    </nav>
  );
}
