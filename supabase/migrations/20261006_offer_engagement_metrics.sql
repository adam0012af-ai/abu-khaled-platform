-- Engagement metrics for stronger coupon/deal discovery.

alter table public.affiliate_offers
  add column if not exists click_count bigint not null default 0,
  add column if not exists copy_count bigint not null default 0,
  add column if not exists view_count bigint not null default 0,
  add column if not exists last_verified_at timestamptz;

alter table public.affiliate_clicks
  add column if not exists event_type text not null default 'click';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='affiliate_clicks_event_type_check'
  ) then
    alter table public.affiliate_clicks
      add constraint affiliate_clicks_event_type_check
      check (event_type in ('click','copy','view'));
  end if;
end
$$;

create index if not exists affiliate_clicks_event_type_created_idx
  on public.affiliate_clicks(event_type, created_at desc);

create index if not exists affiliate_offers_popular_idx
  on public.affiliate_offers((click_count + copy_count * 2) desc)
  where active = true;
