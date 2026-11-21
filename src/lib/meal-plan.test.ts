import assert from "node:assert/strict";
import { test } from "node:test";
import { MEAL_TYPES, generateWeekPlan, recipeAllowed, type PlanRecipe } from "./meal-plan";

function recipe(id: number, meal: PlanRecipe["meal_type"], tags: string[], name = `${meal} ${id}`): PlanRecipe {
  return {
    id,
    name,
    meal_type: meal,
    ingredients: [{ name: "olive oil", quantity: 1, unit: "tsp" }],
    allergen_tags: tags,
  };
}

const catalog: PlanRecipe[] = [
  recipe(1, "breakfast", [], "sausage skillet"),
  recipe(2, "breakfast", ["eggs"], "omelet"),
  recipe(3, "lunch", [], "chicken salad"),
  recipe(4, "lunch", ["fish"], "tuna avocado"),
  recipe(5, "dinner", [], "ribeye"),
  recipe(6, "dinner", ["dairy"], "tuscan chicken"),
  recipe(7, "snack", [], "olives"),
  recipe(8, "snack", ["nuts"], "almonds"),
];

test("allergy and dislike filters", () => {
  assert.equal(recipeAllowed(catalog[1], ["eggs"], ""), false);
  assert.equal(recipeAllowed(catalog[0], ["eggs"], ""), true);
  assert.equal(recipeAllowed(catalog[0], [], "sausage"), false);
  assert.equal(recipeAllowed(catalog[7], [], "almond"), false);
  assert.equal(recipeAllowed(catalog[7], [], "nut"), true);
  assert.equal(recipeAllowed(catalog[5], [], "oil"), false);
});

test("a week has four meals a day and skips blocked recipes", () => {
  const plan = generateWeekPlan(catalog, { allergies: ["eggs", "fish", "dairy", "nuts"], dislikes: "", random: () => 0 });
  assert.ok(!("error" in plan));
  if ("error" in plan) return;
  assert.equal(plan.items.length, 28);
  const ids = new Set(plan.items.map((item) => item.recipeId));
  assert.deepEqual([...ids].sort(), [1, 3, 5, 7]);
  for (const mealType of MEAL_TYPES) {
    assert.equal(plan.items.filter((item) => item.mealType === mealType).length, 7);
  }
});

test("generation fails when a meal type has no safe recipe", () => {
  const plan = generateWeekPlan(catalog, { allergies: [], dislikes: "sausage, chicken, ribeye, olive" });
  assert.deepEqual(plan, {
    error: "No breakfast recipes match your allergies and dislikes. Edit them in onboarding and try again.",
  });
});
