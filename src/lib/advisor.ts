// Guided check: questions, and a rules engine that ranks what is worth testing.
// Information only. It never suggests a false answer. Every "tweak" is a TEST of an honest option.
import type { ChangeKey } from './report-schema';
import { seedFindings } from '../data/findings-seed';

export type Opt = { value: string; label: string };
export type Step = { id: keyof Answers; question: string; hint?: string; options: Opt[] };

export type Answers = {
  age?: string;
  ncd?: string;
  cover?: string;
  household?: 'none' | 'one' | 'two';
  mileage?: 'low' | 'mid' | 'high' | 'unsure';
  job?: string;
  payment?: 'annual' | 'monthly';
  renewal?: 'new' | 'lt2' | 'w2_3' | 'w3_5' | 'gt5';
  blackbox?: 'yes' | 'maybe' | 'no';
  claim?: 'unlikely' | 'maybe' | 'likely';
  excess?: 'none' | '250' | '500';
};

export const STEPS: Step[] = [
  { id: 'age', question: 'Hi! Let us work out what is worth testing on your car insurance. First, how old are you?', options: ['17-20', '21-24', '25-29', '30-39', '40-49', '50-59', '60+'].map((v) => ({ value: v, label: v })) },
  { id: 'ncd', question: 'How many years of no-claims discount do you have?', hint: 'Roughly is fine.', options: [{ value: '0', label: 'None' }, { value: '1-2', label: '1 to 2' }, { value: '3-5', label: '3 to 5' }, { value: '6-9', label: '6 to 9' }, { value: '10+', label: '10 or more' }] },
  { id: 'cover', question: 'What cover do you have or usually buy?', options: [{ value: 'Comprehensive', label: 'Comprehensive' }, { value: 'Third party, fire and theft', label: 'Third party, fire and theft' }, { value: 'Third party only', label: 'Third party only' }] },
  { id: 'job', question: 'Which best describes your work?', hint: 'A broad group only. We do not need your exact job title.', options: [
    { value: 'managers', label: 'Manager or director' }, { value: 'professional', label: 'Professional (for example engineer, teacher, nurse)' },
    { value: 'associate', label: 'Technician or associate professional' }, { value: 'admin', label: 'Office or admin' },
    { value: 'trades', label: 'Skilled trade' }, { value: 'caring', label: 'Caring, leisure or personal service' },
    { value: 'sales', label: 'Sales or customer service' }, { value: 'transport', label: 'Driver, machine or plant operator' },
    { value: 'elementary', label: 'Elementary or general work' }, { value: 'student', label: 'Student' },
    { value: 'retired', label: 'Retired' }, { value: 'other', label: 'Other or between jobs' },
  ] },
  { id: 'household', question: 'Does anyone else with a full licence genuinely drive, or might genuinely drive, your car?', hint: 'Only people who really would. Not just to cut the price.', options: [{ value: 'none', label: 'No one else' }, { value: 'one', label: 'One other person' }, { value: 'two', label: 'Two or more' }] },
  { id: 'mileage', question: 'About how far do you drive a year?', options: [{ value: 'low', label: 'Under 5,000 miles' }, { value: 'mid', label: '5,000 to 12,000' }, { value: 'high', label: 'Over 12,000' }, { value: 'unsure', label: 'Not sure' }] },
  { id: 'excess', question: 'Do you usually add a voluntary excess?', hint: 'The extra amount you agree to pay towards a claim.', options: [{ value: 'none', label: 'No' }, { value: '250', label: 'About £250' }, { value: '500', label: '£500 or more' }] },
  { id: 'claim', question: 'How likely do you feel it is that you will claim in the next year?', options: [{ value: 'unlikely', label: 'Unlikely' }, { value: 'maybe', label: 'Possible' }, { value: 'likely', label: 'Quite likely' }] },
  { id: 'payment', question: 'How do you usually pay?', options: [{ value: 'annual', label: 'Once a year' }, { value: 'monthly', label: 'Monthly' }] },
  { id: 'blackbox', question: 'Would you consider a black box or app that records your driving?', options: [{ value: 'yes', label: 'Yes' }, { value: 'maybe', label: 'Maybe' }, { value: 'no', label: 'No' }] },
  { id: 'renewal', question: 'When does your policy start or renew?', options: [{ value: 'new', label: 'New policy, no date yet' }, { value: 'lt2', label: 'Under 2 weeks' }, { value: 'w2_3', label: '2 to 3 weeks' }, { value: 'w3_5', label: '3 to 5 weeks' }, { value: 'gt5', label: 'More than 5 weeks' }] },
];

export const CLAIM_PCT = { unlikely: 5, maybe: 15, likely: 30 } as const;

export type Community = Partial<Record<ChangeKey, { n: number; published: boolean; medianPct: number | null }>>;

export type Item = {
  id: string;
  title: string;
  why: string;
  size: string; // what we can honestly say about the size
  basis: string; // where the number or rule comes from
  likelihood: 'High' | 'Medium' | 'Low';
  score: number;
  group: 'start' | 'also' | 'skip';
  mustBeTrue?: string;
  caution?: string;
  testLabel?: string; // becomes a row in the what-if explorer
};

const young = (a: Answers) => a.age === '17-20' || a.age === '21-24';
const youngish = (a: Answers) => young(a) || a.age === '25-29';
const seed = (k: ChangeKey) => seedFindings.find((s) => s.change === k)?.pct;

const lk = (applicability: number, confidence: number): Item['likelihood'] => {
  const x = applicability * confidence;
  return x >= 0.5 ? 'High' : x >= 0.25 ? 'Medium' : 'Low';
};

/** Pick the best figure: community median if published, else the 2022 seed. */
function figure(k: ChangeKey, c: Community) {
  const comm = c[k];
  if (comm?.published && comm.medianPct !== null) return { pct: comm.medianPct, basis: `community median of ${comm.n} reports`, conf: 0.9 };
  const s = seed(k);
  return s === undefined ? null : { pct: s, basis: '2022 test on one young-driver profile', conf: 0.5 };
}

const fmt = (n: number) => (n > 0 ? '+' : '') + Math.round(n) + '%';

export function advise(a: Answers, community: Community = {}): Item[] {
  const items: Item[] = [];
  const add = (i: Omit<Item, 'group' | 'likelihood'> & { applicability: number; confidence: number }) => {
    const { applicability, confidence, ...rest } = i;
    items.push({ ...rest, likelihood: lk(applicability, confidence), group: 'also' });
  };

  // 1. Additional drivers
  if (a.household && a.household !== 'none') {
    const k: ChangeKey = a.household === 'two' ? 'add_two_named_drivers' : 'add_named_driver';
    const f = figure(k, community);
    const match = young(a) ? 1 : youngish(a) ? 0.6 : 0.35; // the evidence is from a young driver
    add({
      id: 'drivers',
      title: 'Test adding the other genuine driver',
      why: 'Adding a named driver changed quotes more than anything else we have data on. It only applies if they would really drive.',
      size: f ? `${fmt(f.pct)} in tests${young(a) ? '' : ', but those tests were for young drivers: yours may be smaller'}` : 'size unknown',
      basis: f?.basis ?? 'no data',
      score: Math.abs(f?.pct ?? 10) * match * (f?.conf ?? 0.4),
      applicability: match,
      confidence: f?.conf ?? 0.4,
      mustBeTrue: 'Only list people who genuinely drive. If you are the main driver, never name an older relative as the main driver (fronting).',
      testLabel: 'Add a named driver (who genuinely drives)',
    });
  }

  // 2. Black box
  if (a.blackbox !== 'no') {
    const f = figure('black_box', community);
    const match = young(a) ? 1 : a.ncd === '0' || a.ncd === '1-2' ? 0.6 : 0.25;
    add({
      id: 'blackbox',
      title: 'Get a black box or app quote as well',
      why: young(a) || a.ncd === '0' || a.ncd === '1-2' ? 'It tends to help new or young drivers most.' : 'It tends to help new or young drivers most, so it may do less for you.',
      size: f ? `${fmt(f.pct)} in the 2022 test (young driver)` : 'size unknown',
      basis: f?.basis ?? 'no data',
      score: Math.abs(f?.pct ?? 10) * match * (f?.conf ?? 0.4) * (a.blackbox === 'maybe' ? 0.7 : 1),
      applicability: match * (a.blackbox === 'maybe' ? 0.7 : 1),
      confidence: f?.conf ?? 0.4,
      caution: 'It records how you drive. Poor scores, night driving or long trips can raise your price. Read the terms.',
      testLabel: 'Black box (telematics) quote',
    });
  }

  // 3. Job title
  add({
    id: 'job',
    title: 'Check every job title that is genuinely accurate for you',
    why: 'Insurers rate job titles differently, and there is no single public list: each insurer uses its own. A formal title and the industry term for the same job can price differently. Also declare a genuine second job or part-time role if you have one.',
    size: 'reported to matter a lot, but we cannot yet say how much for you',
    basis: 'industry sources and our 2022 survey (3 of 12 people named it as their biggest saving)',
    score: 30 * 0.8 * 0.35 * (a.job === 'student' || a.job === 'retired' ? 0.6 : 1), // size is a placeholder until community data exists
    applicability: 0.8,
    confidence: 0.35,
    mustBeTrue: 'Choose only a title that is true. Insurers can check, and a wrong job title can void a claim.',
    caution: a.job === 'transport' ? 'Jobs that involve driving are often rated higher. Check each accurate option carefully.' : undefined,
    testLabel: 'Alternative job title (also true)',
  });

  // 4. Timing
  const timing: Record<string, { s: number; why: string }> = {
    new: { s: 0.6, why: 'Quotes about 22 to 26 days before the start date are often best. Pick your start date, then get quotes in that window.' },
    lt2: { s: 1, why: 'You are inside the usual best window, so compare now. Prices tend to rise nearer the start date.' },
    w2_3: { s: 0.9, why: 'You are at the start of the usual best window (about 22 to 26 days ahead). Compare now.' },
    w3_5: { s: 0.8, why: 'You are about right. Set a reminder for 26 days before the start date and compare then.' },
    gt5: { s: 0.5, why: 'It is early. Set a reminder for about 26 days before the start date.' },
  };
  const t = timing[a.renewal ?? 'new'];
  add({ id: 'timing', title: 'Time your quotes', why: t.why, size: 'free to do, effect varies', basis: 'MoneySavingExpert guidance and our 2022 survey (6 of 16 started in the last week)', score: 10 * t.s * 0.6, applicability: 1, confidence: 0.6, testLabel: 'Start date about 4 weeks ahead' });

  // 5. Compare several places
  add({ id: 'sites', title: 'Compare at least two or three sites, and a few insurers directly', why: 'Prices and insurers differ between comparison sites, and some insurers are not on them.', size: 'free to do', basis: 'MoneySavingExpert guidance', score: 10 * 0.7, applicability: 1, confidence: 0.7 });

  // 6. Payment
  if (a.payment === 'monthly') {
    add({ id: 'pay', title: 'Check the total cost of paying monthly', why: 'Paying monthly is a loan, so it usually costs more in total, and it can leave a hard search on your credit file. Compare the total payable with the annual price.', size: 'depends on the interest rate: check the total payable', basis: 'MoneySavingExpert guidance', score: 8 * 0.8, applicability: 1, confidence: 0.8, testLabel: 'Pay monthly (record total payable)' });
  }

  // 7. Excess
  const excessWorth = a.claim === 'unlikely' ? 1 : a.claim === 'maybe' ? 0.6 : 0.25;
  add({
    id: 'excess',
    title: a.claim === 'likely' ? 'Keep the voluntary excess low' : 'Test a higher voluntary excess',
    why: a.claim === 'likely' ? 'You feel a claim is quite likely, so a high excess could cost you more than it saves.' : 'A higher excess can lower the price, but you pay more if you claim. Weigh the saving against the excess times your claim chance (the comparer does this).',
    size: 'mixed in our test: the pattern was not consistent',
    basis: '2022 test (unreliable pattern)',
    score: 10 * excessWorth * 0.3,
    applicability: excessWorth,
    confidence: 0.3,
    testLabel: 'Voluntary excess +£500',
  });

  // 8. Cover type
  if (a.cover === 'Comprehensive') {
    const f = figure('cover_tp', community);
    add({ id: 'cover', title: 'Also quote third party, fire and theft', why: 'Do not assume lower cover is cheaper. In our test third party only was dearer. Check, but compare what you give up.', size: f ? `third party only ${fmt(f.pct)} in 2022 (low confidence)` : 'size unknown', basis: f?.basis ?? 'no data', score: 10 * 0.5 * 0.3, applicability: 0.5, confidence: 0.3, testLabel: 'Cover: third party, fire and theft' });
  }

  // 9. Things that did not matter
  add({ id: 'mileage', title: 'Fine-tuning mileage', why: 'Use an honest figure. Moving it by 40% changed quotes by only 1 to 3% in the 2022 test.', size: 'within noise in the test', basis: '2022 test', score: 1.2, applicability: 0.3, confidence: 0.4, mustBeTrue: 'Use a figure you can support, for example from past MOT readings.' });
  add({ id: 'value', title: 'Small changes to vehicle value, or adding a tracker', why: 'These moved quotes by about £0 to £2 in the 2022 test.', size: 'within noise', basis: '2022 test', score: 0.8, applicability: 0.3, confidence: 0.4, mustBeTrue: 'Use the real value and declare any real tracker or modification.' });

  items.sort((x, y) => y.score - x.score);
  // "Start here" = the biggest, best-fitting few. A Low-fit item never leads, however big its effect.
  let started = 0;
  for (const it of items) {
    if (it.score >= 5 && it.likelihood !== 'Low' && started < 4) { it.group = 'start'; started++; }
    else it.group = it.score >= 2.5 ? 'also' : 'skip';
  }
  return items;
}

export const MUST_BE_TRUE = ['Name and date of birth exactly as on your licence', 'Vehicle details, value and modifications', 'Annual mileage you can support', 'Where the car is kept overnight', 'Everyone who drives it', 'Claims, accidents and convictions', 'A job title that is true'];
