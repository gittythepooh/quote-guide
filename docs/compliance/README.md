# Compliance pack

Prepared 19 Oct 2026. These are **working drafts and internal records**, not legal advice. Their job is to make the site as safe as it can be before a qualified adviser reviews it, and to give that adviser everything in one place.

Run `npm run check:launch` to list every blocker still in the code. `npm run check:wording` runs automatically before every build and fails if advice-like phrases appear or required disclaimers go missing.

## Status

| Area | What exists | Still needs a human |
|---|---|---|
| Role and FCA position | Footer, terms, guided check and share panel all say we are not FCA authorised and do not sell, arrange or advise. Advice-like labels softened. `fca-self-assessment.md`. | Adviser confirms the position (brief questions 1 to 4, 19, 20). |
| Privacy notice | Full draft at `/privacy/` with a table of data, basis, recipients, transfers, retention, rights, ICO complaint route, storage section. | Fill the yellow placeholders. Confirm Cloudflare transfer terms. Adviser review. |
| Terms | Draft at `/terms/`: role, user duties, reporting rules, liability, licences. | Fill placeholders. Confirm governing law. Adviser review. |
| Consent | Two ticks before sharing (own genuine data; consent to banded report), plus a bot check. Delete-by-code. | Adviser confirms basis and wording. |
| Records | `ropa.md`, `dpia-lite.md`, `anonymisation-assessment.md`. | Review and sign. Keep current. |
| Procedures | `requests-procedure.md`, `breach-response.md`. | Add the real contact address and a backup person. |
| ICO fee | `ico-fee.md` explains how to check. | Complete the ICO self-assessment (official tool). |
| Abuse and security | Turnstile, hourly/daily cap, origin checks, input validation, purge script. See `../launch-checklist.md`. | Cloudflare rate-limit rule, Turnstile keys. |
| Search engines | `noindex` meta tag and header while this is a draft site. | Remove both at launch (the launch check lists them). |

## Human sign-offs needed before launch
1. Legal review of the brief (`../legal-review-brief.md`), privacy notice and terms.
2. ICO data protection fee self-assessment (official ICO tool), then register and pay if required.
3. Decide the controller name and a monitored contact email. Fill every yellow placeholder.
4. Confirm Cloudflare's data processing terms and UK transfer mechanism in your account.
5. Create the Cloudflare rate-limit rule and Turnstile keys (`../cloudflare-setup.md`).
6. Check comparison sites' terms about test quotes (brief question 13).
7. Remove `noindex` and add the donation link, then run `npm run check:launch` until it is clean.

## Facts to verify against official sources
Secondary web sources disagreed or were out of date on these points. Check the primary source before relying on them:
- ICO fee tiers and amounts for 2026, and which exemptions apply to you.
- PECR rule 6 as amended by the Data (Use and Access) Act 2025 (reported as in force from 5 Feb 2026), and the ICO's current storage and access technologies guidance.
- The current wording of FCA PERG 5 and the Regulated Activities Order on arranging, advising and providing information about insurance contracts.
- The ICO's current guidance on anonymisation and pseudonymisation.
