<script lang="ts">
  import { sampleBaseline, sampleScenarios, type Scenario } from '../data/sample';
  import SharePanel from './SharePanel.svelte';

  const KEY = 'qg-whatif-v1';
  const NOISE = 5; // percent. Gaps smaller than this are treated as likely noise.

  let baseline = $state<number | null>(sampleBaseline);
  let scenarios = $state<Scenario[]>(structuredClone(sampleScenarios));
  let usingSample = $state(true);
  let loaded = $state(false);
  let msg = $state('');

  $effect.pre(() => {
    if (loaded) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        baseline = d.baseline ?? null;
        scenarios = d.scenarios ?? [];
        usingSample = !!d.usingSample;
      }
    } catch {}
    loaded = true;
  });

  $effect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ baseline, scenarios, usingSample }));
    } catch {}
  });

  type Row = Scenario & { diff: number | null; pct: number | null; verdict: 'real-cheaper' | 'real-dearer' | 'noise' | 'empty' };

  const rows = $derived.by<Row[]>(() =>
    scenarios.map((s) => {
      if (!baseline || baseline <= 0 || s.price == null || !Number.isFinite(s.price)) {
        return { ...s, diff: null, pct: null, verdict: 'empty' };
      }
      const diff = s.price - baseline;
      const pct = (diff / baseline) * 100;
      const verdict = Math.abs(pct) < NOISE ? 'noise' : pct < 0 ? 'real-cheaper' : 'real-dearer';
      return { ...s, diff, pct, verdict };
    }),
  );

  const scale = $derived(Math.max(15, ...rows.map((r) => Math.abs(r.pct ?? 0))));
  const best = $derived(
    rows.filter((r) => r.verdict === 'real-cheaper').sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0],
  );

  const gbp = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');
  const signed = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + gbp(Math.abs(n));

  function addRow() {
    scenarios.push({ id: crypto.randomUUID(), label: '', price: null });
  }
  function removeRow(id: string) {
    scenarios = scenarios.filter((s) => s.id !== id);
  }
  function clearAll() {
    baseline = null;
    scenarios = [{ id: crypto.randomUUID(), label: '', price: null }];
    usingSample = false;
    msg = 'Cleared. Enter your own baseline quote to start.';
  }
  function loadSample() {
    baseline = sampleBaseline;
    scenarios = structuredClone(sampleScenarios);
    usingSample = true;
    msg = 'Sample data loaded.';
  }
  function markEdited() {
    usingSample = false;
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ baseline, scenarios }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'quote-guide-whatif.json';
    a.click();
    URL.revokeObjectURL(a.href);
    msg = 'Exported to a file on this device.';
  }
  async function importJson(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d.scenarios)) throw new Error('bad file');
      baseline = typeof d.baseline === 'number' ? d.baseline : null;
      scenarios = d.scenarios.map((s: any) => ({
        id: String(s.id ?? crypto.randomUUID()),
        label: String(s.label ?? ''),
        price: typeof s.price === 'number' ? s.price : null,
      }));
      usingSample = false;
      msg = 'Imported.';
    } catch {
      msg = 'That file could not be read.';
    }
    (e.target as HTMLInputElement).value = '';
  }
</script>

<div class="grid">
  <section class="card panel" aria-labelledby="in-h">
    <div class="head">
      <h2 id="in-h">Your quotes</h2>
      {#if usingSample}<span class="pill">Sample data</span>{/if}
    </div>

    <label class="field">
      <span>Baseline price (£)</span>
      <input type="number" inputmode="decimal" min="0" placeholder="e.g. 1200" bind:value={baseline} oninput={markEdited} />
    </label>

    <div class="rows">
      {#each scenarios as s (s.id)}
        <div class="row">
          <input class="lbl" type="text" placeholder="What did you change?" aria-label="Change made" bind:value={s.label} oninput={markEdited} />
          <input class="num" type="number" inputmode="decimal" min="0" placeholder="£" aria-label="New price" bind:value={s.price} oninput={markEdited} />
          <button class="x" type="button" onclick={() => removeRow(s.id)} aria-label="Remove row">×</button>
        </div>
      {/each}
    </div>

    <div class="actions">
      <button class="btn btn-primary" type="button" onclick={addRow}>+ Add a change</button>
      <button class="btn btn-ghost" type="button" onclick={clearAll}>Start fresh</button>
      {#if !usingSample}<button class="btn btn-ghost" type="button" onclick={loadSample}>Load sample</button>{/if}
    </div>

    <div class="actions small">
      <button class="btn btn-ghost" type="button" onclick={exportJson}>Export</button>
      <label class="btn btn-ghost">
        Import
        <input type="file" accept="application/json" onchange={importJson} hidden />
      </label>
    </div>
    <p class="note" aria-live="polite">{msg || 'Saved on this device only. Nothing is sent anywhere.'}</p>
  </section>

  <section class="card panel" aria-labelledby="out-h">
    <div class="head">
      <h2 id="out-h">What mattered</h2>
      <span class="legend"><i class="sw sw-noise"></i> Likely noise (under {NOISE}%)</span>
    </div>

    {#if best}
      <div class="best">
        <strong>Biggest drop: {best.label || 'Unnamed change'}</strong>
        <span>{signed(best.diff ?? 0)} ({(best.pct ?? 0).toFixed(1)}%)</span>
      </div>
    {/if}

    <ul class="chart" role="list">
      {#each rows as r (r.id)}
        {#if r.verdict !== 'empty'}
          <li>
            <div class="meta">
              <span class="name">{r.label || 'Unnamed change'}</span>
              <span class="val {r.verdict}">
                {signed(r.diff ?? 0)} · {(r.pct ?? 0).toFixed(1)}%
              </span>
            </div>
            <div class="track" aria-hidden="true">
              <div class="band" style="left:{50 - (NOISE / scale) * 50}%; width:{(NOISE / scale) * 100}%"></div>
              <div class="mid"></div>
              <div
                class="bar {r.verdict}"
                style="{(r.pct ?? 0) < 0 ? 'right' : 'left'}:50%; width:{(Math.abs(r.pct ?? 0) / scale) * 50}%"
              ></div>
            </div>
            <span class="sr">{r.verdict === 'noise' ? 'Within noise' : r.verdict === 'real-cheaper' ? 'Cheaper than baseline' : 'Dearer than baseline'}</span>
          </li>
        {/if}
      {/each}
    </ul>

    {#if rows.every((r) => r.verdict === 'empty')}
      <p class="empty">Enter a baseline and at least one changed price to see the chart.</p>
    {/if}

    <p class="note">
      Left of the middle line is cheaper. Right is dearer. Small gaps can come from the cheapest insurer changing between runs, so repeat a test before you trust it. This is information, not advice.
    </p>
  </section>

  <SharePanel
    rows={rows.filter((r) => r.pct !== null).map((r) => ({ id: r.id, label: r.label, pct: r.pct as number }))}
    {usingSample}
  />
</div>

<style>
  .grid { display: grid; gap: 18px; grid-template-columns: 1fr; }
  @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1.15fr; align-items: start; } }
  .panel { padding: 24px; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
  h2 { margin: 0; font-size: 1.2rem; letter-spacing: -0.01em; }
  .field { display: grid; gap: 6px; font-weight: 600; font-size: 0.9rem; margin-bottom: 16px; }
  input[type='text'], input[type='number'] {
    font: inherit; color: var(--text); background: var(--surface-2); border: 1px solid var(--line);
    border-radius: 12px; padding: 10px 12px; width: 100%; box-sizing: border-box;
  }
  input:focus-visible { outline: 3px solid var(--accent); outline-offset: 1px; }
  .rows { display: grid; gap: 8px; }
  .row { display: grid; grid-template-columns: 1fr 96px 36px; gap: 8px; align-items: center; }
  @media (max-width: 520px) {
    .row { grid-template-columns: 1fr 36px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
    .row .lbl { grid-column: 1 / -1; }
    .row .num { grid-column: 1; }
    .row .x { grid-column: 2; }
  }
  .x { border: 0; background: transparent; color: var(--muted); font-size: 1.4rem; cursor: pointer; border-radius: 10px; height: 36px; }
  .x:hover { background: var(--surface-2); color: var(--bad); }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .actions.small .btn { padding: 8px 14px; font-size: 0.85rem; }
  .note { color: var(--muted); font-size: 0.85rem; margin: 14px 0 0; }
  .legend { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 0.8rem; }
  .sw { width: 14px; height: 14px; border-radius: 4px; display: inline-block; }
  .sw-noise { background: var(--noise); border: 1px solid var(--line); }
  .best { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; background: var(--good-soft); color: var(--good); padding: 12px 14px; border-radius: 14px; margin-bottom: 16px; font-size: 0.95rem; }
  .chart { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
  .meta { display: flex; justify-content: space-between; gap: 10px; font-size: 0.92rem; margin-bottom: 6px; }
  .name { font-weight: 600; }
  .val { font-variant-numeric: tabular-nums; color: var(--muted); white-space: nowrap; }
  .val.real-cheaper { color: var(--good); font-weight: 700; }
  .val.real-dearer { color: var(--bad); font-weight: 700; }
  .track { position: relative; height: 14px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
  .band { position: absolute; top: 0; bottom: 0; background: var(--noise); }
  .mid { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: var(--line); transform: translateX(-1px); }
  .bar { position: absolute; top: 2px; bottom: 2px; border-radius: 999px; transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .bar.real-cheaper { background: var(--good); }
  .bar.real-dearer { background: var(--bad); }
  .bar.noise { background: var(--muted); opacity: 0.7; }
  .empty { color: var(--muted); padding: 24px 0; text-align: center; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  li { position: relative; }
</style>
