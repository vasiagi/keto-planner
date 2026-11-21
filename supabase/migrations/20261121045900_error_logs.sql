-- App error log. Already applied on the live project; kept here so the schema is in the repo.
-- Do not treat this file as a change to re-run against production if the objects already exist.

create table public.error_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  level text not null default 'error',
  source text not null,
  message text not null,
  error_code text,
  path text,
  user_id uuid,
  user_email text,
  metadata jsonb not null default '{}'::jsonb,
  constraint error_logs_level_check check (level in ('debug', 'info', 'warn', 'error', 'fatal'))
);

create index error_logs_created_at_idx on public.error_logs (created_at desc);
create index error_logs_source_idx on public.error_logs (source);

alter table public.error_logs enable row level security;

revoke all on table public.error_logs from public, anon, authenticated;
revoke all on sequence public.error_logs_id_seq from public, anon, authenticated;

-- Inserts go through this function only. It runs as the owner so it can write
-- while the table has no policies for anon or authenticated.
create or replace function public.log_app_error(
  p_source text,
  p_message text,
  p_level text default 'error',
  p_error_code text default null,
  p_path text default null,
  p_user_email text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_level text := lower(coalesce(nullif(btrim(p_level), ''), 'error'));
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if v_level not in ('debug', 'info', 'warn', 'error', 'fatal') then
    v_level := 'error';
  end if;
  if jsonb_typeof(v_metadata) is distinct from 'object' then
    v_metadata := '{}'::jsonb;
  end if;

  insert into public.error_logs (
    level,
    source,
    message,
    error_code,
    path,
    user_id,
    user_email,
    metadata
  )
  values (
    v_level,
    left(coalesce(nullif(btrim(p_source), ''), 'app'), 200),
    left(coalesce(p_message, ''), 4000),
    left(nullif(btrim(p_error_code), ''), 120),
    left(nullif(btrim(p_path), ''), 500),
    auth.uid(),
    left(nullif(btrim(p_user_email), ''), 320),
    v_metadata
  );
end;
$$;

revoke all on function public.log_app_error(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.log_app_error(text, text, text, text, text, text, jsonb) to anon, authenticated, service_role;
