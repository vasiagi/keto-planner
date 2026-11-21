import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-5 py-8">
      <header className="flex items-center justify-between">
        <p className="font-display text-2xl text-moss-deep">Cedar</p>
        <div className="flex gap-2">
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center rounded-full bg-moss px-4 text-sm font-semibold text-white"
          >
            Start
          </Link>
        </div>
      </header>
      <main className="grid flex-1 items-end gap-10 py-16 md:grid-cols-[1.3fr_0.7fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-saffron">Keto, planned weekly</p>
          <h1 className="mt-3 max-w-xl font-display text-5xl leading-tight text-moss-deep md:text-6xl">
            From 250 lb toward 200, one plate at a time.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            Cedar builds a breakfast, lunch, dinner, and snack for each day from a keto recipe catalog, then turns
            that week into a grocery list you can check off.
          </p>
          <Suspense fallback={null}>
            <SignedInLink />
          </Suspense>
        </div>
        <aside className="rounded-3xl border border-line bg-paper p-5">
          <p className="text-sm font-semibold text-moss">What you get</p>
          <ul className="mt-4 grid gap-3 text-sm leading-6">
            <li>Onboarding with a safe calorie deficit and a net-carb cap.</li>
            <li>A saved weekly plan with meal swaps.</li>
            <li>An aggregated grocery list.</li>
            <li>A daily log for meals, water, steps, and a fasting timer.</li>
            <li>A weight chart and a badge every 10 lb.</li>
          </ul>
        </aside>
      </main>
      <p className="pb-6 text-sm text-muted">Not medical advice. Talk with your doctor before changing how you eat.</p>
    </div>
  );
}

async function SignedInLink() {
  await connection();
  const { userId } = await getAuth();
  if (!userId) return null;
  redirect("/dashboard");
}
