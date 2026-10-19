# Cloudflare setup for sharing (Turnstile, rate limit, D1)

Do these in your own Cloudflare account. Nothing here is automated.

## 1. Turnstile (bot check)
1. Dashboard, Turnstile, Add widget. Mode: Managed. Hostnames: your domain (and `*.pages.dev` for previews).
2. Copy the **site key** (public) and the **secret key** (private).
3. Pages project, Settings, Environment variables:
   - Build variable `PUBLIC_TURNSTILE_SITEKEY` = the site key (production and preview).
4. Add the secret (never in the repo, never in chat):
   ```sh
   npx wrangler pages secret put TURNSTILE_SECRET --project-name quote-guide
   ```
5. Leave `TURNSTILE_VERIFY_URL` unset in production. It exists only for local tests.
6. Without a site key the share panel shows "Sharing is switched off". Without the secret the API answers 503. Both fail closed.

Local development uses Cloudflare's public always-pass TEST keys (in `.env` and `.dev.vars`, both git-ignored). Never ship those.

## 2. Rate limiting (per IP)
Dashboard, your domain, Security, WAF, Rate limiting rules, Create rule:
- Name: `report-post`
- If incoming requests match: URI Path equals `/api/report` and Method is `POST` or `DELETE`
- Same characteristic: IP
- Suggested: 5 requests per 10 minutes (or the longest period your plan allows)
- Action: Block, duration 1 hour

Plan limits differ. If your plan only offers a very short period, still set it. The app has a second layer that does not depend on your plan:
- Turnstile on every report.
- A global circuit breaker in D1: at most 60 accepted reports per hour and 400 per day (`functions/api/_util.ts`, `underCap`). It is not per person (no IP is kept). A flood can fill the quota and pause sharing for an hour, but it cannot add more than 60 rows an hour.

## 3. D1 database
```sh
npx wrangler d1 create quote-guide                         # paste database_id into wrangler.toml
npx wrangler d1 execute quote-guide --remote --file db/schema.sql
```
Pages project, Settings, Functions, D1 database bindings: variable `DB` = `quote-guide`.

If you already ran an older schema, add the new table once:
```sh
npx wrangler d1 execute quote-guide --remote --command "CREATE TABLE IF NOT EXISTS limits (bucket TEXT PRIMARY KEY, n INTEGER NOT NULL)"
```

## 4. No IP logging
Do not enable Logpush, Web Analytics beacons or any tool that records client IPs for `/api/*`.

## 5. Monthly
```sh
npx wrangler d1 execute quote-guide --remote --file db/purge.sql
```
Then skim for bursts (many reports for one change in one week).
