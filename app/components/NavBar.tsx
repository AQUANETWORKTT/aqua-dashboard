"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function NavBar({ user }: { user: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const hideOn = ["/login", "/"];
  if (!user) return null;
  if (hideOn.includes(pathname)) return null;

  const links = [
    { href: "/", label: "Home" },
    { href: `/dashboard/${user}`, label: "Dashboard" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/points-leaderboard", label: "Points" },
    { href: "/merch", label: "Merch" },
    {
      href: "/banned-help",
      label: "Ban Help",
      style: { color: "#ff4d4d", fontWeight: 900 },
    },
  ];

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 999,
        background: "rgba(0, 6, 18, 0.72)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(45, 224, 255, 0.22)",
        padding: "12px 14px",
        fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
        letterSpacing: "0.08em",
      }}
    >
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
            fontWeight: 900,
            fontSize: "18px",
            color: "#ffffff",
            textTransform: "uppercase",
            textShadow:
              "0 0 8px rgba(45,224,255,0.9), 0 0 20px rgba(45,224,255,0.55)",
          }}
        >
          Aqua agency
        </div>

        <button
          onClick={() => setOpen((prev) => !prev)}
          style={{
            background: "rgba(45,224,255,0.06)",
            border: "1px solid rgba(45,224,255,0.35)",
            borderRadius: "10px",
            cursor: "pointer",
            padding: "8px 9px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            boxShadow: "0 0 14px rgba(45,224,255,0.18)",
          }}
        >
          <span style={{ width: "22px", height: "2px", background: "#2de0ff" }} />
          <span style={{ width: "22px", height: "2px", background: "#2de0ff" }} />
          <span style={{ width: "22px", height: "2px", background: "#2de0ff" }} />
        </button>
      </div>

      {open && (
        <div
          style={{
            maxWidth: "1100px",
            margin: "12px auto 0",
            display: "flex",
            flexDirection: "column",
            gap: "9px",
          }}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{
                padding: "11px 8px",
                textAlign: "center",
                textDecoration: "none",
                color: pathname === link.href ? "#2de0ff" : "#ffffff",
                fontWeight: 800,
                fontSize: "13px",
                textTransform: "uppercase",
                border: "1px solid rgba(45,224,255,0.18)",
                borderRadius: "12px",
                background:
                  pathname === link.href
                    ? "rgba(45,224,255,0.13)"
                    : "rgba(255,255,255,0.025)",
                textShadow:
                  "0 0 6px rgba(45,224,255,0.75), 0 0 18px rgba(45,224,255,0.35)",
                boxShadow:
                  pathname === link.href
                    ? "0 0 18px rgba(45,224,255,0.32)"
                    : "none",
                ...(link.style || {}),
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