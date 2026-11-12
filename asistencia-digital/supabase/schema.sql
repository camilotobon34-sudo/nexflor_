-- Attendance system schema.
-- Public QR and trainer-code verification must run on a trusted server using
-- service_role; never ship that key or a raw one-time code to the browser.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 1 and 200),
  role text not null check (role in ('admin', 'trainer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trainers (
  id uuid primary key default gen_random_uuid(),
  profile_user_id uuid unique references public.profiles (user_id) on delete set null,
  full_name text not null check (length(btrim(full_name)) between 1 and 200),
  master_code_hash text not null unique check (master_code_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(btrim(full_name)) between 1 and 200),
  identification_number text not null unique
    check (
      length(btrim(identification_number)) between 5 and 20
      and btrim(identification_number) ~ '^[0-9]+$'
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  trainer_id uuid not null references public.trainers (id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 250),
  event_date date not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete restrict,
  registered_by_trainer_id uuid references public.trainers (id) on delete set null,
  registration_method text not null
    check (registration_method in ('admin', 'trainer', 'qr')),
  created_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

create table if not exists public.attendances (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  participant_id uuid not null,
  event_participant_id uuid not null references public.event_participants (id) on delete restrict,
  method text not null check (method in ('trainer', 'qr')),
  attended_at timestamptz not null default now(),
  -- Paths reference private storage objects; do not save public URLs or raw images.
  id_document_storage_path text,
  signature_storage_path text,
  created_at timestamptz not null default now(),
  unique (event_id, participant_id),
  foreign key (event_id, participant_id)
    references public.event_participants (event_id, participant_id)
    on delete restrict
);

create table if not exists public.event_registration_keys (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  created_by_trainer_id uuid not null references public.trainers (id) on delete restrict,
  -- HMAC-SHA256 hex digest, generated with a server-only secret.
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  failed_attempts smallint not null default 0
    check (failed_attempts between 0 and 5),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, key_hash)
);

create index if not exists events_company_date_idx
  on public.events (company_id, event_date desc);
create index if not exists events_trainer_date_idx
  on public.events (trainer_id, event_date desc);
create index if not exists event_participants_participant_idx
  on public.event_participants (participant_id, created_at desc);
create index if not exists event_participants_trainer_idx
  on public.event_participants (registered_by_trainer_id, created_at desc);
create index if not exists attendances_event_time_idx
  on public.attendances (event_id, attended_at desc);
create index if not exists event_registration_keys_expiry_idx
  on public.event_registration_keys (event_id, expires_at)
  where redeemed_at is null;

create or replace function private.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.role = 'admin'
      and p.is_active
  );
$$;

create or replace function private.is_active_event_trainer(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    join public.trainers t on t.id = e.trainer_id
    join public.profiles p on p.user_id = t.profile_user_id
    where e.id = target_event_id
      and p.user_id = (select auth.uid())
      and p.role = 'trainer'
      and p.is_active
      and t.status = 'active'
  );
$$;

create or replace function private.can_read_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.company_id = target_company_id
      and private.is_active_event_trainer(e.id)
  );
$$;

create or replace function private.can_read_participant(target_participant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_participants ep
    where ep.participant_id = target_participant_id
      and private.is_active_event_trainer(ep.event_id)
  );
$$;

revoke all on function private.is_active_admin() from public, anon;
revoke all on function private.is_active_event_trainer(uuid) from public, anon;
revoke all on function private.can_read_company(uuid) from public, anon;
revoke all on function private.can_read_participant(uuid) from public, anon;
grant execute on function private.is_active_admin() to authenticated, service_role;
grant execute on function private.is_active_event_trainer(uuid) to authenticated, service_role;
grant execute on function private.can_read_company(uuid) to authenticated, service_role;
grant execute on function private.can_read_participant(uuid) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.trainers enable row level security;
alter table public.participants enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.attendances enable row level security;
alter table public.event_registration_keys enable row level security;

drop policy if exists profiles_read_own_or_admin on public.profiles;
create policy profiles_read_own_or_admin
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_active_admin()));

drop policy if exists companies_read_assigned_or_admin on public.companies;
create policy companies_read_assigned_or_admin
  on public.companies for select to authenticated
  using (
    (select private.is_active_admin())
    or (select private.can_read_company(id))
  );
drop policy if exists companies_manage_admin on public.companies;
create policy companies_manage_admin
  on public.companies for all to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

drop policy if exists trainers_read_own_or_admin on public.trainers;
create policy trainers_read_own_or_admin
  on public.trainers for select to authenticated
  using (
    (select private.is_active_admin())
    or profile_user_id = (select auth.uid())
  );

drop policy if exists participants_read_assigned_or_admin on public.participants;
create policy participants_read_assigned_or_admin
  on public.participants for select to authenticated
  using (
    (select private.is_active_admin())
    or (select private.can_read_participant(id))
  );
drop policy if exists participants_manage_admin on public.participants;
create policy participants_manage_admin
  on public.participants for all to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

drop policy if exists events_read_assigned_or_admin on public.events;
create policy events_read_assigned_or_admin
  on public.events for select to authenticated
  using (
    (select private.is_active_admin())
    or (select private.is_active_event_trainer(id))
  );
drop policy if exists events_manage_admin on public.events;
create policy events_manage_admin
  on public.events for all to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

drop policy if exists event_participants_read_assigned_or_admin on public.event_participants;
create policy event_participants_read_assigned_or_admin
  on public.event_participants for select to authenticated
  using (
    (select private.is_active_admin())
    or (select private.is_active_event_trainer(event_id))
  );
drop policy if exists event_participants_manage_admin on public.event_participants;
create policy event_participants_manage_admin
  on public.event_participants for all to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

drop policy if exists attendances_read_assigned_or_admin on public.attendances;
create policy attendances_read_assigned_or_admin
  on public.attendances for select to authenticated
  using (
    (select private.is_active_admin())
    or (select private.is_active_event_trainer(event_id))
  );

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.companies from public, anon, authenticated;
revoke all on public.trainers from public, anon, authenticated;
revoke all on public.participants from public, anon, authenticated;
revoke all on public.events from public, anon, authenticated;
revoke all on public.event_participants from public, anon, authenticated;
revoke all on public.attendances from public, anon, authenticated;
revoke all on public.event_registration_keys from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.companies to authenticated;
-- The hashed master code is never readable by browser sessions.
grant select (id, profile_user_id, full_name, status, created_at, updated_at)
  on public.trainers to authenticated;
grant select, insert, update, delete on public.participants to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.event_participants to authenticated;
grant select on public.attendances to authenticated;
grant all on public.profiles to service_role;
grant all on public.companies to service_role;
grant all on public.trainers to service_role;
grant all on public.participants to service_role;
grant all on public.events to service_role;
grant all on public.event_participants to service_role;
grant all on public.attendances to service_role;
grant all on public.event_registration_keys to service_role;

-- Evidence remains private; issue short-lived signed URLs only from a trusted server.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'asistencia-evidencias',
  'asistencia-evidencias',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
