import "./globals.css";
import { cookies } from "next/headers";
import NavBarClient from "./components/NavBarClient";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});


export default async function RootLayout({ children }: { children: React.ReactNode }) {

  const cookieStore = await cookies();
  const aquaCookie = cookieStore.get("aqua_user");
  const loggedInUser = aquaCookie?.value ?? null;

  return (
    <html lang="en">
      <body className="app-body">
        <NavBarClient user={loggedInUser} />
        {children}
      </body>
    </html>
  );
}
