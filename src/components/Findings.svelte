<script lang="ts">
  import { CHANGES, MIN_GROUP, type ChangeKey } from '../lib/report-schema';
  import { seedFindings, seedSurvey, SEED_SOURCE } from '../data/findings-seed';

  type Community = { change: ChangeKey; n: number; published: boolean; medianPct: number | null; p25: number | null; p75: number | null; medianNoise: number | null };

  let community = $state<Record<string, Community>>({});
  let online = $state<'loading' | 'ok' | 'offline'>('loading');

  $effect(() => {
    fetch('/api/findings')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        community = Object.fromEntries((d.findings as Community[]).map((f) => [f.change, f]));
        online = 'ok';
      })
      .catch(() => (online = 'offline'));
  });

  const seedMap = Object.fromEntries(seedFindings.map((s) => [s.change, s]));
  const keys = Object.keys(CHANGES) as ChangeKey[];

  const rows = $derived(
    keys.map((k) => ({ key: k, label: CHANGES[k], seed: seedMap[k], c: community[k] })).sort((a, b) => {
      const av = a.c?.published ? a.c.medianPct! : a.seed?.pct ?? 999;
      const bv = b.c?.published ? b.c.medianPct! : b.seed?.pct ?? 999;
      return av - bv;
    }),
  );

  const fmt = (n: number) => (n > 0 ? '+' : '') + n.toFixed(1) + '%';
  const tone = (n: number) => (Math.abs(n) < 5 ? 'noise' : n < 0 ? 'good' : 'bad');
  const scale = 40;
  const width = (n: number) => Math.min(50, (Math.abs(n) / scale) * 50);
</script>

<div class="card panel">
  <div class="legend">
    <span><i class="sw seed"></i>Starting point (one early test)</span>
    <span><i class="sw comm"></i>Community median</span>
    <span class="status">
      {#if online === 'loading'}Loading community data…{:else if online === 'offline'}Community data not available here (showing the starting point).{:else}Community data loaded.{/if}
    </span>
  </div>

  <ul class="rows" role="list">
    {#each rows as r (r.key)}
      {#if r.seed || r.c}
        <li>
          <div class="meta">
            <strong>{r.label}</strong>
            <span class="vals">
              {#if r.c?.published}
                <b class="{tone(r.c.medianPct!)}">{fmt(r.c.medianPct!)}</b> <small>median of {r.c.n} reports ({fmt(r.c.p25!)} to {fmt(r.c.p75!)})</small>
              {:else if r.seed}
                <b class="{tone(r.seed.pct)}">{fmt(r.seed.pct)}</b> <small>early test</small>
              {/if}
            </span>
          </div>
          <div class="track" aria-hidden="true">
            <div class="mid"></div>
            {#if r.c?.published}
              <div class="bar comm {tone(r.c.medianPct!)}" style="{r.c.medianPct! < 0 ? 'right' : 'left'}:50%; width:{width(r.c.medianPct!)}%"></div>
            {:else if r.seed}
              <div class="bar seed {tone(r.seed.pct)}" style="{r.seed.pct < 0 ? 'right' : 'left'}:50%; width:{width(r.seed.pct)}%"></div>
            {/if}
          </div>
          {#if !r.c?.published}
            <div class="prog">
              <div class="pbar"><div style="width:{Math.min(100, ((r.c?.n ?? 0) / MIN_GROUP) * 100)}%"></div></div>
              <small>{r.c?.n ?? 0} of {MIN_GROUP} community reports needed to publish this figure</small>
            </div>
          {/if}
          {#if r.seed && !r.c?.published}<p class="note">{r.seed.note}</p>{/if}
        </li>
      {/if}
    {/each}
  </ul>

  <p class="foot">Left of the line is cheaper than the baseline. Right is dearer. Gaps under about 5% are usually noise. Figures are for the profiles tested, not a promise for you.</p>
</div>

<div class="card panel" style="margin-top:18px;">
  <h2>Early survey ({seedSurvey.n} people)</h2>
  <ul class="pts">{#each seedSurvey.points as p}<li>{p}</li>{/each}</ul>
  <p class="foot">Small, informal sample. Treat it as a hint, not a result.</p>
</div>

<p class="src">Starting point source: {SEED_SOURCE}</p>

<style>
  .panel { padding: 24px; }
  h2 { margin: 0 0 10px; font-size: 1.2rem; letter-spacing: -0.01em; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 0.82rem; color: var(--muted); margin-bottom: 18px; }
  .sw { display: inline-block; width: 12px; height: 12px; border-radius: 4px; margin-right: 6px; vertical-align: -1px; }
  .sw.seed { background: var(--muted); opacity: 0.6; } .sw.comm { background: var(--accent); }
  .status { margin-left: auto; }
  .rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 20px; }
  .meta { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
  .vals small { color: var(--muted); }
  b.good { color: var(--good); } b.bad { color: var(--bad); } b.noise { color: var(--muted); }
  .track { position: relative; height: 12px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
  .mid { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: var(--line); }
  .bar { position: absolute; top: 2px; bottom: 2px; border-radius: 999px; }
  .bar.seed { opacity: 0.55; }
  .bar.good { background: var(--good); } .bar.bad { background: var(--bad); } .bar.noise { background: var(--muted); }
  .prog { display: flex; align-items: center; gap: 10px; margin-top: 6px; color: var(--muted); }
  .pbar { width: 90px; height: 6px; background: var(--surface-2); border-radius: 999px; overflow: hidden; flex: none; }
  .pbar > div { height: 100%; background: var(--accent); }
  .note { margin: 4px 0 0; font-size: 0.85rem; color: var(--muted); }
  .foot { color: var(--muted); font-size: 0.85rem; margin: 18px 0 0; }
  .pts { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
  .src { color: var(--muted); font-size: 0.8rem; margin-top: 12px; }
</style>
