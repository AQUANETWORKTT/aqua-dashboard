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
  // MUST be awaited on Next 15+
  const cookieStore = await cookies();
  const aquaCookie = cookieStore.get("aqua_user");
  const loggedInUser = aquaCookie?.value ?? null;

  const showNavbar = !!loggedInUser;

  return (
    <html lang="en">
      <body className="app-body">

        {/* NAVBAR — small, clean, mobile friendly */}
        {showNavbar && (
          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              padding: "14px 0",
              background: "rgba(0, 0, 0, 0.45)",
              backdropFilter: "blur(10px)",
              position: "sticky",
              top: 0,
              zIndex: 999,
            }}
          >
            <Link href="/leaderboard" className="aqua-link">
              Leaderboard
            </Link>

            <Link href="/" className="aqua-link">
              Home
            </Link>

            <Link href={`/dashboard/${loggedInUser}`} className="aqua-link">
              Dashboard
            </Link>
          </nav>
        )}

        {children}
      </body>
    </html>
  );
}
