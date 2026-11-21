export type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

const RATE_LIMIT = "Too many sign-up attempts right now, please try again in a few minutes";

export function friendlyAuthError(error: AuthErrorLike): string {
  const message = error.message?.trim() ?? "";
  const code = error.code ?? "";
  const rateLimited =
    error.status === 429 ||
    code === "over_email_send_rate_limit" ||
    /over_email_send_rate_limit/i.test(message) ||
    /over_email_send_rate_limit/i.test(code) ||
    /rate limit/i.test(message);

  if (rateLimited) return RATE_LIMIT;
  if (code === "weak_password" || /weak password|password should be at least|password is known to be weak/i.test(message)) {
    return "That password is too weak. Use at least 8 characters.";
  }
  if (
    code === "user_already_exists" ||
    /already registered|already been registered|user already exists/i.test(message)
  ) {
    return "That email already has an account. Sign in instead.";
  }
  if (
    code === "email_address_invalid" ||
    /invalid email|unable to validate email|email address is invalid/i.test(message)
  ) {
    return "Enter a valid email address.";
  }
  if (/email not confirmed|not confirmed/i.test(message)) {
    return "Confirm your email first, then sign in. The link is in your inbox.";
  }
  return message || "Something went wrong. Please try again.";
}
