<script lang="ts">
  type Quote = {
    id: string;
    label: string;
    price: number | null; // annual total, or monthly instalment when monthly = true
    monthly: boolean;
    excess: number | null; // total excess (compulsory + voluntary)
    extras: number | null; // cost to add cover you need but the quote lacks
  };

  const KEY = 'qg-compare-v1';
  const uid = () => crypto.randomUUID();

  const sample = (): Quote[] => [
    { id: uid(), label: 'Quote A (cheap, high excess)', price: 520, monthly: false, excess: 900, extras: 60 },
    { id: uid(), label: 'Quote B (mid)', price: 565, monthly: false, excess: 500, extras: 0 },
    { id: uid(), label: 'Quote C (monthly)', price: 49, monthly: true, excess: 250, extras: 0 },
  ];

  let quotes = $state<Quote[]>(sample());
  let claimChance = $state(15); // percent chance of making a claim in the year
  let usingSample = $state(true);
  let loaded = $state(false);
  let msg = $state('');

  $effect.pre(() => {
    if (loaded) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d.quotes)) quotes = d.quotes;
        if (typeof d.claimChance === 'number') claimChance = d.claimChance;
        usingSample = !!d.usingSample;
      }
    } catch {}
    loaded = true;
  });
  $effect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ quotes, claimChance, usingSample }));
    } catch {}
  });

  const num = (n: number | null) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0);
  const gbp = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');

  type Result = Quote & { yearly: number; expectedClaim: number; total: number; valid: boolean; delta: number; rank: number };

  const results = $derived.by<Result[]>(() => {
    const p = claimChance / 100;
    const base = quotes.map((q) => {
      const yearly = q.monthly ? num(q.price) * 12 : num(q.price);
      const expectedClaim = p * num(q.excess);
      const total = yearly + expectedClaim + num(q.extras);
      return { ...q, yearly, expectedClaim, total, valid: num(q.price) > 0, delta: 0, rank: 0 };
    });
    const valid = base.filter((r) => r.valid).sort((a, b) => a.total - b.total);
    const best = valid[0]?.total ?? 0;
    valid.forEach((r, i) => {
      r.rank = i + 1;
      r.delta = r.total - best;
    });
    return [...valid, ...base.filter((r) => !r.valid)];
  });

  const maxTotal = $derived(Math.max(1, ...results.filter((r) => r.valid).map((r) => r.total)));
  const winner = $derived(results.find((r) => r.rank === 1));
  const runnerUp = $derived(results.find((r) => r.rank === 2));
  const closeCall = $derived(!!winner && !!runnerUp && runnerUp.delta < winner.total * 0.03);

  // What claim chance flips the winner? Find the claim chance (0-100%) where first and second swap.
  const flipAt = $derived.by(() => {
    if (!winner || !runnerUp) return null;
    const dPrice = winner.yearly + num(winner.extras) - (runnerUp.yearly + num(runnerUp.extras));
    const dExcess = num(winner.excess) - num(runnerUp.excess);
    if (dExcess === 0) return null;
    const p = -dPrice / dExcess; // yearly_w + p*ex_w = yearly_r + p*ex_r
    return p > 0 && p < 1 ? Math.round(p * 100) : null;
  });

  function add() {
    if (quotes.length >= 8) return;
    quotes.push({ id: uid(), label: '', price: null, monthly: false, excess: null, extras: null });
    usingSample = false;
  }
  function remove(id: string) {
    quotes = quotes.filter((q) => q.id !== id);
  }
  function clearAll() {
    quotes = [
      { id: uid(), label: '', price: null, monthly: false, excess: null, extras: null },
      { id: uid(), label: '', price: null, monthly: false, excess: null, extras: null },
    ];
    usingSample = false;
    msg = 'Cleared. Enter your own quotes.';
  }
  function loadSample() {
    quotes = sample();
    usingSample = true;
    msg = 'Sample data loaded.';
  }
  const edited = () => (usingSample = false);
</script>

<div class="grid">
  <section class="card panel" aria-labelledby="q-h">
    <div class="head">
      <h2 id="q-h">Your quotes</h2>
      {#if usingSample}<span class="pill">Sample data</span>{/if}
    </div>

    <div class="quotes">
      {#each quotes as q, i (q.id)}
        <fieldset class="quote">
          <legend class="sr">Quote {i + 1}</legend>
          <div class="top">
            <input class="lbl" type="text" placeholder="Name, e.g. Insurer or site" aria-label="Quote name" bind:value={q.label} oninput={edited} />
            <button class="x" type="button" onclick={() => remove(q.id)} aria-label="Remove quote">×</button>
          </div>
          <div class="cols">
            <label>
              <span>{q.monthly ? 'Monthly payment (£)' : 'Yearly price (£)'}</span>
              <input type="number" inputmode="decimal" min="0" bind:value={q.price} oninput={edited} />
            </label>
            <label>
              <span>Total excess (£)</span>
              <input type="number" inputmode="decimal" min="0" bind:value={q.excess} oninput={edited} />
            </label>
            <label>
              <span>Missing cover to add (£)</span>
              <input type="number" inputmode="decimal" min="0" bind:value={q.extras} oninput={edited} />
            </label>
          </div>
          <label class="check">
            <input type="checkbox" bind:checked={q.monthly} onchange={edited} />
            <span>I pay monthly (×12)</span>
          </label>
        </fieldset>
      {/each}
    </div>

    <div class="actions">
      <button class="btn btn-primary" type="button" onclick={add} disabled={quotes.length >= 8}>+ Add a quote</button>
      <button class="btn btn-ghost" type="button" onclick={clearAll}>Start fresh</button>
      {#if !usingSample}<button class="btn btn-ghost" type="button" onclick={loadSample}>Load sample</button>{/if}
    </div>
    <p class="note" aria-live="polite">{msg || 'Saved on this device only. Nothing is sent anywhere.'}</p>
  </section>

  <section class="card panel" aria-labelledby="r-h">
    <div class="head"><h2 id="r-h">Expected cost</h2></div>

    <div class="slider">
      <label for="cc">
        <span>How likely are you to claim this year?</span>
        <strong>{claimChance}%</strong>
      </label>
      <input id="cc" type="range" min="0" max="50" step="1" bind:value={claimChance} />
      <div class="ticks"><span>Unlikely</span><span>Likely</span></div>
      <p class="hint">This is your own estimate. A higher chance makes a high excess cost more.</p>
    </div>

    {#if winner}
      <div class="best">
        <strong>Lowest expected cost: {winner.label || 'Unnamed quote'}</strong>
        <span>{gbp(winner.total)} a year</span>
      </div>
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
              <span class="name"><b class="rank">{r.rank}</b>{r.label || 'Unnamed quote'}</span>
              <span class="tot">{gbp(r.total)}</span>
            </div>
            <div class="stack" aria-hidden="true">
              <div class="seg s1" style="width:{(r.yearly / maxTotal) * 100}%"></div>
              <div class="seg s2" style="width:{(r.expectedClaim / maxTotal) * 100}%"></div>
              <div class="seg s3" style="width:{(num(r.extras) / maxTotal) * 100}%"></div>
            </div>
            <div class="sub">
              <span>Price {gbp(r.yearly)}</span>
              <span>Excess risk {gbp(r.expectedClaim)}</span>
              {#if num(r.extras) > 0}<span>Extras {gbp(num(r.extras))}</span>{/if}
              {#if r.delta > 0}<span class="d">+{gbp(r.delta)} vs best</span>{/if}
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

<style>
  .grid { display: grid; gap: 18px; grid-template-columns: 1fr; }
  @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1.1fr; align-items: start; } }
  .panel { padding: 24px; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  h2 { margin: 0; font-size: 1.2rem; letter-spacing: -0.01em; }
  .quotes { display: grid; gap: 12px; }
  .quote { border: 1px solid var(--line); border-radius: 14px; padding: 12px; margin: 0; display: grid; gap: 10px; background: var(--surface); }
  .top { display: grid; grid-template-columns: 1fr 36px; gap: 8px; }
  .cols { display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 520px) { .cols { grid-template-columns: 1fr 1fr; } .cols label:last-child { grid-column: 1 / -1; } }
  label span { display: block; font-size: 0.76rem; font-weight: 600; color: var(--muted); margin-bottom: 4px; }
  input[type='text'], input[type='number'] {
    font: inherit; color: var(--text); background: var(--surface-2); border: 1px solid var(--line);
    border-radius: 12px; padding: 9px 11px; width: 100%; box-sizing: border-box;
  }
  input:focus-visible { outline: 3px solid var(--accent); outline-offset: 1px; }
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
  .warn { background: var(--warn-soft); color: var(--text); padding: 10px 14px; border-radius: 12px; font-size: 0.88rem; margin: 0 0 10px; }
  .flip { color: var(--muted); font-size: 0.88rem; margin: 0 0 14px; }

  .list { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 18px; }
  .meta { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
  .name { font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .rank { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-size: 0.75rem; }
  .tot { font-variant-numeric: tabular-nums; font-weight: 800; }
  .stack { display: flex; height: 14px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
  .seg { height: 100%; transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .s1 { background: var(--accent); }
  .s2 { background: var(--warn); }
  .s3 { background: var(--muted); }
  .sub { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 0.8rem; color: var(--muted); margin-top: 6px; font-variant-numeric: tabular-nums; }
  .sub .d { color: var(--bad); font-weight: 600; }
  .credit { font-size: 0.78rem; color: var(--warn); margin: 6px 0 0; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 18px; font-size: 0.78rem; color: var(--muted); }
  .sw { display: inline-block; width: 12px; height: 12px; border-radius: 4px; margin-right: 6px; vertical-align: -1px; }
  .sw.a { background: var(--accent); } .sw.b { background: var(--warn); } .sw.c { background: var(--muted); }
  .empty { color: var(--muted); text-align: center; padding: 24px 0; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
