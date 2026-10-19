// Sample data from a 2022 controlled test. Dummy profile, one change per row.
// Prices are the cheapest "no black box" comprehensive quote. For demo only:
// re-run with current quotes before drawing any real conclusion.
export type Scenario = { id: string; label: string; price: number | null };

export const sampleBaseline = 3339;

export const sampleScenarios: Scenario[] = [
  { id: 's1', label: 'Add mum as a driver', price: 2827 },
  { id: 's2', label: 'Add dad as a driver', price: 2843 },
  { id: 's3', label: 'Add both parents', price: 2601 },
  { id: 's4', label: 'Vehicle value +£200', price: 3339 },
  { id: 's5', label: 'Vehicle value −£200', price: 3339 },
  { id: 's6', label: 'Add a tracker', price: 3337 },
  { id: 's7', label: 'Change course type', price: 3339 },
  { id: 's8', label: 'Add a second job', price: 3339 },
];
