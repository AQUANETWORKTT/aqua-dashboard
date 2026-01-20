import "./globals.css";
import { cookies } from "next/headers";
import NavBarClient from "./components/NavBarClient";
import { Poppins } from "next/font/google";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Aqua Agency",
  description: "Creator Network Dashboard",
  manifest: "/manifest.json",
  themeColor: "#22d3ee",
  appleWebApp: {
    capable: true,
    title: "Aqua Agency",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const aquaCookie = cookieStore.get("aqua_user");
  const loggedInUser = aquaCookie?.value ?? null;

  return (
    <html lang="en" className={poppins.variable}>
      <head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22d3ee" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>

      <body className="app-body">
        <NavBarClient user={loggedInUser} />

       

        {children}
      </body>
    </html>
  );
}
