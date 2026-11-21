"use client";

import { useActionState } from "react";
import { signIn } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/form-state";
import { callServerAction } from "@/lib/stale-action";

const initial: FormState = {};

export function LoginForm({ confirmationFailed }: { confirmationFailed: boolean }) {
  const [state, action] = useActionState(submitSignIn, initial);
  return (
    <form action={action} className="grid gap-4">
      {confirmationFailed ? (
        <p role="alert" className="rounded-2xl border border-clay bg-white px-3 py-3 text-sm font-medium text-clay">
          That confirmation link is invalid or expired. Sign in if you already confirmed, or create the account again.
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="rounded-2xl border border-clay bg-white px-3 py-3 text-sm font-medium text-clay">
          {state.error}
        </p>
      ) : null}
      <label className="grid gap-1 text-sm font-medium" htmlFor="email">
        Email
        <input id="email" name="email" type="email" autoComplete="email" required className={fieldClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium" htmlFor="password">
        Password
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
          className={fieldClass}
        />
      </label>
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

async function submitSignIn(prev: FormState, formData: FormData) {
  try {
    return await callServerAction(() => signIn(prev, formData));
  } catch (err) {
    return { error: err instanceof Error && err.message ? err.message : "Something went wrong. Please try again." };
  }
}

const fieldClass = "min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base";
