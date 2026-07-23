import "./globals.css";
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
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export default async function RootLayout({
  children: _children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22d3ee" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>

      <body className="m-0 min-h-screen overflow-hidden bg-black">
        <main className="fixed inset-0 flex h-screen w-screen items-center justify-center bg-black">
          <img
            src="/aqua-merging-into-first-class.png"
            alt="Aqua is merging into First Class Agency"
            className="h-full w-full object-contain"
          />
        </main>
      </body>
    </html>
  );
}
