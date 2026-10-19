import type { ChangeKey } from '../lib/report-schema';

// Starting point only. One controlled test on a single dummy profile (young driver,
// living at home, older small car) from an early test, plus a 17-person survey. Prices have
// moved since. Community reports replace these figures as they arrive.
export const SEED_SOURCE =
  'Early controlled test: one dummy profile (18-year-old student, 2010 small petrol car). Not a general rule.';

export type SeedFinding = { change: ChangeKey; pct: number; note: string };

export const seedFindings: SeedFinding[] = [
  { change: 'add_named_driver', pct: -15, note: 'A parent added who would genuinely drive: about -15% either way.' },
  { change: 'add_two_named_drivers', pct: -22, note: 'Both parents added: -22.1%.' },
  { change: 'vehicle_value_up', pct: 0, note: 'About £0 change. Within noise.' },
  { change: 'vehicle_value_down', pct: 0, note: 'About £0 change. Within noise.' },
  { change: 'tracker', pct: -0.1, note: 'About £2 change. Within noise.' },
  { change: 'cover_tpft', pct: -6, note: 'About 6% cheaper than comprehensive. Low confidence: one small early test.' },
  { change: 'cover_tp', pct: 72, note: 'Third party only was dearer than comprehensive (+72%). Low confidence: one small early test. Always get a comprehensive quote too.' },
  { change: 'mileage_down', pct: 3, note: 'Lower mileage moved the price by about 3%. Within noise.' },
  { change: 'mileage_up', pct: -1, note: 'Higher mileage moved the price by about 1%. Within noise.' },
  { change: 'black_box', pct: -38, note: 'Black box quote about 38% cheaper than the no-black-box baseline. Check the trade-offs.' },
];

export const seedSurvey = {
  n: 17,
  points: [
    '12 of 16 adjusted answers to test prices; 8 of those 12 saved money.',
    'Additional drivers was the most-used lever (11 of 12) and the most-named saving (8 of 11).',
    'Reported savings were small: £20 to a few hundred pounds.',
    '6 of 16 started researching in the last week before renewal.',
    '13 of 16 compare at renewal; 12 of 16 use more than one comparison site.',
  ],
};
