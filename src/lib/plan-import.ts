// Turns the saved test plan into starting rows for the comparer, so nothing has to be typed twice.
import { TESTS } from './tests';
import { baseline, allResults, stackCandidates, buildStack, type Store } from './explorer-store';
import { CLAIM_PCT } from './advisor';

export type PlanQuote = {
  source: 'baseline' | 'recipe';
  label: string;
  price: number; // yearly
  excess: number | null; // voluntary excess only (the compulsory part is on the quote)
};

export type PlanImport = {
  quotes: PlanQuote[];
  claimPct: number | null;
  recipeIds: string[];
  recipeTitles: string[];
  baselineAvg: number | null;
  recipePrice: number | null;
  savingPct: number | null; // recipe against baseline, negative = cheaper
};

export function planToQuotes(store: Store, answers: any): PlanImport {
  const b = baseline(store.baselineRuns);
  const results = allResults(store);
  const cands = stackCandidates(results);
  const stack = buildStack(cands, store.stack, b.noise);

  // The recipe is the finished combination if there is one, otherwise the best single change.
  let recipeIds: string[] = [];
  let recipePrice: number | null = null;
  if (cands.length >= 2 && stack.done && stack.bestPrice !== null) {
    recipeIds = stack.keptIds;
    recipePrice = stack.bestPrice;
  } else if (cands.length >= 1) {
    recipeIds = [cands[0].id];
    recipePrice = cands[0].avg;
  }

  const baseExcess = typeof store.refs.excess === 'number' ? store.refs.excess : null;
  let recipeExcess = baseExcess;
  if (recipeIds.includes('excess')) {
    const p = store.tests.excess?.params ?? TESTS.excess.defaults;
    const add = p.amount === 'custom' ? Number(p.amountCustom) : Number(p.amount);
    if (Number.isFinite(add)) recipeExcess = (baseExcess ?? 0) + add;
  }

  const recipeTitles = recipeIds.map((id) => TESTS[id].title);
  const quotes: PlanQuote[] = [];
  if (b.avg !== null) quotes.push({ source: 'baseline', label: 'Your baseline (before tweaks)', price: b.avg, excess: baseExcess });
  if (recipePrice !== null && recipeIds.length) quotes.push({ source: 'recipe', label: `With your tweaks: ${recipeTitles.join(' + ')}`, price: recipePrice, excess: recipeExcess });

  const claim = answers?.claim as keyof typeof CLAIM_PCT | undefined;
  return {
    quotes,
    claimPct: claim && claim in CLAIM_PCT ? CLAIM_PCT[claim] : null,
    recipeIds,
    recipeTitles,
    baselineAvg: b.avg,
    recipePrice,
    savingPct: b.avg !== null && recipePrice !== null ? ((recipePrice - b.avg) / b.avg) * 100 : null,
  };
}
