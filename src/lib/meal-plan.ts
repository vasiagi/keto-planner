import type { Ingredient } from "./grocery";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const ALLERGENS = [
  "dairy",
  "eggs",
  "nuts",
  "peanuts",
  "shellfish",
  "fish",
  "soy",
  "sesame",
  "gluten",
] as const;

export type Allergen = (typeof ALLERGENS)[number];

export type PlanRecipe = {
  id: number;
  name: string;
  meal_type: MealType;
  ingredients: Ingredient[];
  allergen_tags: string[];
};

export type PlannedSlot = {
  dayOffset: number;
  mealType: MealType;
  recipeId: number;
};

const ALLERGEN_SET = new Set<string>(ALLERGENS);

export function isMealType(value: string): value is MealType {
  return (MEAL_TYPES as readonly string[]).includes(value);
}

export function isAllergen(value: string): value is Allergen {
  return ALLERGEN_SET.has(value);
}

export function dislikeTerms(dislikes: string): string[] {
  return dislikes
    .split(",")
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 3);
}

function matchesTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z])${escaped}s?(?:[^a-z]|$)`, "i").test(haystack);
}

export function recipeAllowed(
  recipe: PlanRecipe,
  allergies: string[],
  dislikes: string,
): boolean {
  const blocked = new Set(allergies.map((tag) => tag.toLowerCase()));
  if (recipe.allergen_tags.some((tag) => blocked.has(tag.toLowerCase()))) return false;
  const terms = dislikeTerms(dislikes);
  if (terms.length === 0) return true;
  const haystack = [recipe.name, ...recipe.ingredients.map((item) => item.name)].join(" ");
  return !terms.some((term) => matchesTerm(haystack, term));
}

export function generateWeekPlan(
  recipes: PlanRecipe[],
  input: { allergies: string[]; dislikes: string; random?: () => number },
): { items: PlannedSlot[] } | { error: string } {
  const random = input.random ?? Math.random;
  const allowed = recipes.filter((recipe) => recipeAllowed(recipe, input.allergies, input.dislikes));
  const byType = new Map<MealType, PlanRecipe[]>();
  for (const mealType of MEAL_TYPES) byType.set(mealType, []);
  for (const recipe of allowed) byType.get(recipe.meal_type)?.push(recipe);

  for (const mealType of MEAL_TYPES) {
    if ((byType.get(mealType) ?? []).length === 0) {
      return {
        error: `No ${mealType} recipes match your allergies and dislikes. Edit them in onboarding and try again.`,
      };
    }
  }

  const used = new Map<number, number>();
  const items: PlannedSlot[] = [];
  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    for (const mealType of MEAL_TYPES) {
      const list = byType.get(mealType) ?? [];
      const recipe = pickLeastUsed(list, used, random);
      items.push({ dayOffset, mealType, recipeId: recipe.id });
    }
  }
  return { items };
}

function pickLeastUsed(list: PlanRecipe[], used: Map<number, number>, random: () => number): PlanRecipe {
  let least = Number.POSITIVE_INFINITY;
  for (const recipe of list) least = Math.min(least, used.get(recipe.id) ?? 0);
  const pool = list.filter((recipe) => (used.get(recipe.id) ?? 0) === least);
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  const choice = pool[index] ?? pool[0];
  used.set(choice.id, (used.get(choice.id) ?? 0) + 1);
  return choice;
}
