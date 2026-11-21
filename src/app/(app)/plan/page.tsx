import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { generatePlan, swapMeal } from "@/app/(app)/actions";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { addDays, formatShort, isIsoDate, mondayOf, weekdayLabels } from "@/lib/dates";
import { requireUser } from "@/lib/auth";
import { mealLabel, readParam } from "@/lib/format";
import { MEAL_TYPES, recipeAllowed } from "@/lib/meal-plan";
import { fetchPlan } from "@/lib/queries";
import { getToday } from "@/lib/today";

export const metadata = { title: "Meal plan" };

export default function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[]; notice?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading the week…</p>}>
      <PlanContent searchParams={searchParams} />
    </Suspense>
  );
}

async function PlanContent({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[]; notice?: string | string[] }>;
}) {
  await connection();
  const params = await searchParams;
  const { supabase, userId } = await requireUser();
  const today = await getToday();
  const requested = readParam(params.week);
  const week = isIsoDate(requested) ? mondayOf(requested) : mondayOf(today);
  const data = await fetchPlan(supabase, userId, week);
  if (!data.profile?.onboardedAt) redirect("/onboarding");
  const notice = readParam(params.notice);
  const days = weekdayLabels(week);
  const allowed = (recipe: (typeof data.recipes)[number]) =>
    recipeAllowed(
      {
        id: recipe.id,
        name: recipe.name,
        meal_type: recipe.mealType,
        ingredients: recipe.ingredients,
        allergen_tags: recipe.allergenTags,
      },
      data.profile?.allergies ?? [],
      data.profile?.dislikes ?? "",
    );

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-saffron">Week</p>
          <h1 className="font-display text-4xl">
            {formatShort(week)} – {formatShort(addDays(week, 6))}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/plan?week=${addDays(week, -7)}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold">
            Previous
          </Link>
          <Link href={`/plan?week=${addDays(week, 7)}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold">
            Next
          </Link>
          <ActionForm action={generatePlan}>
            <input type="hidden" name="week" value={week} />
            <SubmitButton pendingLabel="Planning…">{data.plan ? "Regenerate" : "Build this week"}</SubmitButton>
          </ActionForm>
        </div>
      </header>
      {notice ? (
        <p role="status" className="rounded-2xl bg-white px-3 py-2 text-sm text-clay">
          {notice}
        </p>
      ) : null}
      {!data.plan ? (
        <p className="rounded-3xl border border-dashed border-line bg-paper p-6 text-sm leading-6">
          This week is empty. Build it from recipes that skip your allergies and dislikes. Each day gets breakfast,
          lunch, dinner, and a snack.
        </p>
      ) : (
        <div className="grid gap-4">
          {days.map((day) => (
            <section key={day.iso} className="rounded-3xl border border-line bg-paper p-4">
              <h2 className="font-display text-2xl">{day.label}</h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {MEAL_TYPES.map((mealType) => {
                  const item = data.plan?.items.find((entry) => entry.dayOffset === day.offset && entry.mealType === mealType);
                  if (!item) return null;
                  const options = data.recipes.filter(
                    (recipe) => recipe.mealType === mealType && (recipe.id === item.recipe.id || allowed(recipe)),
                  );
                  return (
                    <article key={item.id} className="rounded-2xl bg-background p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{mealLabel(mealType)}</p>
                      <h3 className="text-base font-semibold">{item.recipe.name}</h3>
                      <p className="mt-1 text-sm tabular-nums text-muted">
                        {item.recipe.netCarbsG} g net · {item.recipe.calories} kcal · {item.recipe.proteinG} p · {item.recipe.fatG} f
                      </p>
                      <p className="mt-2 text-sm leading-6">{item.recipe.instructions}</p>
                      <ActionForm action={swapMeal} className="mt-3 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="week" value={week} />
                        <label className="sr-only" htmlFor={`swap-${item.id}`}>
                          Swap {item.recipe.name}
                        </label>
                        <select id={`swap-${item.id}`} name="recipeId" defaultValue={item.recipe.id} className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-2 text-sm">
                          {options.map((recipe) => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name} ({recipe.netCarbsG} g)
                            </option>
                          ))}
                        </select>
                        <SubmitButton variant="secondary" pendingLabel="Swapping…">
                          Swap
                        </SubmitButton>
                      </ActionForm>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      <p className="text-sm">
        <Link href={`/groceries?week=${week}`} className="font-semibold text-moss">
          Open this week grocery list
        </Link>
      </p>
    </div>
  );
}
