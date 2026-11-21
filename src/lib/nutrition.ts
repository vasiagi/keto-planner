export const LB_TO_KG = 0.45359237;
export const IN_TO_CM = 2.54;
export const KCAL_PER_LB = 3500;

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

export type Sex = "male" | "female";
export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;
export type DietStyle = "strict_keto" | "low_carb";

export type BodyInput = {
  sex: Sex;
  age: number;
  heightIn: number;
  weightLb: number;
};

export type CalorieTarget = {
  calories: number;
  deficit: number;
  weeklyLossLb: number;
};

export type MacroTargets = {
  proteinG: number;
  fatG: number;
  netCarbG: number;
};

export type PlanTargets = {
  bmr: number;
  tdee: number;
  calories: number;
  deficit: number;
  weeklyLossLb: number;
  proteinG: number;
  fatG: number;
  netCarbG: number;
  goalDate: string | null;
};

const SEXES = new Set<Sex>(["male", "female"]);
const ACTIVITIES = new Set<ActivityLevel>([
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);
const DIETS = new Set<DietStyle>(["strict_keto", "low_carb"]);

export function isSex(value: string): value is Sex {
  return SEXES.has(value as Sex);
}

export function isActivityLevel(value: string): value is ActivityLevel {
  return ACTIVITIES.has(value as ActivityLevel);
}

export function isDietStyle(value: string): value is DietStyle {
  return DIETS.has(value as DietStyle);
}

/** Mifflin-St Jeor BMR, in kilocalories per day. */
export function mifflinStJeorBmr(input: BodyInput): number {
  const weightKg = input.weightLb * LB_TO_KG;
  const heightCm = input.heightIn * IN_TO_CM;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * input.age;
  return input.sex === "male" ? base + 5 : base - 161;
}

export function maintenanceCalories(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activity];
}

/**
 * Preferred loss is 1.5 lb/week (750 kcal/day), kept inside 1–2 lb/week
 * when the sex-specific calorie floor allows it. Floors are 1,500 kcal for
 * male and 1,200 kcal for female. A smaller deficit is used when the floor
 * would otherwise be crossed. Never more than 1,000 kcal/day.
 */
export function calorieTarget(tdee: number, sex: Sex): CalorieTarget {
  const floor = sex === "male" ? 1500 : 1200;
  const preferredDeficit = 750;
  const maxDeficit = 1000;

  if (tdee <= floor) {
    return {
      calories: Math.round(tdee),
      deficit: 0,
      weeklyLossLb: 0,
    };
  }

  const maxSafeDeficit = Math.min(maxDeficit, tdee - floor);
  const deficit = Math.min(preferredDeficit, maxSafeDeficit);
  const calories = Math.round(tdee - deficit);
  return {
    calories,
    deficit: Math.round(deficit),
    weeklyLossLb: (deficit * 7) / KCAL_PER_LB,
  };
}

export function netCarbCap(diet: DietStyle): number {
  return diet === "strict_keto" ? 20 : 30;
}

/**
 * Protein is 1.6 g per kg of goal weight. Net carbs are capped by diet style.
 * Fat fills the remaining calories.
 */
export function macroTargets(input: {
  calories: number;
  diet: DietStyle;
  goalWeightLb: number;
}): MacroTargets {
  const netCarbG = netCarbCap(input.diet);
  const carbKcal = netCarbG * 4;
  let proteinG = Math.round(input.goalWeightLb * LB_TO_KG * 1.6);
  if (proteinG * 4 + carbKcal > input.calories) {
    proteinG = Math.max(0, Math.round((input.calories - carbKcal) / 4));
  }
  const fatG = Math.max(0, Math.round((input.calories - proteinG * 4 - carbKcal) / 9));
  return { proteinG, fatG, netCarbG };
}

export function goalDateISO(input: {
  currentWeightLb: number;
  goalWeightLb: number;
  weeklyLossLb: number;
  from: string;
}): string | null {
  const toLose = input.currentWeightLb - input.goalWeightLb;
  if (toLose <= 0 || input.weeklyLossLb <= 0) return null;
  const days = Math.ceil((toLose / input.weeklyLossLb) * 7);
  return addIsoDays(input.from, days);
}

export function buildTargets(input: {
  sex: Sex;
  age: number;
  heightIn: number;
  currentWeightLb: number;
  goalWeightLb: number;
  activity: ActivityLevel;
  diet: DietStyle;
  from: string;
}): PlanTargets {
  const bmr = mifflinStJeorBmr({
    sex: input.sex,
    age: input.age,
    heightIn: input.heightIn,
    weightLb: input.currentWeightLb,
  });
  const tdee = maintenanceCalories(bmr, input.activity);
  const target = calorieTarget(tdee, input.sex);
  const macros = macroTargets({
    calories: target.calories,
    diet: input.diet,
    goalWeightLb: input.goalWeightLb,
  });
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: target.calories,
    deficit: target.deficit,
    weeklyLossLb: round2(target.weeklyLossLb),
    proteinG: macros.proteinG,
    fatG: macros.fatG,
    netCarbG: macros.netCarbG,
    goalDate: goalDateISO({
      currentWeightLb: input.currentWeightLb,
      goalWeightLb: input.goalWeightLb,
      weeklyLossLb: target.weeklyLossLb,
      from: input.from,
    }),
  };
}

export function poundsLost(startLb: number, latestLb: number): number {
  return round1(Math.max(0, startLb - latestLb));
}

export function poundsToGo(latestLb: number, goalLb: number): number {
  return round1(Math.max(0, latestLb - goalLb));
}

export type Badge = { pounds: number; earned: boolean };

export function lossBadges(startLb: number, latestLb: number, goalLb: number): Badge[] {
  const lost = Math.max(0, startLb - latestLb);
  const span = Math.max(10, Math.ceil((startLb - goalLb) / 10) * 10);
  const badges: Badge[] = [];
  for (let pounds = 10; pounds <= span; pounds += 10) {
    badges.push({ pounds, earned: lost + 0.05 >= pounds });
  }
  return badges;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addIsoDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
