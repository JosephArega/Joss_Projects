-- ============================================================
-- ጉዞ (Guzo) — community traffic intelligence for Addis Ababa
-- Supabase schema: Postgres + PostGIS
-- Apply with:  supabase db push   (or psql -f schema.sql)
-- ============================================================

create extension if not exists postgis;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type report_type as enum
  ('traffic', 'police', 'blocked', 'pothole', 'flood', 'accident', 'fuel', 'tip');

create type report_status as enum
  ('active', 'high_priority', 'dismissed', 'expired');

create type vehicle_type as enum
  ('car', 'minibus', 'taxi', 'truck', 'bajaj', 'motorbike', 'other');

-- ------------------------------------------------------------
-- profiles — optional driver identity (nickname, vehicle, reputation).
-- Basic reporting never requires a row here: anonymous devices are
-- identified only by a random per-install UUID (device_key).
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text unique check (char_length(nickname) between 2 and 24),
  vehicle vehicle_type not null default 'car',
  reputation integer not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- reports — the live map feed. Coordinates constrained to the
-- Addis Ababa bounding box; a generated PostGIS point powers
-- radius and corridor queries.
-- ------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  type report_type not null,
  lat double precision not null check (lat between 8.7 and 9.3),
  lng double precision not null check (lng between 38.5 and 39.1),
  location geography(point, 4326) generated always as
    (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  note text check (char_length(note) <= 280),
  neighborhood text,
  device_key text not null,  -- random per-install UUID; no PII
  user_id uuid references auth.users (id) on delete set null,
  confirmations integer not null default 0,
  dismissals integer not null default 0,
  status report_status not null default 'active',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);

create index reports_location_idx on public.reports using gist (location);
create index reports_active_idx on public.reports (status, expires_at desc);
create index reports_device_recent_idx on public.reports (device_key, created_at desc);

-- ------------------------------------------------------------
-- report_votes — community verification. vote = 1 (still there)
-- or -1 (gone). One vote per device per report; re-voting flips it.
-- ------------------------------------------------------------
create table public.report_votes (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports (id) on delete cascade,
  voter_key text not null,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (report_id, voter_key)
);

-- Recount + apply community rules on every vote:
--   * 3+ confirmations           -> high_priority
--   * 3+ dismissals (majority)   -> dismissed (hidden)
--   * each confirmation keeps the report alive 20 more minutes
--   * reaching high_priority rewards the author's reputation
create or replace function public.apply_report_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.reports;
begin
  update public.reports set
    confirmations = (select count(*) from public.report_votes v
                     where v.report_id = new.report_id and v.vote = 1),
    dismissals    = (select count(*) from public.report_votes v
                     where v.report_id = new.report_id and v.vote = -1)
  where id = new.report_id
  returning * into r;

  if r.dismissals >= 3 and r.dismissals > r.confirmations then
    update public.reports set status = 'dismissed' where id = r.id;
  elsif r.confirmations >= 3 and r.status = 'active' then
    update public.reports set status = 'high_priority' where id = r.id;
    if r.user_id is not null then
      update public.profiles set reputation = reputation + 5 where id = r.user_id;
    end if;
  end if;

  if new.vote = 1 then
    update public.reports
      set expires_at = greatest(expires_at, now() + interval '20 minutes')
      where id = new.report_id;
  end if;

  return new;
end;
$$;

create trigger report_votes_apply
after insert or update on public.report_votes
for each row execute function public.apply_report_vote();

-- ------------------------------------------------------------
-- tips — the chat tips board, geotagged to neighborhoods.
-- ------------------------------------------------------------
create table public.tips (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 2 and 500),
  neighborhood text not null,
  lat double precision,
  lng double precision,
  device_key text not null,
  user_id uuid references auth.users (id) on delete set null,
  nickname text check (char_length(nickname) <= 24),
  upvotes integer not null default 0,
  created_at timestamptz not null default now()
);

create index tips_neighborhood_idx on public.tips (neighborhood, created_at desc);

create table public.tip_votes (
  tip_id uuid not null references public.tips (id) on delete cascade,
  voter_key text not null,
  created_at timestamptz not null default now(),
  primary key (tip_id, voter_key)
);

create or replace function public.apply_tip_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tips
    set upvotes = (select count(*) from public.tip_votes v where v.tip_id = new.tip_id)
    where id = new.tip_id;
  return new;
end;
$$;

create trigger tip_votes_apply
after insert on public.tip_votes
for each row execute function public.apply_tip_vote();

-- ------------------------------------------------------------
-- devices — opt-in push notification registry (2 km nearby alerts).
-- Read only by the service role (edge function); never by clients.
-- ------------------------------------------------------------
create table public.devices (
  device_key text primary key,
  expo_push_token text,
  last_lat double precision,
  last_lng double precision,
  notify_enabled boolean not null default false,
  notify_radius_km numeric not null default 2,
  language text not null default 'am',
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- active_reports — the public read surface. Filters to live
-- reports and hides device_key / user_id.
-- ------------------------------------------------------------
create or replace view public.active_reports as
select
  r.id, r.type, r.lat, r.lng, r.note, r.neighborhood,
  r.confirmations, r.dismissals, r.status, r.created_at, r.expires_at,
  p.nickname as author_nickname
from public.reports r
left join public.profiles p on p.id = r.user_id
where r.status in ('active', 'high_priority')
  and r.expires_at > now();

-- ------------------------------------------------------------
-- RPC: submit_report — anonymous-friendly insert with a simple
-- per-device rate limit (max 5 reports / 10 minutes).
-- ------------------------------------------------------------
create or replace function public.submit_report(
  p_type report_type,
  p_lat double precision,
  p_lng double precision,
  p_device_key text,
  p_note text default null,
  p_neighborhood text default null
)
returns setof public.active_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent integer;
  v_id uuid;
begin
  select count(*) into v_recent
  from public.reports
  where device_key = p_device_key
    and created_at > now() - interval '10 minutes';

  if v_recent >= 5 then
    raise exception 'rate_limited: too many reports from this device, try again shortly';
  end if;

  insert into public.reports (type, lat, lng, note, neighborhood, device_key, user_id)
  values (p_type, p_lat, p_lng, nullif(trim(p_note), ''), p_neighborhood, p_device_key, auth.uid())
  returning id into v_id;

  return query select * from public.active_reports where id = v_id;
end;
$$;

-- ------------------------------------------------------------
-- RPC: vote_report — upsert a confirm/dismiss vote.
-- Returns the updated report (empty set once dismissed/expired).
-- ------------------------------------------------------------
create or replace function public.vote_report(
  p_report_id uuid,
  p_voter_key text,
  p_vote smallint
)
returns setof public.active_reports
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.report_votes (report_id, voter_key, vote)
  values (p_report_id, p_voter_key, p_vote)
  on conflict (report_id, voter_key)
  do update set vote = excluded.vote, created_at = now();

  return query select * from public.active_reports where id = p_report_id;
end;
$$;

-- ------------------------------------------------------------
-- RPC: reports_nearby — radius query for map refresh / alerts.
-- ------------------------------------------------------------
create or replace function public.reports_nearby(
  p_lat double precision,
  p_lng double precision,
  p_radius_km numeric default 5
)
returns table (
  id uuid, type report_type, lat double precision, lng double precision,
  note text, neighborhood text, confirmations integer, dismissals integer,
  status report_status, created_at timestamptz, expires_at timestamptz,
  author_nickname text, distance_m double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select a.*,
         st_distance(r.location,
           st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
  from public.active_reports a
  join public.reports r using (id)
  where st_dwithin(r.location,
          st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
          p_radius_km * 1000)
  order by distance_m;
$$;

-- ------------------------------------------------------------
-- RPC: reports_along_route — route advisory. p_points is a JSON
-- array of [lat, lng] pairs (2+ points; pass the route polyline
-- once real routing lands, or just [origin, destination] for the
-- straight-corridor MVP).
-- ------------------------------------------------------------
create or replace function public.reports_along_route(
  p_points jsonb,
  p_corridor_km numeric default 0.7
)
returns table (
  id uuid, type report_type, lat double precision, lng double precision,
  note text, neighborhood text, confirmations integer, dismissals integer,
  status report_status, created_at timestamptz, expires_at timestamptz,
  author_nickname text, distance_m double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with line as (
    select st_makeline(array(
      select st_setsrid(st_makepoint((pt->>1)::float8, (pt->>0)::float8), 4326)
      from jsonb_array_elements(p_points) pt
    ))::geography as g
  )
  select a.*, st_distance(r.location, line.g) as distance_m
  from line, public.active_reports a
  join public.reports r using (id)
  where st_dwithin(r.location, line.g, p_corridor_km * 1000)
  order by distance_m;
$$;

-- ------------------------------------------------------------
-- RPC: post_tip — tips board insert, rate limited 3 / 10 minutes.
-- ------------------------------------------------------------
create or replace function public.post_tip(
  p_body text,
  p_neighborhood text,
  p_device_key text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_nickname text default null
)
returns setof public.tips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent integer;
  v_id uuid;
begin
  select count(*) into v_recent
  from public.tips
  where device_key = p_device_key
    and created_at > now() - interval '10 minutes';

  if v_recent >= 3 then
    raise exception 'rate_limited: too many tips from this device, try again shortly';
  end if;

  insert into public.tips (body, neighborhood, lat, lng, device_key, user_id, nickname)
  values (trim(p_body), p_neighborhood, p_lat, p_lng, p_device_key, auth.uid(),
          nullif(trim(coalesce(p_nickname, '')), ''))
  returning id into v_id;

  return query select * from public.tips where id = v_id;
end;
$$;

-- ------------------------------------------------------------
-- RPC: upvote_tip
-- ------------------------------------------------------------
create or replace function public.upvote_tip(
  p_tip_id uuid,
  p_voter_key text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.tip_votes (tip_id, voter_key)
  values (p_tip_id, p_voter_key)
  on conflict do nothing;
$$;

-- ------------------------------------------------------------
-- RPC: register_device — opt-in push registration.
-- ------------------------------------------------------------
create or replace function public.register_device(
  p_device_key text,
  p_token text,
  p_lat double precision,
  p_lng double precision,
  p_enabled boolean,
  p_radius_km numeric,
  p_language text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.devices
    (device_key, expo_push_token, last_lat, last_lng, notify_enabled, notify_radius_km, language, updated_at)
  values
    (p_device_key, p_token, p_lat, p_lng, p_enabled, coalesce(p_radius_km, 2), coalesce(p_language, 'am'), now())
  on conflict (device_key) do update set
    expo_push_token = excluded.expo_push_token,
    last_lat = excluded.last_lat,
    last_lng = excluded.last_lng,
    notify_enabled = excluded.notify_enabled,
    notify_radius_km = excluded.notify_radius_km,
    language = excluded.language,
    updated_at = now();
$$;

-- ------------------------------------------------------------
-- Expiry sweep — auto-fade: mark stale rows expired. Schedule with
-- pg_cron (Dashboard → Database → Extensions) e.g. every 10 min:
--   select cron.schedule('guzo-expire', '*/10 * * * *',
--                        $$select public.expire_reports()$$);
-- The client also filters by expires_at, so this is hygiene only.
-- ------------------------------------------------------------
create or replace function public.expire_reports()
returns void
language sql
security definer
set search_path = public
as $$
  update public.reports
    set status = 'expired'
    where status in ('active', 'high_priority')
      and expires_at < now();
$$;

-- ------------------------------------------------------------
-- Row Level Security
-- Writes go exclusively through the SECURITY DEFINER RPCs above,
-- so no insert/update policies are granted to clients.
-- NOTE: the reports select policy exists so Realtime can deliver
-- change events; device_key is a random per-install UUID (no PII).
-- V2: move realtime fan-out to a broadcast channel and drop it.
-- ------------------------------------------------------------
alter table public.reports enable row level security;
alter table public.report_votes enable row level security;
alter table public.tips enable row level security;
alter table public.tip_votes enable row level security;
alter table public.devices enable row level security;
alter table public.profiles enable row level security;

create policy "live reports are public" on public.reports
  for select using (status in ('active', 'high_priority'));

create policy "tips are public" on public.tips
  for select using (true);

create policy "profiles are public" on public.profiles
  for select using (true);

create policy "own profile insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);

-- devices / report_votes / tip_votes: no client policies at all —
-- service role and RPCs only.

-- ------------------------------------------------------------
-- Realtime
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.reports;
alter publication supabase_realtime add table public.tips;
