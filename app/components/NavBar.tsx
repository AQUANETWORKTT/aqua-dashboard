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

  const mobileLinks = [
    { href: "/banned-help", label: "", icon: "/nav-icons/ban-help.png" },
    { href: `/dashboard/${user}`, label: "", icon: "/nav-icons/dashboard.png" },
    { href: "/", label: "", icon: "/nav-icons/home.png" },
    { href: "/leaderboard", label: "", icon: "/nav-icons/leaderboard.png" },
    { href: "/merch", label: "", icon: "/nav-icons/merch.png" },
  ];

  const desktopLinks = [
    { href: "/", label: "Home" },
    { href: `/dashboard/${user}`, label: "Dashboard" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/merch", label: "Merch" },
    { href: "/banned-help", label: "Ban Help" },
  ];

  return (
    <>
      <nav className="aqua-top-nav">
        <div className="aqua-top-inner">
          <div className="aqua-brand">Aqua agency</div>

          <button
            onClick={() => setOpen((prev) => !prev)}
            className="aqua-menu-button"
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {open && (
          <div className="aqua-dropdown">
            {desktopLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`aqua-dropdown-link ${
                  pathname === link.href ? "active" : ""
                } ${link.label === "Ban Help" ? "ban-help-link" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <nav className="aqua-mobile-bottom">
        {mobileLinks.map((link) => {
          const active = pathname === link.href;
          const ban = link.label === "Ban Help";

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`aqua-mobile-tab ${active ? "active" : ""} ${
                ban ? "ban" : ""
              }`}
            >
              <img src={link.icon} alt="" className="aqua-mobile-icon" />
              <span>{link.label}</span>
            </Link>
          );
        })}
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

        .aqua-menu-button {
          background: rgba(45, 224, 255, 0.06);
          border: 1px solid rgba(45, 224, 255, 0.35);
          border-radius: 10px;
          cursor: pointer;
          padding: 8px 9px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 0 14px rgba(45, 224, 255, 0.18);
        }

        .aqua-menu-button span {
          width: 22px;
          height: 2px;
          background: #2de0ff;
          display: block;
        }

        .aqua-dropdown {
          max-width: 1100px;
          margin: 12px auto 0;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .aqua-dropdown-link {
          padding: 11px 8px;
          text-align: center;
          text-decoration: none;
          color: #ffffff;
          font-weight: 800;
          font-size: 13px;
          text-transform: uppercase;
          border: 1px solid rgba(45, 224, 255, 0.18);
          border-radius: 12px;
          background: rgba(45, 224, 255, 0.06);
          text-shadow:
            0 0 6px rgba(45, 224, 255, 0.75),
            0 0 18px rgba(45, 224, 255, 0.35);
          box-shadow: 0 0 14px rgba(45, 224, 255, 0.1);
        }

        .aqua-dropdown-link.active {
          color: #2de0ff;
          background: rgba(45, 224, 255, 0.13);
          box-shadow: 0 0 18px rgba(45, 224, 255, 0.32);
        }

        .aqua-dropdown-link.ban-help-link {
          color: #ff4d4d;
          border-color: rgba(255, 77, 77, 0.35);
          background: rgba(255, 77, 77, 0.06);
        }

        .aqua-mobile-bottom {
          display: none;
        }

        @media (max-width: 700px) {
          .aqua-menu-button,
          .aqua-dropdown {
            display: none;
          }

          .aqua-top-inner {
            justify-content: center;
          }

          .aqua-mobile-bottom {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            height: 92px;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            background:
              radial-gradient(circle at 50% 0%, rgba(45, 224, 255, 0.22), transparent 38%),
              linear-gradient(180deg, rgba(3, 15, 35, 0.98), rgba(0, 5, 16, 0.99));
            border-top: 2px solid rgba(45, 224, 255, 0.9);
            box-shadow:
              0 -12px 32px rgba(0, 0, 0, 0.78),
              0 0 24px rgba(45, 224, 255, 0.35);
            font-family: "Orbitron", "Rajdhani", sans-serif;
          }

          .aqua-mobile-tab {
            min-width: 0;
            height: 92px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
            text-decoration: none;
            color: rgba(255, 255, 255, 0.82);
            position: relative;
            border-right: 1px solid rgba(45, 224, 255, 0.14);
          }

          .aqua-mobile-tab:last-child {
            border-right: none;
          }

          .aqua-mobile-icon {
            width: 34px;
            height: 34px;
            object-fit: contain;
            filter: drop-shadow(0 0 7px rgba(45, 224, 255, 0.75));
          }

          .aqua-mobile-tab.ban .aqua-mobile-icon {
            filter: drop-shadow(0 0 8px rgba(255, 77, 77, 0.8));
          }

          .aqua-mobile-tab span {
            font-size: 10px;
            line-height: 1;
            font-weight: 800;
            white-space: nowrap;
            text-align: center;
          }

          .aqua-mobile-tab.active {
            color: #67f7ff;
            background:
              radial-gradient(circle at center, rgba(45, 224, 255, 0.2), transparent 62%);
          }

          .aqua-mobile-tab.active::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 28%;
            right: 28%;
            height: 3px;
            border-radius: 999px;
            background: #2de0ff;
            box-shadow:
              0 0 10px rgba(45, 224, 255, 1),
              0 0 20px rgba(45, 224, 255, 0.65);
          }

          .aqua-mobile-tab.ban.active {
            color: #ffb0b0;
            background:
              radial-gradient(circle at center, rgba(255, 77, 77, 0.14), transparent 62%);
          }

          .aqua-mobile-tab.ban.active::after {
            background: #ff4d4d;
            box-shadow:
              0 0 10px rgba(255, 77, 77, 1),
              0 0 20px rgba(255, 77, 77, 0.65);
          }

          body {
            padding-bottom: 92px;
          }
        }
      `}</style>
    </>
  );
}