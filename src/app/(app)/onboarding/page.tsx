import { Suspense } from "react";
import { connection } from "next/server";
import { OnboardingForm } from "@/app/(app)/onboarding/onboarding-form";
import { requireUser } from "@/lib/auth";
import { ensureProfile, fetchWeight } from "@/lib/queries";
import { getToday } from "@/lib/today";

export const metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading onboarding…</p>}>
      <OnboardingContent />
    </Suspense>
  );
}

async function OnboardingContent() {
  await connection();
  const { supabase, userId, email } = await requireUser();
  const [profile, today, weight] = await Promise.all([
    ensureProfile(supabase, userId, email),
    getToday(),
    fetchWeight(supabase, userId),
  ]);
  const height = profile.heightIn ?? 70;
  const feet = Math.min(7, Math.max(4, Math.floor(height / 12)));
  const inches = Math.min(11, Math.max(0, Math.round(height - feet * 12)));
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-saffron">Onboarding</p>
      <h1 className="mt-2 font-display text-4xl">Set the numbers Cedar will plan around.</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Current weight starts at 250 lb and the goal at 200 lb. Change either one. A later edit updates today weigh-in
        and the calorie target. The first saved weight stays the baseline for pounds lost. Calories use Mifflin-St
        Jeor, then a 1.5 lb per week deficit when a 1,200 or 1,500 kcal floor allows it.
      </p>
      <div className="mt-6">
        <OnboardingForm
          today={today}
          defaults={{
            currentWeight: weight.weights.at(-1)?.weightLb ?? profile.startWeightLb ?? 250,
            goalWeight: profile.goalWeightLb ?? 200,
            feet,
            inches,
            age: profile.age ? String(profile.age) : "",
            sex: profile.sex ?? "",
            activity: profile.activity ?? "moderate",
            diet: profile.diet ?? "strict_keto",
            allergies: profile.allergies,
            dislikes: profile.dislikes,
          }}
        />
      </div>
    </div>
  );
}
