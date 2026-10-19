// Saved state for the test plan (browser only) and the maths behind the results.
import { TESTS, type Params, type Refs } from './tests';
import type { ChangeKey } from './report-schema';

export const KEY = 'qg-whatif-v2';
export const NOISE_FLOOR = 5; // percent. Gaps smaller than this are treated as likely noise.

export type TestState = { on?: boolean; skipped?: boolean; params: Params; runs: (number | null)[]; text?: string };
export type Custom = { id: string; label: string; price: number | null };
export type Store = {
  v: 2;
  baselineRuns: (number | null)[];
  refs: Refs;
  tests: Record<string, TestState>;
  custom: Custom[];
  usingSample: boolean;
};

export const emptyStore = (): Store => ({ v: 2, baselineRuns: [null], refs: { vehicleValue: null, mileage: null }, tests: {}, custom: [], usingSample: false });

export function sampleStore(): Store {
  const t = (id: string, params: Params, price: number): [string, TestState] => [id, { params: { ...TESTS[id].defaults, ...params }, runs: [price] }];
  return {
    ...emptyStore(),
    baselineRuns: [3339],
    usingSample: true,
    tests: Object.fromEntries([
      t('drivers', { count: 'two' }, 2601),
      t('blackbox', {}, 2052),
      t('cover', { type: 'tpft' }, 3135),
      t('value', { dir: 'down' }, 3339),
      t('tracker', {}, 3337),
    ]),
  };
}

const V1_LABELS: Record<string, [string, Params]> = {
  'add a named driver (who genuinely drives)': ['drivers', {}],
  'black box (telematics) quote': ['blackbox', {}],
  'alternative job title (also true)': ['job', {}],
  'pay monthly (record total payable)': ['pay', {}],
  'start date about 4 weeks ahead': ['timing', { when: '4w' }],
  'voluntary excess +£500': ['excess', { amount: '500' }],
  'cover: third party, fire and theft': ['cover', { type: 'tpft' }],
};

/** Bring the old table format (v1) into the new shape. Sample data is dropped. */
function fromV1(d: any): Store {
  const s = emptyStore();
  if (!d || d.usingSample) return s;
  if (typeof d.baseline === 'number') s.baselineRuns = [d.baseline];
  for (const row of d.scenarios ?? []) {
    const label = String(row.label ?? '').trim();
    const price = typeof row.price === 'number' ? row.price : null;
    if (!label && price === null) continue;
    const hit = V1_LABELS[label.toLowerCase()];
    if (hit && !s.tests[hit[0]]) s.tests[hit[0]] = { on: true, params: { ...TESTS[hit[0]].defaults, ...hit[1] }, runs: [price] };
    else s.custom.push({ id: crypto.randomUUID(), label, price });
  }
  return s;
}

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d?.v === 2) return { ...emptyStore(), ...d };
    }
    const old = localStorage.getItem('qg-whatif-v1');
    if (old) return fromV1(JSON.parse(old));
  } catch {}
  return emptyStore();
}
export function save(s: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

// ---------------------------------------------------------------- maths
const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function baseline(runs: (number | null)[]) {
  const v = runs.filter(valid);
  if (!v.length) return { avg: null as number | null, runs: 0, spreadPct: 0, noise: NOISE_FLOOR };
  const a = avg(v);
  const spreadPct = v.length > 1 ? ((Math.max(...v) - Math.min(...v)) / a) * 100 : 0;
  return { avg: a, runs: v.length, spreadPct, noise: Math.max(NOISE_FLOOR, spreadPct) };
}

export type Verdict = 'cheaper' | 'dearer' | 'noise';
export type Result = {
  id: string;
  title: string;
  avg: number;
  diff: number;
  pct: number;
  verdict: Verdict;
  runs: number;
  disagreePct: number; // how far apart repeat runs of this test are
  repeatsDisagree: boolean;
  change: ChangeKey | null;
};

export function resultFor(id: string, title: string, runs: (number | null)[], change: ChangeKey | null, b: ReturnType<typeof baseline>): Result | null {
  const v = runs.filter(valid);
  if (!v.length || b.avg === null) return null;
  const a = avg(v);
  const diff = a - b.avg;
  const pct = (diff / b.avg) * 100;
  const disagreePct = v.length > 1 ? ((Math.max(...v) - Math.min(...v)) / a) * 100 : 0;
  const verdict: Verdict = Math.abs(pct) < b.noise ? 'noise' : pct < 0 ? 'cheaper' : 'dearer';
  return { id, title, avg: a, diff, pct, verdict, runs: v.length, disagreePct, repeatsDisagree: v.length > 1 && disagreePct > b.noise, change };
}

export function allResults(s: Store): Result[] {
  const b = baseline(s.baselineRuns);
  const out: Result[] = [];
  for (const [id, st] of Object.entries(s.tests)) {
    const def = TESTS[id];
    if (!def || st.skipped) continue;
    const r = resultFor(id, def.title, st.runs, def.change(st.params), b);
    if (r) out.push(r);
  }
  for (const c of s.custom) {
    const r = resultFor(c.id, c.label || 'Your own test', [c.price], null, b);
    if (r) out.push(r);
  }
  return out;
}

export const gbp = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');
export const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + gbp(Math.abs(n));
export const pctText = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(1) + '%';
