// app/layout.tsx

import "./globals.css";
import NavBar from "./components/NavBar";

// Old metadata.viewport is not supported anymore.
// Keep only title + description here.
export const metadata = {
  title: "Aqua Dashboard",
  description: "Creator stats dashboard",
};

// NEW Next.js 15 viewport format:
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-x-hidden">
        {/* Navbar auto-hides on login */}
        <NavBar />

        {/* Main content wrapper (mobile friendly) */}
        <main className="max-w-[900px] mx-auto w-full px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
