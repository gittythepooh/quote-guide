# Record of processing (UK GDPR Art. 30, light version)

Small organisations can be exempt from a full record, but keeping one is good practice and helps the adviser.

Controller: **[YOUR NAME OR TRADING NAME]**, contact **[CONTACT EMAIL]**. No DPO.

| # | Activity | Data | Purpose | Basis | Recipients | Transfers | Retention |
|---|---|---|---|---|---|---|---|
| 1 | Local tools (guided check, test plan, checklist) | Answers and prices typed by the user, in their browser only | Provide the tools, remember progress | Not received by the controller | none | none | Until the user clears it |
| 2 | Shared report | Banded profile (age band, region, car age band, no-claims band, cover, site), % changes, runs, baseline spread, week | Build community findings | Consent, Art. 6(1)(a) | Cloudflare (processor) | Cloudflare global network, incl. US: confirm safeguards | 24 months, monthly purge (`db/purge.sql`); backups up to 30 days |
| 3 | Delete code hash | SHA-256 of a random code | Let contributors erase their own report | Consent / follow-through of erasure right | Cloudflare | as above | same as report |
| 4 | Abuse counters | Counts per hour and day | Stop floods | Not personal data | Cloudflare | as above | 3 days |
| 5 | Bot check | Turnstile token, processed by Cloudflare | Security | Legitimate interests | Cloudflare | as above | Cloudflare terms |
| 6 | Website delivery | Technical request data (IP, user agent) processed by Cloudflare | Deliver and protect the site | Legitimate interests | Cloudflare | as above | Cloudflare terms. Not stored by us. |

Security measures: HTTPS, strict input validation, origin and content-type checks, hourly and daily cap, no IP storage by us, two-factor authentication on GitHub and Cloudflare, least-privilege access, secrets only in Cloudflare (never in the repo).
