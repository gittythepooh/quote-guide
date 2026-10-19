# Second review (19 Oct 2026)

Method: automated checks (dependency audit, type and Svelte checker, internal-link crawl, page weight), the **axe** accessibility engine on every page in light, dark and at phone width, a read of the code for edge cases and server hardening, and a check of the live site's headers. Not yet done: testing with real people, real devices, a screen reader, or a real Turnstile and database round trip.

## Fixed in this pass
| # | Finding | Severity | Fix |
|---|---|---|---|
| 1 | Green text on the pale green badge was 4.35:1 (needs 4.5:1) on the results and test-plan pages | Serious (WCAG AA) | Darker green token (6.9:1). |
| 2 | Low-priority cards were dimmed with `opacity`, which lowered every word in them below AA | Serious | Dashed border instead of dimming. |
| 3 | The guide's checklist progress bar had no accessible name; the guided check's bar too | Serious | `aria-label` added. |
| 4 | "How to run a test" skipped a heading level | Moderate | Headings corrected. |
| 5 | The type checker reported 21 errors (missing Cloudflare typings, a real `excess` type slip in the explorer) and 4 warnings (dead CSS, a prop captured only at first render) | Medium | Typings added, types fixed, share prefill is now reactive. **Now 0 errors, 0 warnings.** |
| 6 | A single typo (a result below -90% or above +300%, or baseline runs over 50% apart) made the server reject the whole shared report | Medium | The share panel applies the server's limits, excludes those results, and says why. |
| 7 | Saved or imported data was trusted as is. A malformed file could crash the test plan | Medium | Everything loaded or imported is normalised (known tests only, numbers or null, size limits). |
| 8 | The privacy notice promises deletion after 24 months, but the purge was a manual command | Medium (compliance) | The Worker now runs a monthly cron that purges old reports and counters. |
| 9 | The test-verifier override could in principle be set in production | Low | Ignored unless the request is to localhost. |
| 10 | `HEAD` requests to the API returned 404 (uptime checks, `curl -I`) | Low | HEAD behaves like GET without a body. |
| 11 | Home page said "Nothing leaves your browser" although sharing exists | Low (accuracy) | "Your answers stay in your browser". |
| 12 | The results page said "5 tests" but counted free tips | Low | Counts real tests and mentions the tips separately. |
| 13 | Client-only tools showed nothing without JavaScript | Low | A plain notice. |
| 14 | **The test suites lived outside the project** and would have been lost | High (process) | 103 checks now in `tests/`; run `npm test`. Type check: `npm run check:types`. |

## Still open (for you or later)
1. **Turnstile secret (you, urgent).** It must be a **Secret**, not a Variable, and rotated, because the first value was pasted into chat. Sharing reports `"ready":false` on the live site until it is set.
2. **No HSTS on the workers.dev address.** Turn on "Always use HTTPS" and HSTS once you have your own domain. The rate-limit rule also needs a domain on Cloudflare.
3. **The Cache API does nothing on workers.dev**, so `/api/findings` is not cached there yet. It works on a custom domain. At small scale this is fine.
4. **Findings reads every report row** on each uncached request. Fine until the table is large; then switch to a pre-aggregated table.
5. **First paint of the tools is blank** until JavaScript loads (the tools render in the browser only). A skeleton would feel faster.
6. **Font subsets:** about 30 KB of unused latin-extended and Cyrillic subsets ship (browsers only download what they need, so the real cost is nil).
7. **No automated browser tests** (for example Playwright), and no CI. Adding CI needs a GitHub token scope for workflow files, so it is a deliberate later step.
8. **Real-user testing, brand identity (logo, illustration, share images), screen-reader pass**: see `site-review.md`.
9. Legal placeholders, ICO fee check, adviser review, `noindex` removal, donation link: see `compliance/README.md`.

## Not an issue (checked)
- npm audit: 0 vulnerabilities. Bundle sizes are small (about 480 KB for the whole site, largest script 42 KB).
- "Missing anchor" `/findings/#share` in a static link crawl is a false alarm: that anchor is drawn in the browser, and it works.
- Cross-site requests to the API are refused (no CORS headers, preflight returns 405); security headers are present on pages and API responses.
