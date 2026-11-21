import type { createClient } from "@/lib/supabase/server";
import { addDays, daysBetween, isIsoDate, mondayOf } from "@/lib/dates";
import type { Ingredient } from "@/lib/grocery";
import { aggregateGroceries } from "@/lib/grocery";
import {
  isActivityLevel,
  isDietStyle,
  isSex,
  poundsLost,
  poundsToGo,
  type ActivityLevel,
  type DietStyle,
  type Sex,
} from "@/lib/nutrition";
import { isMealType, type MealType } from "@/lib/meal-plan";
import { loggingStreak } from "@/lib/streak";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type Profile = {
  id: string;
  email: string | null;
  startWeightLb: number | null;
  goalWeightLb: number | null;
  heightIn: number | null;
  age: number | null;
  sex: Sex | null;
  activity: ActivityLevel | null;
  diet: DietStyle | null;
  allergies: string[];
  dislikes: string;
  bmr: number | null;
  tdee: number | null;
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  netCarbG: number | null;
  weeklyLossLb: number | null;
  goalDate: string | null;
  onboardedAt: string | null;
};

export type Recipe = {
  id: number;
  name: string;
  mealType: MealType;
  ingredients: Ingredient[];
  calories: number;
  proteinG: number;
  fatG: number;
  totalCarbsG: number;
  fiberG: number;
  netCarbsG: number;
  instructions: string;
  allergenTags: string[];
};

export type PlanItem = {
  id: number;
  dayOffset: number;
  mealType: MealType;
  recipe: Recipe;
};

const RECIPE_COLUMNS =
  "id, name, meal_type, ingredients, calories, protein_g, fat_g, total_carbs_g, fiber_g, net_carbs_g, instructions, allergen_tags";

export async function ensureProfile(supabase: Supabase, userId: string, email: string | null) {
  const existing = await getProfile(supabase, userId);
  if (existing) return existing;
  const { error } = await supabase.from("profiles").insert({ id: userId, email });
  if (error && error.code !== "23505") throwQuery(error);
  const created = await getProfile(supabase, userId);
  if (!created) throw new Error("Could not create your profile.");
  return created;
}

export async function getProfile(supabase: Supabase, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, start_weight_lb, goal_weight_lb, height_in, age, sex, activity_level, diet_style, allergies, dislikes, bmr_kcal, tdee_kcal, daily_calories, protein_g, fat_g, net_carb_cap_g, weekly_loss_lb, goal_date, onboarded_at",
    )
    .eq("id", userId)
    .maybeSingle();
  throwQuery(error);
  if (!data) return null;
  return mapProfile(data);
}

export async function listRecipes(supabase: Supabase): Promise<Recipe[]> {
  const { data, error } = await supabase.from("recipes").select(RECIPE_COLUMNS).order("name");
  throwQuery(error);
  return (data ?? []).flatMap((row) => {
    const recipe = mapRecipe(row);
    return recipe ? [recipe] : [];
  });
}

export async function fetchDashboard(supabase: Supabase, userId: string, today: string) {
  const week = mondayOf(today);
  const from = addDays(today, -120);
  const [profile, plan, eaten, daily, weights] = await Promise.all([
    getProfile(supabase, userId),
    getPlan(supabase, userId, week),
    getLoggedMeals(supabase, userId, today, today),
    listDailyLogs(supabase, userId, from, today),
    listWeights(supabase, userId),
  ]);

  if (!profile) return null;

  const offset = daysBetween(week, today);
  const planned = plan?.items.filter((item) => item.dayOffset === offset) ?? [];
  const eatenByMeal = new Map(eaten.filter((meal) => meal.eaten).map((meal) => [meal.mealType, meal]));
  const totals = sumMacros([...eatenByMeal.values()].map((meal) => meal.recipe));
  const latest = weights.at(-1) ?? null;
  const start = profile.startWeightLb ?? latest?.weightLb ?? null;
  const current = latest?.weightLb ?? profile.startWeightLb;
  const loggedDates = new Set<string>();
  for (const row of daily) {
    if (row.waterOz > 0 || (row.steps ?? 0) > 0 || row.fastStartedAt) loggedDates.add(row.logDate);
  }
  const mealDates = await loggedMealDates(supabase, userId, from, today);
  for (const date of mealDates) loggedDates.add(date);
  for (const weight of weights) {
    if (weight.loggedOn >= from) loggedDates.add(weight.loggedOn);
  }
  const todayLog = daily.find((row) => row.logDate === today) ?? null;

  return {
    profile,
    planned,
    totals,
    streak: loggingStreak([...loggedDates], today),
    lost: start != null && current != null ? poundsLost(start, current) : 0,
    toGo: current != null && profile.goalWeightLb != null ? poundsToGo(current, profile.goalWeightLb) : null,
    currentWeight: current,
    waterOz: todayLog?.waterOz ?? 0,
    week,
  };
}

export async function fetchPlan(supabase: Supabase, userId: string, weekStart: string) {
  const [profile, recipes, plan] = await Promise.all([
    getProfile(supabase, userId),
    listRecipes(supabase),
    getPlan(supabase, userId, weekStart),
  ]);
  return { profile, recipes, plan };
}

export async function fetchGroceries(supabase: Supabase, userId: string, weekStart: string) {
  const plan = await getPlan(supabase, userId, weekStart);
  if (!plan) return { plan: null, lines: [], checks: new Map<string, boolean>() };
  const { data, error } = await supabase
    .from("grocery_checks")
    .select("item_key, checked")
    .eq("meal_plan_id", plan.id);
  throwQuery(error);
  const checks = new Map<string, boolean>();
  for (const row of data ?? []) {
    const record = row as { item_key?: unknown; checked?: unknown };
    if (typeof record.item_key === "string") checks.set(record.item_key, record.checked === true);
  }
  return {
    plan,
    lines: aggregateGroceries(plan.items.map((item) => item.recipe.ingredients)),
    checks,
  };
}

export async function fetchLog(supabase: Supabase, userId: string, date: string) {
  const week = mondayOf(date);
  const [profile, plan, eaten, daily] = await Promise.all([
    getProfile(supabase, userId),
    getPlan(supabase, userId, week),
    getLoggedMeals(supabase, userId, date, date),
    listDailyLogs(supabase, userId, date, date),
  ]);
  const offset = daysBetween(week, date);
  return {
    profile,
    planned: plan?.items.filter((item) => item.dayOffset === offset) ?? [],
    eaten,
    daily: daily[0] ?? null,
    hasPlan: Boolean(plan),
  };
}

export async function fetchWeight(supabase: Supabase, userId: string) {
  const [profile, weights] = await Promise.all([
    getProfile(supabase, userId),
    listWeights(supabase, userId),
  ]);
  return { profile, weights };
}

export type WeightPoint = { loggedOn: string; weightLb: number };

export type DailyLog = {
  logDate: string;
  waterOz: number;
  steps: number | null;
  fastStartedAt: string | null;
  fastEndedAt: string | null;
  fastTargetHours: number | null;
};

export type LoggedMeal = {
  mealType: MealType;
  eaten: boolean;
  recipe: Recipe;
};

export type MealPlan = {
  id: number;
  weekStart: string;
  items: PlanItem[];
};

async function getPlan(supabase: Supabase, userId: string, weekStart: string): Promise<MealPlan | null> {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("id, week_start")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  throwQuery(error);
  if (!data) return null;
  const planId = asNumber((data as { id: unknown }).id);
  const storedWeek = asDate((data as { week_start: unknown }).week_start);
  if (planId == null || !storedWeek) return null;
  const { data: items, error: itemError } = await supabase
    .from("meal_plan_items")
    .select(`id, day_offset, meal_type, recipe_id, recipes (${RECIPE_COLUMNS})`)
    .eq("meal_plan_id", planId)
    .order("day_offset")
    .order("meal_type");
  throwQuery(itemError);
  return {
    id: planId,
    weekStart: storedWeek,
    items: (items ?? []).flatMap((row) => {
      const record = row as Record<string, unknown>;
      const id = asNumber(record.id);
      const dayOffset = asNumber(record.day_offset);
      const mealType = typeof record.meal_type === "string" && isMealType(record.meal_type) ? record.meal_type : null;
      const recipe = mapRecipe(record.recipes);
      if (id == null || dayOffset == null || !mealType || !recipe) return [];
      return [{ id, dayOffset, mealType, recipe }];
    }),
  };
}

async function getLoggedMeals(supabase: Supabase, userId: string, from: string, to: string): Promise<LoggedMeal[]> {
  const { data, error } = await supabase
    .from("logged_meals")
    .select(`meal_type, eaten, recipes (${RECIPE_COLUMNS})`)
    .eq("user_id", userId)
    .gte("log_date", from)
    .lte("log_date", to);
  throwQuery(error);
  return (data ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>;
    const mealType = typeof record.meal_type === "string" && isMealType(record.meal_type) ? record.meal_type : null;
    const recipe = mapRecipe(record.recipes);
    if (!mealType || !recipe) return [];
    return [{ mealType, eaten: record.eaten !== false, recipe }];
  });
}

async function loggedMealDates(supabase: Supabase, userId: string, from: string, to: string) {
  const { data, error } = await supabase
    .from("logged_meals")
    .select("log_date")
    .eq("user_id", userId)
    .eq("eaten", true)
    .gte("log_date", from)
    .lte("log_date", to);
  throwQuery(error);
  const dates: string[] = [];
  for (const row of data ?? []) {
    const date = asDate((row as { log_date?: unknown }).log_date);
    if (date) dates.push(date);
  }
  return dates;
}

async function listDailyLogs(supabase: Supabase, userId: string, from: string, to: string): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("log_date, water_oz, steps, fast_started_at, fast_ended_at, fast_target_hours")
    .eq("user_id", userId)
    .gte("log_date", from)
    .lte("log_date", to);
  throwQuery(error);
  return (data ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>;
    const logDate = asDate(record.log_date);
    if (!logDate) return [];
    return [
      {
        logDate,
        waterOz: asNumber(record.water_oz) ?? 0,
        steps: asNumber(record.steps),
        fastStartedAt: typeof record.fast_started_at === "string" ? record.fast_started_at : null,
        fastEndedAt: typeof record.fast_ended_at === "string" ? record.fast_ended_at : null,
        fastTargetHours: asNumber(record.fast_target_hours),
      },
    ];
  });
}

async function listWeights(supabase: Supabase, userId: string): Promise<WeightPoint[]> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("logged_on, weight_lb")
    .eq("user_id", userId)
    .order("logged_on", { ascending: true })
    .limit(400);
  throwQuery(error);
  return (data ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>;
    const loggedOn = asDate(record.logged_on);
    const weightLb = asNumber(record.weight_lb);
    if (!loggedOn || weightLb == null) return [];
    return [{ loggedOn, weightLb }];
  });
}

export function sumMacros(recipes: Pick<Recipe, "calories" | "proteinG" | "fatG" | "netCarbsG">[]) {
  return recipes.reduce(
    (total, recipe) => ({
      calories: total.calories + recipe.calories,
      proteinG: total.proteinG + recipe.proteinG,
      fatG: total.fatG + recipe.fatG,
      netCarbsG: total.netCarbsG + recipe.netCarbsG,
    }),
    { calories: 0, proteinG: 0, fatG: 0, netCarbsG: 0 },
  );
}

function mapProfile(row: unknown): Profile {
  const record = row as Record<string, unknown>;
  const sex = typeof record.sex === "string" && isSex(record.sex) ? record.sex : null;
  const activity =
    typeof record.activity_level === "string" && isActivityLevel(record.activity_level) ? record.activity_level : null;
  const diet = typeof record.diet_style === "string" && isDietStyle(record.diet_style) ? record.diet_style : null;
  return {
    id: String(record.id),
    email: typeof record.email === "string" ? record.email : null,
    startWeightLb: asNumber(record.start_weight_lb),
    goalWeightLb: asNumber(record.goal_weight_lb),
    heightIn: asNumber(record.height_in),
    age: asNumber(record.age),
    sex,
    activity,
    diet,
    allergies: Array.isArray(record.allergies) ? record.allergies.filter((tag) => typeof tag === "string") : [],
    dislikes: typeof record.dislikes === "string" ? record.dislikes : "",
    bmr: asNumber(record.bmr_kcal),
    tdee: asNumber(record.tdee_kcal),
    calories: asNumber(record.daily_calories),
    proteinG: asNumber(record.protein_g),
    fatG: asNumber(record.fat_g),
    netCarbG: asNumber(record.net_carb_cap_g),
    weeklyLossLb: asNumber(record.weekly_loss_lb),
    goalDate: asDate(record.goal_date),
    onboardedAt: typeof record.onboarded_at === "string" ? record.onboarded_at : null,
  };
}

function mapRecipe(value: unknown): Recipe | null {
  const record = Array.isArray(value) ? value[0] : value;
  if (!record || typeof record !== "object") return null;
  const row = record as Record<string, unknown>;
  const id = asNumber(row.id);
  const mealType = typeof row.meal_type === "string" && isMealType(row.meal_type) ? row.meal_type : null;
  const name = typeof row.name === "string" ? row.name : "";
  if (id == null || !mealType || !name) return null;
  return {
    id,
    name,
    mealType,
    ingredients: asIngredients(row.ingredients),
    calories: asNumber(row.calories) ?? 0,
    proteinG: asNumber(row.protein_g) ?? 0,
    fatG: asNumber(row.fat_g) ?? 0,
    totalCarbsG: asNumber(row.total_carbs_g) ?? 0,
    fiberG: asNumber(row.fiber_g) ?? 0,
    netCarbsG: asNumber(row.net_carbs_g) ?? 0,
    instructions: typeof row.instructions === "string" ? row.instructions : "",
    allergenTags: Array.isArray(row.allergen_tags) ? row.allergen_tags.filter((tag) => typeof tag === "string") : [],
  };
}

function asIngredients(value: unknown): Ingredient[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name : "";
    const unit = typeof row.unit === "string" ? row.unit : "";
    const quantity = asNumber(row.quantity);
    if (!name || quantity == null) return [];
    return [{ name, unit, quantity }];
  });
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function asDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = value.slice(0, 10);
  return isIsoDate(date) ? date : null;
}

function throwQuery(error: { message: string } | null) {
  if (!error) return;
  if (/does not exist|schema cache/i.test(error.message)) {
    throw new Error("Database tables are missing. Apply the SQL migrations in supabase/migrations, then refresh.");
  }
  throw new Error(error.message);
}

export function sumRound(value: number) {
  return Math.round(value);
}
