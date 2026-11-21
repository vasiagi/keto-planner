import assert from "node:assert/strict";
import { test } from "node:test";
import { loggingStreak } from "./streak";

test("streak counts through today and pauses on an unlogged today", () => {
  const dates = ["2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"];
  assert.equal(loggingStreak(dates, "2026-11-21"), 4);
  assert.equal(loggingStreak(dates.slice(0, 3), "2026-11-21"), 3);
  assert.equal(loggingStreak(["2026-11-18"], "2026-11-21"), 0);
  assert.equal(loggingStreak([], "2026-11-21"), 0);
});
