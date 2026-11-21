import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACTIVITY_MULTIPLIERS,
  buildTargets,
  calorieTarget,
  goalDateISO,
  lossBadges,
  macroTargets,
  mifflinStJeorBmr,
  netCarbCap,
  poundsLost,
  poundsToGo,
} from "./nutrition";

test("mifflin-st jeor uses the published sex constants", () => {
  const male = mifflinStJeorBmr({ sex: "male", age: 30, heightIn: 70, weightLb: 180 });
  const weightKg = 180 * 0.45359237;
  const heightCm = 70 * 2.54;
  assert.ok(Math.abs(male - (10 * weightKg + 6.25 * heightCm - 5 * 30 + 5)) < 0.001);

  const female = mifflinStJeorBmr({ sex: "female", age: 30, heightIn: 70, weightLb: 180 });
  assert.ok(Math.abs(male - female - 166) < 0.001);
});

test("activity multipliers match the standard TDEE factors", () => {
  assert.equal(ACTIVITY_MULTIPLIERS.sedentary, 1.2);
  assert.equal(ACTIVITY_MULTIPLIERS.light, 1.375);
  assert.equal(ACTIVITY_MULTIPLIERS.moderate, 1.55);
  assert.equal(ACTIVITY_MULTIPLIERS.active, 1.725);
  assert.equal(ACTIVITY_MULTIPLIERS.very_active, 1.9);
});

test("preferred deficit is 1.5 lb per week and never above 2", () => {
  const comfortable = calorieTarget(3200, "male");
  assert.equal(comfortable.deficit, 750);
  assert.equal(comfortable.calories, 2450);
  assert.ok(Math.abs(comfortable.weeklyLossLb - 1.5) < 0.001);

  const high = calorieTarget(5000, "female");
  assert.equal(high.deficit, 750);
  assert.ok(high.weeklyLossLb <= 2);
});

test("calorie floor reduces the deficit instead of going below it", () => {
  const male = calorieTarget(1800, "male");
  assert.equal(male.calories, 1500);
  assert.equal(male.deficit, 300);
  assert.ok(male.weeklyLossLb < 1);

  const female = calorieTarget(1600, "female");
  assert.equal(female.calories, 1200);
  assert.equal(female.deficit, 400);

  const alreadyLow = calorieTarget(1400, "male");
  assert.equal(alreadyLow.deficit, 0);
  assert.equal(alreadyLow.weeklyLossLb, 0);
});

test("net carb caps are 20 g strict keto and 30 g low-carb", () => {
  assert.equal(netCarbCap("strict_keto"), 20);
  assert.equal(netCarbCap("low_carb"), 30);
});

test("macros fill calories with protein from goal weight and fat as the remainder", () => {
  const macros = macroTargets({ calories: 2400, diet: "strict_keto", goalWeightLb: 200 });
  assert.equal(macros.netCarbG, 20);
  const expectedProtein = Math.round(200 * 0.45359237 * 1.6);
  assert.equal(macros.proteinG, expectedProtein);
  const used = macros.proteinG * 4 + macros.fatG * 9 + macros.netCarbG * 4;
  assert.ok(Math.abs(used - 2400) < 9);
});

test("protein drops when it would crowd out the calorie budget", () => {
  const macros = macroTargets({ calories: 1200, diet: "strict_keto", goalWeightLb: 400 });
  assert.ok(macros.proteinG * 4 + macros.netCarbG * 4 <= 1200);
  assert.ok(macros.fatG >= 0);
});

test("goal date for 50 lb at 1.5 lb per week", () => {
  assert.equal(
    goalDateISO({
      currentWeightLb: 250,
      goalWeightLb: 200,
      weeklyLossLb: 1.5,
      from: "2026-11-16",
    }),
    "2027-07-08",
  );
  assert.equal(
    goalDateISO({
      currentWeightLb: 200,
      goalWeightLb: 200,
      weeklyLossLb: 1.5,
      from: "2026-11-16",
    }),
    null,
  );
});

test("client scenario: 250 lb toward 200 lb, 5 ft 10 in, age 40, male, moderate, strict keto", () => {
  const plan = buildTargets({
    sex: "male",
    age: 40,
    heightIn: 70,
    currentWeightLb: 250,
    goalWeightLb: 200,
    activity: "moderate",
    diet: "strict_keto",
    from: "2026-11-21",
  });
  assert.equal(plan.deficit, 750);
  assert.equal(plan.weeklyLossLb, 1.5);
  assert.equal(plan.netCarbG, 20);
  assert.ok(plan.calories > 2000);
  assert.equal(plan.goalDate, "2027-07-13");
  assert.ok(plan.proteinG > 100);
  assert.ok(plan.fatG > plan.proteinG);
});

test("progress helpers and 10 lb badges", () => {
  assert.equal(poundsLost(250, 229.4), 20.6);
  assert.equal(poundsToGo(229.4, 200), 29.4);
  const badges = lossBadges(250, 229.4, 200);
  assert.deepEqual(
    badges.map((badge) => [badge.pounds, badge.earned]),
    [
      [10, true],
      [20, true],
      [30, false],
      [40, false],
      [50, false],
    ],
  );
});
