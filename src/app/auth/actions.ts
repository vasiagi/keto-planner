"use server";

import { redirect } from "next/navigation";
import { friendlyAuthError, type AuthErrorLike } from "@/lib/auth-errors";
import type { FormState } from "@/lib/form-state";
import { logError } from "@/lib/log-error";
import { resolveSiteOrigin } from "@/lib/site-origin";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  if (!email) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      await recordAuthError("login", "/login", email, error);
      return { error: friendlyAuthError(error) };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign in failed.";
    await logError({ source: "login", message, path: "/login", email });
    return { error: message };
  }
  redirect("/dashboard");
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!email) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "That password is too weak. Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };

  const origin = resolveSiteOrigin(String(formData.get("origin") ?? ""));
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: origin ? { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` } : undefined,
    });
    if (error) {
      await recordAuthError("signup", "/signup", email, error);
      return { error: friendlyAuthError(error) };
    }
    if (!data.session) return { confirmEmail: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign up failed.";
    await logError({ source: "signup", message, path: "/signup", email });
    return { error: message };
  }
  redirect("/onboarding");
}

export async function signOut() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) await recordAuthError("signout", "/", null, error);
  } catch (err) {
    await logError({
      source: "signout",
      message: err instanceof Error ? err.message : "Sign out failed.",
      path: "/",
    });
  }
  redirect("/");
}

async function recordAuthError(source: string, path: string, email: string | null, error: AuthErrorLike) {
  await logError({
    source,
    message: error.message || "Auth request failed.",
    code: error.code ?? null,
    path,
    email,
    metadata: { status: error.status ?? null },
  });
}

function readEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
