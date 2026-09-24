# Affiliate API collection plan

This project is a product/deals discovery platform, not a checkout merchant.

## Data flow

External affiliate network / merchant API
→ server-side provider adapter
→ normalized product model
→ Supabase catalog/cache
→ Web + Android
→ external merchant checkout only

## First providers to onboard

1. Awin
2. CJ Affiliate
3. Rakuten Advertising
4. Admitad
5. noon Affiliate after direct feed/API access is confirmed
6. impact.com after account access

## Normalized minimum product fields

- provider
- provider product id
- store id / store name
- title / description
- image / gallery
- current price
- old price
- currency from source
- discount percent
- stock / availability
- category / brand
- coupon code when available
- tracked affiliate URL
- source locale / country
- last updated timestamp

## Non-negotiable architecture rules

- Never expose affiliate API secrets in React or Android.
- Never convert the merchant currency in our catalog unless a separate display-only feature is explicitly added.
- Never collect payment card data.
- Checkout always happens on the merchant/source page.
- Every provider gets its own adapter.
- Web and Android consume the same normalized catalog API.
- Cache product data and keep a source timestamp so stale prices can be detected.
- Do not claim a price, discount, coupon or stock state is live unless it came from a live API/feed refresh.
