"use client";

import { useActionState } from "react";
import { signUp } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/form-state";

const initial: FormState = {};

export function SignupForm() {
  const [state, action] = useActionState(signUp, initial);
  if (state.confirmEmail) {
    return (
      <div className="rounded-3xl border border-line bg-paper p-5" role="status">
        <h2 className="font-display text-2xl">Check your email</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          We sent a confirmation link. Open it on this device and you will land in onboarding. Then come back and sign
          in if the link already confirmed the account.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4">
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
          autoComplete="new-password"
          minLength={8}
          required
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium" htmlFor="confirm">
        Confirm password
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={fieldClass}
        />
      </label>
      <SubmitButton pendingLabel="Creating…">Create account</SubmitButton>
    </form>
  );
}

const fieldClass = "min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base";
