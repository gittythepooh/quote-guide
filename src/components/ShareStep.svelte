<script lang="ts">
  import { load, baseline, allResults, pctText, gbp } from '../lib/explorer-store';
  import { planToQuotes } from '../lib/plan-import';
  import SharePanel from './SharePanel.svelte';

  let store = $state(load());
  let answers = $state<any>(null);
  let open = $state(false);

  $effect.pre(() => {
    try {
      const a = localStorage.getItem('qg-advisor-v1');
      if (a) answers = JSON.parse(a);
    } catch {}
    if (location.hash === '#share') open = true;
  });

  const b = $derived(baseline(store.baselineRuns));
  const results = $derived(allResults(store));
  const shareable = $derived(results.filter((r) => r.change));
  const rows = $derived(store.usingSample ? [] : shareable.map((r) => ({ id: r.id, label: r.title, pct: r.pct, change: r.change!, repeats: r.runs })));
  const plan = $derived(planToQuotes(store, answers));
</script>

<section class="card step" id="share" aria-labelledby="sh2-h">
  <span class="pill">Step 4 · Share</span>
  <h2 id="sh2-h">Share what you found</h2>

  {#if rows.length > 0 && b.avg !== null}
    <p class="lead">
      You have <strong>{rows.length} test result{rows.length === 1 ? '' : 's'}</strong> that can help other people.
      {#if plan.savingPct !== null}Your tweaks moved your price by <strong>{pctText(plan.savingPct)}</strong>.{/if}
      Only the percentages are shared, never your prices.
    </p>
    <ul class="chips" role="list">
      {#each rows as r (r.id)}
        <li><span class="t">{r.label}</span><b class:good={r.pct < 0}>{pctText(r.pct)}</b></li>
      {/each}
    </ul>
    <SharePanel bind:open rows={rows} baselineRuns={b.runs} noisePct={Math.round(b.spreadPct * 10) / 10} usingSample={store.usingSample} {answers} />
  {:else}
    <p class="lead">
      When you have finished a couple of tests, you can share the percentages anonymously here. Each report brings a community figure closer to being published, so the next person starts with evidence.
    </p>
    <div class="acts">
      <a class="btn btn-primary" href={b.avg !== null ? '/explorer/' : '/start/'}>{b.avg !== null ? 'Back to my test plan' : 'Start the guided check →'}</a>
    </div>
  {/if}
</section>

<style>
  .step { padding: 24px; margin-bottom: 22px; scroll-margin-top: 90px; background: linear-gradient(135deg, var(--accent-soft), var(--surface)); }
  h2 { margin: 12px 0 8px; font-size: 1.5rem; letter-spacing: -0.02em; }
  .lead { color: var(--muted); max-width: 64ch; margin: 0 0 14px; }
  .lead strong { color: var(--text); }
  .chips { list-style: none; margin: 0 0 16px; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
  .chips li { display: inline-flex; gap: 8px; align-items: baseline; background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px; font-size: 0.85rem; }
  .chips b { font-variant-numeric: tabular-nums; color: var(--muted); }
  .chips b.good { color: var(--good); }
  .acts { display: flex; gap: 10px; flex-wrap: wrap; }
</style>
