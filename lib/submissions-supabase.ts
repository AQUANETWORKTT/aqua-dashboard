import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY;

if (!url) {
  throw new Error("Missing NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL");
}

if (!key) {
  throw new Error("Missing NEXT_PUBLIC_SUBMISSIONS_SUPABASE_ANON_KEY");
}

export const submissionsSupabase = createClient(url, key);