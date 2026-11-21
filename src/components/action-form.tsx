"use client";

import { bindServerAction } from "@/lib/stale-action";

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form action={bindServerAction(action)} className={className}>
      {children}
    </form>
  );
}
