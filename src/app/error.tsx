"use client";

import { useRecoverStaleAction } from "@/lib/stale-action";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const stale = useRecoverStaleAction(error);
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-5">
      <h1 className="font-display text-4xl">{stale ? "The app was updated, reloading..." : "Something went wrong"}</h1>
      {stale ? null : <p className="mt-3 text-sm leading-6 text-muted">{error.message}</p>}
      {stale ? null : (
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 w-fit items-center rounded-full bg-moss px-4 text-sm font-semibold text-white"
        >
          Try again
        </button>
      )}
    </main>
  );
}
