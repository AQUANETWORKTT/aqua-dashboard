import "./globals.css";
import Link from "next/link";
import { cookies } from "next/headers";

export const metadata = {
  title: "Aqua Dashboard",
  description: "Creator stats dashboard",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // MUST be awaited in Next.js 15+
  const cookieStore = await cookies();
  const aquaCookie = cookieStore.get("aqua_user");
  const loggedInUser = aquaCookie?.value ?? null;

  const showNavbar = !!loggedInUser;

  return (
    <html lang="en">
      <body className="app-body">

        {/* NAVBAR (only when logged in) */}
        {showNavbar && (
          <nav className="aqua-nav">
            <div className="aqua-nav-inner">

              {/* Glowing Text Logo */}
              <Link href="/" className="aqua-nav-logo-text">
                AQUA
              </Link>

              {/* Right side links */}
              <div className="aqua-nav-links">
                <Link href="/leaderboard" className="aqua-link">
                  Leaderboard
                </Link>

                <Link href="/" className="aqua-link">
                  Home
                </Link>

                <Link href={`/dashboard/${loggedInUser}`} className="aqua-link">
                  Dashboard
                </Link>
              </div>

            </div>
          </nav>
        )}

        {/* Page content */}
        {children}

      </body>
    </html>
  );
}
