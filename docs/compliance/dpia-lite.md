# Data protection risk assessment (light DPIA)

A full DPIA is required only where processing is likely to result in a high risk to people. This light version records why we think the risk is low, and what would change that. Adviser to confirm.

## Why risk looks low
- Default use sends nothing to us.
- Optional reports hold only broad bands and percentages. No names, contact details, addresses, prices or free text.
- Individual reports are never published. Group figures need 20 or more reports.
- People can delete their own report with a code.
- Small scale. No special category data. No profiling of individuals. No automated decisions. No sale or marketing use.

## Risks and controls
| Risk | Likelihood | Impact | Control | Residual |
|---|---|---|---|---|
| Someone is singled out from a unique combination of bands | Low to medium (see `anonymisation-assessment.md`) | Low (no direct identifiers; combined data reveals only banded profile and % changes) | Banding, week-level date, no IP, no publication of rows, data kept 24 months | Low |
| Poisoned or fake reports | Medium | Medium (misleading findings) | Turnstile, hourly/daily cap, rate-limit rule, validation, monthly review, purge | Low to medium |
| Database breach | Low | Low to medium | Minimal data, Cloudflare access control and 2FA, no secrets in repo | Low |
| People believe findings are personal advice | Medium | Medium | Role statements, softened wording, caveats, sample sizes shown | Low to medium |
| Reports cannot be deleted if the code is lost | Medium | Low | Say so plainly in the notice. Offer contact route. | Low |
| Third-party script (Turnstile) | Low | Low | Loaded only when the share panel is opened, privacy notice explains it | Low |

## Triggers to redo this assessment
Adding accounts or emails, any free-text field, any exact date or location, any sharing with a third party, any marketing use, any publication of per-site or per-insurer figures, or large growth.

Reviewed by: __________  Date: __________
