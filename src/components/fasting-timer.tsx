"use client";

import { useEffect, useState } from "react";
import { endFast, startFast } from "@/app/(app)/actions";
import { SubmitButton } from "@/components/submit-button";
import { bindServerAction } from "@/lib/stale-action";

const stopFast = bindServerAction(endFast);
const beginFast = bindServerAction(startFast);

export function FastingTimer({
  date,
  startedAt,
  endedAt,
  targetHours,
}: {
  date: string;
  startedAt: string | null;
  endedAt: string | null;
  targetHours: number | null;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const start = startedAt ? Date.parse(startedAt) : Number.NaN;
  const end = endedAt ? Date.parse(endedAt) : null;
  const running = Number.isFinite(start) && end == null;
  const elapsed = Number.isFinite(start) && now != null ? (end ?? now) - start : 0;
  const targetMs = (targetHours ?? 16) * 3_600_000;
  const remaining = Math.max(0, targetMs - elapsed);

  return (
    <section className="rounded-3xl border border-line bg-paper p-4">
      <h2 className="font-display text-2xl">Fasting timer</h2>
      <p className="mt-1 text-sm text-muted">A simple 16, 18, or 20 hour timer. Stop if you feel unwell.</p>
      {Number.isFinite(start) ? (
        <p className="mt-4 font-display text-4xl tabular-nums" aria-live="polite">
          {running ? formatDuration(remaining) : formatDuration(elapsed)}
          <span className="ml-2 font-sans text-sm font-medium text-muted">
            {running ? "left" : "completed"}
          </span>
        </p>
      ) : (
        <p className="mt-4 text-sm">No fast logged for this day.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {running ? (
          <form action={stopFast}>
            <input type="hidden" name="date" value={date} />
            <SubmitButton variant="secondary" pendingLabel="Stopping…">
              End fast
            </SubmitButton>
          </form>
        ) : (
          [16, 18, 20].map((hours) => (
            <form key={hours} action={beginFast}>
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="hours" value={hours} />
              <SubmitButton variant="secondary" pendingLabel="Starting…">
                Start {hours}h
              </SubmitButton>
            </form>
          ))
        )}
      </div>
    </section>
  );
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}
