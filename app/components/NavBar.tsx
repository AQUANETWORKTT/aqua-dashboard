"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function NavBar() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);

  // Hide navbar on home + login
  const hideOn = ["/login", "/"];
  if (hideOn.includes(pathname)) return null;

  // Read username from cookie so dashboard link works
  useEffect(() => {
    const match = document.cookie.match(/aqua_user=([^;]+)/);
    if (match) setUsername(match[1]);
  }, []);

  return (
    <nav className="aqua-nav">
      <div className="aqua-nav-inner">

        {/* Logo */}
        <Link href="/" className="aqua-nav-logo-text">
          AQUA 🐬
        </Link>

        {/* Links */}
        <div className="aqua-nav-links">
          {username && (
            <Link href={`/dashboard/${username}`} className="aqua-link">
              Dashboard
            </Link>
          )}

          <Link href="/leaderboard" className="aqua-link">
            Leaderboard
          </Link>
        </div>

      </div>
    </nav>
  );
}
