import assert from "node:assert/strict";
import { test } from "node:test";
import { friendlyAuthError } from "./auth-errors";
import { isHttpOrigin, resolveSiteOrigin } from "./site-origin";

test("rate limit errors use the friendly signup message", () => {
  assert.equal(
    friendlyAuthError({ status: 429, code: "over_email_send_rate_limit", message: "email rate limit exceeded" }),
    "Too many sign-up attempts right now, please try again in a few minutes",
  );
});

test("known auth failures map to friendly copy and unknown ones keep the message", () => {
  assert.match(friendlyAuthError({ code: "weak_password", message: "Password should be at least 6 characters" }), /too weak/i);
  assert.match(friendlyAuthError({ message: "User already registered" }), /already has an account/i);
  assert.equal(friendlyAuthError({ code: "email_address_invalid", message: "Unable to validate email address" }), "Enter a valid email address.");
  assert.equal(friendlyAuthError({ message: "Database is restarting" }), "Database is restarting");
});

test("site origin prefers the public env and never invents localhost", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  assert.equal(isHttpOrigin("http://localhost:3000"), true);
  assert.equal(isHttpOrigin("https://keto-planner.vercel.app/auth"), false);
  assert.equal(resolveSiteOrigin("https://keto-planner.vercel.app"), "https://keto-planner.vercel.app");
  assert.equal(resolveSiteOrigin("not a url"), null);
  process.env.NEXT_PUBLIC_SITE_URL = "https://keto-planner.vercel.app";
  assert.equal(resolveSiteOrigin("http://localhost:3000"), "https://keto-planner.vercel.app");
  if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = previous;
});
