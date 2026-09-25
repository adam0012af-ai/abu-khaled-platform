# ACTIVE CODE MULTI

This branch is isolated from the Abu Khaled production main branch.

## Architecture
- React/Vite frontend.
- Cloudflare Worker API.
- Cloudflare D1 database, provisioned from the DB binding.
- Username/password authentication with PBKDF2 password hashing.
- HttpOnly SameSite session cookies and CSRF tokens.
- Admin and Reseller role separation.
- Server -> Package -> Batch -> Code hard binding.
- Atomic code issuance using guarded D1 batch transactions.
- Full audit trail for login, stock, credits, requests and issuance.

## Initial servers
Marvel, Nova, X, Spider, MH.

## First owner
Set a Cloudflare Worker secret named SETUP_KEY before first owner creation. The first-owner screen refuses setup when that secret is absent. Never commit the setup key or passwords to GitHub.

## Code stock
Admin selects a server and one of that server's packages, then imports a TXT file with one code per line. The database unique constraint prevents duplicate codes inside the same server/package. Available code values are never returned to reseller clients before issuance.

## Deployment
Cloudflare Workers Builds can use:
- Build command: npm run build
- Deploy command: npx wrangler deploy

The D1 binding is declared without an account-specific ID so current Wrangler automatic resource provisioning can create/link the database on Cloudflare. The Worker also creates the schema safely on first API request; migrations/0001_init.sql remains the versioned schema source.
