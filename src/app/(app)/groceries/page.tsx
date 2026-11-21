import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { toggleGrocery } from "@/app/(app)/actions";
import { ActionForm } from "@/components/action-form";
import { addDays, formatShort, isIsoDate, mondayOf } from "@/lib/dates";
import { requireUser } from "@/lib/auth";
import { formatQuantity, groceryKey } from "@/lib/grocery";
import { readParam } from "@/lib/format";
import { fetchGroceries } from "@/lib/queries";
import { getToday } from "@/lib/today";

export const metadata = { title: "Groceries" };

export default function GroceriesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[]; notice?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading the list…</p>}>
      <GroceriesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function GroceriesContent({
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
  const data = await fetchGroceries(supabase, userId, week);
  const notice = readParam(params.notice);
  const checkedCount = data.lines.filter((line) => data.checks.get(line.key)).length;

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-saffron">Groceries</p>
        <h1 className="font-display text-4xl">
          {formatShort(week)} – {formatShort(addDays(week, 6))}
        </h1>
        {data.plan ? (
          <p className="mt-1 text-sm text-muted">
            {checkedCount} of {data.lines.length} checked
          </p>
        ) : null}
      </header>
      {notice ? (
        <p role="status" className="rounded-2xl bg-white px-3 py-2 text-sm text-clay">
          {notice}
        </p>
      ) : null}
      {!data.plan ? (
        <p className="rounded-3xl border border-dashed border-line bg-paper p-6 text-sm">
          Build a meal plan first.{" "}
          <Link href={`/plan?week=${week}`} className="font-semibold text-moss">
            Go to the week
          </Link>
          .
        </p>
      ) : (
        <ul className="grid gap-2">
          {data.lines.map((line) => {
            const checked = data.checks.get(groceryKey(line.name, line.unit)) === true;
            return (
              <li key={line.key}>
                <ActionForm action={toggleGrocery}>
                  <input type="hidden" name="planId" value={data.plan?.id} />
                  <input type="hidden" name="week" value={week} />
                  <input type="hidden" name="itemKey" value={line.key} />
                  <input type="hidden" name="checked" value={checked ? "false" : "true"} />
                  <button
                    type="submit"
                    aria-pressed={checked}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-2xl border border-line bg-paper px-3 text-left text-sm ${checked ? "text-muted line-through" : ""}`}
                  >
                    <span className={`grid h-5 w-5 place-items-center rounded-md border ${checked ? "border-moss bg-moss text-white" : "border-line bg-white"}`} aria-hidden>
                      {checked ? "✓" : ""}
                    </span>
                    <span className="tabular-nums">
                      {formatQuantity(line.quantity)} {line.unit}
                    </span>
                    <span className="capitalize">{line.name}</span>
                  </button>
                </ActionForm>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
