import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

type SeedRecipe = {
  name: string;
  meal_type: string;
  ingredients: { name: string; quantity: number; unit: string }[];
  protein_g: number;
  fat_g: number;
  total_carbs_g: number;
  fiber_g: number;
  net_carbs_g: number;
  calories: number;
  instructions: string;
  allergen_tags: string[];
};

const recipes = JSON.parse(readFileSync(join(root, "src/data/recipes.json"), "utf8")) as SeedRecipe[];
const schema = readFileSync(
  join(root, "supabase/migrations/20261121041045_init_schema.sql"),
  "utf8",
);
const seed = readFileSync(
  join(root, "supabase/migrations/20261121041046_seed_recipes.sql"),
  "utf8",
);

test("catalog has 30 recipes spread across meal types", () => {
  assert.equal(recipes.length, 30);
  const counts = Object.fromEntries(["breakfast", "lunch", "dinner", "snack"].map((meal) => [meal, 0]));
  for (const recipe of recipes) counts[recipe.meal_type] += 1;
  assert.equal(counts.breakfast, 8);
  assert.equal(counts.lunch, 8);
  assert.equal(counts.dinner, 8);
  assert.equal(counts.snack, 6);
  assert.equal(new Set(recipes.map((recipe) => recipe.name)).size, 30);
});

test("recipe macros are internally consistent and each meal has an unrestricted option", () => {
  const known = new Set(["dairy", "eggs", "nuts", "peanuts", "shellfish", "fish", "soy", "sesame", "gluten"]);
  for (const recipe of recipes) {
    assert.equal(Math.round((recipe.total_carbs_g - recipe.fiber_g) * 10) / 10, recipe.net_carbs_g);
    const calories = Math.round(recipe.protein_g * 4 + recipe.fat_g * 9 + recipe.net_carbs_g * 4);
    assert.equal(calories, recipe.calories);
    assert.ok(recipe.instructions.length > 20);
    assert.ok(recipe.ingredients.length > 0);
    for (const tag of recipe.allergen_tags) assert.ok(known.has(tag));
    assert.ok(seed.includes(recipe.name.replaceAll("'", "''")));
  }
  for (const meal of ["breakfast", "lunch", "dinner", "snack"]) {
    const open = recipes.filter((recipe) => recipe.meal_type === meal && recipe.allergen_tags.length === 0);
    assert.ok(open.length >= 1, meal);
  }
});

test("user tables enable RLS and recipes are not writable by policy", () => {
  const tables = [...schema.matchAll(/create table (public\.\w+)/g)].map((match) => match[1]);
  assert.deepEqual(tables, [
    "public.profiles",
    "public.recipes",
    "public.meal_plans",
    "public.meal_plan_items",
    "public.grocery_checks",
    "public.daily_logs",
    "public.logged_meals",
    "public.weight_logs",
  ]);
  for (const table of tables) {
    assert.match(schema, new RegExp(`alter table ${table.replace(".", "\\.")} enable row level security`));
  }
  assert.match(schema, /create policy recipes_select/);
  assert.equal(schema.includes("recipes_insert"), false);
  assert.equal(schema.includes("recipes_update"), false);
  assert.equal(schema.includes("recipes_delete"), false);
  for (const table of ["profiles", "meal_plans", "meal_plan_items", "grocery_checks", "daily_logs", "logged_meals", "weight_logs"]) {
    for (const action of ["select", "insert", "update", "delete"]) {
      assert.match(schema, new RegExp(`create policy ${table}_${action}`));
    }
  }
  assert.match(schema, /auth\.uid\(\)/);
});
