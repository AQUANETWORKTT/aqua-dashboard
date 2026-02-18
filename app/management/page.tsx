// app/management/page.tsx

import { redirect } from "next/navigation";

export default function ManagementIndexPage() {
  redirect("/management/admin");
}
