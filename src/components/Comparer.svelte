<script lang="ts">
  import { load as loadPlan, gbp as money } from '../lib/explorer-store';
  import { planToQuotes } from '../lib/plan-import';

  type Source = 'baseline' | 'recipe' | 'own';
  type Quote = {
    id: string;
    source: Source;
    label: string;
    price: number | null; // annual total, or monthly instalment when monthly = true
    monthly: boolean;
    excess: number | null; // total excess (compulsory + voluntary)
    extras: number | null; // cost to add cover you need but the quote lacks
  };

  const KEY = 'qg-compare-v2';
  const uid = () => crypto.randomUUID();
  const blank = (n: number): Quote => ({ id: uid(), source: 'own', label: `Final quote ${n}`, price: null, monthly: false, excess: null, extras: null });

  let quotes = $state<Quote[]>([]);
  let claimChance = $state(15);
  let claimFrom = $state<string | null>(null); // where the slider's starting value came from
  let loaded = $state(false);
  let msg = $state('');
  let plan = $state<ReturnType<typeof planToQuotes> | null>(null);

  function readAnswers() {
    try { const a = localStorage.getItem('qg-advisor-v1'); return a ? JSON.parse(a) : null; } catch { return null; }
  }

  /** Reference rows (baseline and recipe) from the test plan, plus the claim feeling from the guided check. */
  function importFromPlan(keepOwn: Quote[] = []) {
    const answers = readAnswers();
    const p = planToQuotes(loadPlan(), answers);
    plan = p;
    const refs: Quote[] = p.quotes.map((q) => ({ id: uid(), source: q.source, label: q.label, price: Math.round(q.price), monthly: false, excess: q.excess, extras: null }));
    const own = keepOwn.filter((q) => q.source === 'own');
    const fill = own.length >= 2 ? own : [...own, ...[1, 2].slice(own.length).map((n) => blank(own.length + n))];
    quotes = [...refs, ...fill];
    if (p.claimPct !== null) { claimChance = p.claimPct; claimFrom = answers?.claim ?? null; }
  }

  $effect.pre(() => {
    if (loaded) return;
    let restored = false;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d.quotes)) { quotes = d.quotes; restored = true; }
        if (typeof d.claimChance === 'number') claimChance = d.claimChance;
        claimFrom = d.claimFrom ?? null;
      }
    } catch {}
    plan = planToQuotes(loadPlan(), readAnswers());
    if (!restored) importFromPlan();
    loaded = true;
  });
  $effect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify({ quotes: $state.snapshot(quotes), claimChance, claimFrom })); } catch {}
  });

  const num = (n: number | null) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0);

  type Result = Quote & { yearly: number; expectedClaim: number; total: number; valid: boolean; delta: number; rank: number; noExcess: boolean };

  const results = $derived.by<Result[]>(() => {
    const p = claimChance / 100;
    const base = quotes.map((q) => {
      const yearly = q.monthly ? num(q.price) * 12 : num(q.price);
      const expectedClaim = p * num(q.excess);
      const total = yearly + expectedClaim + num(q.extras);
      return { ...q, yearly, expectedClaim, total, valid: num(q.price) > 0, delta: 0, rank: 0, noExcess: num(q.price) > 0 && q.excess === null };
    });
    const valid = base.filter((r) => r.valid).sort((a, b) => a.total - b.total);
    // Only quotes you typed in can be crowned: the reference rows are prices from the test plan, not offers you can buy.
    const buyable = valid.filter((r) => r.source === 'own');
    const best = buyable[0]?.total ?? valid[0]?.total ?? 0;
    valid.forEach((r) => { r.delta = r.total - best; });
    buyable.forEach((r, i) => { r.rank = i + 1; });
    return [...valid, ...base.filter((r) => !r.valid)];
  });

  const maxTotal = $derived(Math.max(1, ...results.filter((r) => r.valid).map((r) => r.total)));
  const winner = $derived(results.find((r) => r.rank === 1));
  const runnerUp = $derived(results.find((r) => r.rank === 2));
  const recipeRow = $derived(results.find((r) => r.source === 'recipe' && r.valid));
  const closeCall = $derived(!!winner && !!runnerUp && runnerUp.delta < winner.total * 0.03);
  const baseRow = $derived(results.find((r) => r.source === 'baseline' && r.valid));
  const ownCount = $derived(results.filter((r) => r.source === 'own' && r.valid).length);
  const missingExcess = $derived(results.filter((r) => r.noExcess).length);

  // Claim chance at which the top two swap places.
  const flipAt = $derived.by(() => {
    if (!winner || !runnerUp) return null;
    const dPrice = winner.yearly + num(winner.extras) - (runnerUp.yearly + num(runnerUp.extras));
    const dExcess = num(winner.excess) - num(runnerUp.excess);
    if (dExcess === 0) return null;
    const p = -dPrice / dExcess;
    return p > 0 && p < 1 ? Math.round(p * 100) : null;
  });

  const tag = (s: Source) => (s === 'baseline' ? 'From your test plan: baseline' : s === 'recipe' ? 'From your test plan: your tweaks' : 'Your quote');
  const claimWord: Record<string, string> = { unlikely: 'unlikely', maybe: 'possible', likely: 'quite likely' };

  function add() { if (quotes.length < 8) quotes.push(blank(quotes.filter((q) => q.source === 'own').length + 1)); }
  function remove(id: string) { quotes = quotes.filter((q) => q.id !== id); }
  function refresh() { importFromPlan(quotes); msg = 'Updated from your test plan. Your own quotes were kept.'; }
  function clearAll() { quotes = [blank(1), blank(2)]; msg = 'Cleared.'; }
  function example() {
    quotes = [
      { id: uid(), source: 'own', label: 'Quote A (cheap, high excess)', price: 520, monthly: false, excess: 900, extras: 60 },
      { id: uid(), source: 'own', label: 'Quote B (mid)', price: 565, monthly: false, excess: 500, extras: 0 },
      { id: uid(), source: 'own', label: 'Quote C (monthly)', price: 49, monthly: true, excess: 250, extras: 0 },
    ];
    msg = 'Example loaded. Use "Start again" to enter your own.';
  }
  function startAgain() { importFromPlan([]); msg = 'Started again from your test plan.'; }
</script>

<div class="stage">
  {#if plan && plan.baselineAvg !== null}
    <section class="card carried" aria-labelledby="c-h">
      <div class="ch">
        <span class="pill">Carried over from your test plan</span>
        <button class="link" type="button" onclick={refresh}>Refresh from my test plan</button>
      </div>
      <h2 id="c-h">
        {#if plan.recipePrice !== null && plan.savingPct !== null}
          Your tweaks took {money(plan.baselineAvg)} to {money(plan.recipePrice)} ({plan.savingPct.toFixed(1)}%)
        {:else}
          Your baseline is {money(plan.baselineAvg)}
        {/if}
      </h2>
      {#if plan.recipeTitles.length}
        <p>
          Your recipe: <strong>{plan.recipeTitles.join(' + ')}</strong>. That price came from one comparison site. Now apply the same changes, honestly, on <strong>two or three sites and a few insurers directly</strong>, and enter the real quotes you get below. Then see which one is the best value once the excess is counted.
        </p>
      {:else}
        <p>Your baseline is in the table below. Add the quotes you get from different sites and insurers to see which is best value once the excess is counted. Finish a few tests first to find tweaks worth applying.</p>
      {/if}
      <p class="links"><a href="/explorer/">← Back to my test plan</a></p>
    </section>
  {:else}
    <section class="card carried" aria-labelledby="c-h">
      <span class="pill">Choose</span>
      <h2 id="c-h">Which quote is really the best value?</h2>
      <p>The tests show what to change. This step helps you choose between the real quotes you get, counting the excess and any missing cover. You have no test plan yet, so start with the <a href="/start/">guided check</a>, or just compare quotes you already have.</p>
    </section>
  {/if}

  <div class="grid">
    <section class="card panel" aria-labelledby="q-h">
      <div class="head"><h2 id="q-h">Your quotes</h2></div>

      <div class="quotes">
        {#each quotes as q, i (q.id)}
          <fieldset class="quote" class:ref={q.source !== 'own'}>
            <legend class="sr">Quote {i + 1}</legend>
            <div class="stag"><span class="src {q.source}">{tag(q.source)}</span></div>
            <div class="top">
              <input class="lbl" type="text" placeholder="Name, e.g. insurer or site" aria-label="Quote name" bind:value={q.label} />
              <button class="x" type="button" onclick={() => remove(q.id)} aria-label="Remove quote">×</button>
            </div>
            <div class="cols">
              <label>
                <span>{q.monthly ? 'Monthly payment (£)' : 'Yearly price (£)'}</span>
                <input type="number" inputmode="decimal" min="0" bind:value={q.price} />
              </label>
              <label>
                <span>Total excess (£)</span>
                <input type="number" inputmode="decimal" min="0" placeholder={q.source === 'own' ? '' : 'add it'} bind:value={q.excess} />
              </label>
              <label>
                <span>Missing cover to add (£)</span>
                <input type="number" inputmode="decimal" min="0" bind:value={q.extras} />
              </label>
            </div>
            {#if q.source !== 'own'}
              <p class="refnote">
                {#if q.excess === null}Add the total excess from the quote so this row is compared fairly.
                {:else}Prefilled from your voluntary excess. Add the compulsory excess shown on the quote.{/if}
              </p>
            {/if}
            <label class="check">
              <input type="checkbox" bind:checked={q.monthly} />
              <span>I pay monthly (×12)</span>
            </label>
          </fieldset>
        {/each}
      </div>

      <div class="actions">
        <button class="btn btn-primary" type="button" onclick={add} disabled={quotes.length >= 8}>+ Add a quote</button>
        <button class="btn btn-ghost" type="button" onclick={startAgain}>Start again</button>
        <button class="btn btn-ghost" type="button" onclick={clearAll}>Clear all</button>
        <button class="btn btn-ghost" type="button" onclick={example}>Load example</button>
      </div>
      <p class="note" aria-live="polite">{msg || 'Saved on this device only. This page never sends your quotes anywhere.'}</p>
    </section>

    <section class="card panel" aria-labelledby="r-h">
      <div class="head"><h2 id="r-h">Expected cost</h2></div>

      <div class="slider">
        <label for="cc">
          <span>How likely are you to claim this year?</span>
          <strong>{claimChance}%</strong>
        </label>
        <input id="cc" type="range" min="0" max="50" step="1" bind:value={claimChance} oninput={() => (claimFrom = null)} />
        <div class="ticks"><span>Unlikely</span><span>Likely</span></div>
        <p class="hint">
          {#if claimFrom}Started from your guided-check answer ({claimWord[claimFrom] ?? claimFrom}).{' '}{/if}This is your own estimate. A higher chance makes a high excess cost more.
        </p>
      </div>

      {#if ownCount === 0}
        <p class="empty">
          Enter the quotes you get from different sites and insurers to see which is best value.{#if plan && plan.baselineAvg !== null} Your baseline and tweaked price are already in the list for reference.{/if}
        </p>
      {/if}

      {#if winner && ownCount > 0}
        <div class="best">
          <strong>Lowest expected cost: {winner.label || 'Unnamed quote'}</strong>
          <span>{money(winner.total)} a year</span>
        </div>
        {#if baseRow && winner.total < baseRow.total}
          <p class="saving">Against your baseline ({money(baseRow.total)} expected), that is <strong>{money(baseRow.total - winner.total)} a year lower</strong> ({(((baseRow.total - winner.total) / baseRow.total) * 100).toFixed(1)}%).</p>
        {/if}
        {#if baseRow && winner.total >= baseRow.total}
          <p class="saving warn">None of your quotes beat your baseline once the excess is counted. Try more sites or insurers.</p>
        {/if}
        {#if recipeRow}
          <p class="saving">
            Your best real quote is <strong>{money(Math.abs(winner.total - recipeRow.total))} {winner.total > recipeRow.total ? 'above' : 'below'}</strong> the price your tests found on the first site. Real quotes often differ a little between sites.
          </p>
        {/if}
        {#if missingExcess > 0}<p class="warn">{missingExcess} quote{missingExcess === 1 ? '' : 's'} with no excess entered. Add it, or the comparison favours those quotes unfairly.</p>{/if}
        {#if closeCall}
          <p class="warn">The top two are within 3%. Treat this as a tie and look at cover, service and the terms.</p>
        {/if}
        {#if flipAt !== null}
          <p class="flip">The winner changes if your claim chance goes {flipAt > claimChance ? 'above' : 'below'} about {flipAt}%.</p>
        {/if}
      {/if}

      <ul class="list" role="list">
        {#each results as r (r.id)}
          {#if r.valid}
            <li>
              <div class="meta">
                <span class="name"><b class="rank" class:refdot={r.rank === 0}>{r.rank === 0 ? '•' : r.rank}</b>{r.label || 'Unnamed quote'}{#if r.source !== 'own'}<em class="ref-tag">reference</em>{/if}</span>
                <span class="tot">{money(r.total)}</span>
              </div>
              <div class="stack" aria-hidden="true">
                <div class="seg s1" style="width:{(r.yearly / maxTotal) * 100}%"></div>
                <div class="seg s2" style="width:{(r.expectedClaim / maxTotal) * 100}%"></div>
                <div class="seg s3" style="width:{(num(r.extras) / maxTotal) * 100}%"></div>
              </div>
              <div class="sub">
                <span>Price {money(r.yearly)}</span>
                <span>Excess risk {money(r.expectedClaim)}</span>
                {#if num(r.extras) > 0}<span>Extras {money(num(r.extras))}</span>{/if}
                {#if r.delta > 0}<span class="d">+{money(r.delta)} vs best</span>{/if}
              </div>
              {#if r.monthly}<p class="credit">Monthly payment is a credit agreement. It can leave a hard search on your file. Check the total payable.</p>{/if}
            </li>
          {/if}
        {/each}
      </ul>

      {#if !winner}<p class="empty">Enter at least one price to see the comparison.</p>{/if}

      <div class="legend">
        <span><i class="sw a"></i>Price</span><span><i class="sw b"></i>Expected excess cost</span><span><i class="sw c"></i>Extras to add</span>
      </div>
      <p class="note">
        Expected cost = price + (claim chance × excess) + missing cover. It is a guide, not advice. Compare the cover, limits and exclusions too, not only the number.
      </p>
    </section>
  </div>
</div>

<style>
  .stage { display: grid; gap: 18px; }
  .carried { padding: 22px; background: linear-gradient(135deg, var(--accent-soft), var(--surface)); }
  .carried h2 { margin: 10px 0 8px; font-size: 1.35rem; letter-spacing: -0.02em; }
  .carried p { margin: 0 0 8px; color: var(--muted); max-width: 70ch; }
  .carried p strong { color: var(--text); }
  .carried a { color: var(--accent); font-weight: 600; }
  .ch { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; }
  .link { background: none; border: 0; padding: 4px 0; color: var(--accent); font: inherit; font-weight: 600; font-size: 0.88rem; cursor: pointer; }
  .links { margin-top: 4px !important; }

  .grid { display: grid; gap: 18px; grid-template-columns: 1fr; }
  @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1.1fr; align-items: start; } }
  .panel { padding: 24px; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  h2 { margin: 0; font-size: 1.2rem; letter-spacing: -0.01em; }
  .quotes { display: grid; gap: 12px; }
  .quote { border: 1px solid var(--line); border-radius: 14px; padding: 12px; margin: 0; display: grid; gap: 10px; background: var(--surface); }
  .quote.ref { background: var(--surface-2); border-style: dashed; }
  .src { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px; background: var(--surface-2); color: var(--muted); }
  .src.baseline, .src.recipe { background: var(--accent-soft); color: var(--accent); }
  .top { display: grid; grid-template-columns: 1fr 36px; gap: 8px; }
  .cols { display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 520px) { .cols { grid-template-columns: 1fr 1fr; } .cols label:last-child { grid-column: 1 / -1; } }
  label span { display: block; font-size: 0.76rem; font-weight: 600; color: var(--muted); margin-bottom: 4px; }
  input[type='text'], input[type='number'] {
    font: inherit; color: var(--text); background: var(--surface-2); border: 1px solid var(--line);
    border-radius: 12px; padding: 9px 11px; width: 100%; box-sizing: border-box;
  }
  .quote.ref input[type='text'], .quote.ref input[type='number'] { background: var(--surface); }
  input:focus-visible { outline: 3px solid var(--accent); outline-offset: 1px; }
  .refnote { margin: 0; font-size: 0.8rem; color: var(--muted); }
  .check { display: flex; align-items: center; gap: 8px; }
  .check span { margin: 0; font-size: 0.85rem; color: var(--text); }
  .check input { accent-color: var(--accent); width: 18px; height: 18px; }
  .x { border: 0; background: transparent; color: var(--muted); font-size: 1.4rem; cursor: pointer; border-radius: 10px; height: 38px; }
  .x:hover { background: var(--surface-2); color: var(--bad); }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .note { color: var(--muted); font-size: 0.85rem; margin: 14px 0 0; }

  .slider { background: var(--surface-2); border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; }
  .slider label { display: flex; justify-content: space-between; gap: 10px; font-weight: 600; font-size: 0.92rem; }
  .slider input[type='range'] { width: 100%; accent-color: var(--accent); margin: 10px 0 2px; }
  .ticks { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--muted); }
  .hint { margin: 8px 0 0; font-size: 0.82rem; color: var(--muted); }

  .best { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; background: var(--good-soft); color: var(--good); padding: 12px 14px; border-radius: 14px; margin-bottom: 10px; font-size: 0.95rem; }
  .saving { margin: 0 0 10px; font-size: 0.92rem; }
  .saving strong { color: var(--good); }
  .saving.warn, .warn { background: var(--warn-soft); color: var(--text); padding: 10px 14px; border-radius: 12px; font-size: 0.88rem; margin: 0 0 10px; }
  .flip { color: var(--muted); font-size: 0.88rem; margin: 0 0 14px; }

  .list { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 18px; }
  .meta { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
  .name { font-weight: 600; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .rank { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-size: 0.75rem; }
  .ref-tag { font-style: normal; font-size: 0.68rem; font-weight: 700; color: var(--muted); background: var(--surface-2); border-radius: 999px; padding: 2px 8px; text-transform: uppercase; letter-spacing: 0.04em; }
  .refdot { background: var(--surface-2); color: var(--muted); }
  .tot { font-variant-numeric: tabular-nums; font-weight: 800; }
  .stack { display: flex; height: 14px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
  .seg { height: 100%; transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .s1 { background: var(--accent); } .s2 { background: var(--warn); } .s3 { background: var(--muted); }
  .sub { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 0.8rem; color: var(--muted); margin-top: 6px; font-variant-numeric: tabular-nums; }
  .sub .d { color: var(--bad); font-weight: 600; }
  .credit { font-size: 0.78rem; color: var(--warn); margin: 6px 0 0; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 18px; font-size: 0.78rem; color: var(--muted); }
  .sw { display: inline-block; width: 12px; height: 12px; border-radius: 4px; margin-right: 6px; vertical-align: -1px; }
  .sw.a { background: var(--accent); } .sw.b { background: var(--warn); } .sw.c { background: var(--muted); }
  .empty { color: var(--muted); padding: 10px 0; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
