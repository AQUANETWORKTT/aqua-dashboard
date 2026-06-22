import { cookies } from "next/headers";
import BattlesClient from "./BattlesClient";

export const dynamic = "force-dynamic";

export default async function BattlesPage() {
  const cookieStore = await cookies();
  const loggedInUser = cookieStore.get("aqua_user")?.value ?? null;

  return <BattlesClient user={loggedInUser} />;
}
