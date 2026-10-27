create type public.app_role as enum ('owner', 'employee');

create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  full_name  text not null default '',
  role       public.app_role not null default 'employee',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index users_role_active_idx on public.users (role) where active;

alter table public.users enable row level security;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = (select auth.uid()) and role = 'owner' and active
  );
$$;

create policy users_select_self
  on public.users for select
  to authenticated
  using ( (select auth.uid()) = id );

create policy users_select_all_for_owner
  on public.users for select
  to authenticated
  using ( public.is_owner() );

grant select on public.users to authenticated;

grant select, insert, update on public.users to service_role;

create table public.allowed_emails (
  email      text primary key,
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;

grant select, insert, update, delete on public.allowed_emails to service_role;

create or replace function public.gate_signups(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.allowed_emails
    where email = lower(event->'user'->>'email')
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error',
    jsonb_build_object(
      'message', coalesce(lower(event->'user'->>'email'), 'That account') ||
                 ' is not on the list. Ask the owner to add it.',
      'http_code', 403
    )
  );
end;
$$;

grant execute on function public.gate_signups(jsonb) to supabase_auth_admin;
revoke execute on function public.gate_signups(jsonb) from authenticated, anon, public;

insert into public.allowed_emails (email)
select lower(email) from public.users
on conflict (email) do nothing;

create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users set email = new.email where id = new.id;

  delete from public.allowed_emails where email = lower(old.email);
  insert into public.allowed_emails (email) values (lower(new.email))
  on conflict (email) do nothing;

  return new;
end;
$$;

create trigger sync_user_email_on_auth
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_user_email();
