"use client";

import { useActionState, useMemo, useState } from "react";
import { saveOnboarding } from "@/app/(app)/actions";
import { callServerAction } from "@/lib/stale-action";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/form-state";
import { formatWeekday } from "@/lib/dates";
import { ALLERGENS } from "@/lib/meal-plan";
import { buildTargets, isActivityLevel, isDietStyle, isSex, type ActivityLevel, type DietStyle } from "@/lib/nutrition";

const initial: FormState = {};

const activities: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary — desk job, little exercise" },
  { value: "light", label: "Light — exercise 1 to 3 days a week" },
  { value: "moderate", label: "Moderate — exercise 3 to 5 days a week" },
  { value: "active", label: "Active — hard exercise 6 to 7 days a week" },
  { value: "very_active", label: "Very active — physical job or two-a-day training" },
];

export function OnboardingForm({
  today,
  defaults,
}: {
  today: string;
  defaults: {
    currentWeight: number;
    goalWeight: number;
    feet: number;
    inches: number;
    age: string;
    sex: string;
    activity: ActivityLevel;
    diet: DietStyle;
    allergies: string[];
    dislikes: string;
  };
}) {
  const [state, action] = useActionState(
    (prev: FormState, formData: FormData) => callServerAction(() => saveOnboarding(prev, formData)),
    initial,
  );
  const [currentWeight, setCurrentWeight] = useState(String(defaults.currentWeight));
  const [goalWeight, setGoalWeight] = useState(String(defaults.goalWeight));
  const [feet, setFeet] = useState(String(defaults.feet));
  const [inches, setInches] = useState(String(defaults.inches));
  const [age, setAge] = useState(defaults.age);
  const [sex, setSex] = useState(defaults.sex);
  const [activity, setActivity] = useState(defaults.activity);
  const [diet, setDiet] = useState(defaults.diet);

  const preview = useMemo(() => {
    const current = Number(currentWeight);
    const goal = Number(goalWeight);
    const height = Number(feet) * 12 + Number(inches);
    const years = Number(age);
    if (!isSex(sex) || !isActivityLevel(activity) || !isDietStyle(diet)) return null;
    if (![current, goal, height, years].every((value) => Number.isFinite(value))) return null;
    if (goal >= current || years < 18 || height < 48 || height > 84) return null;
    return buildTargets({
      sex,
      age: years,
      heightIn: height,
      currentWeightLb: current,
      goalWeightLb: goal,
      activity,
      diet,
      from: today,
    });
  }, [activity, age, currentWeight, diet, feet, goalWeight, inches, sex, today]);

  return (
    <form action={action} className="grid gap-5">
      <div className="rounded-3xl border border-clay/30 bg-white px-4 py-3 text-sm leading-6">
        Not medical advice. These numbers are a planning estimate. Consult your doctor before starting a keto or
        low-carb diet, especially if you take medication or have a medical condition.
        <label className="mt-3 flex min-h-11 items-center gap-2 font-medium">
          <input type="checkbox" name="disclaimer" value="yes" required />
          I understand this is not medical advice.
        </label>
      </div>
      {state.error ? (
        <p role="alert" className="rounded-2xl bg-white px-3 py-2 text-sm text-clay">
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current weight (lb)" id="currentWeight">
          <input
            id="currentWeight"
            name="currentWeight"
            type="number"
            min={70}
            max={700}
            step="0.1"
            required
            value={currentWeight}
            onChange={(event) => setCurrentWeight(event.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Goal weight (lb)" id="goalWeight">
          <input
            id="goalWeight"
            name="goalWeight"
            type="number"
            min={70}
            max={700}
            step="0.1"
            required
            value={goalWeight}
            onChange={(event) => setGoalWeight(event.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Height" id="feet">
          <span className="grid grid-cols-2 gap-2">
            <select id="feet" name="feet" value={feet} onChange={(event) => setFeet(event.target.value)} className={fieldClass}>
              {[4, 5, 6, 7].map((value) => (
                <option key={value} value={value}>
                  {value} ft
                </option>
              ))}
            </select>
            <select aria-label="Inches" name="inches" value={inches} onChange={(event) => setInches(event.target.value)} className={fieldClass}>
              {Array.from({ length: 12 }, (_, value) => (
                <option key={value} value={value}>
                  {value} in
                </option>
              ))}
            </select>
          </span>
        </Field>
        <Field label="Age" id="age">
          <input
            id="age"
            name="age"
            type="number"
            min={18}
            max={90}
            required
            value={age}
            onChange={(event) => setAge(event.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="Sex, for the calorie equation" id="sex">
          <select id="sex" name="sex" required value={sex} onChange={(event) => setSex(event.target.value)} className={fieldClass}>
            <option value="">Choose</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </Field>
        <Field label="Activity" id="activity">
          <select
            id="activity"
            name="activity"
            value={activity}
            onChange={(event) => setActivity(event.target.value as ActivityLevel)}
            className={fieldClass}
          >
            {activities.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Diet style</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="radio" name="diet" value="strict_keto" checked={diet === "strict_keto"} onChange={() => setDiet("strict_keto")} />
          Strict keto, about 20 g net carbs
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="radio" name="diet" value="low_carb" checked={diet === "low_carb"} onChange={() => setDiet("low_carb")} />
          Low-carb, about 30 g net carbs
        </label>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">Allergies</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALLERGENS.map((allergen) => (
            <label key={allergen} className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm capitalize">
              <input type="checkbox" name="allergies" value={allergen} defaultChecked={defaults.allergies.includes(allergen)} />
              {allergen}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Dislikes, separated by commas" id="dislikes">
        <textarea
          id="dislikes"
          name="dislikes"
          defaultValue={defaults.dislikes}
          maxLength={300}
          rows={3}
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-base"
          placeholder="mushrooms, salmon"
        />
      </Field>
      {preview ? (
        <aside className="rounded-3xl bg-moss-deep p-5 text-white">
          <p className="text-sm text-white/80">Daily target</p>
          <p className="font-display text-4xl">{preview.calories.toLocaleString()} kcal</p>
          <p className="mt-2 text-sm leading-6 text-white/80">
            {preview.proteinG} g protein, {preview.fatG} g fat, {preview.netCarbG} g net carbs.
            {preview.weeklyLossLb > 0
              ? ` About ${preview.weeklyLossLb} lb per week.`
              : " The calorie floor leaves no deficit at this weight."}
          </p>
          <p className="mt-2 text-sm">
            {preview.goalDate ? `Estimated goal date ${formatWeekday(preview.goalDate)}.` : "No estimated goal date yet."}
          </p>
        </aside>
      ) : (
        <p className="text-sm text-muted">Add age and sex to see the calorie estimate.</p>
      )}
      <SubmitButton pendingLabel="Saving…">Save and continue</SubmitButton>
    </form>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium" htmlFor={id}>
      {label}
      {children}
    </label>
  );
}

const fieldClass = "min-h-11 w-full rounded-xl border border-line bg-white px-3 text-base";
