
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  lead_date         date not null default current_date,
  name              text not null,
  phone             text,
  phone_key         text,
  source            text,
  source_name       text,
  possession        text,
  status            text not null default 'new',
  priority          text check (priority in ('high', 'medium', 'low')),
  next_follow_up_at timestamptz,
  assignee_ids      uuid[] not null default '{}',
  lost_reason       text,
  notes             text,
  amount            numeric check (amount > 0),
  campaign          text,
  meta_id           text unique,
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
  source_id  text not null default 'meta',
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

alter table public.leads           enable row level security;
alter table public.lead_events     enable row level security;
alter table public.campaigns       enable row level security;
alter table public.meta_sync       enable row level security;

grant select, insert, update, delete on
  public.campaigns,
  public.meta_sync,
  public.leads,
  public.lead_events
to service_role;

grant delete on public.users to service_role;
