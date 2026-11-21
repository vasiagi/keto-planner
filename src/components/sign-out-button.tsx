"use client";

import { signOut } from "@/app/auth/actions";
import { bindServerAction } from "@/lib/stale-action";

const signOutAction = bindServerAction(signOut);

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="min-h-11 rounded-full px-3 text-sm font-semibold text-moss">
        Sign out
      </button>
    </form>
  );
}
