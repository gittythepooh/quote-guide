# Anonymisation assessment

**Conclusion for now: treat shared reports as personal data (pseudonymous at best).** Reasons below. Adviser to confirm.

## Re-identification arithmetic
Fields stored per row and their possible values: age band 7, region 12, car age band 4, no-claims band 5, cover 3, comparison site 5. That is 7 x 12 x 4 x 5 x 3 x 5 = **25,200 combinations**. Add the arrival week (about 104 weeks in 24 months) and there are about **2.6 million** combinations. With far fewer rows than that, most stored rows will be unique in the table. The table therefore cannot be called anonymous in the sense that every row looks like at least k others.

## Why the risk is still low
- No direct identifier is stored (no name, address, postcode, date of birth, email, registration, IP).
- Someone would need outside knowledge that a particular person submitted a report in a particular week, plus their bands, to find the row. What they would learn is a handful of percentages.
- The raw table is not public. Only Cloudflare account holders (the controller) can read it.
- Public output is aggregate only, with a minimum group size of 20, a one-hour cache and a rolling 24-month window.

## Controls to keep
Never publish rows. Never add free text, exact dates, postcodes or prices. Keep the week-level date. Review before adding any field. Delete rows after 24 months. Re-run this assessment when fields change or the table grows.

## Possible improvements
- Publish stratified figures (for example by age band) only when each stratum has 20 or more reports.
- Merge rare bands (for example 60+ with 50-59) if some cells stay tiny.
- Consider dropping the comparison site from stored rows if it is not used.
