import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, daysBetween, isIsoDate, mondayOf } from "./dates";

test("civil dates reject impossible calendar days", () => {
  assert.equal(isIsoDate("2026-11-21"), true);
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(isIsoDate("2024-02-29"), true);
  assert.equal(isIsoDate("11/21/2026"), false);
});

test("mondayOf returns the Monday of that week", () => {
  assert.equal(mondayOf("2026-11-21"), "2026-11-16");
  assert.equal(mondayOf("2026-11-16"), "2026-11-16");
  assert.equal(mondayOf("2026-11-22"), "2026-11-16");
});

test("addDays and daysBetween stay on the civil calendar", () => {
  assert.equal(addDays("2026-11-21", 10), "2026-12-01");
  assert.equal(daysBetween("2026-11-16", "2026-11-22"), 6);
});
