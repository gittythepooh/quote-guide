# Handling privacy requests

Deadline: reply **within one month** of receipt (can extend by up to two further months for complex requests, with notice). No fee for ordinary requests.

1. **Log it.** Date received, what was asked, who by (only what they give us).
2. **Check identity only as far as needed.** Reports hold no identity, so we usually cannot link a person to rows. Do not ask for ID just to look.
3. **If they have a delete code:** they can use the "Delete a report I sent" box on the Share step (Findings page). Or delete by hash: compute SHA-256 of the code and run `DELETE FROM results WHERE code_hash = '<hash>'` (see `db/purge.sql`).
4. **If they lost the code:** explain we cannot find their report because it is not linked to them. Offer: nothing identifiable is held; reports are deleted after 24 months. Record the reply.
5. **Access or portability:** we hold no account data. Explain the local-storage export in the test plan ("Export").
6. **Objection or withdrawal of consent:** same as deletion where we can find rows.
7. **Reply in writing** and keep the log for at least 12 months. Mention the right to complain to the ICO.
8. **Not a request?** If it is a complaint about content, a takedown request, or a media query, handle under the same log and respond within a week where possible.
