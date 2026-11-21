import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { logError } from "@/lib/log-error";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES = new Set<EmailOtpType>(["signup", "email", "invite", "magiclink", "recovery", "email_change"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    await logError({
      source: "auth-callback",
      message: error.message,
      code: error.code,
      path: "/auth/callback",
      metadata: { status: error.status ?? null },
    });
    return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
  }

  if (tokenHash && type && isEmailOtp(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    await logError({
      source: "auth-callback",
      message: error.message,
      code: error.code,
      path: "/auth/callback",
      metadata: { status: error.status ?? null },
    });
    return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
  }

  await logError({
    source: "auth-callback",
    message: "Confirmation link did not include a code.",
    path: "/auth/callback",
  });
  return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
}

function safeNext(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/onboarding";
  return next;
}

function isEmailOtp(type: string): type is EmailOtpType {
  return OTP_TYPES.has(type as EmailOtpType);
}
