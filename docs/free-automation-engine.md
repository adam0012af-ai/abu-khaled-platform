# Free automation engine

Abu Khaled now has a free-first automation foundation. The goal is to demonstrate real value before paying for a workflow library or managed automation plan.

## Implemented foundation

- Normalized `affiliate_offers` catalog schema.
- Price history for every observed refresh.
- Automation event log.
- Secure server-side `offer-import` Edge Function source.
- Live web catalog loading from Supabase with fallback to the existing demo catalog.
- Starter n8n workflows that can be imported later into a self-hosted/free development instance.
- CI build check for every push/PR.

## Free-first architecture

GitHub → Cloudflare web app  
Merchant/product URL → Supabase Edge Function → normalized catalog → Web / future Android app  
Optional n8n → calls the same trusted Edge Function for schedules, Telegram admin and alerts

Checkout stays on the merchant site. The platform does not collect card data and does not convert the source currency.

## Supabase activation steps

1. Apply `supabase/migrations/20261006_affiliate_automation.sql`.
2. Deploy `supabase/functions/offer-import/index.ts` with JWT verification enabled.
3. Configure either:
   - `ADMIN_EMAILS` for human admin use, and/or
   - `AUTOMATION_WEBHOOK_KEY` for n8n/scheduled jobs.
4. Do not expose the service-role key to React, Android or n8n browser clients.

The function accepts a URL, extracts JSON-LD/OpenGraph product data when available, upserts the catalog, records price history, and returns whether the product or price changed.

## Starter workflow pack

Files under `automation/n8n`:

1. `01-offer-import-webhook.json` — reusable URL → Abu Khaled offer importer.
2. `02-price-refresh.json` — scheduled refresh for active offers.
3. `03-telegram-admin-add.json` — Telegram command `/add URL`.
4. `04-expiry-alert.json` — warns about offers expiring within 3 days.
5. `05-github-build-alert.json` — GitHub webhook → Telegram build/deploy alert.

These templates intentionally contain no credentials. They expect environment values such as `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `AUTOMATION_WEBHOOK_KEY`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID`.

## Next reusable projects

After the affiliate engine is activated, the same repository can add:
- customer-support triage;
- lead intake and follow-up;
- content approval/publishing queue;
- Shopify order notifications;
- daily KPI digest.

Those can reuse the existing `automation_events` table so we do not build ten disconnected systems.
