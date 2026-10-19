// Shared by the share panel (browser) and the Pages Function (server).
// Only coarse, banded values are accepted. No prices, no names, no free text.

export const CHANGES = {
  add_named_driver: 'Add one named driver',
  add_two_named_drivers: 'Add two named drivers',
  vehicle_value_up: 'Vehicle value up about 10%',
  vehicle_value_down: 'Vehicle value down about 10%',
  tracker: 'Add a tracker',
  mileage_down: 'Lower annual mileage (about 40%)',
  mileage_up: 'Higher annual mileage (about 40%)',
  excess_250: 'Voluntary excess +£250',
  excess_500: 'Voluntary excess +£500',
  excess_1000: 'Voluntary excess +£1,000',
  cover_tpft: 'Third party, fire and theft instead of comprehensive',
  cover_tp: 'Third party only instead of comprehensive',
  black_box: 'Black box (telematics) quote',
  start_later_1d: 'Start date +1 day',
  start_later_4w: 'Start date about 4 weeks ahead',
  pay_monthly: 'Pay monthly (total payable)',
  job_title_alt: 'Another job title that is also true',
  parking_alt: 'Other overnight parking (only if true)',
} as const;
export type ChangeKey = keyof typeof CHANGES;

export const AGE_BANDS = ['17-20', '21-24', '25-29', '30-39', '40-49', '50-59', '60+'] as const;
export const REGIONS = [
  'North East', 'North West', 'Yorkshire', 'East Midlands', 'West Midlands', 'East of England',
  'London', 'South East', 'South West', 'Wales', 'Scotland', 'Northern Ireland',
] as const;
export const CAR_AGE_BANDS = ['0-3 yrs', '4-7 yrs', '8-12 yrs', '13+ yrs'] as const;
export const NCD_BANDS = ['0', '1-2', '3-5', '6-9', '10+'] as const;
export const COVER = ['Comprehensive', 'Third party, fire and theft', 'Third party only'] as const;
export const SITES = ['Compare the Market', 'MoneySupermarket', 'GoCompare', 'Confused.com', 'Other'] as const;

export type Profile = {
  ageBand: (typeof AGE_BANDS)[number];
  region: (typeof REGIONS)[number];
  carAge: (typeof CAR_AGE_BANDS)[number];
  ncd: (typeof NCD_BANDS)[number];
  cover: (typeof COVER)[number];
  site: (typeof SITES)[number];
};

export type Result = { change: ChangeKey; pct: number; repeats: number };

export type Report = {
  v: 1;
  profile: Profile;
  baselineRuns: number; // how many baseline runs set the noise level
  noisePct: number; // observed baseline spread, percent
  results: Result[];
};

export const MIN_GROUP = 20; // a public figure needs at least this many reports

const has = <T extends readonly string[]>(list: T, v: unknown): v is T[number] =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Strict validation. Returns a clean Report or an error string. Unknown fields are dropped. */
export function validateReport(input: unknown): { ok: true; report: Report } | { ok: false; error: string } {
  const r = input as any;
  if (!r || typeof r !== 'object' || r.v !== 1) return { ok: false, error: 'bad version' };
  const p = r.profile;
  if (!p || typeof p !== 'object') return { ok: false, error: 'missing profile' };
  if (!has(AGE_BANDS, p.ageBand)) return { ok: false, error: 'bad ageBand' };
  if (!has(REGIONS, p.region)) return { ok: false, error: 'bad region' };
  if (!has(CAR_AGE_BANDS, p.carAge)) return { ok: false, error: 'bad carAge' };
  if (!has(NCD_BANDS, p.ncd)) return { ok: false, error: 'bad ncd' };
  if (!has(COVER, p.cover)) return { ok: false, error: 'bad cover' };
  if (!has(SITES, p.site)) return { ok: false, error: 'bad site' };
  // Numbers must be real JSON numbers. Strings, null and "" are rejected.
  const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  const baselineRuns = r.baselineRuns;
  if (!isNum(baselineRuns) || !Number.isInteger(baselineRuns) || baselineRuns < 1 || baselineRuns > 10) return { ok: false, error: 'bad baselineRuns' };
  const noisePct = r.noisePct;
  if (!isNum(noisePct) || noisePct < 0 || noisePct > 50) return { ok: false, error: 'bad noisePct' };
  if (!Array.isArray(r.results) || r.results.length < 1 || r.results.length > 20) return { ok: false, error: 'bad results' };
  const seen = new Set<string>();
  const results: Result[] = [];
  for (const x of r.results) {
    if (!x || typeof x.change !== 'string' || !Object.hasOwn(CHANGES, x.change) || seen.has(x.change)) return { ok: false, error: 'bad change' };
    const pct = x.pct;
    const repeats = x.repeats;
    if (!isNum(pct) || pct < -90 || pct > 300) return { ok: false, error: 'bad pct' };
    if (!isNum(repeats) || !Number.isInteger(repeats) || repeats < 1 || repeats > 10) return { ok: false, error: 'bad repeats' };
    seen.add(x.change);
    results.push({ change: x.change as ChangeKey, pct: round1(pct), repeats });
  }
  return {
    ok: true,
    report: {
      v: 1,
      profile: { ageBand: p.ageBand, region: p.region, carAge: p.carAge, ncd: p.ncd, cover: p.cover, site: p.site },
      baselineRuns,
      noisePct: round1(noisePct),
      results,
    },
  };
}
