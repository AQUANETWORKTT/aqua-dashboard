"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function NavBar({ user }: { user: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Pages where navbar should NOT appear
  const hideOn = ["/login", "/"];
  if (!user) return null;
  if (hideOn.includes(pathname)) return null;

  // ORDER YOU REQUESTED
  const links = [
    { href: "/", label: "Home" },
    { href: `/dashboard/${user}`, label: "Dashboard" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/points-leaderboard", label: "Points" },
    { href: "/arranged-battles", label: "Arranged Battles" },
    { href: "/request-battle", label: "Request a Battle" },
  ];

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(10px)",
        padding: "10px 14px",
      }}
    >
      {/* Top row: Brand + burger */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: "18px",
          }}
          className="glow-text"
        >
          Aqua Dashboard
        </div>

        {/* Burger button */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 6px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span style={{ width: "22px", height: "2px", background: "#2de0ff" }} />
          <span style={{ width: "22px", height: "2px", background: "#2de0ff" }} />
          <span style={{ width: "22px", height: "2px", background: "#2de0ff" }} />
        </button>
      </div>

      {/* Dropdown menu */}
      {open && (
        <div
          style={{
            maxWidth: "1100px",
            margin: "10px auto 0",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="aqua-link"
              onClick={() => setOpen(false)}
              style={{
                padding: "8px 4px",
                textAlign: "center",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
