import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const recipes = [
  {
    name: "Spinach cheddar scramble",
    meal_type: "breakfast",
    ingredients: [
      { name: "eggs", quantity: 3, unit: "large" },
      { name: "baby spinach", quantity: 2, unit: "cups" },
      { name: "cheddar", quantity: 1, unit: "oz" },
      { name: "butter", quantity: 1, unit: "tsp" },
    ],
    protein_g: 28,
    fat_g: 29,
    total_carbs_g: 4,
    fiber_g: 1,
    instructions: "Melt butter in a skillet. Soft-scramble the eggs, then fold in spinach and cheddar until just set.",
    allergen_tags: ["eggs", "dairy"],
  },
  {
    name: "Bacon avocado plate",
    meal_type: "breakfast",
    ingredients: [
      { name: "bacon", quantity: 3, unit: "slices" },
      { name: "eggs", quantity: 2, unit: "large" },
      { name: "avocado", quantity: 0.5, unit: "whole" },
    ],
    protein_g: 22,
    fat_g: 34,
    total_carbs_g: 8,
    fiber_g: 5,
    instructions: "Cook the bacon, fry the eggs in a teaspoon of the rendered fat, and serve with sliced avocado.",
    allergen_tags: ["eggs"],
  },
  {
    name: "Smoked salmon cucumber bites",
    meal_type: "breakfast",
    ingredients: [
      { name: "smoked salmon", quantity: 3, unit: "oz" },
      { name: "cucumber", quantity: 1, unit: "whole" },
      { name: "cream cheese", quantity: 2, unit: "tbsp" },
      { name: "fresh dill", quantity: 1, unit: "tsp" },
    ],
    protein_g: 18,
    fat_g: 12,
    total_carbs_g: 4,
    fiber_g: 1,
    instructions: "Spread cream cheese on cucumber rounds, top with smoked salmon, and finish with dill.",
    allergen_tags: ["fish", "dairy"],
  },
  {
    name: "Sausage and pepper skillet",
    meal_type: "breakfast",
    ingredients: [
      { name: "breakfast sausage", quantity: 3, unit: "oz" },
      { name: "bell pepper", quantity: 1, unit: "cup" },
      { name: "baby spinach", quantity: 1, unit: "cup" },
      { name: "olive oil", quantity: 1, unit: "tsp" },
    ],
    protein_g: 16,
    fat_g: 26,
    total_carbs_g: 7,
    fiber_g: 2,
    instructions: "Brown the sausage in olive oil, add pepper, and wilt the spinach. Salt and pepper to taste.",
    allergen_tags: [],
  },
  {
    name: "Coconut flour pancakes",
    meal_type: "breakfast",
    ingredients: [
      { name: "coconut flour", quantity: 3, unit: "tbsp" },
      { name: "eggs", quantity: 2, unit: "large" },
      { name: "heavy cream", quantity: 2, unit: "tbsp" },
      { name: "butter", quantity: 1, unit: "tsp" },
    ],
    protein_g: 16,
    fat_g: 28,
    total_carbs_g: 8,
    fiber_g: 4,
    instructions: "Whisk flour, eggs, and cream. Cook small pancakes in butter until the edges set, then flip once.",
    allergen_tags: ["eggs", "dairy"],
  },
  {
    name: "Greek yogurt almond bowl",
    meal_type: "breakfast",
    ingredients: [
      { name: "plain Greek yogurt", quantity: 0.75, unit: "cup" },
      { name: "raspberries", quantity: 0.25, unit: "cup" },
      { name: "almonds", quantity: 1, unit: "tbsp" },
    ],
    protein_g: 18,
    fat_g: 14,
    total_carbs_g: 12,
    fiber_g: 3,
    instructions: "Spoon whole-milk yogurt into a bowl. Top with raspberries and chopped almonds.",
    allergen_tags: ["dairy", "nuts"],
  },
  {
    name: "Chia coconut pudding",
    meal_type: "breakfast",
    ingredients: [
      { name: "chia seeds", quantity: 3, unit: "tbsp" },
      { name: "unsweetened almond milk", quantity: 1, unit: "cup" },
      { name: "coconut cream", quantity: 2, unit: "tbsp" },
      { name: "cinnamon", quantity: 0.25, unit: "tsp" },
    ],
    protein_g: 6,
    fat_g: 18,
    total_carbs_g: 14,
    fiber_g: 10,
    instructions: "Stir chia, almond milk, coconut cream, and cinnamon. Chill at least 2 hours, overnight if you can.",
    allergen_tags: ["nuts"],
  },
  {
    name: "Mushroom herb omelet",
    meal_type: "breakfast",
    ingredients: [
      { name: "eggs", quantity: 3, unit: "large" },
      { name: "mushrooms", quantity: 1, unit: "cup" },
      { name: "butter", quantity: 1, unit: "tsp" },
      { name: "fresh parsley", quantity: 1, unit: "tbsp" },
    ],
    protein_g: 20,
    fat_g: 22,
    total_carbs_g: 4,
    fiber_g: 1,
    instructions: "Saute mushrooms in butter. Add beaten eggs, tilt the pan, and fold when the center is still soft.",
    allergen_tags: ["eggs", "dairy"],
  },
  {
    name: "Grilled chicken olive salad",
    meal_type: "lunch",
    ingredients: [
      { name: "chicken breast", quantity: 5, unit: "oz" },
      { name: "romaine", quantity: 2, unit: "cups" },
      { name: "cucumber", quantity: 0.5, unit: "whole" },
      { name: "tomato", quantity: 0.5, unit: "whole" },
      { name: "olive oil", quantity: 1, unit: "tbsp" },
    ],
    protein_g: 35,
    fat_g: 18,
    total_carbs_g: 8,
    fiber_g: 3,
    instructions: "Grill or pan-sear the chicken. Slice it over romaine with cucumber, tomato, olive oil, salt, and lemon.",
    allergen_tags: [],
  },
  {
    name: "Bunless beef bowl",
    meal_type: "lunch",
    ingredients: [
      { name: "ground beef", quantity: 5, unit: "oz" },
      { name: "romaine", quantity: 2, unit: "cups" },
      { name: "tomato", quantity: 0.5, unit: "whole" },
      { name: "dill pickle", quantity: 1, unit: "spear" },
      { name: "yellow mustard", quantity: 1, unit: "tsp" },
    ],
    protein_g: 32,
    fat_g: 22,
    total_carbs_g: 6,
    fiber_g: 2,
    instructions: "Brown the beef with salt and pepper. Serve over lettuce with tomato, pickle, and mustard.",
    allergen_tags: [],
  },
  {
    name: "Turkey lettuce wraps",
    meal_type: "lunch",
    ingredients: [
      { name: "sliced turkey", quantity: 4, unit: "oz" },
      { name: "butter lettuce", quantity: 4, unit: "leaves" },
      { name: "avocado", quantity: 0.25, unit: "whole" },
      { name: "yellow mustard", quantity: 1, unit: "tsp" },
    ],
    protein_g: 28,
    fat_g: 12,
    total_carbs_g: 6,
    fiber_g: 3,
    instructions: "Fill lettuce leaves with turkey, avocado, and mustard. Eat two wraps and save the rest for later if you like.",
    allergen_tags: [],
  },
  {
    name: "Tuna stuffed avocado",
    meal_type: "lunch",
    ingredients: [
      { name: "tuna in olive oil", quantity: 4, unit: "oz" },
      { name: "avocado", quantity: 0.5, unit: "whole" },
      { name: "celery", quantity: 1, unit: "stalk" },
      { name: "lemon juice", quantity: 1, unit: "tsp" },
    ],
    protein_g: 32,
    fat_g: 24,
    total_carbs_g: 9,
    fiber_g: 6,
    instructions: "Drain most of the oil, mix tuna with chopped celery and lemon, and spoon it into the avocado half.",
    allergen_tags: ["fish"],
  },
  {
    name: "Shrimp avocado salad",
    meal_type: "lunch",
    ingredients: [
      { name: "shrimp", quantity: 5, unit: "oz" },
      { name: "mixed greens", quantity: 2, unit: "cups" },
      { name: "avocado", quantity: 0.25, unit: "whole" },
      { name: "olive oil", quantity: 1, unit: "tbsp" },
    ],
    protein_g: 30,
    fat_g: 16,
    total_carbs_g: 7,
    fiber_g: 4,
    instructions: "Sear shrimp with salt and garlic powder. Toss greens with olive oil and top with shrimp and avocado.",
    allergen_tags: ["shellfish"],
  },
  {
    name: "Chicken Caesar lettuce wraps",
    meal_type: "lunch",
    ingredients: [
      { name: "chicken breast", quantity: 4, unit: "oz" },
      { name: "romaine", quantity: 1.5, unit: "cups" },
      { name: "parmesan", quantity: 0.5, unit: "oz" },
      { name: "caesar dressing", quantity: 1, unit: "tbsp" },
    ],
    protein_g: 36,
    fat_g: 22,
    total_carbs_g: 5,
    fiber_g: 2,
    instructions: "Slice cooked chicken over romaine. Add parmesan and a measured spoon of dressing, then wrap in the largest leaves.",
    allergen_tags: ["dairy", "eggs", "fish"],
  },
  {
    name: "Egg salad lettuce cups",
    meal_type: "lunch",
    ingredients: [
      { name: "eggs", quantity: 3, unit: "large" },
      { name: "mayonnaise", quantity: 1, unit: "tbsp" },
      { name: "celery", quantity: 1, unit: "stalk" },
      { name: "butter lettuce", quantity: 3, unit: "leaves" },
    ],
    protein_g: 20,
    fat_g: 24,
    total_carbs_g: 4,
    fiber_g: 1,
    instructions: "Chop hard-boiled eggs with mayonnaise, celery, salt, and pepper. Spoon into lettuce cups.",
    allergen_tags: ["eggs"],
  },
  {
    name: "Pesto chicken zucchini noodles",
    meal_type: "lunch",
    ingredients: [
      { name: "chicken thigh", quantity: 4, unit: "oz" },
      { name: "zucchini", quantity: 2, unit: "cups" },
      { name: "basil pesto", quantity: 2, unit: "tbsp" },
    ],
    protein_g: 34,
    fat_g: 26,
    total_carbs_g: 8,
    fiber_g: 3,
    instructions: "Sear the chicken. Toss spiralized zucchini in the warm pan just until soft, then stir in pesto.",
    allergen_tags: ["dairy", "nuts"],
  },
  {
    name: "Ribeye and broccoli",
    meal_type: "dinner",
    ingredients: [
      { name: "ribeye steak", quantity: 6, unit: "oz" },
      { name: "broccoli", quantity: 1.5, unit: "cups" },
      { name: "olive oil", quantity: 1, unit: "tbsp" },
    ],
    protein_g: 42,
    fat_g: 36,
    total_carbs_g: 8,
    fiber_g: 4,
    instructions: "Season the steak with salt and sear to your preferred doneness. Roast broccoli in olive oil on the side.",
    allergen_tags: [],
  },
  {
    name: "Chicken thighs with olives",
    meal_type: "dinner",
    ingredients: [
      { name: "chicken thigh", quantity: 6, unit: "oz" },
      { name: "green olives", quantity: 8, unit: "olives" },
      { name: "baby spinach", quantity: 2, unit: "cups" },
      { name: "olive oil", quantity: 1, unit: "tsp" },
    ],
    protein_g: 38,
    fat_g: 32,
    total_carbs_g: 5,
    fiber_g: 2,
    instructions: "Brown the thighs, add olives and a splash of water, cover 8 minutes, then wilt spinach into the pan.",
    allergen_tags: [],
  },
  {
    name: "Pork chops and roasted cauliflower",
    meal_type: "dinner",
    ingredients: [
      { name: "pork chop", quantity: 6, unit: "oz" },
      { name: "cauliflower", quantity: 2, unit: "cups" },
      { name: "olive oil", quantity: 1, unit: "tbsp" },
    ],
    protein_g: 40,
    fat_g: 24,
    total_carbs_g: 8,
    fiber_g: 3,
    instructions: "Roast cauliflower in olive oil at 425 F. Pan-sear the chop with salt, pepper, and garlic powder.",
    allergen_tags: [],
  },
  {
    name: "Ginger beef and broccoli",
    meal_type: "dinner",
    ingredients: [
      { name: "sirloin steak", quantity: 5, unit: "oz" },
      { name: "broccoli", quantity: 1.5, unit: "cups" },
      { name: "fresh ginger", quantity: 1, unit: "tsp" },
      { name: "olive oil", quantity: 1, unit: "tbsp" },
    ],
    protein_g: 40,
    fat_g: 22,
    total_carbs_g: 9,
    fiber_g: 4,
    instructions: "Slice the sirloin thin. Stir-fry with broccoli, ginger, salt, and olive oil until the beef is just cooked.",
    allergen_tags: [],
  },
  {
    name: "Lamb chops and green beans",
    meal_type: "dinner",
    ingredients: [
      { name: "lamb chops", quantity: 5, unit: "oz" },
      { name: "green beans", quantity: 1.5, unit: "cups" },
      { name: "olive oil", quantity: 1, unit: "tbsp" },
    ],
    protein_g: 36,
    fat_g: 30,
    total_carbs_g: 8,
    fiber_g: 3,
    instructions: "Sear chops with salt and pepper. Saute green beans in olive oil until blistered and still bright.",
    allergen_tags: [],
  },
  {
    name: "Garlic butter salmon and asparagus",
    meal_type: "dinner",
    ingredients: [
      { name: "salmon", quantity: 6, unit: "oz" },
      { name: "asparagus", quantity: 8, unit: "spears" },
      { name: "butter", quantity: 1, unit: "tbsp" },
      { name: "garlic", quantity: 1, unit: "clove" },
    ],
    protein_g: 40,
    fat_g: 28,
    total_carbs_g: 6,
    fiber_g: 3,
    instructions: "Roast salmon and asparagus at 400 F. Spoon garlic melted in butter over the fish before serving.",
    allergen_tags: ["fish", "dairy"],
  },
  {
    name: "Lemon butter cod",
    meal_type: "dinner",
    ingredients: [
      { name: "cod", quantity: 6, unit: "oz" },
      { name: "zucchini", quantity: 1, unit: "cup" },
      { name: "butter", quantity: 1, unit: "tbsp" },
      { name: "lemon juice", quantity: 1, unit: "tbsp" },
    ],
    protein_g: 36,
    fat_g: 16,
    total_carbs_g: 5,
    fiber_g: 2,
    instructions: "Bake cod until it flakes. Warm zucchini in butter and lemon and spoon it beside the fish.",
    allergen_tags: ["fish", "dairy"],
  },
  {
    name: "Creamy Tuscan chicken",
    meal_type: "dinner",
    ingredients: [
      { name: "chicken thigh", quantity: 6, unit: "oz" },
      { name: "heavy cream", quantity: 0.25, unit: "cup" },
      { name: "baby spinach", quantity: 2, unit: "cups" },
      { name: "parmesan", quantity: 0.5, unit: "oz" },
      { name: "sun-dried tomatoes", quantity: 2, unit: "tbsp" },
    ],
    protein_g: 42,
    fat_g: 34,
    total_carbs_g: 7,
    fiber_g: 2,
    instructions: "Sear the thighs, then simmer cream, spinach, parmesan, and chopped sun-dried tomatoes for a few minutes.",
    allergen_tags: ["dairy"],
  },
  {
    name: "Cucumber guacamole cups",
    meal_type: "snack",
    ingredients: [
      { name: "cucumber", quantity: 0.5, unit: "whole" },
      { name: "avocado", quantity: 0.5, unit: "whole" },
      { name: "lime juice", quantity: 1, unit: "tsp" },
    ],
    protein_g: 2,
    fat_g: 12,
    total_carbs_g: 9,
    fiber_g: 6,
    instructions: "Mash avocado with lime and salt. Spoon it into cucumber cups cut from the other half.",
    allergen_tags: [],
  },
  {
    name: "Olive and pepperoni plate",
    meal_type: "snack",
    ingredients: [
      { name: "green olives", quantity: 10, unit: "olives" },
      { name: "pepperoni", quantity: 1, unit: "oz" },
    ],
    protein_g: 7,
    fat_g: 16,
    total_carbs_g: 3,
    fiber_g: 1,
    instructions: "Set olives and pepperoni on a plate. No cooking. Eat it cold.",
    allergen_tags: [],
  },
  {
    name: "Cheddar crisps",
    meal_type: "snack",
    ingredients: [{ name: "cheddar", quantity: 1.5, unit: "oz" }],
    protein_g: 10,
    fat_g: 14,
    total_carbs_g: 1,
    fiber_g: 0,
    instructions: "Mound small piles of shredded cheddar on parchment. Bake at 400 F until the edges brown, then cool until crisp.",
    allergen_tags: ["dairy"],
  },
  {
    name: "Roasted almonds",
    meal_type: "snack",
    ingredients: [{ name: "almonds", quantity: 1, unit: "oz" }],
    protein_g: 6,
    fat_g: 14,
    total_carbs_g: 6,
    fiber_g: 3,
    instructions: "Measure one ounce. A pinch of salt is plenty if they are not already salted.",
    allergen_tags: ["nuts"],
  },
  {
    name: "Hard-boiled eggs",
    meal_type: "snack",
    ingredients: [{ name: "eggs", quantity: 2, unit: "large" }],
    protein_g: 12,
    fat_g: 10,
    total_carbs_g: 1,
    fiber_g: 0,
    instructions: "Simmer eggs for 10 minutes, chill, peel, and season with salt.",
    allergen_tags: ["eggs"],
  },
  {
    name: "Macadamia nuts",
    meal_type: "snack",
    ingredients: [{ name: "macadamia nuts", quantity: 1, unit: "oz" }],
    protein_g: 2,
    fat_g: 21,
    total_carbs_g: 4,
    fiber_g: 2,
    instructions: "Measure one ounce. They are rich, so stop at the portion.",
    allergen_tags: ["nuts"],
  },
];

function round1(value) {
  return Math.round(value * 10) / 10;
}

const finalized = recipes.map((recipe) => {
  const net = round1(recipe.total_carbs_g - recipe.fiber_g);
  const calories = Math.round(recipe.protein_g * 4 + recipe.fat_g * 9 + net * 4);
  return { ...recipe, net_carbs_g: net, calories };
});

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlArray(tags) {
  if (tags.length === 0) return "'{}'::text[]";
  return `array[${tags.map(sqlString).join(", ")}]::text[]`;
}

const values = finalized
  .map((recipe) => {
    return `  (${[
      sqlString(recipe.name),
      sqlString(recipe.meal_type),
      sqlString(JSON.stringify(recipe.ingredients)) + "::jsonb",
      recipe.calories,
      recipe.protein_g,
      recipe.fat_g,
      recipe.total_carbs_g,
      recipe.fiber_g,
      recipe.net_carbs_g,
      sqlString(recipe.instructions),
      sqlArray(recipe.allergen_tags),
    ].join(", ")})`;
  })
  .join(",\n");

const sql = `-- Seeded keto recipe catalog. Generated by scripts/emit-recipe-seed.mjs.
-- Calories are label-style estimates: protein*4 + fat*9 + net carbs*4.
-- Net carbs = total carbs - fiber.

insert into public.recipes (
  name,
  meal_type,
  ingredients,
  calories,
  protein_g,
  fat_g,
  total_carbs_g,
  fiber_g,
  net_carbs_g,
  instructions,
  allergen_tags
) values
${values}
on conflict (name) do nothing;
`;

writeFileSync(join(root, "src/data/recipes.json"), JSON.stringify(finalized, null, 2) + "\n");
writeFileSync(join(root, "supabase/migrations/20261121041046_seed_recipes.sql"), sql);
console.log(`Wrote ${finalized.length} recipes`);
