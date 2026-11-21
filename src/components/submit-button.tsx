"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-moss text-white hover:bg-moss-deep",
    secondary: "border border-line bg-white text-foreground hover:border-moss",
    ghost: "text-moss hover:bg-white",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold disabled:opacity-60 ${styles}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
