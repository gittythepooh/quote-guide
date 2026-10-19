# Launch checklist (privacy, security, abuse)

Reviewed 19 Oct 2026. Items marked DONE are in the code. The rest need your action.

## Fixed in code
- DONE Cross-site abuse: POST/DELETE reject other origins (403) and any content type except `application/json` (415).
- DONE Body size cap enforced while reading (8 KB), even without a content-length header.
- DONE Strict types: strings, null and "" are no longer accepted as numbers.
- DONE Prototype-key bug: `"toString"` and `"__proto__"` passed the change-type check (`in` operator). Now `Object.hasOwn`.
- DONE Delete code moved from the URL to the request body (URLs end up in logs).
- DONE Reports stored by week, not by day.
- DONE `/api/findings` uses the Cache API (1 hour), so page views do not read the whole table.
- DONE Extra security headers (CSP base-uri, form-action, object-src; COOP; nosniff on API responses).
- DONE `db/purge.sql` for the 24-month deletion; npm audit clean; no XSS sinks (`@html`, `innerHTML`, `eval`); no personal data or secrets in the repo.

## Added 19 Oct (legal hardening)
- DONE `noindex` meta tag on every page and an `X-Robots-Tag` header while this is a draft. Remove both at launch (`npm run check:launch` lists them). We deliberately did NOT block crawlers in robots.txt: a blocked crawler cannot see noindex.
- DONE Full draft privacy notice and terms pages, FCA role statement in the footer, softened advice-like wording ("Fit for your answers", "What is worth testing").
- DONE Second consent tick on sharing (own genuine data) plus links to privacy and terms.
- DONE `docs/compliance/` pack (records, light DPIA, anonymisation assessment, request and breach procedures, FCA self-assessment, ICO fee, editorial rules).
- DONE `npm run check:wording` runs before every build; `npm run check:launch` lists remaining blockers.
- STILL HUMAN: legal review, ICO fee self-assessment, yellow placeholders (name, contact email, governing law), Cloudflare transfer terms, remove noindex, donation link.

## Added 19 Oct (second pass)
- DONE Turnstile: widget loads only when the share panel opens; server verifies before storing; fails closed (503 if no secret, 403 if the check fails or times out after 5 s). The visitor IP is not sent when verifying.
- DONE Circuit breaker: at most 60 accepted reports per hour and 400 per day (D1 counters, no IPs). Invalid reports never spend a bot-check call.
- DONE Docs: `docs/cloudflare-setup.md` (exact steps) and `docs/legal-review-brief.md` (questions for an adviser).
- TESTED in Node with a fake D1 and fake verifier (10 checks pass). The real Turnstile call could NOT be tested here (the local Cloudflare runtime has no outbound network in this sandbox). Test it on a preview deployment with a real site key.

## Must do before launch
1. **Rate limiting rule (HIGH, you).** Create the Cloudflare WAF rule in `docs/cloudflare-setup.md`. The in-app cap is a backstop, not a substitute.
2. **Turnstile keys (HIGH, you).** Create the widget, set `PUBLIC_TURNSTILE_SITEKEY` and the `TURNSTILE_SECRET` Pages secret. Then send one real test report on the preview URL.
3. **Legal review (HIGH, you).** Give the adviser `docs/legal-review-brief.md`. New risk found: the test method asks people to enter dummy or changed details on comparison sites. Their terms may forbid this (question 13).
4. **Privacy contact (MED).** Add a contact address to the privacy page for people who lose their delete code. State that deleted rows can persist in D1 Time Travel backups for up to 30 days.
5. **Account security (MED).** 2FA on GitHub and Cloudflare. Protect `main`. Never commit tokens. Keep the repo free of real data.
6. **Do not log IPs (MED).** No analytics or Logpush on `/api/*` that records client IPs.
7. **Monthly job (MED).** Run `db/purge.sql`. Skim new reports for bursts (same week, same change, odd values).

## Known, accepted for now
- CSP still allows inline scripts (Astro islands need it). Move to hashes later.
- One new report can nudge a published median slightly. The 1-hour cache and the 20-report minimum limit this.
- Self-selection bias in reports. The Findings page shows sample sizes.
- 2022 seed figures for third-party cover are low confidence (swapped labels in the source sheet, unresolved).
- Rows are only pseudonymous in theory. Treat the table as personal data until a legal review says otherwise.
