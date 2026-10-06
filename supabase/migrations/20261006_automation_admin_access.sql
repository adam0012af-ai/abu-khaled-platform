-- Secure in-app automation admin access.
-- Adds an owner/admin allowlist keyed by Supabase auth user id.

create table if not exists public.automation_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.automation_admins enable row level security;

comment on table public.automation_admins is
  'Server-side allowlist for Abu Khaled automation dashboard administrators.';

-- Bootstrap the existing owner account only when exactly one current auth user
-- matches the project's established Adam owner profile. If the condition is not
-- uniquely true, nothing is inserted.
insert into public.automation_admins(user_id)
select id
from auth.users
where lower(coalesce(raw_user_meta_data::text,'')) like '%adam%'
  and (
    select count(*)
    from auth.users
    where lower(coalesce(raw_user_meta_data::text,'')) like '%adam%'
  ) = 1
on conflict (user_id) do nothing;
