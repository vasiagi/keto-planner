import "server-only";

import { createClient } from "@/lib/supabase/server";

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const SENSITIVE_KEY = /password|token|cookie|authorization|secret|otp|code|session|refresh/i;

export async function logError(input: {
  source: string;
  message: string;
  level?: LogLevel;
  code?: string | null;
  path?: string | null;
  email?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("log_app_error", {
      p_source: input.source,
      p_message: input.message,
      p_level: input.level ?? "error",
      p_error_code: input.code ?? null,
      p_path: input.path ?? null,
      p_user_email: input.email ?? null,
      p_metadata: safeMetadata(input.metadata),
    });
    if (error) console.error("log_app_error failed", error.message);
  } catch (err) {
    console.error("log_app_error threw", err instanceof Error ? err.message : "unknown");
  }
}

function safeMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return {};
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY.test(key) || value === undefined) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      clean[key] = value;
    }
  }
  return clean;
}
