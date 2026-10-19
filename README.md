# Quote Guide (working name)

Free, independent, information-only help for getting fair-value UK car insurance.
Everything runs in the browser. No server, no accounts, no stored personal data.

## Licence
- **Code:** PolyForm Noncommercial License 1.0.0 (`LICENSE`). Source available, not open source: free for personal, research, educational and non-profit use. Companies and commercial use need permission from the owner.
- **Guide text and published findings:** CC BY 4.0 (`CONTENT-LICENSE.md`).
- **Name and logo:** all rights reserved. Individual reports are never published.
- Outside code contributions are not accepted for now (the owner keeps the right to relicense). Bug reports and ideas are welcome as issues.

## Stack
Astro (static) + Svelte islands + Tailwind v4. Hosted on Cloudflare Pages.

## Run locally
```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs ./dist
```

## Structure
- `src/pages/` home, `guide`, `explorer`
- `src/components/WhatIf.svelte` the what-if explorer (localStorage, JSON export/import)
- `src/components/MustBeTrue.svelte` "true at purchase" checklist
- `src/data/sample.ts` sample data from the 2022 controlled test (dummy profile)
- `docs/controlled-test-template.xlsx` controlled quote test (dummy data; Runs, Summary, Profile sheets)
- `public/_headers` Cloudflare security headers (CSP, no-referrer)

## Deploy (Cloudflare Pages, connected to GitHub)
1. Push this folder to a new public GitHub repo.
2. Cloudflare dashboard: Workers & Pages, Create, Pages, Connect to Git.
3. Build command `npm run build`. Output directory `dist`. Node 22 or newer.
4. Add the custom domain under the Pages project.

## Community reports (built)
- `src/lib/report-schema.ts` strict, banded report format (shared by browser and server).
- `src/components/SharePanel.svelte` optional anonymous share panel on the explorer (shows the exact payload).
- `functions/api/report.ts` POST stores a report in D1 and returns a one-time delete code; DELETE removes it.
- `functions/api/findings.ts` GET returns group medians only once a change has 20 reports (rolling 2 years).
- `src/data/findings-seed.ts` the 2022 starting point, replaced per change by community medians.
- `db/schema.sql`, `wrangler.toml` D1 table and binding.

### Local test of the API
```sh
npm run build
npx wrangler d1 execute quote-guide --local --file db/schema.sql
npx wrangler pages dev ./dist --port 8788
```

### Go live
1. `npx wrangler d1 create quote-guide`, paste the `database_id` into `wrangler.toml`.
2. `npx wrangler d1 execute quote-guide --remote --file db/schema.sql`.
3. In the Pages project: Settings, Functions, D1 bindings, add `DB` = quote-guide.
4. Add a Cloudflare rate-limiting rule on `/api/report` (for example 5 per minute per IP) and consider Turnstile.
5. Do NOT enable request logging that stores IP addresses for `/api/report`.
6. Get the privacy page and the information-only wording reviewed before launch.

## Later (not built)
- Bot protection (Turnstile) and a nightly rollup to a static JSON if traffic grows.
- Optional accounts with browser-side encryption and renewal reminders.
- Donation link: replace the `#` link on the home page.

## Rules for content
Information only. Never suggest false answers. Name, mileage, value, modifications,
parking and drivers must be true on the quote a person buys. Re-run the sample test
with current quotes before publishing any figure.
