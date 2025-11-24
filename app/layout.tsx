import "./globals.css";
import NavBar from "./components/NavBar";

export const metadata = {
  title: "Aqua Dashboard",
  description: "Creator stats dashboard",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-x-hidden">
        <NavBar />
        <main className="max-w-[900px] mx-auto w-full px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
