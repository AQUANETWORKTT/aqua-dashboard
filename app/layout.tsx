import "./globals.css";
import Link from "next/link";
import { cookies } from "next/headers";

export const metadata = {
  title: "Aqua Dashboard",
  description: "Creator stats dashboard",
  icons: {
    icon: "/favicon.png", // <-- make sure your icon file is in /public
  },
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

        {/* NAVBAR — dark, glowing, mobile-friendly */}
        {showNavbar && (
          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "28px",
              padding: "16px 0",
              background: "rgba(0, 0, 0, 0.55)",
              backdropFilter: "blur(12px)",
              position: "sticky",
              top: 0,
              zIndex: 999,
              borderBottom: "1px solid rgba(0, 255, 255, 0.25)",
              boxShadow: "0 0 14px rgba(0,255,255,0.22)",
            }}
          >
            <Link href="/leaderboard" className="aqua-link glow-link">
              Leaderboard
            </Link>

            <Link href="/" className="aqua-link glow-link">
              Home
            </Link>

            <Link href={`/dashboard/${loggedInUser}`} className="aqua-link glow-link">
              Dashboard
            </Link>
          </nav>
        )}

        {children}
      </body>
    </html>
  );
}
