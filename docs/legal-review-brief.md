# Brief for a legal / compliance adviser

Prepared 19 Oct 2026. This is a briefing, not legal advice. Its purpose is to let an adviser (solicitor or compliance consultant with FCA and UK GDPR experience) answer the questions below in one short engagement.

## The product in one paragraph
"Fog Off" is a free, donation-funded, UK website. It helps people understand what changes a car-insurance quote on comparison sites. It does not sell insurance, take commission, show live quotes or give personal recommendations. People run their own test quotes elsewhere, type the resulting prices into tools on this site, and see which changes mattered. Everything runs in the browser by default. Optionally, a user can share an anonymous, banded result (percentage changes only) to build community averages that are published only once 20 people have reported a given change.

## What it does and does not do
| Does | Does not |
|---|---|
| Explains quote-form questions in general terms | Recommend an insurer, product or policy to a person |
| Shows the effect of each test on the user's own prices (percentage change against their baseline) and builds a "recipe" of the changes that helped | Fetch, scrape or display live quotes |
| Publishes aggregate findings ("typically X% lower in N reports") | Publish any individual report |
| Warns that answers must be true when buying and warns about fronting | Suggest false answers |
| Is funded by donations | Take commissions or affiliate fees |

## Data flows
1. Default: data stays in the browser (localStorage). Export and import are files on the user's device.
2. Optional share: POST of banded fields (age band, region, car age band, no-claims band, cover type, comparison site) plus percentage changes. Stored in Cloudflare D1 by week. No IP, no account, no free text. A random delete code is shown once; only its hash is stored.
3. Cloudflare Turnstile runs when the share panel opens (contacts Cloudflare). IPs are not sent by us when verifying and not stored by us.
4. Published output: medians and ranges per change type, minimum 20 reports, rolling 24 months.

## Questions
### FCA perimeter and promotions
1. Is a free information tool of this kind outside the regulated activities for contracts of insurance (for example arranging, advising, assisting in administration)? Which parts, if any, are at risk: the Fog Off score and its High, Medium and Low bands, the "recipe", the findings page, the guide wording?
2. Is wording such as "adding a parent cut the quote by about 15%" a financial promotion or personal recommendation? What wording or disclaimers should we use?
3. Do any rules apply to publishing aggregated results that name comparison sites (the `site` field is collected, not yet published)?
4. Do we need to be an appointed representative or have any permission if we later add affiliate links or a browser add-on?

### UK GDPR / data protection
5. Are the banded rows personal data (age band + region + car age band + no-claims band + cover + site + week + changes)? What anonymisation test do you apply?
6. Are we a controller? Is consent the right lawful basis for the optional report, and is a tick-box with a plain-language preview enough?
7. Is a DPIA needed? Is the privacy page (draft) adequate? What is missing?
8. Retention: 24 months for rows, 3 days for limiter counters. Reasonable? D1 Time Travel keeps backups for 30 days: how should we describe that for erasure requests?
9. Erasure without identity: users hold a random code. What do we say to people who lose it?
10. International transfers: Cloudflare may process data outside the UK. Is anything needed beyond Cloudflare's own terms?
11. Do we need to pay the ICO data protection fee, or are we exempt? (ICO self-assessment.)
12. PECR: we use localStorage for features the user asked for and load Turnstile only on opening the share panel. Is a consent banner needed?

### Terms and liability
13. The method asks users to enter dummy or changed details on comparison sites to see price effects. Do those sites' terms or insurers' rules prohibit this? What should we say to users (we already say: buy only on true answers; test names and personal-detail changes are never to be shared or bought on)?
14. Disclaimer and limitation of liability for information that may be out of date or wrong. Governing law and a plain-English terms page.
15. Defamation and competition risk if we later publish per-insurer or per-site results. What rules of thumb should we follow?

### Guided check
19. The "Guided check" ranks what is worth testing for a person ("Start here", "Chance it helps: High/Medium/Low", approximate sizes from tests). Does that amount to a personal recommendation or advice on a contract of insurance? What changes (wording, removing the likelihood label, extra disclaimers) would keep it information-only?
20. The tool tells people to test every job title that is genuinely accurate for them. Is that wording safe, given insurers can verify occupation and a wrong title can void a claim?

### Other
16. Donations: what structure is needed (sole trader, community interest company, other), and any VAT or tax issues?
17. Licence for the code (open source) and for the published data.
18. Accessibility duties (Equality Act) for a free public site.

## Already drafted for you to review
`docs/compliance/` holds an FCA self-assessment, record of processing, light DPIA, anonymisation assessment (shows the rows are unique in the table, so treated as personal data), request and breach procedures, and editorial rules. The site has draft `/privacy/` and `/terms/` pages with yellow placeholders. Please mark up those drafts rather than starting from scratch.

## Documents to give the adviser
- `src/pages/privacy.astro` (draft privacy notice) and `src/pages/guide.astro`.
- `src/lib/report-schema.ts` (exactly what can be collected) and `db/schema.sql`.
- `docs/launch-checklist.md` and `docs/cloudflare-setup.md`.
- The 2022 survey and test summary (dummy data only).
