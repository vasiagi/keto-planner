import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { setMealEaten, setSteps, setWater } from "@/app/(app)/actions";
import { ActionForm } from "@/components/action-form";
import { FastingTimer } from "@/components/fasting-timer";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { addDays, formatWeekday, isIsoDate } from "@/lib/dates";
import { mealLabel, readParam } from "@/lib/format";
import { MEAL_TYPES } from "@/lib/meal-plan";
import { fetchLog, sumMacros, sumRound } from "@/lib/queries";
import { getToday } from "@/lib/today";

export const metadata = { title: "Daily log" };

export default function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[]; notice?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading the log…</p>}>
      <LogContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LogContent({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[]; notice?: string | string[] }>;
}) {
  await connection();
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const today = await getToday();
  const requested = readParam(params.date);
  const date = isIsoDate(requested) ? requested : today;
  const data = await fetchLog(supabase, userId, date);
  if (!data.profile?.onboardedAt || data.profile.netCarbG == null) redirect("/onboarding");
  const eatenMeals = data.eaten.filter((meal) => meal.eaten);
  const totals = sumMacros(eatenMeals.map((meal) => meal.recipe));
  const over = totals.netCarbsG > data.profile.netCarbG;
  const notice = readParam(params.notice);
  const water = data.daily?.waterOz ?? 0;

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-saffron">Log</p>
          <h1 className="font-display text-4xl">{formatWeekday(date)}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/log?date=${addDays(date, -1)}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold">
            Previous
          </Link>
          <Link href={`/log?date=${addDays(date, 1)}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold">
            Next
          </Link>
        </div>
      </header>
      {notice ? (
        <p role="status" className="rounded-2xl bg-white px-3 py-2 text-sm text-clay">
          {notice}
        </p>
      ) : null}
      <section className="rounded-3xl bg-moss-deep p-5 text-white">
        <p className="text-sm text-white/75">Net carbs eaten</p>
        <p className="font-display text-4xl">
          {sumRound(totals.netCarbsG)} <span className="text-2xl">/ {data.profile.netCarbG} g</span>
        </p>
        <p className={`mt-1 text-sm ${over ? "text-saffron" : "text-white/75"}`}>
          {sumRound(totals.calories)} kcal · {sumRound(totals.proteinG)} g protein · {sumRound(totals.fatG)} g fat
        </p>
      </section>
      <section className="grid gap-2">
        <h2 className="font-display text-2xl">Meals</h2>
        {!data.hasPlan ? (
          <p className="text-sm text-muted">
            This week has no plan yet.{" "}
            <Link href="/plan" className="font-semibold text-moss">
              Build the week
            </Link>{" "}
            to log those meals.
          </p>
        ) : (
          MEAL_TYPES.map((mealType) => {
            const planned = data.planned.find((item) => item.mealType === mealType);
            if (!planned) return null;
            const logged = data.eaten.find((meal) => meal.mealType === mealType);
            const recipe = logged?.recipe ?? planned.recipe;
            const eaten = logged?.eaten ?? false;
            return (
              <ActionForm key={mealType} action={setMealEaten} className="rounded-2xl border border-line bg-paper p-3">
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="mealType" value={mealType} />
                <input type="hidden" name="recipeId" value={recipe.id} />
                <input type="hidden" name="eaten" value={eaten ? "0" : "1"} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{mealLabel(mealType)}</p>
                    <p className="font-semibold">{recipe.name}</p>
                    <p className="text-sm text-muted">{recipe.netCarbsG} g net carbs</p>
                  </div>
                  <button
                    type="submit"
                    aria-pressed={eaten}
                    className={`min-h-11 rounded-full px-4 text-sm font-semibold ${eaten ? "bg-moss text-white" : "border border-line bg-white"}`}
                  >
                    {eaten ? "Eaten" : "Mark eaten"}
                  </button>
                </div>
              </ActionForm>
            );
          })
        )}
      </section>
      <section className="rounded-3xl border border-line bg-paper p-4">
        <h2 className="font-display text-2xl">Water</h2>
        <p className="mt-1 text-sm text-muted">{water} oz logged. A common target is about 100 oz.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionForm action={setWater}>
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="water" value={Math.max(0, water - 8)} />
            <SubmitButton variant="secondary">Minus 8 oz</SubmitButton>
          </ActionForm>
          <ActionForm action={setWater}>
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="water" value={Math.min(400, water + 8)} />
            <SubmitButton variant="secondary">Plus 8 oz</SubmitButton>
          </ActionForm>
        </div>
      </section>
      <section className="rounded-3xl border border-line bg-paper p-4">
        <h2 className="font-display text-2xl">Steps</h2>
        <ActionForm action={setSteps} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="date" value={date} />
          <label className="grid gap-1 text-sm font-medium" htmlFor="steps">
            Steps today
            <input
              id="steps"
              name="steps"
              type="number"
              min={0}
              max={200000}
              defaultValue={data.daily?.steps ?? ""}
              className="min-h-11 w-40 rounded-xl border border-line bg-white px-3 text-base"
            />
          </label>
          <SubmitButton variant="secondary">Save steps</SubmitButton>
        </ActionForm>
      </section>
      <FastingTimer
        date={date}
        startedAt={data.daily?.fastStartedAt ?? null}
        endedAt={data.daily?.fastEndedAt ?? null}
        targetHours={data.daily?.fastTargetHours ?? null}
      />
    </div>
  );
}
