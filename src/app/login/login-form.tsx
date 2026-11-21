"use client";

import { useActionState } from "react";
import { signIn } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/form-state";

const initial: FormState = {};

export function LoginForm({ confirmationFailed }: { confirmationFailed: boolean }) {
  const [state, action] = useActionState(signIn, initial);
  return (
    <form action={action} className="grid gap-4">
      {confirmationFailed ? (
        <p role="alert" className="rounded-2xl bg-white px-3 py-2 text-sm text-clay">
          That confirmation link is invalid or expired. Sign in if you already confirmed, or create the account again.
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-white px-3 py-2 text-sm text-clay">
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
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}

const fieldClass = "min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base";
