-- Harvest: initial schema
-- Every row belongs to a user; row-level security keeps farms private.

-- ── Profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  farm_name    text,                       -- null until onboarding is finished
  timezone     text not null default 'UTC',
  created_at   timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, timezone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Habits (one per plot) ───────────────────────────────────────────────────
create table public.habits (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 60),
  crop_type        text not null check (crop_type in ('carrot','sunflower','strawberry','pumpkin','lavender','wheat')),
  plot_index       smallint not null check (plot_index between 0 and 8),
  cycle_started_on date not null,
  created_at       timestamptz not null default now(),
  archived_at      timestamptz
);
create index habits_user_idx on public.habits (user_id) where archived_at is null;

-- ── Completions (one per habit per day) ─────────────────────────────────────
create table public.completions (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day        date not null,
  kind       text not null default 'done' check (kind in ('done','rest')),
  created_at timestamptz not null default now(),
  unique (habit_id, day)
);
create index completions_user_day_idx on public.completions (user_id, day);

-- ── Harvests (the pantry) ───────────────────────────────────────────────────
create table public.harvests (
  id           uuid primary key default gen_random_uuid(),
  habit_id     uuid references public.habits (id) on delete set null,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  crop_type    text not null,
  habit_name   text not null,
  harvested_on date not null,
  cycle_length integer not null,
  created_at   timestamptz not null default now()
);

-- ── Cycles (finished growing seasons, harvested or died) ────────────────────
create table public.cycles (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid references public.habits (id) on delete set null,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  crop_type  text not null,
  habit_name text not null,
  started_on date not null,
  ended_on   date not null,
  outcome    text not null check (outcome in ('harvested','died')),
  created_at timestamptz not null default now()
);

-- ── Row-level security ──────────────────────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.habits      enable row level security;
alter table public.completions enable row level security;
alter table public.harvests    enable row level security;
alter table public.cycles      enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own habits" on public.habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own completions" on public.completions
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
  );

create policy "own harvests" on public.harvests
  for select using (user_id = auth.uid());

create policy "own cycles" on public.cycles
  for select using (user_id = auth.uid());

-- ── Season changes (atomic; run as the calling user so RLS still applies) ───
create function public.harvest_habit(p_habit_id uuid, p_today date)
returns void
language plpgsql
security invoker set search_path = ''
as $$
declare h public.habits;
begin
  select * into h from public.habits where id = p_habit_id and user_id = auth.uid() for update;
  if not found then raise exception 'habit not found'; end if;

  insert into public.harvests (habit_id, crop_type, habit_name, harvested_on, cycle_length)
  values (h.id, h.crop_type, h.name, p_today, p_today - h.cycle_started_on + 1);

  insert into public.cycles (habit_id, crop_type, habit_name, started_on, ended_on, outcome)
  values (h.id, h.crop_type, h.name, h.cycle_started_on, p_today, 'harvested');

  -- the soil rests for the remainder of today; the next season starts tomorrow
  update public.habits set cycle_started_on = p_today + 1 where id = h.id;
end;
$$;

create function public.replant_habit(p_habit_id uuid, p_died_on date, p_today date)
returns void
language plpgsql
security invoker set search_path = ''
as $$
declare h public.habits;
begin
  select * into h from public.habits where id = p_habit_id and user_id = auth.uid() for update;
  if not found then raise exception 'habit not found'; end if;

  insert into public.cycles (habit_id, crop_type, habit_name, started_on, ended_on, outcome)
  values (h.id, h.crop_type, h.name, h.cycle_started_on, p_died_on, 'died');

  update public.habits set cycle_started_on = p_today where id = h.id;
end;
$$;

-- the season functions run as the caller, so they need these insert rights
create policy "insert own harvests" on public.harvests for insert with check (user_id = auth.uid());
create policy "insert own cycles"   on public.cycles   for insert with check (user_id = auth.uid());
