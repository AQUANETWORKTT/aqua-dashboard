"use client";

import NavBar from "./NavBar";

export default function NavBarClient({ user }: { user: string | null }) {
  return <NavBar user={user} />;
}
