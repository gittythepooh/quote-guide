<script lang="ts">
  import { tick } from 'svelte';
  import { TESTS, orderTests, type Ordered } from '../lib/tests';
  import {
    load, save, emptyStore, sampleStore, baseline, allResults, gbp, signed, pctText, NOISE_FLOOR,
    type Store, type Result,
  } from '../lib/explorer-store';
  import SharePanel from './SharePanel.svelte';

  let store = $state<Store>(emptyStore());
  let answers = $state<any>(null);
  let loaded = $state(false);
  let openId = $state<string | null>(null);
  let initOpen = false;
  let moreOpen = $state(false);
  let msg = $state('');

  $effect.pre(() => {
    if (loaded) return;
    store = load();
    try {
      const a = localStorage.getItem('qg-advisor-v1');
      if (a) answers = JSON.parse(a);
    } catch {}
    loaded = true;
  });
  $effect(() => {
    if (!loaded) return;
    save($state.snapshot(store) as Store);
  });

  const order = $derived(orderTests(answers));
  const b = $derived(baseline(store.baselineRuns));
  const results = $derived(allResults(store));
  const resMap = $derived(Object.fromEntries(results.map((r) => [r.id, r])) as Record<string, Result>);
  const on = (id: string) => !!store.tests[id]?.on;
  const startList = $derived(order.items.filter((i) => i.group === 'start'));
  const alsoList = $derived(order.items.filter((i) => i.group === 'also'));
  const addedList = $derived(order.items.filter((i) => (i.group === 'skip' || i.group === 'more') && on(i.test.id)));
  const moreList = $derived(order.items.filter((i) => (i.group === 'skip' || i.group === 'more') && !on(i.test.id)));
  const activeIds = $derived([...startList, ...alsoList, ...addedList].map((i) => i.test.id));
  const doneCount = $derived(activeIds.filter((id) => resMap[id]).length);
  const sorted = $derived([...results].sort((x, y) => x.pct - y.pct));
  const scale = $derived(Math.max(15, ...results.map((r) => Math.abs(r.pct))));
  const best = $derived(sorted.find((r) => r.verdict === 'cheaper'));
  const realCheaper = $derived(sorted.filter((r) => r.verdict === 'cheaper' && r.change));
  const hasCombo = $derived(store.custom.some((c) => c.id === 'combo'));
  const hasData = $derived(b.avg !== null);

  const shareRows = $derived(
    store.usingSample ? [] : results.filter((r) => r.change).map((r) => ({ id: r.id, label: r.title, pct: r.pct, change: r.change!, repeats: r.runs })),
  );

  // Open the first test that still needs a price, once.
  $effect(() => {
    if (!loaded || initOpen) return;
    initOpen = true;
    openId = activeIds.find((id) => !resMap[id] && !store.tests[id]?.skipped) ?? null;
  });

  // ------------------------------------------------------------ helpers (events only)
  function st(id: string) {
    if (!store.tests[id]) store.tests[id] = { params: { ...TESTS[id].defaults }, runs: [null] };
    return store.tests[id];
  }
  const param = (id: string, pid: string) => store.tests[id]?.params[pid] ?? TESTS[id].defaults[pid];
  const paramsOf = (id: string) => ({ ...TESTS[id].defaults, ...(store.tests[id]?.params ?? {}) });
  const runsOf = (id: string) => store.tests[id]?.runs ?? [null];
  const numOrNull = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v));

  const setParam = (id: string, pid: string, v: string) => { st(id).params[pid] = v; };
  const setRun = (id: string, i: number, v: string) => { st(id).runs[i] = numOrNull(v); };
  const addRun = (id: string) => { const s = st(id); if (s.runs.length < 3) s.runs.push(null); };
  const dropRun = (id: string, i: number) => { const s = st(id); if (s.runs.length > 1) s.runs.splice(i, 1); };
  const setBase = (i: number, v: string) => { store.baselineRuns[i] = numOrNull(v); };
  const addBase = () => { if (store.baselineRuns.length < 3) store.baselineRuns.push(null); };
  const dropBase = (i: number) => { if (store.baselineRuns.length > 1) store.baselineRuns.splice(i, 1); };
  const setRef = (k: 'vehicleValue' | 'mileage', v: string) => { store.refs[k] = numOrNull(v); };
  const skip = (id: string) => { st(id).skipped = true; if (openId === id) openId = null; };
  const unskip = (id: string) => { st(id).skipped = false; openId = id; };
  const clear = (id: string) => { const s = st(id); s.runs = [null]; s.skipped = false; };
  const addTest = (id: string) => { st(id).on = true; openId = id; moreOpen = false; };
  const toggle = (id: string) => { openId = openId === id ? null : id; };

  async function nextAfter(id: string) {
    const i = activeIds.indexOf(id);
    const next = [...activeIds.slice(i + 1), ...activeIds.slice(0, i)].find((x) => !resMap[x] && !store.tests[x]?.skipped);
    openId = next ?? null;
    await tick();
    await new Promise((r) => setTimeout(r, 30));
    const el = next ? document.querySelector(`[data-test="${next}"]`) : document.querySelector('[data-results]');
    if (el) window.scrollTo({ top: Math.max(0, window.scrollY + el.getBoundingClientRect().top - 90), behavior: 'smooth' });
  }

  function addCustom(label = '') { store.custom.push({ id: crypto.randomUUID(), label, price: null }); }
  function addCombo() {
    const [x, y] = realCheaper;
    if (!x || !y || hasCombo) return;
    store.custom.push({ id: 'combo', label: `Combine: ${x.title} + ${y.title}`, price: null });
  }
  const dropCustom = (id: string) => { store.custom = store.custom.filter((c) => c.id !== id); };

  function loadSample() { store = sampleStore(); openId = null; msg = 'Example loaded. Start fresh to enter your own.'; }
  function startFresh() { store = emptyStore(); openId = activeIds[0] ?? null; msg = 'Cleared.'; }

  function exportJson() {
    const blob = new Blob([JSON.stringify($state.snapshot(store), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'quote-guide-test-plan.json';
    a.click();
    URL.revokeObjectURL(a.href);
    msg = 'Exported to a file on this device.';
  }
  async function importJson(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d?.v !== 2 || !Array.isArray(d.baselineRuns)) throw new Error('bad');
      store = { ...emptyStore(), ...d, usingSample: false };
      msg = 'Imported.';
    } catch { msg = 'That file could not be read.'; }
    (e.target as HTMLInputElement).value = '';
  }

  const verdictText = (r: Result) => (r.verdict === 'noise' ? 'Within noise' : r.verdict === 'cheaper' ? 'Cheaper · real effect' : 'Dearer · real effect');
  const statusOf = (id: string) => {
    if (store.tests[id]?.skipped) return { text: 'Skipped', cls: 'skip' };
    const r = resMap[id];
    if (!r) return { text: 'To do', cls: 'todo' };
    return { text: `${pctText(r.pct)} · ${r.verdict === 'noise' ? 'noise' : r.verdict}`, cls: r.verdict };
  };
  const GROUP_NAME: Record<string, string> = { start: 'Start here', also: 'Also worth a try', skip: 'Low priority', more: 'Extra' };
</script>

{#snippet card(item: Ordered, n: number)}
  {@const id = item.test.id}
  {@const def = item.test}
  {@const s = statusOf(id)}
  {@const r = resMap[id]}
  {@const open = openId === id}
  <article class="card test" class:open data-test={id}>
    <button class="head" type="button" aria-expanded={open} onclick={() => toggle(id)}>
      <span class="num">{n}</span>
      <span class="ttl">{def.title}</span>
      <span class="status {s.cls}">{s.text}</span>
      <span class="chev" aria-hidden="true">{open ? '▴' : '▾'}</span>
    </button>

    {#if open}
      <div class="body">
        {#if item.why}<p class="why">{item.why}</p>{/if}
        <p class="inst"><b>What to change on the comparison site</b><br />{def.instruction(paramsOf(id), store.refs)}</p>

        {#each def.params as p (p.id)}
          <div class="pgroup" role="group" aria-label={p.label}>
            <span class="plabel">{p.label}</span>
            <div class="chips">
              {#each p.options as o (o.value)}
                <button type="button" class="chip" class:on={param(id, p.id) === o.value} aria-pressed={param(id, p.id) === o.value} onclick={() => setParam(id, p.id, o.value)}>{o.label}</button>
              {/each}
            </div>
          </div>
        {/each}

        {#if def.ref}
          <label class="field">
            <span>{def.ref.label} <i>(optional, gives you the exact number)</i></span>
            <input type="number" inputmode="decimal" min="0" placeholder={def.ref.unit === '£' ? '£' : 'miles'} value={store.refs[def.ref.id] ?? ''} oninput={(e) => setRef(def.ref!.id, (e.target as HTMLInputElement).value)} />
          </label>
        {/if}

        {#if def.localText}
          <label class="field">
            <span>{def.localText.label}</span>
            <input type="text" placeholder={def.localText.placeholder} value={store.tests[id]?.text ?? ''} oninput={(e) => { st(id).text = (e.target as HTMLInputElement).value; }} />
          </label>
        {/if}

        <div class="runs">
          {#each runsOf(id) as run, i (i)}
            <label class="field price">
              <span>{runsOf(id).length > 1 ? `Cheapest price, run ${i + 1} (£)` : 'Cheapest price you were quoted (£)'}</span>
              <div class="pr">
                <input type="number" inputmode="decimal" min="0" placeholder="£" value={run ?? ''} oninput={(e) => setRun(id, i, (e.target as HTMLInputElement).value)} />
                {#if runsOf(id).length > 1}<button class="x" type="button" aria-label="Remove run" onclick={() => dropRun(id, i)}>×</button>{/if}
              </div>
            </label>
          {/each}
        </div>
        {#if runsOf(id).length < 3}<button class="link" type="button" onclick={() => addRun(id)}>+ Add a repeat run (checks it is not a fluke)</button>{/if}

        {#if r && b.avg !== null}
          <div class="out {r.verdict}" aria-live="polite">
            <strong>{signed(r.diff)} ({pctText(r.pct)})</strong>
            <span>{gbp(r.avg)} against your {gbp(b.avg)} baseline. {verdictText(r)}{r.verdict === 'noise' ? ` (under ${b.noise.toFixed(1)}%).` : '.'}</span>
            {#if r.repeatsDisagree}<span class="warnline">Your repeat runs differ by {r.disagreePct.toFixed(1)}%. Treat this result with care.</span>{/if}
          </div>
        {:else if !hasData}
          <p class="hint">Enter your baseline price first to see the effect.</p>
        {/if}

        {#if def.mustBeTrue}<p class="must">✓ {def.mustBeTrue}</p>{/if}
        {#if def.caution}<p class="caut">⚠ {def.caution}</p>{/if}

        <div class="acts">
          {#if r}<button class="btn btn-primary sm" type="button" onclick={() => nextAfter(id)}>Next test →</button>{/if}
          {#if store.tests[id]?.skipped}
            <button class="btn btn-ghost sm" type="button" onclick={() => unskip(id)}>Undo skip</button>
          {:else}
            <button class="btn btn-ghost sm" type="button" onclick={() => { skip(id); nextAfter(id); }}>Skip this one</button>
          {/if}
          {#if r || runsOf(id).some((x) => x !== null)}<button class="btn btn-ghost sm" type="button" onclick={() => clear(id)}>Clear</button>{/if}
        </div>
      </div>
    {/if}
  </article>
{/snippet}

<div class="layout">
  <section class="area-base card base" aria-labelledby="b-h">
    <div class="bh">
      <h2 id="b-h"><span class="step">1</span> Your baseline</h2>
      {#if store.usingSample}<span class="pill">Example data</span>{/if}
    </div>
    <p class="lead">
      Fill in one comparison site with your real details. Write down the <strong>cheapest comprehensive price</strong>. That is your baseline. Every test below is compared with it.
    </p>

    <div class="runs">
      {#each store.baselineRuns as run, i (i)}
        <label class="field price">
          <span>{store.baselineRuns.length > 1 ? `Baseline run ${i + 1} (£)` : 'Baseline price (£)'}</span>
          <div class="pr">
            <input type="number" inputmode="decimal" min="0" placeholder="£" value={run ?? ''} oninput={(e) => setBase(i, (e.target as HTMLInputElement).value)} />
            {#if store.baselineRuns.length > 1}<button class="x" type="button" aria-label="Remove run" onclick={() => dropBase(i)}>×</button>{/if}
          </div>
        </label>
      {/each}
    </div>
    {#if store.baselineRuns.length < 3}<button class="link" type="button" onclick={addBase}>+ Add another baseline run (measures the noise)</button>{/if}

    <p class="noise">
      {#if b.runs >= 2}Noise level: <strong>{b.noise.toFixed(1)}%</strong>. Your baseline runs differ by {b.spreadPct.toFixed(1)}%, so smaller gaps are treated as noise.
      {:else}Noise level: <strong>{NOISE_FLOOR}%</strong> (standard). Add a second baseline run to measure your own.{/if}
    </p>

    {#if !answers || Object.keys(answers).length < 11}
      <p class="notice">The order below is generic. <a href="/start/">Take the 2-minute guided check</a> to order it for you.</p>
    {:else}
      <p class="notice ok">Ordered for you from your guided-check answers. <a href="/start/">Change them</a></p>
    {/if}

    {#if !hasData && !store.usingSample}
      <div class="empty"><button class="btn btn-ghost sm" type="button" onclick={loadSample}>See an example first</button></div>
    {/if}
  </section>

  <div class="area-tests">
    <div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax={activeIds.length} aria-valuenow={doneCount} aria-label="Tests done">
      <div style="width:{activeIds.length ? (doneCount / activeIds.length) * 100 : 0}%"></div>
    </div>
    <p class="count">{doneCount} of {activeIds.length} tests done</p>

    {#if startList.length}
      <h2 class="grp">Start here</h2>
      <div class="stack">{#each startList as it, i (it.test.id)}{@render card(it, i + 1)}{/each}</div>
    {/if}
    {#if alsoList.length}
      <h2 class="grp">Also worth a try</h2>
      <div class="stack">{#each alsoList as it, i (it.test.id)}{@render card(it, startList.length + i + 1)}{/each}</div>
    {/if}
    {#if addedList.length}
      <h2 class="grp">Added by you</h2>
      <div class="stack">{#each addedList as it, i (it.test.id)}{@render card(it, startList.length + alsoList.length + i + 1)}{/each}</div>
    {/if}

    {#if moreList.length}
      <details class="more" bind:open={moreOpen}>
        <summary>More tests you can add ({moreList.length})</summary>
        <p class="hint">These are low priority for you, or did not apply to your answers. Add any you are curious about.</p>
        <ul class="addlist">
          {#each moreList as it (it.test.id)}
            <li>
              <span><strong>{it.test.title}</strong> <em>{GROUP_NAME[it.group]}</em></span>
              <button class="btn btn-ghost sm" type="button" onclick={() => addTest(it.test.id)}>+ Add</button>
            </li>
          {/each}
        </ul>
      </details>
    {/if}

    <h2 class="grp">Your own tests</h2>
    <div class="card customs">
      {#each store.custom as c (c.id)}
        <div class="crow">
          <input type="text" placeholder="What did you change?" value={c.label} oninput={(e) => { c.label = (e.target as HTMLInputElement).value; }} aria-label="Test name" />
          <input type="number" inputmode="decimal" min="0" placeholder="£" value={c.price ?? ''} oninput={(e) => { c.price = numOrNull((e.target as HTMLInputElement).value); }} aria-label="Price" />
          <button class="x" type="button" aria-label="Remove" onclick={() => dropCustom(c.id)}>×</button>
        </div>
      {/each}
      <button class="link" type="button" onclick={() => addCustom()}>+ Add your own test</button>
    </div>

    <div class="data">
      <button class="btn btn-ghost sm" type="button" onclick={exportJson}>Export</button>
      <label class="btn btn-ghost sm">Import<input type="file" accept="application/json" onchange={importJson} hidden /></label>
      <button class="btn btn-ghost sm" type="button" onclick={startFresh}>Start fresh</button>
      {#if store.usingSample}<button class="btn btn-ghost sm" type="button" onclick={startFresh}>Clear example</button>{:else}<button class="btn btn-ghost sm" type="button" onclick={loadSample}>Load example</button>{/if}
    </div>
    <p class="note" aria-live="polite">{msg || 'Saved on this device only. Nothing is sent anywhere unless you choose to share.'}</p>
  </div>

  <aside class="area-res card res" data-results aria-labelledby="r-h">
    <h2 id="r-h">Results so far</h2>

    {#if best}
      <div class="best"><strong>Biggest drop: {best.title}</strong><span>{signed(best.diff)} ({pctText(best.pct)})</span></div>
    {/if}

    {#if sorted.length}
      <ul class="chart" role="list">
        {#each sorted as r (r.id)}
          <li>
            <div class="meta"><span class="name">{r.title}</span><span class="val {r.verdict}">{pctText(r.pct)}</span></div>
            <div class="track" aria-hidden="true">
              <div class="band" style="left:{50 - (b.noise / scale) * 50}%; width:{(b.noise / scale) * 100}%"></div>
              <div class="mid"></div>
              <div class="bar {r.verdict}" style="{r.pct < 0 ? 'right' : 'left'}:50%; width:{(Math.abs(r.pct) / scale) * 50}%"></div>
            </div>
            <span class="sr">{verdictText(r)}</span>
          </li>
        {/each}
      </ul>
      <p class="legend"><i class="sw"></i> Grey zone = likely noise (under {b.noise.toFixed(1)}%). Left is cheaper, right is dearer.</p>
    {:else}
      <p class="empty-res">Enter your baseline and a test price to see what moved your quote.</p>
    {/if}

    {#if realCheaper.length >= 2 && !hasCombo}
      <div class="combo">
        <strong>Try combining your best two</strong>
        <span>{realCheaper[0].title} and {realCheaper[1].title}. Savings do not simply add up, so test them together.</span>
        <button class="btn btn-primary sm" type="button" onclick={addCombo}>Add a combined test</button>
      </div>
    {/if}
    <p class="note">Information only, not advice. Buy only on true answers: see the <a href="/guide/">guide</a>.</p>
  </aside>

  <div class="area-share">
    <SharePanel rows={shareRows} baselineRuns={b.runs} noisePct={Math.round(b.spreadPct * 10) / 10} usingSample={store.usingSample} {answers} />
  </div>
</div>

<style>
  .layout { display: grid; gap: 18px; grid-template-columns: 1fr; grid-template-areas: 'base' 'res' 'tests' 'share'; align-items: start; }
  @media (min-width: 1000px) {
    .layout { grid-template-columns: minmax(0, 1fr) 380px; grid-template-areas: 'base res' 'tests res' 'share res'; }
    .area-res { position: sticky; top: 84px; }
  }
  .area-base { grid-area: base; } .area-tests { grid-area: tests; } .area-res { grid-area: res; } .area-share { grid-area: share; }
  .base, .res { padding: 22px; }
  h2 { margin: 0; font-size: 1.15rem; letter-spacing: -0.01em; }
  .bh { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .step { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-weight: 800; margin-right: 8px; font-size: 0.9rem; }
  .lead { color: var(--muted); margin: 10px 0 14px; }
  .noise { font-size: 0.9rem; color: var(--muted); margin: 12px 0 0; }
  .notice { margin: 12px 0 0; padding: 10px 14px; border-radius: 12px; background: var(--warn-soft); font-size: 0.88rem; }
  .notice.ok { background: var(--accent-soft); }
  .notice a, .note a { color: var(--accent); font-weight: 600; }
  .empty { margin-top: 12px; }

  .prog { height: 6px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
  .prog > div { height: 100%; background: var(--accent); transition: width 0.35s ease; }
  .count { color: var(--muted); font-size: 0.82rem; margin: 8px 0 4px; }
  .grp { margin: 22px 0 10px; font-size: 1rem; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.78rem; }
  .stack { display: grid; gap: 10px; }

  .test { scroll-margin-top: 90px; overflow: hidden; }
  .test.open { border-color: var(--accent); }
  .head { all: unset; box-sizing: border-box; width: 100%; display: grid; grid-template-columns: 30px 1fr auto 18px; gap: 10px; align-items: center; padding: 14px 16px; cursor: pointer; }
  .head:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px; border-radius: 14px; }
  .num { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-weight: 800; font-size: 0.85rem; }
  .ttl { font-weight: 700; }
  .status { font-size: 0.75rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
  .status.todo { background: var(--surface-2); color: var(--muted); }
  .status.skip { background: var(--surface-2); color: var(--muted); text-decoration: line-through; }
  .status.cheaper { background: var(--good-soft); color: var(--good); }
  .status.dearer { background: var(--warn-soft); color: var(--bad); }
  .status.noise { background: var(--surface-2); color: var(--muted); }
  .chev { color: var(--muted); }
  .body { padding: 0 16px 16px 56px; display: grid; gap: 12px; }
  @media (max-width: 520px) { .body { padding-left: 16px; } .head { grid-template-columns: 30px 1fr 18px; } .status { grid-column: 2; grid-row: 2; justify-self: start; } .chev { grid-row: 1; grid-column: 3; } }
  .why { margin: 0; color: var(--muted); font-size: 0.9rem; }
  .inst { margin: 0; background: var(--surface-2); border-radius: 12px; padding: 12px 14px; font-size: 0.92rem; }
  .inst b { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
  .pgroup { display: grid; gap: 6px; }
  .plabel { font-size: 0.78rem; font-weight: 700; color: var(--muted); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { font: inherit; font-size: 0.85rem; font-weight: 600; padding: 7px 13px; border-radius: 999px; background: var(--surface); color: var(--text); border: 1.5px solid var(--line); cursor: pointer; transition: all 0.12s ease; }
  .chip:hover { border-color: var(--accent); }
  .chip.on { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
  .field { display: grid; gap: 5px; }
  .field > span { font-size: 0.8rem; font-weight: 700; color: var(--muted); }
  .field i { font-weight: 400; font-style: normal; }
  input[type='number'], input[type='text'] { font: inherit; color: var(--text); background: var(--surface-2); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; width: 100%; box-sizing: border-box; }
  input:focus-visible { outline: 3px solid var(--accent); outline-offset: 1px; }
  .runs { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
  .pr { display: flex; gap: 6px; align-items: center; }
  .x { border: 0; background: transparent; color: var(--muted); font-size: 1.4rem; cursor: pointer; border-radius: 10px; width: 36px; height: 36px; flex: none; }
  .x:hover { background: var(--surface-2); color: var(--bad); }
  .link { background: none; border: 0; padding: 4px 0; color: var(--accent); font: inherit; font-weight: 600; font-size: 0.88rem; cursor: pointer; text-align: left; justify-self: start; }
  .out { display: grid; gap: 3px; padding: 12px 14px; border-radius: 12px; background: var(--surface-2); font-size: 0.92rem; }
  .out.cheaper { background: var(--good-soft); } .out.cheaper strong { color: var(--good); }
  .out.dearer { background: var(--warn-soft); } .out.dearer strong { color: var(--bad); }
  .warnline { color: var(--warn); font-weight: 600; }
  .hint { color: var(--muted); font-size: 0.85rem; margin: 0; }
  .must { background: var(--accent-soft); border-radius: 12px; padding: 8px 12px; font-size: 0.86rem; margin: 0; }
  .caut { background: var(--warn-soft); border-radius: 12px; padding: 8px 12px; font-size: 0.86rem; margin: 0; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; }
  .sm { padding: 8px 14px; font-size: 0.85rem; }

  .more { margin-top: 18px; }
  .more summary { cursor: pointer; font-weight: 600; }
  .addlist { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 8px; }
  .addlist li { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); }
  .addlist em { color: var(--muted); font-style: normal; font-size: 0.78rem; margin-left: 6px; }
  .customs { padding: 14px 16px; display: grid; gap: 10px; }
  .crow { display: grid; grid-template-columns: 1fr 110px 36px; gap: 8px; align-items: center; }
  .data { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
  .note { color: var(--muted); font-size: 0.82rem; margin: 10px 0 0; }

  .best { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: var(--good-soft); color: var(--good); padding: 12px 14px; border-radius: 14px; margin: 14px 0 10px; font-size: 0.92rem; }
  .chart { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 14px; }
  .meta { display: flex; justify-content: space-between; gap: 10px; font-size: 0.88rem; margin-bottom: 5px; }
  .name { font-weight: 600; }
  .val { font-variant-numeric: tabular-nums; color: var(--muted); }
  .val.cheaper { color: var(--good); font-weight: 700; } .val.dearer { color: var(--bad); font-weight: 700; }
  .track { position: relative; height: 12px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
  .band { position: absolute; top: 0; bottom: 0; background: var(--noise); }
  .mid { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: var(--line); transform: translateX(-1px); }
  .bar { position: absolute; top: 2px; bottom: 2px; border-radius: 999px; transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .bar.cheaper { background: var(--good); } .bar.dearer { background: var(--bad); } .bar.noise { background: var(--muted); opacity: 0.7; }
  .legend { color: var(--muted); font-size: 0.78rem; margin: 12px 0 0; }
  .sw { display: inline-block; width: 12px; height: 12px; border-radius: 4px; background: var(--noise); border: 1px solid var(--line); vertical-align: -2px; }
  .empty-res { color: var(--muted); padding: 18px 0 6px; }
  .combo { display: grid; gap: 8px; background: var(--accent-soft); border-radius: 14px; padding: 14px; margin-top: 16px; font-size: 0.9rem; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  li { position: relative; }
</style>
