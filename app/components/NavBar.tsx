"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function NavBar({ user }: { user: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Pages where navbar should NOT appear
  const hideOn = ["/login", "/"];
  if (!user) return null;
  if (hideOn.includes(pathname)) return null;

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ORDER + NEW LINKS
  const links: { href: string; label: string; style?: React.CSSProperties }[] = [
    { href: "/", label: "Home" },
    { href: `/dashboard/${user}`, label: "Dashboard" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/points-leaderboard", label: "Points" },

    // ✅ Aqua Bingo
    {
      href: "/aqua-bingo",
      label: "Aqua Bingo",
      style: { fontWeight: 800 },
    },

    // 🔥 Ban Help highlighted in red
    {
      href: "/banned-help",
      label: "Ban Help",
      style: { color: "#ff4d4d", fontWeight: 800 },
    },
  ];

  const isActive = (href: string) => {
    // Treat dashboard as active for /dashboard/username
    if (href.startsWith("/dashboard/")) return pathname.startsWith("/dashboard/");
    return pathname === href;
  };

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 999,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(10px)",
        padding: "10px 14px",
        borderBottom: "1px solid rgba(45,224,255,0.25)",
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
            fontWeight: 800,
            fontSize: "18px",
            letterSpacing: "0.06em",
          }}
          className="glow-text"
        >
          Aqua Dashboard
        </div>

        {/* Burger button */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={open}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "6px 8px",
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
            paddingBottom: "6px",
          }}
        >
          {links.map((link) => {
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className="aqua-link"
                onClick={() => setOpen(false)}
                style={{
                  padding: "10px 8px",
                  textAlign: "center",
                  borderRadius: 10,
                  border: active ? "1px solid rgba(45,224,255,0.55)" : "1px solid transparent",
                  background: active ? "rgba(45,224,255,0.08)" : "transparent",
                  ...(link.style || {}),
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
