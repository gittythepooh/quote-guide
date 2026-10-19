// Guards the "information only" position. Runs before every build (prebuild).
// Fails if advice-like or risky phrases appear, or if required disclaimers are missing.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const BANNED = [
  [/you should (buy|choose|switch|take out|go with)/i, 'tells a person what to buy'],
  [/we recommend/i, 'a recommendation'],
  [/best (insurer|policy|insurance|deal|provider|company)/i, 'ranks a product or insurer'],
  [/cheapest (job )?title/i, 'implies choosing a job title for price'],
  [/\bguaranteed?\b/i, 'a guarantee'],
  [/you('| wi)ll save/i, 'a promise of savings'],
  [/\b(pretend|lie about|fake (name|address|details|job))\b/i, 'encourages false answers'],
  [/free (insurance )?advice/i, 'offers advice'],
];
const REQUIRED = [
  ['src/layouts/Base.astro', 'not authorised or regulated by the Financial Conduct Authority'],
  ['src/layouts/Base.astro', 'href="/terms/"'],
  ['src/layouts/Base.astro', 'href="/privacy/"'],
  ['src/components/Advisor.svelte', 'not a recommendation'],
  ['src/pages/terms.astro', 'Not personal advice'],
  ['src/pages/privacy.astro', 'Information Commissioner'],
  ['src/pages/guide.astro', 'fronting'],
];

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    statSync(p).isDirectory() ? walk(p, out) : /\.(astro|svelte|ts|md)$/.test(f) && out.push(p);
  }
  return out;
}

let problems = 0;
for (const file of walk(join(root, 'src'))) {
  const text = readFileSync(file, 'utf8');
  for (const [re, why] of BANNED) {
    const m = text.match(re);
    if (m) { console.error(`WORDING  ${relative(root, file)}: "${m[0]}" (${why})`); problems++; }
  }
}
for (const [file, needle] of REQUIRED) {
  let text = '';
  try { text = readFileSync(join(root, file), 'utf8'); } catch {}
  if (!text.includes(needle)) { console.error(`MISSING  ${file}: required text "${needle}"`); problems++; }
}
if (problems) { console.error(`\ncheck-wording: ${problems} problem(s). Fix them or discuss with your adviser before changing the rules.`); process.exit(1); }
console.log('check-wording: ok');
