import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { logWeight } from "@/app/(app)/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { formatShort } from "@/lib/dates";
import { formatLb, readParam } from "@/lib/format";
import { lossBadges, poundsLost, poundsToGo } from "@/lib/nutrition";
import { fetchWeight } from "@/lib/queries";
import { getToday } from "@/lib/today";

export const metadata = { title: "Weight" };

export default function WeightPage({ searchParams }: { searchParams: Promise<{ notice?: string | string[] }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading weight…</p>}>
      <WeightContent searchParams={searchParams} />
    </Suspense>
  );
}

async function WeightContent({ searchParams }: { searchParams: Promise<{ notice?: string | string[] }> }) {
  await connection();
  const { supabase, userId } = await requireUser();
  const [data, today, params] = await Promise.all([fetchWeight(supabase, userId), getToday(), searchParams]);
  if (!data.profile?.onboardedAt || data.profile.goalWeightLb == null || data.profile.startWeightLb == null) {
    redirect("/onboarding");
  }
  const latest = data.weights.at(-1)?.weightLb ?? data.profile.startWeightLb;
  const lost = poundsLost(data.profile.startWeightLb, latest);
  const toGo = poundsToGo(latest, data.profile.goalWeightLb);
  const badges = lossBadges(data.profile.startWeightLb, latest, data.profile.goalWeightLb);
  const notice = readParam(params.notice);

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-saffron">Weight</p>
        <h1 className="font-display text-4xl">{formatLb(latest)} lb</h1>
        <p className="mt-1 text-sm text-muted">
          {formatLb(lost)} lb lost · {formatLb(toGo)} lb to {formatLb(data.profile.goalWeightLb)}
          {data.profile.goalDate ? ` · goal around ${formatShort(data.profile.goalDate)}` : ""}
        </p>
      </header>
      {notice ? (
        <p role="status" className="rounded-2xl bg-white px-3 py-2 text-sm text-clay">
          {notice}
        </p>
      ) : null}
      <WeightChart points={data.weights} goal={data.profile.goalWeightLb} />
      <form action={logWeight} className="flex flex-wrap items-end gap-2 rounded-3xl border border-line bg-paper p-4">
        <label className="grid gap-1 text-sm font-medium" htmlFor="weight-date">
          Date
          <input id="weight-date" name="date" type="date" defaultValue={today} required className="min-h-11 rounded-xl border border-line bg-white px-3 text-base" />
        </label>
        <label className="grid gap-1 text-sm font-medium" htmlFor="weight">
          Weight (lb)
          <input id="weight" name="weight" type="number" min={70} max={700} step="0.1" required className="min-h-11 w-32 rounded-xl border border-line bg-white px-3 text-base" />
        </label>
        <SubmitButton>Log weight</SubmitButton>
      </form>
      <section>
        <h2 className="font-display text-2xl">Every 10 lb</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <li
              key={badge.pounds}
              className={`rounded-full px-3 py-2 text-sm font-semibold ${badge.earned ? "bg-moss text-white" : "border border-line bg-white text-muted"}`}
            >
              {badge.pounds} lb {badge.earned ? "down" : "to go"}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-display text-2xl">History</h2>
        {data.weights.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No weigh-ins yet.</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Weight</th>
              </tr>
            </thead>
            <tbody>
              {[...data.weights].reverse().map((point) => (
                <tr key={point.loggedOn} className="border-t border-line">
                  <td className="py-2">{formatShort(point.loggedOn)}</td>
                  <td className="py-2 tabular-nums">{formatLb(point.weightLb)} lb</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function WeightChart({ points, goal }: { points: { loggedOn: string; weightLb: number }[]; goal: number }) {
  if (points.length === 0) return <p className="text-sm text-muted">Log a weight to draw the chart.</p>;
  const values = points.map((point) => point.weightLb).concat(goal);
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const width = 640;
  const height = 220;
  const pad = 24;
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : pad + (index * (width - pad * 2)) / (points.length - 1);
    const y = pad + ((max - point.weightLb) / (max - min)) * (height - pad * 2);
    return { x, y };
  });
  const goalY = pad + ((max - goal) / (max - min)) * (height - pad * 2);
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  return (
    <figure className="rounded-3xl border border-line bg-paper p-3">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weight trend toward the goal" className="h-56 w-full">
        <line x1={pad} x2={width - pad} y1={goalY} y2={goalY} stroke="#c98412" strokeDasharray="6 6" />
        <path d={path} fill="none" stroke="#1f5c45" strokeWidth="3" />
        {coords.map((point) => (
          <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="4" fill="#1f5c45" />
        ))}
      </svg>
      <figcaption className="px-2 text-sm text-muted">Green is your log. The dashed line is the goal weight.</figcaption>
    </figure>
  );
}
