
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists projects_name_key on public.projects (lower(name));

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  primary key (project_id, user_id)
);

create table if not exists public.project_goals (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name       text not null,
  target     integer not null check (target > 0),
  starts_on  date not null,
  ends_on    date not null,
  reward     text not null default '',
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index if not exists project_goals_project_idx on public.project_goals (project_id);

create table if not exists public.goal_logs (
  id         bigint generated always as identity primary key,
  goal_id    uuid not null references public.project_goals (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  logged_on  date not null,
  achieved   integer not null check (achieved >= 0),
  created_at timestamptz not null default now()
);

create index if not exists goal_logs_goal_idx on public.goal_logs (goal_id);

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  lead_date         date not null default current_date,
  name              text not null,
  phone             text,
  phone_key         text,
  source            text,
  source_name       text,
  project           text,
  possession        text,
  budget            numeric,
  configuration     text,
  status            text not null default 'new',
  priority          text check (priority in ('high', 'medium', 'low')),
  next_follow_up_at timestamptz,
  assignee_ids      uuid[] not null default '{}',
  lost_reason       text,
  notes             text,
  previous_lead_id  uuid references public.leads (id) on delete set null,
  campaign          text,
  meta_id           text unique,
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  touched_at        timestamptz
);

create index if not exists leads_phone_key_idx on public.leads (phone_key);
create index if not exists leads_lead_date_idx on public.leads (lead_date);

create table if not exists public.lead_events (
  id             bigint generated always as identity primary key,
  lead_id        uuid not null references public.leads (id) on delete cascade,
  at             timestamptz not null default now(),
  event          text not null,
  field          text,
  from_value     text,
  to_value       text,
  by_id          uuid references public.users (id) on delete set null,
  by_name        text,
  reason         text,
  assignee_ids   uuid[],
  assignee_names text
);

create index if not exists lead_events_lead_idx on public.lead_events (lead_id, at);
create index if not exists lead_events_calls_idx on public.lead_events (at) where event = 'call';

create table if not exists public.campaigns (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  platform   text not null,
  stopped    boolean not null default false,
  started_on date not null default current_date,
  created_at timestamptz not null default now()
);

create unique index if not exists campaigns_name_key on public.campaigns (lower(name));

create table if not exists public.meta_sync (
  id        boolean primary key default true check (id),
  connected boolean not null default false,
  since     bigint not null default 0,
  synced_at timestamptz,
  error     text
);

insert into public.meta_sync (id) values (true) on conflict (id) do nothing;

create table if not exists public.kpi_sets (
  department     text not null,
  effective_from text not null check (effective_from ~ '^\d{4}-\d{2}$'),
  kpis           jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now(),
  primary key (department, effective_from)
);

create table if not exists public.attendance (
  user_id uuid not null references public.users (id) on delete cascade,
  day     date not null,
  status  text not null check (status in ('present', 'half-day', 'absent', 'weekly-off')),
  primary key (user_id, day)
);

create table if not exists public.report_entries (
  user_id    uuid not null references public.users (id) on delete cascade,
  day        date not null,
  department text not null,
  task       text not null,
  achieved   integer not null check (achieved >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day, department, task)
);

create index if not exists report_entries_day_idx on public.report_entries (day);

alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.project_goals   enable row level security;
alter table public.goal_logs       enable row level security;
alter table public.leads           enable row level security;
alter table public.lead_events     enable row level security;
alter table public.kpi_sets        enable row level security;
alter table public.attendance      enable row level security;
alter table public.report_entries  enable row level security;
alter table public.campaigns       enable row level security;
alter table public.meta_sync       enable row level security;

grant select, insert, update, delete on
  public.campaigns,
  public.meta_sync,
  public.projects,
  public.project_members,
  public.project_goals,
  public.goal_logs,
  public.leads,
  public.lead_events,
  public.kpi_sets,
  public.attendance,
  public.report_entries
to service_role;

grant delete on public.users to service_role;
