"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function NavBar() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);

  // Always run hooks – cannot be inside condition!
  useEffect(() => {
    const match = document.cookie.match(/aqua_user=([^;]+)/);
    if (match) {
      setUsername(match[1]);
    }
  }, []);

  // Now we can safely hide the navbar
  const hideOn = ["/login", "/"];
  if (hideOn.includes(pathname)) return null;

  return (
    <nav className="aqua-nav">
      <div className="aqua-nav-inner">

        {/* Logo */}
        <Link href="/" className="aqua-nav-logo-text">
          AQUA 🐬
        </Link>

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
