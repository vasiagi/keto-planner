import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getAuth() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  return { supabase, userId, email };
}

export async function requireUser() {
  const auth = await getAuth();
  if (!auth.userId) redirect("/login");
  return { supabase: auth.supabase, userId: auth.userId, email: auth.email };
}
