import assert from "node:assert/strict";
import { test } from "node:test";
import { isStaleServerActionMessage } from "./stale-action-message";

test("stale deployment errors match the Next.js messages", () => {
  assert.equal(
    isStaleServerActionMessage('Server Action "60e1aed5" was not found on the server.'),
    true,
  );
  assert.equal(isStaleServerActionMessage("Failed to find Server Action"), true);
  assert.equal(isStaleServerActionMessage("Email or password is incorrect."), false);
});
