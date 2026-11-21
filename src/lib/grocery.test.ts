import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateGroceries, formatQuantity, groceryKey } from "./grocery";

test("grocery lines sum matching name and unit and keep different units apart", () => {
  const lines = aggregateGroceries([
    [
      { name: "Eggs", quantity: 2, unit: "large" },
      { name: "olive oil", quantity: 1, unit: "tbsp" },
    ],
    [
      { name: "eggs", quantity: 3, unit: "large" },
      { name: "olive oil", quantity: 1, unit: "tsp" },
    ],
  ]);
  assert.deepEqual(lines, [
    { key: groceryKey("Eggs", "large"), name: "Eggs", unit: "large", quantity: 5 },
    { key: groceryKey("olive oil", "tbsp"), name: "olive oil", unit: "tbsp", quantity: 1 },
    { key: groceryKey("olive oil", "tsp"), name: "olive oil", unit: "tsp", quantity: 1 },
  ]);
});

test("formatQuantity trims trailing zeros", () => {
  assert.equal(formatQuantity(2), "2");
  assert.equal(formatQuantity(2.5), "2.5");
  assert.equal(formatQuantity(2.04), "2");
});
