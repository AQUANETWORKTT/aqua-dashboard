"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar({ user }: { user: string | null }) {
  const pathname = usePathname();

  const hideOn = ["/login", "/"];
  if (!user) return null;
  if (hideOn.includes(pathname)) return null;

  const links = [
    { href: "/banned-help", label: "Ban Help", icon: "⛔" },
    { href: `/dashboard/${user}`, label: "Dashboard", icon: "📊" },
    { href: "/", label: "Home", icon: "⌂" },
    { href: "/leaderboard", label: "Leaderboard", icon: "☰" },
    { href: "/merch", label: "Merch", icon: "👕" },
  ];

  return (
    <>
      <nav className="aqua-top-nav">
        <div className="aqua-top-inner">
          <div className="aqua-brand">Aqua agency</div>

          <div className="aqua-desktop-links">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`aqua-desktop-link ${
                  pathname === link.href ? "active" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <nav className="aqua-bottom-bar">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`aqua-bottom-item ${
              pathname === link.href ? "active" : ""
            }`}
          >
            <span className="aqua-bottom-icon">{link.icon}</span>
            <span className="aqua-bottom-label">{link.label}</span>
          </Link>
        ))}
      </nav>

      <style jsx>{`
        .aqua-top-nav {
          position: sticky;
          top: 0;
          z-index: 999;
          background: rgba(0, 6, 18, 0.72);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(45, 224, 255, 0.22);
          padding: 12px 14px;
          font-family: "Orbitron", "Rajdhani", sans-serif;
          letter-spacing: 0.08em;
        }

        .aqua-top-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1100px;
          margin: 0 auto;
        }

        .aqua-brand {
          font-weight: 900;
          font-size: 18px;
          color: #ffffff;
          text-transform: uppercase;
          text-shadow:
            0 0 8px rgba(45, 224, 255, 0.9),
            0 0 20px rgba(45, 224, 255, 0.55);
        }

        .aqua-desktop-links {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .aqua-desktop-link {
          padding: 9px 12px;
          border-radius: 999px;
          text-decoration: none;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          border: 1px solid rgba(45, 224, 255, 0.14);
          background: rgba(255, 255, 255, 0.025);
        }

        .aqua-desktop-link.active {
          color: #2de0ff;
          background: rgba(45, 224, 255, 0.13);
          box-shadow: 0 0 18px rgba(45, 224, 255, 0.28);
        }

        .aqua-bottom-bar {
          display: none;
        }

        @media (max-width: 700px) {
          .aqua-desktop-links {
            display: none;
          }

          .aqua-top-nav {
            padding: 13px 14px;
          }

          .aqua-top-inner {
            justify-content: center;
          }

          .aqua-bottom-bar {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            height: 72px;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            background: rgba(0, 6, 18, 0.96);
            backdrop-filter: blur(18px);
            border-top: 1px solid rgba(45, 224, 255, 0.26);
            box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.65);
            padding-bottom: env(safe-area-inset-bottom);
          }

          .aqua-bottom-item {
            min-width: 0;
            height: 72px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            text-decoration: none;
            color: rgba(255, 255, 255, 0.68);
            border-right: 1px solid rgba(255, 255, 255, 0.06);
            overflow: hidden;
          }

          .aqua-bottom-item:last-child {
            border-right: none;
          }

          .aqua-bottom-icon {
            font-size: 18px;
            line-height: 1;
          }

          .aqua-bottom-label {
            width: 100%;
            padding: 0 2px;
            text-align: center;
            font-size: 8px;
            line-height: 1.05;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0;
            white-space: normal;
            overflow: hidden;
          }

          .aqua-bottom-item.active {
            color: #2de0ff;
            background: rgba(45, 224, 255, 0.12);
            box-shadow: inset 0 0 18px rgba(45, 224, 255, 0.14);
          }

          .aqua-bottom-item.active .aqua-bottom-icon {
            filter: drop-shadow(0 0 7px rgba(45, 224, 255, 0.8));
          }

          body {
            padding-bottom: 72px;
          }
        }
      `}</style>
    </>
  );
}