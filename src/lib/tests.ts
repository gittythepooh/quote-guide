// Catalog of the tests a person can run on a comparison site, and how to order them.
// Gender is deliberately not asked: UK insurers have not been allowed to price on gender since 2012.
import type { ChangeKey } from './report-schema';
import { advise, type Answers } from './advisor';

export type Params = Record<string, string>;
export type Refs = { vehicleValue: number | null; mileage: number | null };
export type Opt = { value: string; label: string };
export type ParamDef = { id: string; label: string; options: Opt[] };
export type RefDef = { id: keyof Refs; label: string; unit: '£' | 'miles' };

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

const drivers: TestDef = {
  id: 'drivers',
  title: 'Add another driver',
  params: [
    { id: 'count', label: 'How many?', options: [{ value: 'one', label: 'One driver' }, { value: 'two', label: 'Two drivers' }] },
    { id: 'who', label: 'Who are they?', options: [{ value: 'partner', label: 'Partner' }, { value: 'parent', label: 'Parent' }, { value: 'child', label: 'Adult child' }, { value: 'sibling', label: 'Sibling' }, { value: 'friend', label: 'Friend' }] },
    { id: 'age', label: 'Their age', options: AGES },
    { id: 'licence', label: 'Years with a full licence', options: [{ value: 'lt2', label: 'Under 2' }, { value: '2-5', label: '2 to 5' }, { value: '5+', label: '5 or more' }] },
    { id: 'record', label: 'Claims or convictions', options: [{ value: 'none', label: 'None' }, { value: 'some', label: 'Some' }] },
  ],
  defaults: { count: 'one', who: 'partner', age: '40-49', licence: '5+', record: 'none' },
  instruction: (p) => {
    const d = drivers.params;
    const n = p.count === 'two' ? 'two named drivers like this' : 'one named driver';
    return `Add ${n}: ${label(d[1], p.who).toLowerCase()}, aged ${p.age}, licence held ${label(d[3], p.licence).toLowerCase()} years, ${p.record === 'none' ? 'no claims or convictions' : 'with claims or convictions'}. Keep every other answer the same.`;
  },
  change: (p) => (p.count === 'two' ? 'add_two_named_drivers' : 'add_named_driver'),
  mustBeTrue: 'Only add people who genuinely drive the car. If you are the main driver, never name an older relative as the main driver (fronting).',
  caution: 'We do not ask for gender: insurers have not been allowed to price on it since 2012.',
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
  params: [{ id: 'when', label: 'Start date', options: [{ value: '4w', label: 'About 4 weeks ahead' }, { value: '1d', label: 'Tomorrow' }] }],
  defaults: { when: '4w' },
  instruction: (p) => (p.when === '1d' ? 'Set the policy to start tomorrow and note the cheapest price.' : 'Set the policy to start about 4 weeks from today (the usual best window is 22 to 26 days ahead) and note the cheapest price.'),
  change: (p) => (p.when === '1d' ? 'start_later_1d' : 'start_later_4w'),
};

const excess: TestDef = {
  id: 'excess',
  title: 'Higher voluntary excess',
  params: [{ id: 'amount', label: 'Add this much excess', options: [{ value: '250', label: '+£250' }, { value: '500', label: '+£500' }, { value: '1000', label: '+£1,000' }] }],
  defaults: { amount: '500' },
  instruction: (p) => `Add £${Number(p.amount).toLocaleString('en-GB')} to your voluntary excess and note the cheapest price. Then weigh the saving against that extra amount if you claim.`,
  change: (p) => (p.amount === '250' ? 'excess_250' : p.amount === '1000' ? 'excess_1000' : 'excess_500'),
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

const mileage: TestDef = {
  id: 'mileage',
  title: 'Annual mileage',
  params: [{ id: 'dir', label: 'Change by', options: [{ value: 'down', label: '−40%' }, { value: 'up', label: '+40%' }] }],
  defaults: { dir: 'down' },
  ref: { id: 'mileage', label: 'Your annual mileage on the form', unit: 'miles' },
  instruction: (p, r) => {
    const f = p.dir === 'up' ? 1.4 : 0.6;
    return r.mileage ? `Change annual mileage from ${num(r.mileage)} to ${num(r.mileage * f)} miles and note the cheapest price.` : `Change annual mileage by ${p.dir === 'up' ? '+' : '−'}40% and note the cheapest price.`;
  },
  change: (p) => (p.dir === 'up' ? 'mileage_up' : 'mileage_down'),
  mustBeTrue: 'Use a figure you can support, for example from past MOT readings.',
};

const value: TestDef = {
  id: 'value',
  title: 'Vehicle value',
  params: [{ id: 'dir', label: 'Change by', options: [{ value: 'down', label: '−10%' }, { value: 'up', label: '+10%' }] }],
  defaults: { dir: 'down' },
  ref: { id: 'vehicleValue', label: "Your car's value on the form", unit: '£' },
  instruction: (p, r) => {
    const f = p.dir === 'up' ? 1.1 : 0.9;
    return r.vehicleValue ? `Change the value from ${money(r.vehicleValue)} to ${money(r.vehicleValue * f)} and note the cheapest price.` : `Change the vehicle value by ${p.dir === 'up' ? '+' : '−'}10% and note the cheapest price.`;
  },
  change: (p) => (p.dir === 'up' ? 'vehicle_value_up' : 'vehicle_value_down'),
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

export const TESTS: Record<string, TestDef> = Object.fromEntries([drivers, blackbox, job, timing, excess, pay, cover, mileage, value, tracker, parking].map((t) => [t.id, t]));

// Guided-check item id -> test ids it covers.
const FROM_ADVISOR: Record<string, string[]> = {
  drivers: ['drivers'], blackbox: ['blackbox'], job: ['job'], timing: ['timing'], pay: ['pay'],
  excess: ['excess'], cover: ['cover'], mileage: ['mileage'], value: ['value', 'tracker'],
};
const DEFAULT_ORDER = ['drivers', 'blackbox', 'job', 'timing', 'excess', 'pay', 'cover', 'mileage', 'value', 'tracker', 'parking'];

export type Ordered = { test: TestDef; group: 'start' | 'also' | 'skip' | 'more'; why?: string };

/** Order tests by the guided check's priority when answers exist, otherwise a generic order. */
export function orderTests(answers: Answers | null): { items: Ordered[]; personal: boolean } {
  const complete = answers && Object.keys(answers).length >= 11;
  if (!complete) {
    return { personal: false, items: DEFAULT_ORDER.map((id, i) => ({ test: TESTS[id], group: i < 4 ? 'start' : i < 7 ? 'also' : 'skip' })) };
  }
  const items: Ordered[] = [];
  const seen = new Set<string>();
  for (const it of advise(answers as Answers)) {
    for (const id of FROM_ADVISOR[it.id] ?? []) {
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({ test: TESTS[id], group: it.group, why: it.why });
    }
  }
  for (const id of DEFAULT_ORDER) if (!seen.has(id)) items.push({ test: TESTS[id], group: 'more' });
  return { items, personal: true };
}
