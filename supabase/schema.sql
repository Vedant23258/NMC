-- Swachh Nellore / NMC Smart Sanitation Platform
-- Full schema + Row Level Security for the pilot backend.
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. Safe to re-run: every statement is guarded with
-- IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS.
--
-- Run supabase/seed.sql afterwards to load the pilot's starting data
-- (mirrors what the app currently ships as mock data).

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- Enums
-- ============================================================
do $$ begin
  create type app_role as enum (
    'ccc_operator',
    'ccc_shift_supervisor',
    'sanitary_inspector',
    'additional_commissioner',
    'commissioner',
    'municipal_health_officer',
    'mis_gis_analyst',
    'system_administrator'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type entity_status as enum (
    'active','pending','resolved','flagged','closed','stale','unavailable','draft','verified'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type priority_level as enum ('critical','high','medium','low');
exception when duplicate_object then null; end $$;

-- ============================================================
-- profiles (one row per platform user, 1:1 with auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role app_role not null,
  ward_scope text[] not null default '{}',
  title text not null default '',
  requires_second_factor boolean not null default false,
  account_status text not null default 'active' check (account_status in ('active','deactivated')),
  last_login_at timestamptz
);

-- Helper functions used by RLS policies below.
create or replace function auth_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_ward_scope() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(ward_scope, '{}') from profiles where id = auth.uid();
$$;

create or replace function has_ward_access(target_ward text) returns boolean
language sql stable security definer set search_path = public as $$
  select target_ward = any(auth_ward_scope()) or 'all' = any(auth_ward_scope());
$$;

alter table profiles enable row level security;
drop policy if exists profiles_select_self_or_admin on profiles;
create policy profiles_select_self_or_admin on profiles for select
  using (id = auth.uid() or auth_role() = 'system_administrator');
drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles for all
  using (auth_role() = 'system_administrator')
  with check (auth_role() = 'system_administrator');

-- ============================================================
-- wards / vehicles (master data)
-- ============================================================
create table if not exists wards (
  id text primary key,
  name text not null,
  zone text not null,
  population_band text not null,
  operational_status entity_status not null default 'active',
  route_summary text
);

create table if not exists vehicles (
  id text primary key,
  registration_number text not null,
  type text not null,
  assigned_ward_id text references wards(id),
  assigned_route text not null default '',
  status entity_status not null default 'active',
  last_seen_at timestamptz
);

alter table wards enable row level security;
alter table vehicles enable row level security;
drop policy if exists wards_read_all on wards;
create policy wards_read_all on wards for select using (auth.uid() is not null);
drop policy if exists vehicles_read_all on vehicles;
create policy vehicles_read_all on vehicles for select using (auth.uid() is not null);
drop policy if exists wards_admin_write on wards;
create policy wards_admin_write on wards for all
  using (auth_role() = 'system_administrator') with check (auth_role() = 'system_administrator');
drop policy if exists vehicles_admin_write on vehicles;
create policy vehicles_admin_write on vehicles for all
  using (auth_role() = 'system_administrator') with check (auth_role() = 'system_administrator');

-- ============================================================
-- complaints (the grievance Kanban) + timeline events
-- ============================================================
create table if not exists complaints (
  id text primary key default ('cmp-' || substr(gen_random_uuid()::text, 1, 8)),
  citizen_reference text not null,
  title text not null,
  description text not null default '',
  ward_id text not null references wards(id),
  location_label text not null default '',
  status text not null check (status in ('new','assigned','in_progress','awaiting_closure','closed')),
  priority priority_level not null,
  eta_minutes int,
  assigned_to text,
  category text not null check (category in ('garbage','overflow','missed_collection','illegal_dumping')),
  opened_at timestamptz not null default now(),
  due_at timestamptz not null,
  closed_at timestamptz
);

create table if not exists complaint_events (
  id uuid primary key default gen_random_uuid(),
  complaint_id text not null references complaints(id) on delete cascade,
  type text not null,
  actor text not null,
  timestamp timestamptz not null default now(),
  note text not null default ''
);

alter table complaints enable row level security;
alter table complaint_events enable row level security;
drop policy if exists complaints_read_all on complaints;
create policy complaints_read_all on complaints for select using (auth.uid() is not null);
drop policy if exists complaints_write_dispatch_or_update on complaints;
create policy complaints_write_dispatch_or_update on complaints for update
  using (auth_role() in ('ccc_operator','ccc_shift_supervisor','sanitary_inspector','additional_commissioner'))
  with check (auth_role() in ('ccc_operator','ccc_shift_supervisor','sanitary_inspector','additional_commissioner'));
drop policy if exists complaints_insert_ccc on complaints;
create policy complaints_insert_ccc on complaints for insert
  with check (auth_role() in ('ccc_operator','ccc_shift_supervisor'));
drop policy if exists events_read_all on complaint_events;
create policy events_read_all on complaint_events for select using (auth.uid() is not null);
drop policy if exists events_insert_all on complaint_events;
create policy events_insert_all on complaint_events for insert with check (auth.uid() is not null);

-- ============================================================
-- weighbridge_entries (single most trusted data source)
-- ============================================================
create table if not exists weighbridge_entries (
  id text primary key default ('wb-' || substr(gen_random_uuid()::text, 1, 8)),
  vehicle_id text not null references vehicles(id),
  vehicle_number text not null,
  ward_id text not null references wards(id),
  location text not null default 'Allipuram Weighbridge',
  status text not null check (status in ('checked_in','processing','checked_out','manual_review')),
  weight_tonnes numeric not null,
  time_in timestamptz not null default now(),
  time_out timestamptz,
  feed_status text not null default 'live' check (feed_status in ('live','refreshing','stale'))
);

alter table weighbridge_entries enable row level security;
drop policy if exists weighbridge_read_all on weighbridge_entries;
create policy weighbridge_read_all on weighbridge_entries for select using (auth.uid() is not null);
-- Once logged, a weighbridge entry is only editable via a System Administrator
-- audit override -- this is the platform's "hardest to fake" data source.
drop policy if exists weighbridge_insert_operator on weighbridge_entries;
create policy weighbridge_insert_operator on weighbridge_entries for insert with check (auth.uid() is not null);
drop policy if exists weighbridge_admin_override on weighbridge_entries;
create policy weighbridge_admin_override on weighbridge_entries for update
  using (auth_role() = 'system_administrator') with check (auth_role() = 'system_administrator');

-- ============================================================
-- verification_records + anomalies
-- ============================================================
create table if not exists verification_records (
  id text primary key default ('ver-' || substr(gen_random_uuid()::text, 1, 8)),
  ward_id text not null references wards(id),
  reporting_period text not null,
  metric_name text not null,
  reported_value numeric not null,
  verified_value numeric not null,
  variance_percent numeric not null,
  status text not null check (status in ('pending','verified','flagged')),
  anomaly_id text,
  reviewed_by text,
  reviewed_at timestamptz
);

create table if not exists anomalies (
  id text primary key default ('ano-' || substr(gen_random_uuid()::text, 1, 8)),
  verification_record_id text not null references verification_records(id) on delete cascade,
  threshold_percent numeric not null,
  variance_percent numeric not null,
  severity priority_level not null,
  status text not null check (status in ('open','under_review','resolved')),
  note text not null default ''
);

alter table verification_records enable row level security;
alter table anomalies enable row level security;
drop policy if exists verification_read_all on verification_records;
create policy verification_read_all on verification_records for select using (auth.uid() is not null);
drop policy if exists verification_write on verification_records;
create policy verification_write on verification_records for all
  using (auth_role() in ('sanitary_inspector','mis_gis_analyst','system_administrator'))
  with check (auth_role() in ('sanitary_inspector','mis_gis_analyst','system_administrator'));
drop policy if exists anomalies_read_all on anomalies;
create policy anomalies_read_all on anomalies for select using (auth.uid() is not null);
drop policy if exists anomalies_write on anomalies;
create policy anomalies_write on anomalies for all
  using (auth_role() in ('mis_gis_analyst','system_administrator'))
  with check (auth_role() in ('mis_gis_analyst','system_administrator'));

-- ============================================================
-- enforcement_records
-- ============================================================
create table if not exists enforcement_records (
  id text primary key default ('enf-' || substr(gen_random_uuid()::text, 1, 8)),
  ward_id text not null references wards(id),
  vehicle_id text references vehicles(id),
  type text not null check (type in ('sup_seizure','bwg','challan')),
  status text not null check (status in ('initiated','in_review','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subject text not null,
  officer text not null,
  fine_amount numeric,
  fine_status text check (fine_status in ('unpaid','paid','waived')),
  evidence_photo_attached boolean not null default false,
  evidence_note text
);

alter table enforcement_records enable row level security;
drop policy if exists enforcement_read_all on enforcement_records;
create policy enforcement_read_all on enforcement_records for select using (auth.uid() is not null);
drop policy if exists enforcement_write on enforcement_records;
create policy enforcement_write on enforcement_records for all
  using (auth_role() in ('sanitary_inspector','system_administrator'))
  with check (auth_role() in ('sanitary_inspector','system_administrator'));

-- ============================================================
-- reports (MAUD monthly format + ad hoc)
-- ============================================================
create table if not exists reports (
  id text primary key default ('rep-' || substr(gen_random_uuid()::text, 1, 8)),
  name text not null,
  period_label text not null,
  status text not null check (status in ('ready','pending_backend','draft')),
  generated_at timestamptz,
  generated_by text,
  sign_off_required boolean not null default false,
  signed_off_at timestamptz,
  approved_at timestamptz,
  approved_by text
);

alter table reports enable row level security;
drop policy if exists reports_read_all on reports;
create policy reports_read_all on reports for select using (auth.uid() is not null);
drop policy if exists reports_insert_analyst on reports;
create policy reports_insert_analyst on reports for insert
  with check (auth_role() = 'mis_gis_analyst');
drop policy if exists reports_update_approve on reports;
create policy reports_update_approve on reports for update
  using (auth_role() in ('additional_commissioner','commissioner'))
  with check (auth_role() in ('additional_commissioner','commissioner'));

-- ============================================================
-- notifications
-- ============================================================
create table if not exists notifications (
  id text primary key default ('not-' || substr(gen_random_uuid()::text, 1, 8)),
  channel text not null check (channel in ('dashboard','sms','whatsapp')),
  subject text not null,
  body text not null,
  status text not null check (status in ('queued','blocked','delivered','development_only')),
  created_at timestamptz not null default now(),
  related_entity_id text
);

alter table notifications enable row level security;
drop policy if exists notifications_read_all on notifications;
create policy notifications_read_all on notifications for select using (auth.uid() is not null);
drop policy if exists notifications_insert_system on notifications;
create policy notifications_insert_system on notifications for insert with check (auth.uid() is not null);

-- ============================================================
-- directives (Additional Commissioner -> Inspector action items)
-- ============================================================
create table if not exists directives (
  id text primary key default ('dir-' || substr(gen_random_uuid()::text, 1, 8)),
  ward_id text not null references wards(id),
  issued_to text not null,
  issued_by text not null,
  instruction text not null,
  status text not null default 'open' check (status in ('open','in_progress','closed')),
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  related_complaint_id text references complaints(id)
);

alter table directives enable row level security;
drop policy if exists directives_read_all on directives;
create policy directives_read_all on directives for select using (auth.uid() is not null);
drop policy if exists directives_write_addl_commissioner on directives;
create policy directives_write_addl_commissioner on directives for all
  using (auth_role() = 'additional_commissioner') with check (auth_role() = 'additional_commissioner');
drop policy if exists directives_inspector_update_status on directives;
create policy directives_inspector_update_status on directives for update
  using (auth_role() = 'sanitary_inspector') with check (auth_role() = 'sanitary_inspector');

-- ============================================================
-- health_risk_zones + ngt_compliance_items
-- ============================================================
create table if not exists health_risk_zones (
  id text primary key default ('hrz-' || substr(gen_random_uuid()::text, 1, 8)),
  ward_id text not null references wards(id),
  risk_level priority_level not null,
  health_complaint_count_7d int not null default 0,
  category text not null check (category in ('stagnant_water','sewage_overflow','dead_animal','disease_linked')),
  flagged_at timestamptz,
  flagged_by text
);

create table if not exists ngt_compliance_items (
  id text primary key default ('ngt-' || substr(gen_random_uuid()::text, 1, 8)),
  site_name text not null,
  ward_id text not null references wards(id),
  category text not null check (category in ('legacy_waste','liquid_waste')),
  status text not null check (status in ('compliant','in_remediation','data_conflict','non_compliant')),
  note text not null default '',
  co_signed_by_addl_commissioner boolean not null default false,
  co_signed_by_mho boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table health_risk_zones enable row level security;
alter table ngt_compliance_items enable row level security;
drop policy if exists health_risk_read_all on health_risk_zones;
create policy health_risk_read_all on health_risk_zones for select using (auth.uid() is not null);
drop policy if exists health_risk_write_mho on health_risk_zones;
create policy health_risk_write_mho on health_risk_zones for all
  using (auth_role() = 'municipal_health_officer') with check (auth_role() = 'municipal_health_officer');
drop policy if exists ngt_read_all on ngt_compliance_items;
create policy ngt_read_all on ngt_compliance_items for select using (auth.uid() is not null);
drop policy if exists ngt_cosign on ngt_compliance_items;
create policy ngt_cosign on ngt_compliance_items for update
  using (auth_role() in ('municipal_health_officer','additional_commissioner'))
  with check (auth_role() in ('municipal_health_officer','additional_commissioner'));

-- ============================================================
-- shift_handovers + system_health_checks + audit_log
-- ============================================================
create table if not exists shift_handovers (
  id text primary key default ('sh-' || substr(gen_random_uuid()::text, 1, 8)),
  shift_label text not null,
  outgoing_supervisor text not null,
  grievances_opened int not null default 0,
  grievances_closed int not null default 0,
  still_open_high_priority int not null default 0,
  unacknowledged_assignments int not null default 0,
  note text not null default '',
  completed_at timestamptz
);

create table if not exists system_health_checks (
  id text primary key default ('sys-' || substr(gen_random_uuid()::text, 1, 8)),
  name text not null,
  status text not null check (status in ('green','amber','red')),
  detail text not null default '',
  last_checked_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor text not null,
  role app_role not null,
  timestamp timestamptz not null default now(),
  detail text not null default ''
);

alter table shift_handovers enable row level security;
alter table system_health_checks enable row level security;
alter table audit_log enable row level security;
drop policy if exists shift_read_all on shift_handovers;
create policy shift_read_all on shift_handovers for select using (auth.uid() is not null);
drop policy if exists shift_write_supervisor on shift_handovers;
create policy shift_write_supervisor on shift_handovers for all
  using (auth_role() = 'ccc_shift_supervisor') with check (auth_role() = 'ccc_shift_supervisor');
drop policy if exists sys_health_read_admin on system_health_checks;
create policy sys_health_read_admin on system_health_checks for select using (auth.uid() is not null);
drop policy if exists sys_health_write_admin on system_health_checks;
create policy sys_health_write_admin on system_health_checks for all
  using (auth_role() = 'system_administrator') with check (auth_role() = 'system_administrator');
-- Audit log is append-only: no update/delete policy exists for anyone.
drop policy if exists audit_read_admin_commissioner on audit_log;
create policy audit_read_admin_commissioner on audit_log for select
  using (auth_role() in ('system_administrator','commissioner'));
drop policy if exists audit_insert_all on audit_log;
create policy audit_insert_all on audit_log for insert with check (auth.uid() is not null);

-- ============================================================
-- forecast_points (ML waste-generation forecast)
-- ============================================================
create table if not exists forecast_points (
  ward_id text not null references wards(id),
  date date not null,
  predicted_tonnage numeric not null,
  actual_tonnage numeric,
  primary key (ward_id, date)
);

alter table forecast_points enable row level security;
drop policy if exists forecast_read_all on forecast_points;
create policy forecast_read_all on forecast_points for select using (auth.uid() is not null);
drop policy if exists forecast_write_analyst on forecast_points;
create policy forecast_write_analyst on forecast_points for all
  using (auth_role() = 'mis_gis_analyst') with check (auth_role() = 'mis_gis_analyst');

-- ============================================================
-- beat_segments + worker_attendance + ward_day_status
-- (Ward Sanitary Inspector's "My Ward Today")
-- ============================================================
create table if not exists beat_segments (
  id text primary key default ('beat-' || substr(gen_random_uuid()::text, 1, 8)),
  ward_id text not null references wards(id),
  street_name text not null,
  beat_type text not null check (beat_type in ('sweeping','collection')),
  status text not null check (status in ('not_started','submitted','confirmed')),
  assigned_worker text not null,
  rejection_reason text
);

create table if not exists worker_attendance (
  id text primary key default ('att-' || substr(gen_random_uuid()::text, 1, 8)),
  ward_id text not null references wards(id),
  worker_name text not null,
  checked_in boolean not null default false,
  photo_submitted boolean not null default false
);

create table if not exists ward_day_status (
  ward_id text primary key references wards(id),
  date date not null default current_date,
  confirmed boolean not null default false,
  confirmed_at timestamptz,
  confirmed_by text
);

alter table beat_segments enable row level security;
alter table worker_attendance enable row level security;
alter table ward_day_status enable row level security;

drop policy if exists beats_read_scoped on beat_segments;
create policy beats_read_scoped on beat_segments for select
  using (auth_role() <> 'sanitary_inspector' or has_ward_access(ward_id));
drop policy if exists beats_write_inspector on beat_segments;
create policy beats_write_inspector on beat_segments for all
  using (auth_role() = 'sanitary_inspector' and has_ward_access(ward_id))
  with check (auth_role() = 'sanitary_inspector' and has_ward_access(ward_id));

drop policy if exists attendance_read_scoped on worker_attendance;
create policy attendance_read_scoped on worker_attendance for select
  using (auth_role() <> 'sanitary_inspector' or has_ward_access(ward_id));
drop policy if exists attendance_write_inspector on worker_attendance;
create policy attendance_write_inspector on worker_attendance for all
  using (auth_role() = 'sanitary_inspector' and has_ward_access(ward_id))
  with check (auth_role() = 'sanitary_inspector' and has_ward_access(ward_id));

drop policy if exists wardday_read_scoped on ward_day_status;
create policy wardday_read_scoped on ward_day_status for select
  using (auth_role() <> 'sanitary_inspector' or has_ward_access(ward_id));
drop policy if exists wardday_write_inspector on ward_day_status;
create policy wardday_write_inspector on ward_day_status for all
  using (auth_role() = 'sanitary_inspector' and has_ward_access(ward_id))
  with check (auth_role() = 'sanitary_inspector' and has_ward_access(ward_id));

-- ============================================================
-- New-user bootstrap: when a Supabase Auth user is created (by the
-- System Administrator's Add User flow, via an Edge Function using the
-- service role key -- never from the browser), auto-create their profile
-- row from the auth user's metadata.
-- ============================================================
create or replace function handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, role, ward_scope, title)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'ccc_operator'),
    coalesce(
      (select array_agg(value::text) from jsonb_array_elements_text(new.raw_user_meta_data->'ward_scope')),
      '{}'
    ),
    coalesce(new.raw_user_meta_data->>'title', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
