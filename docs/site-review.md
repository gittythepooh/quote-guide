# Site review: does it meet the objectives?

Reviewed 19 Oct 2026 by walking the whole journey (home, guided check, results, test plan, compare, findings, privacy, terms) on desktop (1280 wide) and a 375 px phone, reading the code, and running the unit checks. Not yet tested with real people, real phones, or a screen reader.

## The two objectives
1. **Guide people to make honest tweaks that improve their price.**
2. **Let people contribute results to a central database.**

| Objective | Before this review | After |
|---|---|---|
| Guide | Strong engine (priority order, evidence, honest caveats) but the path was unclear: five sibling nav links, no sense of step, Compare floated alone, jargon unexplained, results page repeated its own title. | Four-step journey bar on every tool page (Check, Test, Compare, Community), top-of-page action on the results, "how to run a test" and a jargon buster, a "what to do next" card and print option. |
| Contribute | Worked technically, but hidden: the home page never mentioned it and sharing sat at the bottom of the test plan. | Home page has a community section, the test plan shows a prominent "share your N results" call-to-action once there are two, findings page invites first contributors. |
| Modern, clean, usable by anyone | Clean cards and dark mode, but text-only hero, orphan card in the grid, font never actually loaded, scrolling nav on phones. | Self-hosted Manrope, hero with a live-style example result, icon steps, mobile menu, skip link, print styles. |

## Journey, revised after testing (19 Oct)
The comparer first felt disconnected from the tests: it opened on sample data and knew nothing about the plan. The journey is now **Check, Test, Choose, Share**:
1. **Check** (guided check) decides what to test.
2. **Test** (test plan) learns what moves the price on one site, and builds a recipe.
3. **Choose** (comparer) opens with the baseline, the recipe price, the excess and the claim feeling already filled in. The user adds the real quotes from two or three sites and insurers with the recipe applied. Only real quotes can win. It reports the saving against the baseline and how far the real quotes are from the tested price.
4. **Share** (final step on the Findings page) lists the results and opens the share panel, with the profile bands prefilled from the guided check.

## Bugs found and fixed
| # | Bug | Effect | Fix |
|---|---|---|---|
| 1 | Old explorer sample rows migrated as the user's own data (it flipped to "your data" on the first keystroke) | "Add mum as a driver", "+734%" bars in a real plan | Migration drops rows that match the old sample label and price; saved v2 data is cleaned on load. Tested. |
| 2 | Implausible results (more than +100%) were charted as normal | One wild number flattened every bar | Warning on the card; chart scale capped at 60%. |
| 3 | A global CSS class `.bar` (header) collided with chart bars, and `.top` with card rows | Bars rendered 64 px tall; cards got sticky behaviour | Header classes renamed with a `site-` prefix. |
| 4 | "Two drivers" was a switch, so one-vs-two could not be compared | Could not see what the second driver adds | Split into "Add one more driver" and "Add a second driver as well"; the second shows the change against baseline and against one driver. |
| 5 | Font declared (Manrope) but never loaded | Fell back to the system font | Self-hosted variable font, no third-party request. |
| 6 | Findings notes said "labels in the sheet looked swapped" | Internal caveat shown to the public | Reworded to "low confidence: one small early test". |

## Method risks and how the plan guards against them
| Risk | Guard |
|---|---|
| A change left switched on from the last test contaminates the next result | Every card says "Reset first: put every answer back to your baseline". If a test returns exactly the same price as an earlier one, and both differ from the baseline, the card warns that the earlier change may still be on. |
| Changes that only help together, or one that hurts and hides another that helps | "Build your best combination": helpful changes are added on top of each other, best first. Each is kept only if the price falls by more than the noise level, otherwise dropped. The end gives a recipe. |
| One lucky or unlucky quote | Optional repeat runs per test, up to three baseline runs, and a noise threshold measured from them. |
| Typos or mixed-up price types | Warning when a result is more than 100% away from the baseline, and the chart scale is capped. |
| Presets that do not fit | Start dates have 7 presets plus a calendar; excess, mileage and vehicle value accept any custom number. Custom values still show results but are only shared when they match a standard type. |

## What a first-time visitor still has to do alone (friction)
- Understand that the method means running quotes on a different website. The how-to explains it, but this is the biggest concept risk. **Test it with five real people before polishing further.**
- Move between two browser tabs on a phone. Consider a "copy the instruction" button, or a compact floating "current test" bar.

## Ranked roadmap towards "award-winning"
**High impact**
1. **Usability test with 5 people** (think-aloud, phone first). Fix the top three problems found.
2. **Brand identity**: a real name, logo, colour pairing, a small illustration and motion set, share images. "Quote Guide" is a placeholder.
3. **Accessibility audit**: axe scan, keyboard-only run, VoiceOver, colour contrast on every token, reduced-motion check. Aim for WCAG 2.2 AA.
4. **Performance**: Lighthouse on a mid-range phone. The tools render in the browser only, so add a skeleton for the first paint.
5. **Community loop**: show "N of 20 reports" per test inside the test card, a thank-you moment after sharing, and a contributor counter on the home page once real numbers exist.

**Medium**
6. Reading-level pass (aim for plain English at about age 12) and a shorter first screen on the guided check.
7. Per-site tips for the big comparison sites (screens and field names). High maintenance and needs a legal check on terms.
8. Light and dark toggle (today it follows the device).
9. Privacy-first measurement of the funnel (start, finish, share) so you can see where people drop. Needs a legal check.
10. More tests (parking, payment type, voluntary excess levels), and a short "how to read a quote" guide.

**Later**
11. Accounts or saved plans across devices, only if people ask. Adds privacy and legal work.
12. Findings by profile (age band, region) once each cell has 20 or more reports.

## Not verified
Smooth scrolling and animations (my test browser does not run them), real devices, screen readers, Lighthouse scores, and anything involving real Turnstile or the live database.
