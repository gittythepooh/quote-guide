# Fog Off: art brief for an AI illustration tool

Use this with a tool that makes SVG or layered vector art (for example Recraft, Figma AI, Illustrator Generative Vector, or Claude/Gemini asked to output SVG). Make each asset as a SEPARATE file. Ask for SVG. If the tool only gives PNG, ask for a transparent background at 2400 px wide and I will trace it.

## Style (applies to every asset)

- Premium, calm, modern. Think Apple, Stripe, Linear marketing art.
- Flat vector shapes. No outlines. No textures. No cartoon faces.
- At most one soft shade per object (a flat darker tone on the lower part). No glossy gradients.
- Same shape language for all assets: smooth, slightly rounded, simple.
- Transparent background. Art must look good on a white page.

## Palette (use only these)

| Use | Colour |
|---|---|
| Brand accent (character top, small details) | #0F766E |
| Navy (trousers, shoes, tyres, dark details) | #1F2A37 |
| Skin | #F1C7A5 |
| Hair | #2B2320 |
| Car body | #E9EDF0 (soft white) with shade #CBD3D9 |
| Glass | #B9D3DF with highlight #E4F0F5 |
| Fog light | #F2F5F8 |
| Fog mid | #DDE5EB |
| Fog dark | #C7D2DB |

## Assets

1. **Character (falling).** One adult, small and simple, full body, arms up and slightly out, legs trailing, as if falling and a little surprised. Teal jacket, navy trousers, white trainers. Face: two tiny dots for eyes and a small open mouth, nothing else. Height about 3x the width. Side-on or front-on, not 3/4.
2. **Character (seated).** The same person from the chest up, seated, facing right, hands on a wheel. Same colours. Separate file.
3. **Car.** A modern compact SUV or hatchback, side view, facing right, parked on flat ground. Clean panels, a visible side window and door line, small headlight and tail light. Two wheels as SEPARATE layers (dark tyre, light rim) so they can spin. Body, glass and shadow as separate groups. Leave the cabin empty (the seated character goes in front of the glass).
4. **Fog banks.** Five different wide, low, soft cloud banks, flat shapes with flat edges at the bottom, three tones (light, mid, dark). Each as its own file. They should read as haze and cloud, not cartoon puffs. Width ratio about 2.5 to 1.
5. **Optional: ground.** A single thin horizontal road strip, light grey, 1600 px wide, seamless.

## Rules for the tool

- Every object in its own named group (`character-fall`, `car-body`, `wheel-front`, `wheel-rear`, `glass`, `fog-1`...).
- Keep the SVG small (under 30 KB each). Few paths, no filters, no blurs, no masks, no embedded images.
- Do not copy any existing brand, mascot or recognisable car model.

## What to send back to me

Drop the SVG files in `src/assets/art/` (or send them here). I will plug them into the scroll scene, keep the sequence (fog lifts, character falls, lands in the car, car drives off, first question appears), and keep the phone, dark mode and reduced-motion versions working.

## Licence check

Before the art goes on the site, confirm the tool's terms allow commercial use of its output, and keep a note of the tool and date. (AI output may have limited copyright protection, so the brand logo should not rely on it.)
