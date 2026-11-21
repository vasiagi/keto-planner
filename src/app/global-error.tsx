"use client";

import { useRecoverStaleAction } from "@/lib/stale-action";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const stale = useRecoverStaleAction(error);
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f3ecdf", color: "#1c241f", fontFamily: "Georgia, serif" }}>
        <main style={{ maxWidth: "32rem", margin: "0 auto", padding: "4rem 1.25rem" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 600 }}>
            {stale ? "The app was updated, reloading..." : "Something went wrong"}
          </h1>
          {stale ? null : <p style={{ marginTop: "0.75rem" }}>{error.message}</p>}
          {stale ? null : (
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "1.5rem",
                minHeight: "2.75rem",
                border: 0,
                borderRadius: "999px",
                background: "#1f5c45",
                color: "#fff",
                padding: "0 1rem",
                fontWeight: 600,
              }}
            >
              Try again
            </button>
          )}
        </main>
      </body>
    </html>
  );
}
