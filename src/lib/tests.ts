// Catalog of the tests a person can run on a comparison site, and how to order them.
// Gender is deliberately not asked: UK insurers have not been allowed to price on gender since 2012.
import type { ChangeKey } from './report-schema';
import { advise, type Answers } from './advisor';

export type Params = Record<string, string>;
export type Refs = { vehicleValue: number | null; mileage: number | null; excess?: number | null };
export type Opt = { value: string; label: string };
export type CustomDef = { id: string; label: string; prefix?: string; suffix?: string; min?: number; max?: number };
export type DateDef = { id: string; label: string; maxDays: number };
export type ParamDef = { id: string; label: string; options: Opt[]; custom?: CustomDef; date?: DateDef };
export type RefDef = { id: 'vehicleValue' | 'mileage' | 'excess'; label: string; unit: '£' | 'miles' };

export type TestDef = {
  id: string;
  title: string;
  params: ParamDef[];
  defaults: Params;
  ref?: RefDef;
  localText?: { label: string; placeholder: string };
  instruction: (p: Params, r: Refs) => string;
  change: (p: Params) => ChangeKey | null;
  mustBeTrue?: string;
  caution?: string;
};

const money = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');
const num = (n: number) => Math.round(n).toLocaleString('en-GB');
const label = (def: ParamDef | undefined, value: string) => def?.options.find((o) => o.value === value)?.label ?? value;

const AGES = ['21-24', '25-29', '30-39', '40-49', '50-59', '60+'].map((v) => ({ value: v, label: v }));

// ---- dates (all in the visitor's local time)
const MS = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (n: number) => { const d = startOfDay(new Date()); d.setDate(d.getDate() + n); return d; };
const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export function daysUntil(iso: string | undefined): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - startOfDay(new Date()).getTime()) / MS);
}
const WHEN: Record<string, { days: number; key: ChangeKey }> = {
  '1d': { days: 1, key: 'start_later_1d' }, '1w': { days: 7, key: 'start_later_1w' }, '2w': { days: 14, key: 'start_later_2w' },
  '3w': { days: 21, key: 'start_later_3w' }, '4w': { days: 26, key: 'start_later_4w' }, '6w': { days: 42, key: 'start_later_6w' }, '8w': { days: 56, key: 'start_later_8w' },
};
/** The preset closest to a number of days, if it is close enough to share as that preset. */
export function nearestWhen(days: number | null): ChangeKey | null {
  if (days === null) return null;
  let best: ChangeKey | null = null, gap = Infinity;
  for (const w of Object.values(WHEN)) {
    const g = Math.abs(w.days - days);
    if (g <= Math.max(1, Math.round(w.days * 0.12)) && g < gap) { best = w.key; gap = g; }
  }
  return best;
}
const signedPct = (n: number) => `${n > 0 ? '+' : '−'}${Math.abs(n)}%`;

const WHO = [{ value: 'partner', label: 'Partner' }, { value: 'parent', label: 'Parent' }, { value: 'child', label: 'Adult child' }, { value: 'sibling', label: 'Sibling' }, { value: 'friend', label: 'Friend' }];
const LICENCE = [{ value: 'lt2', label: 'Under 2' }, { value: '2-5', label: '2 to 5' }, { value: '5+', label: '5 or more' }];
const RECORD = [{ value: 'none', label: 'None' }, { value: 'some', label: 'Some' }];
const DRIVER_MUST = 'Only add people who genuinely drive the car. If you are the main driver, never name an older relative as the main driver (fronting).';
const DRIVER_CAUTION = 'We do not ask for gender: insurers have not been allowed to price on it since 2012.';
/** Describe a driver from the details actually chosen. Nothing is assumed: returns null until something is picked. */
const describe = (p: Params): string | null => {
  const parts: string[] = [];
  const who = WHO.find((o) => o.value === p.who)?.label.toLowerCase();
  if (who) parts.push(who);
  if (p.age) parts.push(`aged ${p.age}`);
  const lic = LICENCE.find((o) => o.value === p.licence)?.label.toLowerCase();
  if (lic) parts.push(`licence held ${lic} years`);
  if (p.record) parts.push(p.record === 'none' ? 'no claims or convictions' : 'with claims or convictions');
  return parts.length ? parts.join(', ') : null;
};

const drivers: TestDef = {
  id: 'drivers',
  title: 'Add one more driver',
  params: [
    { id: 'who', label: 'Who are they?', options: WHO },
    { id: 'age', label: 'Their age', options: AGES },
    { id: 'licence', label: 'Years with a full licence', options: LICENCE },
    { id: 'record', label: 'Claims or convictions', options: RECORD },
  ],
  defaults: { who: '', age: '', licence: '', record: '' }, // nothing pre-selected: use the real driver's details
  instruction: (p) => { const d = describe(p); return d ? `Add one named driver: ${d}. Keep every other answer the same.` : 'Add one named driver who genuinely drives your car. Choose their details below, then keep every other answer the same.'; },
  change: () => 'add_named_driver',
  mustBeTrue: DRIVER_MUST,
  caution: DRIVER_CAUTION,
};

const drivers2: TestDef = {
  id: 'drivers2',
  title: 'Add a second driver as well',
  params: [
    { id: 'who', label: 'Who is the second driver?', options: WHO },
    { id: 'age', label: 'Their age', options: AGES },
    { id: 'licence', label: 'Years with a full licence', options: LICENCE },
    { id: 'record', label: 'Claims or convictions', options: RECORD },
  ],
  defaults: { who: '', age: '', licence: '', record: '' },
  instruction: (p) => { const d = describe(p); return `Keep the first extra driver and add a second named driver${d ? `: ${d}` : ' who genuinely drives (choose their details below)'}. Enter the price with BOTH drivers added. We compare it with your baseline and with the one-driver price.`; },
  change: () => 'add_two_named_drivers',
  mustBeTrue: DRIVER_MUST,
  caution: DRIVER_CAUTION,
};

const blackbox: TestDef = {
  id: 'blackbox',
  title: 'Black box or app quote',
  params: [],
  defaults: {},
  instruction: () => 'Pick the black box or driving-app option on the results page and note the cheapest telematics price. Keep every other answer the same.',
  change: () => 'black_box',
  caution: 'It records how you drive. Poor scores, night driving or long trips can raise your price. Read the terms.',
};

const job: TestDef = {
  id: 'job',
  title: 'Another accurate job title',
  params: [],
  defaults: {},
  localText: { label: 'Title you tried (stays on your device)', placeholder: 'for example the industry term for your job' },
  instruction: () => 'Change only your job title to another one that is also true for you (for example the formal title and the everyday term). Add a genuine second job or part-time role if you have one. Note the cheapest price.',
  change: () => 'job_title_alt',
  mustBeTrue: 'Use a title that is true. Insurers can check, and a wrong title can void a claim.',
};

const timing: TestDef = {
  id: 'timing',
  title: 'Move the start date',
  params: [{
    id: 'when',
    label: 'Start date',
    options: [
      { value: '1d', label: 'Tomorrow' }, { value: '1w', label: '1 week' }, { value: '2w', label: '2 weeks' }, { value: '3w', label: '3 weeks' },
      { value: '4w', label: 'About 4 weeks' }, { value: '6w', label: '6 weeks' }, { value: '8w', label: '8 weeks' },
    ],
    date: { id: 'date', label: 'Or pick any date', maxDays: 120 },
  }],
  defaults: { when: '4w' },
  instruction: (p) => {
    const days = p.when === 'custom' ? daysUntil(p.date) : WHEN[p.when]?.days ?? null;
    if (days === null || days < 0) return 'Pick a start date from today onwards, then note the cheapest price.';
    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `${days} days from today`;
    const window = days >= 22 && days <= 26 ? ' That is inside the usual best window (22 to 26 days ahead).' : '';
    return `Set the policy to start on ${fmtDate(addDays(days))} (${when}). Keep every other answer the same.${window} Note the cheapest price.`;
  },
  change: (p) => (p.when === 'custom' ? nearestWhen(daysUntil(p.date)) : WHEN[p.when]?.key ?? null),
  caution: 'Use a different start date from the one in your baseline, or there is nothing to compare.',
};

const excess: TestDef = {
  id: 'excess',
  title: 'Higher voluntary excess',
  params: [{
    id: 'amount',
    label: 'Add this much excess',
    options: [{ value: '250', label: '+£250' }, { value: '500', label: '+£500' }, { value: '1000', label: '+£1,000' }],
    custom: { id: 'amountCustom', label: 'Or type an amount', prefix: '£', min: 50, max: 5000 },
  }],
  defaults: { amount: '500' },
  ref: { id: 'excess', label: 'Voluntary excess in your baseline', unit: '£' },
  instruction: (p, r) => {
    const amt = p.amount === 'custom' ? Number(p.amountCustom) : Number(p.amount);
    if (!Number.isFinite(amt) || amt <= 0) return 'Type the extra excess you want to try, then note the cheapest price.';
    const from = r.excess ?? null;
    const raise = from !== null && Number.isFinite(from) ? `Raise your voluntary excess from ${money(from)} to ${money(from + amt)} (${'+' + money(amt)})` : `Add ${money(amt)} to your voluntary excess`;
    return `${raise} and note the cheapest price. Then weigh the saving against that extra amount if you claim.`;
  },
  change: (p) => {
    const amt = p.amount === 'custom' ? Number(p.amountCustom) : Number(p.amount);
    return amt === 250 ? 'excess_250' : amt === 500 ? 'excess_500' : amt === 1000 ? 'excess_1000' : null;
  },
};

const pay: TestDef = {
  id: 'pay',
  title: 'Pay monthly instead',
  params: [],
  defaults: {},
  instruction: () => 'Switch to monthly payment and enter the TOTAL payable over the year (not the monthly amount).',
  change: () => 'pay_monthly',
  caution: 'Monthly payment is a loan and can leave a hard search on your credit file.',
};

const cover: TestDef = {
  id: 'cover',
  title: 'Different cover level',
  params: [{ id: 'type', label: 'Switch to', options: [{ value: 'tpft', label: 'Third party, fire and theft' }, { value: 'tp', label: 'Third party only' }] }],
  defaults: { type: 'tpft' },
  instruction: (p) => `Change the cover to ${p.type === 'tp' ? 'third party only' : 'third party, fire and theft'} and note the cheapest price.`,
  change: (p) => (p.type === 'tp' ? 'cover_tp' : 'cover_tpft'),
  caution: 'Lower cover is not always cheaper. Compare what you give up.',
};

const pctOf = (p: Params, preset: number) => (p.dir === 'custom' ? Number(p.pctCustom) : p.dir === 'up' ? preset : -preset);
const PCT_CUSTOM = (max: number): CustomDef => ({ id: 'pctCustom', label: 'Or type a % change', suffix: '%', min: -80, max });

const mileage: TestDef = {
  id: 'mileage',
  title: 'Annual mileage',
  params: [{ id: 'dir', label: 'Change by', options: [{ value: 'down', label: '−40%' }, { value: 'up', label: '+40%' }], custom: PCT_CUSTOM(200) }],
  defaults: { dir: 'down' },
  ref: { id: 'mileage', label: 'Your annual mileage on the form', unit: 'miles' },
  instruction: (p, r) => {
    const pct = pctOf(p, 40);
    if (!Number.isFinite(pct) || pct === 0) return 'Type the % change you want to try, then note the cheapest price.';
    return r.mileage ? `Change annual mileage from ${num(r.mileage)} to ${num(r.mileage * (1 + pct / 100))} miles (${signedPct(pct)}) and note the cheapest price.` : `Change annual mileage by ${signedPct(pct)} and note the cheapest price.`;
  },
  change: (p) => { const pct = pctOf(p, 40); return pct === 40 ? 'mileage_up' : pct === -40 ? 'mileage_down' : null; },
  mustBeTrue: 'Use a figure you can support, for example from past MOT readings.',
};

const value: TestDef = {
  id: 'value',
  title: 'Vehicle value',
  params: [{ id: 'dir', label: 'Change by', options: [{ value: 'down', label: '−10%' }, { value: 'up', label: '+10%' }], custom: PCT_CUSTOM(100) }],
  defaults: { dir: 'down' },
  ref: { id: 'vehicleValue', label: "Your car's value on the form", unit: '£' },
  instruction: (p, r) => {
    const pct = pctOf(p, 10);
    if (!Number.isFinite(pct) || pct === 0) return 'Type the % change you want to try, then note the cheapest price.';
    return r.vehicleValue ? `Change the value from ${money(r.vehicleValue)} to ${money(r.vehicleValue * (1 + pct / 100))} (${signedPct(pct)}) and note the cheapest price.` : `Change the vehicle value by ${signedPct(pct)} and note the cheapest price.`;
  },
  change: (p) => { const pct = pctOf(p, 10); return pct === 10 ? 'vehicle_value_up' : pct === -10 ? 'vehicle_value_down' : null; },
  mustBeTrue: 'Use a fair, real value when you buy.',
};

const tracker: TestDef = {
  id: 'tracker',
  title: 'Add a tracker',
  params: [],
  defaults: {},
  instruction: () => 'Say the car has a tracker and note the cheapest price.',
  change: () => 'tracker',
  mustBeTrue: 'Only if the car really has one fitted.',
};

const parking: TestDef = {
  id: 'parking',
  title: 'Other overnight parking',
  params: [],
  defaults: {},
  instruction: () => 'Try another place you genuinely keep the car overnight (for example driveway instead of road) and note the cheapest price.',
  change: () => 'parking_alt',
  mustBeTrue: 'Only if it is true. Use the real place when you buy.',
};

export const TESTS: Record<string, TestDef> = Object.fromEntries([drivers, drivers2, blackbox, job, timing, excess, pay, cover, mileage, value, tracker, parking].map((t) => [t.id, t]));

// Guided-check item id -> test ids it covers.
const FROM_ADVISOR: Record<string, string[]> = {
  drivers: ['drivers'], blackbox: ['blackbox'], job: ['job'], timing: ['timing'], pay: ['pay'],
  excess: ['excess'], cover: ['cover'], mileage: ['mileage'], value: ['value', 'tracker'],
};
const DEFAULT_ORDER = ['drivers', 'drivers2', 'blackbox', 'job', 'timing', 'excess', 'pay', 'cover', 'mileage', 'value', 'tracker', 'parking'];

export type Ordered = { test: TestDef; group: 'start' | 'also' | 'skip' | 'more'; why?: string; score?: number; band?: 'High' | 'Medium' | 'Low' };

/** Order tests by the guided check's priority when answers exist, otherwise a generic order. */
export function orderTests(answers: Answers | null): { items: Ordered[]; personal: boolean } {
  const complete = answers && Object.keys(answers).length >= 11;
  if (!complete) {
    return { personal: false, items: DEFAULT_ORDER.map((id, i) => ({ test: TESTS[id], group: i < 4 ? 'start' : i < 8 ? 'also' : 'skip' })) };
  }
  const items: Ordered[] = [];
  const seen = new Set<string>();
  for (const it of advise(answers as Answers)) {
    for (const id of FROM_ADVISOR[it.id] ?? []) {
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({ test: TESTS[id], group: it.group, why: it.why, score: it.score, band: it.band });
      // Two other genuine drivers: also test the second one, right after the first.
      if (id === 'drivers' && (answers as Answers).household === 'two' && !seen.has('drivers2')) {
        seen.add('drivers2');
        items.push({ test: TESTS.drivers2, group: it.group, why: 'Shows what the second driver adds on top of the first.', score: it.score, band: it.band });
      }
    }
  }
  for (const id of DEFAULT_ORDER) if (!seen.has(id)) items.push({ test: TESTS[id], group: 'more' });
  return { items, personal: true };
}
