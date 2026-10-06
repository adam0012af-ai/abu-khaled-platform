-- Abu Khaled affiliate automation foundation
-- Safe, additive migration: creates new tables/indexes/policies only.

create extension if not exists pgcrypto;

create table if not exists public.affiliate_offers (
  id text primary key,
  provider text not null default 'web',
  provider_product_id text,
  store_id text not null,
  store_name text not null,
  store_logo text not null default '',
  title text not null,
  description text not null default '',
  country text not null default '',
  category text not null default '',
  brand text,
  product_url text not null,
  affiliate_link text not null,
  coupon_code text not null default '',
  currency text,
  price numeric,
  old_price numeric,
  discount_percent numeric,
  discount_label text not null default '',
  original_price text not null default '',
  deal_price text not null default '',
  availability text not null default 'unknown' check (availability in ('in_stock','out_of_stock','unknown')),
  gallery jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  verified boolean not null default false,
  featured boolean not null default false,
  active boolean not null default true,
  expires text,
  expires_at timestamptz,
  locale text,
  source_hash text,
  source_updated_at timestamptz,
  last_checked_at timestamptz,
  last_check_status text,
  last_check_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists affiliate_offers_provider_product_uidx
  on public.affiliate_offers(provider, provider_product_id)
  where provider_product_id is not null and provider_product_id <> '';

create index if not exists affiliate_offers_active_updated_idx
  on public.affiliate_offers(active, updated_at desc);

create index if not exists affiliate_offers_store_idx
  on public.affiliate_offers(store_id, active);

create index if not exists affiliate_offers_expires_idx
  on public.affiliate_offers(expires_at)
  where active = true and expires_at is not null;

create table if not exists public.affiliate_offer_price_history (
  id uuid primary key default gen_random_uuid(),
  offer_id text not null references public.affiliate_offers(id) on delete cascade,
  old_price numeric,
  new_price numeric,
  currency text,
  changed boolean not null default false,
  observed_at timestamptz not null default now(),
  source text not null default 'automation'
);

create index if not exists affiliate_offer_price_history_offer_idx
  on public.affiliate_offer_price_history(offer_id, observed_at desc);

create table if not exists public.automation_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  offer_id text,
  status text not null default 'ok',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists automation_events_created_idx
  on public.automation_events(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists affiliate_offers_set_updated_at on public.affiliate_offers;
create trigger affiliate_offers_set_updated_at
before update on public.affiliate_offers
for each row execute function public.set_updated_at();

alter table public.affiliate_offers enable row level security;
alter table public.affiliate_offer_price_history enable row level security;
alter table public.automation_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='affiliate_offers'
      and policyname='Public can read active affiliate offers'
  ) then
    create policy "Public can read active affiliate offers"
      on public.affiliate_offers
      for select
      to anon, authenticated
      using (active = true);
  end if;
end
$$;

comment on table public.affiliate_offers is
  'Normalized affiliate/deal catalog. Writes should go through trusted server-side automation only.';
comment on table public.affiliate_offer_price_history is
  'Price observations produced by trusted refresh jobs.';
comment on table public.automation_events is
  'Operational audit trail for import/refresh/automation jobs.';
