# Personal data breach response

A breach is any loss, theft, unauthorised access or exposure of the report database or credentials. If a breach is likely to risk people's rights and freedoms, **tell the ICO within 72 hours of becoming aware**. If the risk to individuals is high, tell them without undue delay. Record every breach, even ones not reported.

1. **Contain (first hour):** rotate the Turnstile secret, revoke Cloudflare API tokens, change passwords, check GitHub and Cloudflare sign-in history, switch sharing off (remove the Turnstile site key build variable and redeploy, or unbind the DB).
2. **Assess:** what data, how many rows, how long, could anyone be identified, was the raw table copied.
3. **Decide and record:** write down the facts, effects and actions, and the reason for any decision not to report.
4. **Notify:** ICO (online breach report, 72-hour clock) when required. Tell affected people if high risk, in plain language. There is no contact list, so use a site notice.
5. **Fix and learn:** patch, add a control, update `dpia-lite.md`.

Contacts to fill in: backup person __________, adviser __________.
