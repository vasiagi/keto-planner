-- Cedar keto planner schema.
-- Apply this file first, then 20261121041046_seed_recipes.sql.
-- Runs as plain SQL. The Data API uses the anon key, so RLS is the access boundary.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres;

-- Signup inserts a profile before the user has a session. Keep this function
-- out of the exposed public schema. It is security definer so it can insert
-- while RLS is enabled.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Stamp the row owner from the verified JWT. A missing uid is allowed only
-- for the signup trigger, which inserts the new auth user id itself.
create or replace function private.assign_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then
    if tg_table_name = 'profiles' and tg_op = 'INSERT' and new.id is not null then
      return new;
    end if;
    raise exception 'not authenticated';
  end if;

  if tg_table_name = 'profiles' then
    if tg_op = 'UPDATE' then
      new.id = old.id;
    else
      new.id = auth.uid();
    end if;
  else
    if tg_op = 'UPDATE' then
      new.user_id = old.user_id;
    else
      new.user_id = auth.uid();
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon;
revoke all on function private.assign_owner() from public, anon;

grant execute on function private.set_updated_at() to authenticated;
grant execute on function private.assign_owner() to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema private to supabase_auth_admin;
    grant execute on function private.handle_new_user() to supabase_auth_admin;
  end if;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  start_weight_lb numeric(5, 1),
  goal_weight_lb numeric(5, 1),
  height_in numeric(4, 1),
  age smallint,
  sex text,
  activity_level text,
  diet_style text,
  allergies text[] not null default '{}',
  dislikes text not null default '',
  bmr_kcal integer,
  tdee_kcal integer,
  daily_calories integer,
  protein_g integer,
  fat_g integer,
  net_carb_cap_g integer,
  weekly_loss_lb numeric(4, 2),
  goal_date date,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_sex_check check (sex is null or sex in ('male', 'female')),
  constraint profiles_activity_check check (
    activity_level is null or activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  constraint profiles_diet_check check (diet_style is null or diet_style in ('strict_keto', 'low_carb')),
  constraint profiles_start_weight_check check (start_weight_lb is null or start_weight_lb between 70 and 700),
  constraint profiles_goal_weight_check check (goal_weight_lb is null or goal_weight_lb between 70 and 700),
  constraint profiles_height_check check (height_in is null or height_in between 48 and 84),
  constraint profiles_age_check check (age is null or age between 18 and 90),
  constraint profiles_allergies_check check (
    allergies <@ array['dairy', 'eggs', 'nuts', 'peanuts', 'shellfish', 'fish', 'soy', 'sesame', 'gluten']::text[]
  ),
  constraint profiles_dislikes_check check (char_length(dislikes) <= 300),
  constraint profiles_calories_check check (daily_calories is null or daily_calories between 800 and 6000),
  constraint profiles_loss_check check (weekly_loss_lb is null or weekly_loss_lb between 0 and 2.5)
);

create table public.recipes (
  id bigint generated always as identity primary key,
  name text not null unique,
  meal_type text not null,
  ingredients jsonb not null,
  calories integer not null,
  protein_g numeric(6, 1) not null,
  fat_g numeric(6, 1) not null,
  total_carbs_g numeric(6, 1) not null,
  fiber_g numeric(6, 1) not null,
  net_carbs_g numeric(6, 1) not null,
  instructions text not null,
  allergen_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint recipes_meal_type_check check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  constraint recipes_ingredients_check check (jsonb_typeof(ingredients) = 'array'),
  constraint recipes_macros_check check (
    calories between 0 and 2000
    and protein_g >= 0
    and fat_g >= 0
    and total_carbs_g >= 0
    and fiber_g >= 0
    and net_carbs_g >= 0
  ),
  constraint recipes_allergens_check check (
    allergen_tags <@ array['dairy', 'eggs', 'nuts', 'peanuts', 'shellfish', 'fish', 'soy', 'sesame', 'gluten']::text[]
  )
);

create table public.meal_plans (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  constraint meal_plans_user_week_key unique (user_id, week_start)
);

create table public.meal_plan_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_plan_id bigint not null references public.meal_plans (id) on delete cascade,
  day_offset smallint not null,
  meal_type text not null,
  recipe_id bigint not null references public.recipes (id),
  constraint meal_plan_items_slot_key unique (meal_plan_id, day_offset, meal_type),
  constraint meal_plan_items_day_check check (day_offset between 0 and 6),
  constraint meal_plan_items_meal_check check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack'))
);

create table public.grocery_checks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_plan_id bigint not null references public.meal_plans (id) on delete cascade,
  item_key text not null,
  checked boolean not null default false,
  constraint grocery_checks_item_key unique (meal_plan_id, item_key),
  constraint grocery_checks_key_length check (char_length(item_key) between 1 and 200)
);

create table public.daily_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  water_oz integer not null default 0,
  steps integer,
  fast_started_at timestamptz,
  fast_ended_at timestamptz,
  fast_target_hours smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_logs_user_date_key unique (user_id, log_date),
  constraint daily_logs_water_check check (water_oz between 0 and 400),
  constraint daily_logs_steps_check check (steps is null or steps between 0 and 200000),
  constraint daily_logs_fast_hours_check check (
    fast_target_hours is null or fast_target_hours between 12 and 24
  )
);

create table public.logged_meals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  meal_type text not null,
  recipe_id bigint not null references public.recipes (id),
  eaten boolean not null default true,
  constraint logged_meals_slot_key unique (user_id, log_date, meal_type),
  constraint logged_meals_meal_check check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack'))
);

create table public.weight_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_on date not null,
  weight_lb numeric(5, 1) not null,
  created_at timestamptz not null default now(),
  constraint weight_logs_user_day_key unique (user_id, logged_on),
  constraint weight_logs_weight_check check (weight_lb between 70 and 700)
);

create index recipes_meal_type_idx on public.recipes (meal_type);
create index meal_plan_items_user_id_idx on public.meal_plan_items (user_id);
create index meal_plan_items_plan_id_idx on public.meal_plan_items (meal_plan_id);
create index meal_plan_items_recipe_id_idx on public.meal_plan_items (recipe_id);
create index grocery_checks_user_id_idx on public.grocery_checks (user_id);
create index logged_meals_recipe_id_idx on public.logged_meals (recipe_id);
create index weight_logs_user_logged_on_idx on public.weight_logs (user_id, logged_on);

create trigger profiles_assign_owner
  before insert or update on public.profiles
  for each row execute function private.assign_owner();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger meal_plans_assign_owner
  before insert or update on public.meal_plans
  for each row execute function private.assign_owner();

create trigger meal_plan_items_assign_owner
  before insert or update on public.meal_plan_items
  for each row execute function private.assign_owner();

create trigger grocery_checks_assign_owner
  before insert or update on public.grocery_checks
  for each row execute function private.assign_owner();

create trigger daily_logs_assign_owner
  before insert or update on public.daily_logs
  for each row execute function private.assign_owner();

create trigger daily_logs_set_updated_at
  before update on public.daily_logs
  for each row execute function private.set_updated_at();

create trigger logged_meals_assign_owner
  before insert or update on public.logged_meals
  for each row execute function private.assign_owner();

create trigger weight_logs_assign_owner
  before insert or update on public.weight_logs
  for each row execute function private.assign_owner();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;
alter table public.grocery_checks enable row level security;
alter table public.daily_logs enable row level security;
alter table public.logged_meals enable row level security;
alter table public.weight_logs enable row level security;

-- Recipes are a shared catalog. Authenticated users can read them. No write policies.
create policy recipes_select on public.recipes
  for select to authenticated
  using (true);

create policy profiles_select on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy profiles_delete on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = id);

create policy meal_plans_select on public.meal_plans
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy meal_plans_insert on public.meal_plans
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy meal_plans_update on public.meal_plans
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy meal_plans_delete on public.meal_plans
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy meal_plan_items_select on public.meal_plan_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy meal_plan_items_insert on public.meal_plan_items
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.meal_plans
      where meal_plans.id = meal_plan_id
        and meal_plans.user_id = (select auth.uid())
    )
  );

create policy meal_plan_items_update on public.meal_plan_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.meal_plans
      where meal_plans.id = meal_plan_id
        and meal_plans.user_id = (select auth.uid())
    )
  );

create policy meal_plan_items_delete on public.meal_plan_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy grocery_checks_select on public.grocery_checks
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy grocery_checks_insert on public.grocery_checks
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.meal_plans
      where meal_plans.id = meal_plan_id
        and meal_plans.user_id = (select auth.uid())
    )
  );

create policy grocery_checks_update on public.grocery_checks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.meal_plans
      where meal_plans.id = meal_plan_id
        and meal_plans.user_id = (select auth.uid())
    )
  );

create policy grocery_checks_delete on public.grocery_checks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy daily_logs_select on public.daily_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy daily_logs_insert on public.daily_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy daily_logs_update on public.daily_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy daily_logs_delete on public.daily_logs
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy logged_meals_select on public.logged_meals
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy logged_meals_insert on public.logged_meals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy logged_meals_update on public.logged_meals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy logged_meals_delete on public.logged_meals
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy weight_logs_select on public.weight_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy weight_logs_insert on public.weight_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy weight_logs_update on public.weight_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy weight_logs_delete on public.weight_logs
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Cloud projects grant new public tables to anon automatically. Take that back.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.recipes from anon, authenticated;
revoke all on table public.meal_plans from anon, authenticated;
revoke all on table public.meal_plan_items from anon, authenticated;
revoke all on table public.grocery_checks from anon, authenticated;
revoke all on table public.daily_logs from anon, authenticated;
revoke all on table public.logged_meals from anon, authenticated;
revoke all on table public.weight_logs from anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select on table public.recipes to authenticated;
grant select, insert, update, delete on table public.meal_plans to authenticated;
grant select, insert, update, delete on table public.meal_plan_items to authenticated;
grant select, insert, update, delete on table public.grocery_checks to authenticated;
grant select, insert, update, delete on table public.daily_logs to authenticated;
grant select, insert, update, delete on table public.logged_meals to authenticated;
grant select, insert, update, delete on table public.weight_logs to authenticated;

revoke all on all sequences in schema public from anon, authenticated;
grant usage, select on all sequences in schema public to authenticated;
