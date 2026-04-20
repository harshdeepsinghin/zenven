create extension if not exists pgcrypto;
create extension if not exists pg_cron;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce((select role from public.users where id = auth.uid()), 'fan');
$$;

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  area_m2 numeric(12,2) not null check (area_m2 > 0),
  zone_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text,
  avatar_url text,
  role text not null default 'fan' check (role in ('fan', 'admin', 'security')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue_id uuid not null references public.venues(id) on delete cascade,
  date timestamptz not null,
  capacity integer not null check (capacity > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  event_code text not null unique check (char_length(event_code) = 6),
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  name text not null,
  type text not null check (type in ('gate', 'section', 'toilet', 'food', 'exit', 'firstaid', 'concourse', 'parking')),
  polygon jsonb not null,
  area_m2 numeric(12,2) not null check (area_m2 > 0),
  capacity integer not null check (capacity >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.event_users (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  ticket_ref text,
  unique (event_id, user_id)
);

create table if not exists public.location_updates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  lat numeric(10,7) not null,
  lng numeric(10,7) not null,
  zone_id uuid references public.zones(id) on delete set null,
  timestamp timestamptz not null default now()
);

create table if not exists public.zone_density_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  density numeric(8,4) not null check (density >= 0),
  user_count integer not null check (user_count >= 0),
  timestamp timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  join_code text not null unique check (char_length(join_code) = 4),
  meeting_point_zone_id uuid references public.zones(id) on delete set null,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.sos_alerts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  lat numeric(10,7) not null,
  lng numeric(10,7) not null,
  zone_id uuid references public.zones(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  resolved_by uuid references public.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  message text not null,
  type text not null default 'info' check (type in ('info', 'warning', 'evacuation')),
  sent_by uuid references public.users(id) on delete set null,
  sent_at timestamptz not null default now()
);

create table if not exists public.nudges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  zone_id uuid references public.zones(id) on delete set null,
  sent_at timestamptz not null default now(),
  acted_on boolean not null default false
);

create index if not exists idx_events_venue_id on public.events (venue_id);
create index if not exists idx_events_created_by on public.events (created_by);
create index if not exists idx_event_users_event_id on public.event_users (event_id);
create index if not exists idx_event_users_user_id on public.event_users (user_id);
create index if not exists idx_location_updates_event_id on public.location_updates (event_id);
create index if not exists idx_location_updates_user_id on public.location_updates (user_id);
create index if not exists idx_location_updates_timestamp on public.location_updates (timestamp);
create index if not exists idx_zone_density_log_event_id on public.zone_density_log (event_id);
create index if not exists idx_zone_density_log_zone_id on public.zone_density_log (zone_id);
create index if not exists idx_zone_density_log_timestamp on public.zone_density_log (timestamp);
create index if not exists idx_groups_event_id on public.groups (event_id);
create index if not exists idx_group_members_group_id on public.group_members (group_id);
create index if not exists idx_group_members_user_id on public.group_members (user_id);
create index if not exists idx_sos_alerts_event_id on public.sos_alerts (event_id);
create index if not exists idx_sos_alerts_status on public.sos_alerts (status);
create index if not exists idx_announcements_event_id on public.announcements (event_id);
create index if not exists idx_nudges_event_id on public.nudges (event_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'role', 'fan')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    role = excluded.role,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.is_event_member(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_users eu
    where eu.event_id = target_event_id
      and eu.user_id = auth.uid()
  );
$$;

create or replace function public.is_event_admin(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.users u on u.id = e.created_by
    where e.id = target_event_id
      and e.created_by = auth.uid()
      and u.role in ('admin', 'security')
  );
$$;

create or replace function public.user_in_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
  );
$$;

create or replace function public.cleanup_expired_location_updates()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.location_updates
  where timestamp < now() - interval '24 hours';
end;
$$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'cleanup_location_updates';

select cron.schedule(
  'cleanup_location_updates',
  '0 * * * *',
  $$select public.cleanup_expired_location_updates();$$
)
where not exists (
  select 1 from cron.job where jobname = 'cleanup_location_updates'
);

alter table public.venues enable row level security;
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.zones enable row level security;
alter table public.event_users enable row level security;
alter table public.location_updates enable row level security;
alter table public.zone_density_log enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.sos_alerts enable row level security;
alter table public.announcements enable row level security;
alter table public.nudges enable row level security;

create policy "users_select_self_or_event_admin"
on public.users
for select
using (
  auth.uid() = id
  or exists (
    select 1
    from public.event_users eu
    join public.events e on e.id = eu.event_id
    where eu.user_id = public.users.id
      and e.created_by = auth.uid()
  )
);

create policy "users_update_self"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "venues_read_event_scoped"
on public.venues
for select
using (
  exists (
    select 1
    from public.events e
    where e.venue_id = venues.id
      and (public.is_event_member(e.id) or public.is_event_admin(e.id))
  )
);

create policy "venues_admin_insert"
on public.venues
for insert
with check (public.current_app_role() in ('admin', 'security'));

create policy "venues_admin_update"
on public.venues
for update
using (public.current_app_role() in ('admin', 'security'))
with check (public.current_app_role() in ('admin', 'security'));

create policy "events_select_member_or_admin"
on public.events
for select
using (public.is_event_member(id) or public.is_event_admin(id));

create policy "events_admin_insert"
on public.events
for insert
with check (
  public.current_app_role() in ('admin', 'security')
  and created_by = auth.uid()
);

create policy "events_admin_update"
on public.events
for update
using (public.is_event_admin(id))
with check (public.is_event_admin(id));

create policy "zones_select_member_or_admin"
on public.zones
for select
using (
  exists (
    select 1
    from public.events e
    where e.venue_id = zones.venue_id
      and (public.is_event_member(e.id) or public.is_event_admin(e.id))
  )
);

create policy "zones_admin_manage"
on public.zones
for all
using (
  exists (
    select 1
    from public.events e
    where e.venue_id = zones.venue_id
      and public.is_event_admin(e.id)
  )
)
with check (
  exists (
    select 1
    from public.events e
    where e.venue_id = zones.venue_id
      and public.is_event_admin(e.id)
  )
);

create policy "event_users_select_self_or_admin"
on public.event_users
for select
using (user_id = auth.uid() or public.is_event_admin(event_id));

create policy "event_users_insert_self_or_admin"
on public.event_users
for insert
with check (user_id = auth.uid() or public.is_event_admin(event_id));

create policy "location_updates_select_self_or_admin"
on public.location_updates
for select
using (user_id = auth.uid() or public.is_event_admin(event_id));

create policy "location_updates_insert_self"
on public.location_updates
for insert
with check (user_id = auth.uid() or public.is_event_admin(event_id));

create policy "zone_density_log_select_member_or_admin"
on public.zone_density_log
for select
using (public.is_event_member(event_id) or public.is_event_admin(event_id));

create policy "zone_density_log_admin_insert"
on public.zone_density_log
for insert
with check (public.is_event_admin(event_id));

create policy "groups_select_group_member_or_admin"
on public.groups
for select
using (
  public.is_event_admin(event_id)
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = groups.id
      and gm.user_id = auth.uid()
  )
);

create policy "groups_insert_member_or_admin"
on public.groups
for insert
with check (
  created_by = auth.uid()
  and (public.is_event_member(event_id) or public.is_event_admin(event_id))
);

create policy "groups_update_owner_or_admin"
on public.groups
for update
using (created_by = auth.uid() or public.is_event_admin(event_id))
with check (created_by = auth.uid() or public.is_event_admin(event_id));

create policy "group_members_select_group_member_or_admin"
on public.group_members
for select
using (
  public.user_in_group(group_id)
  or exists (
    select 1
    from public.groups g
    where g.id = group_members.group_id
      and public.is_event_admin(g.event_id)
  )
);

create policy "group_members_insert_self_or_admin"
on public.group_members
for insert
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.groups g
    where g.id = group_members.group_id
      and public.is_event_admin(g.event_id)
  )
);

create policy "sos_alerts_select_owner_or_admin"
on public.sos_alerts
for select
using (user_id = auth.uid() or public.is_event_admin(event_id));

create policy "sos_alerts_insert_owner_or_admin"
on public.sos_alerts
for insert
with check (user_id = auth.uid() or public.is_event_admin(event_id));

create policy "sos_alerts_update_admin_only"
on public.sos_alerts
for update
using (public.is_event_admin(event_id))
with check (public.is_event_admin(event_id));

create policy "announcements_select_member_or_admin"
on public.announcements
for select
using (public.is_event_member(event_id) or public.is_event_admin(event_id));

create policy "announcements_insert_admin_only"
on public.announcements
for insert
with check (public.is_event_admin(event_id));

create policy "nudges_select_owner_or_admin"
on public.nudges
for select
using (user_id = auth.uid() or public.is_event_admin(event_id));

create policy "nudges_insert_admin_or_service"
on public.nudges
for insert
with check (user_id = auth.uid() or public.is_event_admin(event_id));
