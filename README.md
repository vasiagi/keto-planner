# Cedar

Weekly keto and low-carb meal planning for one person. The app signs people in with Supabase Auth, stores their plan in Postgres under row level security, and is meant to deploy on Vercel.

The starting example in onboarding is 250 lb now and 200 lb as the goal. Height, age, sex, and activity are entered on that screen because the calorie equation needs them.

## Stack

- Next.js 16 (App Router) and TypeScript
- Tailwind CSS
- Supabase Auth and Postgres through `@supabase/ssr`
- The anon/publishable key only. There is no service-role key in this app.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.example` already points at the project URL and the public key used for local builds. On Vercel, set the same two variables for Production and Preview:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do not add a service-role or secret key.

## Apply the database

Run these files in the Supabase SQL editor, in this order. Each file is plain SQL.

1. `supabase/migrations/20261121041045_init_schema.sql`
2. `supabase/migrations/20261121041046_seed_recipes.sql`

The first file creates the tables, the signup profile trigger, and row level security. The second seeds 30 recipes. Re-running the seed is safe: recipe names are unique and the insert uses `on conflict do nothing`.

If you use the Supabase CLI against a linked project, `supabase db push` applies the same files in order.

## Auth settings to change in Supabase

Email/password can stay on, including **Confirm email**.

In Authentication → URL configuration:

- Site URL: your production origin, for example `https://your-app.vercel.app`. For local only, `http://localhost:3000`.
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://your-app.vercel.app/auth/callback`
  - `https://*.vercel.app/auth/callback` if you want preview deployments to confirm email too

Signup sends people back to `/auth/callback`, which exchanges the confirmation code for a session and then opens `/onboarding`. If email confirmation is enabled, the app tells them to check their email and does not sign them in until they use the link. The same route also accepts `token_hash` and `type` when the email template uses that form.

A trigger on `auth.users` inserts a `profiles` row at signup. Onboarding inserts one if that row is missing.

## Scripts

- `npm run dev` — local app
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — nutrition, plan, grocery, streak, and seed checks

Regenerate the recipe seed after editing `scripts/emit-recipe-seed.mjs`:

```bash
node scripts/emit-recipe-seed.mjs
```

## How the targets are calculated

- BMR is Mifflin-St Jeor. The sex field is the male or female constant from that equation.
- TDEE multiplies BMR by activity: sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very active 1.9.
- The preferred deficit is 750 kcal/day (about 1.5 lb/week), capped at 1,000 kcal/day (2 lb/week).
- Intake does not go below 1,500 kcal for male or 1,200 kcal for female. If the floor gets in the way, the weekly loss is slower.
- Strict keto caps net carbs at 20 g. Low-carb caps them at 30 g.
- Protein is 1.6 g per kg of goal weight. Fat fills the remaining calories.
- The goal date assumes that weekly rate from the day you save onboarding. 50 lb at 1.5 lb/week is 234 days.

Recipe calories are label-style estimates: protein × 4 + fat × 9 + net carbs × 4. Net carbs are total carbs minus fiber.

This is not medical advice. Onboarding says so, and the person has to confirm they read it.

## What is included

- Email/password sign up, sign in, and sign out, including the check-your-email state
- Onboarding and saved targets
- A Monday-based weekly plan (breakfast, lunch, dinner, snack) that skips allergies and comma-separated dislikes, with meal swap
- A grocery list summed from that plan, with check-off
- A daily log for meals eaten, net carbs against the cap, water, steps, and a 16/18/20 hour fasting timer
- Weight log, chart, pounds lost, pounds to go, and a badge every 10 lb
- Dashboard for today macros, logging streak, and progress
- A short keto-flu and electrolyte note

Every user-owned table has RLS so a signed-in person can only select, insert, update, and delete their own rows. Recipes are readable by signed-in people and have no write policy.

## Not in this version

- Password reset
- Custom recipes or a larger food database
- Barcode search or a paid nutrition API
