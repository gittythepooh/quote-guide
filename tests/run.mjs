// `npm test`: bundles the code under test with esbuild, runs each tests/*.test.mjs, and fails if any check fails.
import { build } from 'esbuild';
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
await build({
  entryPoints: {
    explorer: root + 'tests/entries/explorer.ts',
    advisor: root + 'src/lib/advisor.ts',
    report: root + 'functions/api/report.ts',
    schema: root + 'tests/entries/schema.ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outdir: root + 'tests/.build',
  outExtension: { '.js': '.mjs' },
  logLevel: 'error',
});

let pass = 0, fail = 0;
for (const f of readdirSync(root + 'tests').filter((n) => n.endsWith('.test.mjs')).sort()) {
  const r = spawnSync(process.execPath, ['--no-warnings', root + 'tests/' + f], { encoding: 'utf8', maxBuffer: 20_000_000 });
  const lines = (r.stdout || '').split('\n');
  const p = lines.filter((l) => l.startsWith('PASS')).length;
  const bad = lines.filter((l) => l.startsWith('FAIL'));
  pass += p; fail += bad.length;
  console.log(`${bad.length || r.status ? 'FAIL' : 'ok  '} ${f.padEnd(22)} ${p} passed${bad.length ? `, ${bad.length} failed` : ''}`);
  bad.forEach((l) => console.log('     ' + l));
  if (r.status && !bad.length) console.log('     crashed:\n' + (r.stderr || '').split('\n').slice(0, 8).join('\n'));
  if (r.status) fail += bad.length ? 0 : 1;
}
console.log(`\n${pass} checks passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
