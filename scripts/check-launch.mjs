// Run before going public: `npm run check:launch`. Lists everything still blocking launch.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (f) => { try { return readFileSync(join(root, f), 'utf8'); } catch { return ''; } };
const walk = (dir, out = []) => { for (const f of readdirSync(dir)) { const p = join(dir, f); statSync(p).isDirectory() ? walk(p, out) : /\.(astro|svelte|ts)$/.test(f) && out.push(p); } return out; };

const blockers = [];
for (const file of walk(join(root, 'src'))) {
  const t = readFileSync(file, 'utf8');
  const hits = t.match(/class="todo">\[[^\]]+\]/g);
  if (hits) hits.forEach((h) => blockers.push(`${relative(root, file)}: placeholder ${h.replace('class="todo">', '')}`));
  if (/Draft, not yet reviewed/.test(t)) blockers.push(`${relative(root, file)}: still marked "Draft, not yet reviewed by a legal adviser"`);
  if (/href="#"/.test(t) && /Donate/.test(t)) blockers.push(`${relative(root, file)}: donate button still points to #`);
}
if (/name="robots" content="noindex/.test(read('src/layouts/Base.astro'))) blockers.push('src/layouts/Base.astro: noindex meta tag (remove at launch)');
if (/X-Robots-Tag/i.test(read('public/_headers'))) blockers.push('public/_headers: X-Robots-Tag noindex (remove at launch)');
if (!/database_id\s*=/.test(read('wrangler.toml').replace(/^\s*#.*$/gm, ''))) blockers.push('wrangler.toml: D1 binding not set up (needed only if you turn sharing on)');

console.log('Launch blockers:\n');
if (!blockers.length) console.log('  none found by this script. Human sign-offs still needed: legal review, ICO fee check, Cloudflare rate-limit rule, Turnstile keys.');
else blockers.forEach((b) => console.log('  - ' + b));
console.log('\nSee docs/compliance/README.md for the full list.');
process.exit(blockers.length ? 1 : 0);
