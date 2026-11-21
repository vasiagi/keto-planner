"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { logError } from "@/lib/log-error";
import { isIsoDate, mondayOf } from "@/lib/dates";
import type { FormState } from "@/lib/form-state";
import { generateWeekPlan, isAllergen, isMealType, recipeAllowed } from "@/lib/meal-plan";
import { buildTargets, isActivityLevel, isDietStyle, isSex } from "@/lib/nutrition";
import { ensureProfile, getProfile, listRecipes } from "@/lib/queries";
import { getToday } from "@/lib/today";

export async function saveOnboarding(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, userId, email } = await requireUser();
  const today = await getToday();
  const currentWeight = readNumber(formData, "currentWeight");
  const goalWeight = readNumber(formData, "goalWeight");
  const feet = readNumber(formData, "feet");
  const inches = readNumber(formData, "inches");
  const age = readNumber(formData, "age");
  const sex = String(formData.get("sex") ?? "");
  const activity = String(formData.get("activity") ?? "");
  const diet = String(formData.get("diet") ?? "");
  const dislikes = String(formData.get("dislikes") ?? "").trim().slice(0, 300);
  const allergies = formData
    .getAll("allergies")
    .map((value) => String(value))
    .filter(isAllergen);
  const heightIn = feet != null && inches != null ? feet * 12 + inches : null;

  if (formData.get("disclaimer") !== "yes") {
    return { error: "Confirm that you understand this is not medical advice." };
  }
  if (currentWeight == null || currentWeight < 70 || currentWeight > 700) {
    return { error: "Enter a current weight between 70 and 700 lb." };
  }
  if (goalWeight == null || goalWeight < 70 || goalWeight > 700) {
    return { error: "Enter a goal weight between 70 and 700 lb." };
  }
  if (goalWeight >= currentWeight) {
    return { error: "Goal weight needs to be below your current weight." };
  }
  if (heightIn == null || heightIn < 48 || heightIn > 84 || inches == null || inches < 0 || inches > 11) {
    return { error: "Enter a height between 4 ft 0 in and 7 ft 0 in." };
  }
  if (age == null || age < 18 || age > 90) return { error: "Enter an age between 18 and 90." };
  if (!isSex(sex) || !isActivityLevel(activity) || !isDietStyle(diet)) {
    return { error: "Choose sex, activity, and diet style." };
  }

  const targets = buildTargets({
    sex,
    age,
    heightIn,
    currentWeightLb: currentWeight,
    goalWeightLb: goalWeight,
    activity,
    diet,
    from: today,
  });
  const profile = await ensureProfile(supabase, userId, email);
  const { error } = await supabase
    .from("profiles")
    .update({
      email,
      start_weight_lb: profile.startWeightLb ?? currentWeight,
      goal_weight_lb: goalWeight,
      height_in: heightIn,
      age,
      sex,
      activity_level: activity,
      diet_style: diet,
      allergies,
      dislikes,
      bmr_kcal: targets.bmr,
      tdee_kcal: targets.tdee,
      daily_calories: targets.calories,
      protein_g: targets.proteinG,
      fat_g: targets.fatG,
      net_carb_cap_g: targets.netCarbG,
      weekly_loss_lb: targets.weeklyLossLb,
      goal_date: targets.goalDate,
      onboarded_at: profile.onboardedAt ?? new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) {
    await logError({ source: "onboarding", message: error.message, code: error.code, path: "/onboarding", email });
    return { error: "Could not save your profile." };
  }

  const { error: weightError } = await supabase.from("weight_logs").upsert(
    { logged_on: today, weight_lb: currentWeight },
    { onConflict: "user_id,logged_on" },
  );
  if (weightError) {
    await logError({
      source: "onboarding",
      message: weightError.message,
      code: weightError.code,
      path: "/onboarding",
      email,
    });
    return { error: "Profile saved, but the starting weight did not log. Add it on the weight page." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  redirect("/dashboard");
}

export async function generatePlan(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const today = await getToday();
  const requested = String(formData.get("week") ?? "");
  const week = isIsoDate(requested) ? mondayOf(requested) : mondayOf(today);
  const profile = await ensureProfile(supabase, userId, null);
  if (!profile?.onboardedAt) redirect("/onboarding");
  const recipes = await listRecipes(supabase);
  const plan = generateWeekPlan(
    recipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      meal_type: recipe.mealType,
      ingredients: recipe.ingredients,
      allergen_tags: recipe.allergenTags,
    })),
    { allergies: profile.allergies, dislikes: profile.dislikes },
  );
  if ("error" in plan) redirect(`/plan?week=${week}&notice=${encodeURIComponent(plan.error)}`);

  const { data: existing, error: existingError } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start", week)
    .maybeSingle();
  if (existingError) await fail("meal-plan", existingError, "/plan", notice(week, "Could not read the current plan."));

  let planId = asId(existing?.id);
  if (planId == null) {
    const { data, error } = await supabase.from("meal_plans").insert({ week_start: week }).select("id").single();
    if (error) await fail("meal-plan", error, "/plan", notice(week, "Could not create the plan."));
    planId = asId(data?.id);
  } else {
    const { error } = await supabase.from("meal_plan_items").delete().eq("meal_plan_id", planId);
    if (error) await fail("meal-plan", error, "/plan", notice(week, "Could not replace the current plan."));
  }
  if (planId == null) redirect(notice(week, "Could not create the plan."));

  const { error } = await supabase.from("meal_plan_items").insert(
    plan.items.map((item) => ({
      meal_plan_id: planId,
      day_offset: item.dayOffset,
      meal_type: item.mealType,
      recipe_id: item.recipeId,
    })),
  );
  if (error) await fail("meal-plan", error, "/plan", notice(week, "Could not save the meals."));
  revalidatePath("/plan");
  revalidatePath("/groceries");
  revalidatePath("/log");
  revalidatePath("/dashboard");
  redirect(`/plan?week=${week}`);
}

export async function swapMeal(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const itemId = asId(formData.get("itemId"));
  const recipeId = asId(formData.get("recipeId"));
  const week = String(formData.get("week") ?? "");
  if (itemId == null || recipeId == null || !isIsoDate(week)) redirect("/plan");

  const profile = await getProfile(supabase, userId);
  if (!profile) redirect("/onboarding");
  const { data: item, error: itemError } = await supabase
    .from("meal_plan_items")
    .select("id, meal_type")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (itemError) await fail("meal-plan", itemError, "/plan", notice(week, "That meal is not on your plan."));
  if (!item) redirect(notice(week, "That meal is not on your plan."));

  const recipes = await listRecipes(supabase);
  const recipe = recipes.find((entry) => entry.id === recipeId);
  const mealType = typeof item.meal_type === "string" ? item.meal_type : "";
  if (!recipe || !isMealType(mealType) || recipe.mealType !== mealType) {
    redirect(notice(week, "Choose another recipe of the same meal type."));
  }
  if (
    !recipeAllowed(
      {
        id: recipe.id,
        name: recipe.name,
        meal_type: recipe.mealType,
        ingredients: recipe.ingredients,
        allergen_tags: recipe.allergenTags,
      },
      profile.allergies,
      profile.dislikes,
    )
  ) {
    redirect(notice(week, "That recipe conflicts with your allergies or dislikes."));
  }

  const { error } = await supabase.from("meal_plan_items").update({ recipe_id: recipeId }).eq("id", itemId);
  if (error) await fail("meal-plan", error, "/plan", notice(week, "Could not swap that meal."));
  revalidatePath("/plan");
  revalidatePath("/groceries");
  revalidatePath("/log");
  redirect(`/plan?week=${week}`);
}

export async function toggleGrocery(formData: FormData) {
  const { supabase } = await requireUser();
  const planId = asId(formData.get("planId"));
  const itemKey = String(formData.get("itemKey") ?? "").slice(0, 200);
  const week = String(formData.get("week") ?? "");
  const checked = formData.get("checked") === "true";
  if (planId == null || !itemKey || !isIsoDate(week)) redirect("/groceries");
  const { error } = await supabase.from("grocery_checks").upsert(
    { meal_plan_id: planId, item_key: itemKey, checked },
    { onConflict: "meal_plan_id,item_key" },
  );
  if (error) {
    await fail("grocery", error, "/groceries", `/groceries?week=${week}&notice=${encodeURIComponent("Could not update that item.")}`);
  }
  revalidatePath("/groceries");
  redirect(`/groceries?week=${week}`);
}

export async function setMealEaten(formData: FormData) {
  const { supabase } = await requireUser();
  const date = readDate(formData, "date");
  const mealType = String(formData.get("mealType") ?? "");
  const recipeId = asId(formData.get("recipeId"));
  const eaten = formData.get("eaten") === "1";
  if (!isMealType(mealType) || recipeId == null) redirect(`/log?date=${date}`);
  const { error } = await supabase.from("logged_meals").upsert(
    { log_date: date, meal_type: mealType, recipe_id: recipeId, eaten },
    { onConflict: "user_id,log_date,meal_type" },
  );
  if (error) {
    await fail("daily-log", error, "/log", `/log?date=${date}&notice=${encodeURIComponent("Could not update that meal.")}`);
  }
  revalidatePath("/log");
  revalidatePath("/dashboard");
  redirect(`/log?date=${date}`);
}

export async function setWater(formData: FormData) {
  const { supabase } = await requireUser();
  const date = readDate(formData, "date");
  const water = clamp(readNumber(formData, "water") ?? 0, 0, 400);
  const { error } = await supabase.from("daily_logs").upsert(
    { log_date: date, water_oz: Math.round(water) },
    { onConflict: "user_id,log_date" },
  );
  if (error) await fail("daily-log", error, "/log", `/log?date=${date}&notice=${encodeURIComponent("Could not save water.")}`);
  revalidatePath("/log");
  revalidatePath("/dashboard");
  redirect(`/log?date=${date}`);
}

export async function setSteps(formData: FormData) {
  const { supabase } = await requireUser();
  const date = readDate(formData, "date");
  const steps = readNumber(formData, "steps");
  if (steps == null || steps < 0 || steps > 200000) {
    redirect(`/log?date=${date}&notice=${encodeURIComponent("Enter steps between 0 and 200,000.")}`);
  }
  const { error } = await supabase.from("daily_logs").upsert(
    { log_date: date, steps: Math.round(steps) },
    { onConflict: "user_id,log_date" },
  );
  if (error) await fail("daily-log", error, "/log", `/log?date=${date}&notice=${encodeURIComponent("Could not save steps.")}`);
  revalidatePath("/log");
  revalidatePath("/dashboard");
  redirect(`/log?date=${date}`);
}

export async function startFast(formData: FormData) {
  const { supabase } = await requireUser();
  const date = readDate(formData, "date");
  const hours = readNumber(formData, "hours");
  if (hours == null || ![16, 18, 20].includes(hours)) redirect(`/log?date=${date}`);
  const { error } = await supabase.from("daily_logs").upsert(
    {
      log_date: date,
      fast_started_at: new Date().toISOString(),
      fast_ended_at: null,
      fast_target_hours: hours,
    },
    { onConflict: "user_id,log_date" },
  );
  if (error) await fail("daily-log", error, "/log", `/log?date=${date}&notice=${encodeURIComponent("Could not start the timer.")}`);
  revalidatePath("/log");
  redirect(`/log?date=${date}`);
}

export async function endFast(formData: FormData) {
  const { supabase } = await requireUser();
  const date = readDate(formData, "date");
  const { error } = await supabase
    .from("daily_logs")
    .update({ fast_ended_at: new Date().toISOString() })
    .eq("log_date", date);
  if (error) await fail("daily-log", error, "/log", `/log?date=${date}&notice=${encodeURIComponent("Could not stop the timer.")}`);
  revalidatePath("/log");
  redirect(`/log?date=${date}`);
}

export async function logWeight(formData: FormData) {
  const { supabase } = await requireUser();
  const today = await getToday();
  const date = readDate(formData, "date", today);
  const weight = readNumber(formData, "weight");
  if (weight == null || weight < 70 || weight > 700) {
    redirect(`/weight?notice=${encodeURIComponent("Enter a weight between 70 and 700 lb.")}`);
  }
  const { error } = await supabase.from("weight_logs").upsert(
    { logged_on: date, weight_lb: Math.round(weight * 10) / 10 },
    { onConflict: "user_id,logged_on" },
  );
  if (error) await fail("weight", error, "/weight", `/weight?notice=${encodeURIComponent("Could not save that weight.")}`);
  revalidatePath("/weight");
  revalidatePath("/dashboard");
  redirect("/weight");
}

function readNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function readDate(formData: FormData, key: string, fallback?: string) {
  const value = String(formData.get(key) ?? "");
  if (isIsoDate(value)) return value;
  if (fallback && isIsoDate(fallback)) return fallback;
  return "1970-01-01";
}

function asId(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function notice(week: string, message: string) {
  return `/plan?week=${week}&notice=${encodeURIComponent(message)}`;
}

async function fail(source: string, error: { message: string; code?: string }, path: string, location: string): Promise<never> {
  await logError({ source, message: error.message, code: error.code, path });
  redirect(location);
}
