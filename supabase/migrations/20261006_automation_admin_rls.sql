-- Allow authenticated automation admins to inspect operational data in the in-app dashboard.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='automation_events'
      and policyname='Automation admins can read events'
  ) then
    create policy "Automation admins can read events"
      on public.automation_events
      for select
      to authenticated
      using (
        exists (
          select 1 from public.automation_admins a
          where a.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='affiliate_offer_price_history'
      and policyname='Automation admins can read price history'
  ) then
    create policy "Automation admins can read price history"
      on public.affiliate_offer_price_history
      for select
      to authenticated
      using (
        exists (
          select 1 from public.automation_admins a
          where a.user_id = auth.uid()
        )
      );
  end if;
end
$$;
