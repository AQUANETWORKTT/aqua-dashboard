"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/manager";

  return (
    <div className="manager-shell">
      {!isLoginPage && (
        <header className="manager-nav">
          <div className="manager-nav-inner">
            <div className="manager-nav-brand">
              <div className="manager-nav-logo-slot">
                <Image
                  src="/manager-logo.png"
                  alt="Management"
                  width={44}
                  height={44}
                  className="manager-nav-logo-image"
                />
              </div>

              <div className="manager-nav-text">
                <small>Management</small>
              </div>
            </div>

            <nav className="manager-nav-links">
              <Link href="/manager/leaderboard" className="manager-link">
                Leaderboard
              </Link>
              <Link href="/manager/admin" className="manager-link">
                Admin
              </Link>
            </nav>
          </div>
        </header>
      )}

      <main className="manager-wrapper">{children}</main>
    </div>
  );
}