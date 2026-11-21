"use client";

import { useActionState } from "react";
import { signUp } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/form-state";
import { resolveSiteOrigin } from "@/lib/site-origin";
import { callServerAction } from "@/lib/stale-action";

const initial: FormState = {};

export function SignupForm() {
  const [state, action] = useActionState(submitSignup, initial);
  if (state.confirmEmail) {
    return (
      <div className="rounded-3xl border border-moss/30 bg-paper p-5" role="status">
        <h2 className="font-display text-2xl">Check your email</h2>
        <p className="mt-2 text-sm leading-6">Check your email to confirm your account.</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4">
      {state.error ? <AuthAlert>{state.error}</AuthAlert> : null}
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
      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}

async function submitSignup(prev: FormState, formData: FormData) {
  formData.set("origin", resolveSiteOrigin(window.location.origin) ?? window.location.origin);
  try {
    return await callServerAction(() => signUp(prev, formData));
  } catch (err) {
    return { error: err instanceof Error && err.message ? err.message : "Something went wrong. Please try again." };
  }
}

function AuthAlert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl border border-clay bg-white px-3 py-3 text-sm font-medium text-clay">
      {children}
    </p>
  );
}

const fieldClass = "min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base";
