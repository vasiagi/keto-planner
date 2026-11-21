import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatLb, mealLabel } from "@/lib/format";
import { fetchDashboard, sumRound } from "@/lib/queries";
import { getToday } from "@/lib/today";

export const metadata = { title: "Today" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading today…</p>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  await connection();
  const { supabase, userId } = await requireUser();
  const today = await getToday();
  const data = await fetchDashboard(supabase, userId, today);
  if (!data) redirect("/onboarding");
  const { profile, totals } = data;
  if (
    !profile.onboardedAt ||
    profile.calories == null ||
    profile.netCarbG == null ||
    profile.proteinG == null ||
    profile.fatG == null
  ) {
    redirect("/onboarding");
  }
  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-saffron">Today</p>
          <h1 className="font-display text-4xl">Your kitchen, so far</h1>
        </div>
        <Link href="/onboarding" className="text-sm font-semibold text-moss">
          Edit targets
        </Link>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Logged calories" value={`${sumRound(totals.calories)} / ${profile.calories}`} />
        <Stat label="Net carbs" value={`${sumRound(totals.netCarbsG)} / ${profile.netCarbG} g`} />
        <Stat label="Logging streak" value={`${data.streak} day${data.streak === 1 ? "" : "s"}`} />
        <Stat label="Lost so far" value={`${formatLb(data.lost)} lb`} detail={data.toGo == null ? undefined : `${formatLb(data.toGo)} lb to go`} />
      </section>
      <Meter label="Net carbs" value={totals.netCarbsG} max={profile.netCarbG} />
      <section className="grid gap-3 md:grid-cols-2">
        <article className="rounded-3xl border border-line bg-paper p-4">
          <h2 className="font-display text-2xl">Planned today</h2>
          {data.planned.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No plan for this week yet.{" "}
              <Link href="/plan" className="font-semibold text-moss">
                Build one
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {data.planned.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span>
                    <span className="text-muted">{mealLabel(item.mealType)}. </span>
                    {item.recipe.name}
                  </span>
                  <span className="shrink-0 tabular-nums">{item.recipe.netCarbsG} g net</span>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="rounded-3xl border border-line bg-paper p-4">
          <h2 className="font-display text-2xl">Also today</h2>
          <p className="mt-2 text-sm leading-6">
            Water logged: {data.waterOz} oz. Protein {sumRound(totals.proteinG)} / {profile.proteinG} g. Fat{" "}
            {sumRound(totals.fatG)} / {profile.fatG} g.
          </p>
          <p className="mt-3 text-sm">
            <Link href="/log" className="font-semibold text-moss">
              Open the daily log
            </Link>
            {" · "}
            <Link href="/tips" className="font-semibold text-moss">
              Keto-flu notes
            </Link>
          </p>
        </article>
      </section>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="rounded-3xl border border-line bg-paper p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
      {detail ? <p className="text-sm text-muted">{detail}</p> : null}
    </article>
  );
}

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const over = value > max;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className={over ? "font-semibold text-clay" : ""}>
          {sumRound(value)} / {max} g
        </span>
      </div>
      <div className="h-2 rounded-full bg-line" role="meter" aria-label={label} aria-valuenow={sumRound(value)} aria-valuemax={max} aria-valuemin={0}>
        <div className={`h-2 rounded-full ${over ? "bg-clay" : "bg-leaf"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
