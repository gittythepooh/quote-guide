# Switching sharing on (Cloudflare Workers)

The site is a Cloudflare **Worker with static assets**. The small API for shared reports is in `src/worker.ts`. It is switched off until you add a database and a bot-check key. Everything below is done in the Cloudflare dashboard; nothing needs the command line.

## 1. Create the database
Dashboard, Storage & databases, **D1 SQL database**, Create database. Name it `fog-off-main`. Copy its **Database ID** (not a secret).
The tables create themselves the first time the Worker runs. There is no schema to run.

## 2. Create the bot check (Turnstile)
Dashboard, **Turnstile**, Add widget:
- Name `fog-off`, widget mode **Managed**.
- Hostnames: `quote-guide.cloudf-0c8.workers.dev` (and your own domain later).
- Copy the **Site key** (public) and the **Secret key** (private).

## 3. Give the Worker its secret
Dashboard, Workers & Pages, **quote-guide**, Settings, **Variables and secrets**, Add:
- Type **Secret**, name `TURNSTILE_SECRET`, value = the Secret key. Type it yourself. Never paste it into chat or the repo.

## 4. Turn it on in the repo
In `wrangler.toml`, replace the `[assets]` block at the top with the block in the SHARING section, filled in with your Database ID and Site key. Commit and push. (Only one `[assets]` table may exist.)
The Worker then serves `/api/config`, `/api/findings` and `/api/report`.

## 5. Check it
- `https://quote-guide.cloudf-0c8.workers.dev/api/config` should show your site key and `"ready":true`.
- Share a test report from the Share step, copy the delete code, then delete it with the box on the same page.

## 6. Before real use
- **Rate limit rule (per IP).** Dashboard, your domain, Security, WAF, Rate limiting rules: URI path equals `/api/report`, method POST or DELETE, suggested 5 requests per 10 minutes (or the longest period your plan allows), action Block for 1 hour. This needs a domain on Cloudflare. The app also has a backstop: at most 60 accepted reports an hour and 400 a day (`underCap` in `functions/api/_util.ts`).
- Do not enable Logpush or any tool that records client IPs for `/api/*`.
- Retention: a monthly cron in the Worker deletes reports older than 24 months and old counters (see `scheduled` in `src/worker.ts`). `db/purge.sql` remains for manual use.
- Legal review and the privacy notice placeholders (see `docs/compliance/README.md`).

## Local testing
`npx wrangler dev -c wrangler.dev.toml` runs the Worker with a local database and Cloudflare's always-pass Turnstile test keys. Never use test keys in production.
