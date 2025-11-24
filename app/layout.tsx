import "./globals.css";
import { cookies } from "next/headers";
import NavBar from "./components/NavBar";

export const metadata = {
  title: "Aqua Dashboard",
  description: "Creator stats dashboard",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {

  const cookieStore = await cookies();
  const aquaCookie = cookieStore.get("aqua_user");
  const loggedInUser = aquaCookie?.value ?? null;

  return (
    <html lang="en">
      <body className="app-body">

        {/* CLIENT NAVBAR LOGIC */}
        <NavBar user={loggedInUser} />

        {children}
      </body>
    </html>
  );
}
