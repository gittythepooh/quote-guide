<script lang="ts">
  import { CHANGES, AGE_BANDS, REGIONS, CAR_AGE_BANDS, NCD_BANDS, COVER, SITES, type ChangeKey, type Report } from '../lib/report-schema';

  type Row = { id: string; label: string; pct: number; change: ChangeKey; repeats: number };
  let { rows, baselineRuns, noisePct, usingSample, answers }: { rows: Row[]; baselineRuns: number; noisePct: number; usingSample: boolean; answers: any } = $props();

  const SITEKEY = import.meta.env.PUBLIC_TURNSTILE_SITEKEY as string | undefined;
  let open = $state(false);
  let token = $state('');
  let tsEl = $state<HTMLDivElement>();
  let tsId: string | undefined;

  // Load the Turnstile bot check only when the user opens the share panel.
  $effect(() => {
    if (!open || !SITEKEY || !tsEl || tsId) return;
    const render = () => {
      const w = window as any;
      if (!w.turnstile || !tsEl || tsId) return;
      tsId = w.turnstile.render(tsEl, {
        sitekey: SITEKEY,
        callback: (t: string) => (token = t),
        'expired-callback': () => (token = ''),
        'error-callback': () => (token = ''),
      });
    };
    if ((window as any).turnstile) return render();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  });

  let consent = $state(false);
  let ownData = $state(false);
  let status = $state<'idle' | 'sending' | 'done' | 'error'>('idle');
  let code = $state('');
  let errorMsg = $state('');
  let delCode = $state('');
  let delMsg = $state('');

  // Bands from the guided check are used when they match the allowed bands. The rest is chosen here.
  const pre = (v: unknown, list: readonly string[]) => (typeof v === 'string' && list.includes(v) ? v : '');
  let ageBand = $state(pre(answers?.age, AGE_BANDS));
  let ncd = $state(pre(answers?.ncd, NCD_BANDS));
  let cover = $state(pre(answers?.cover, COVER));
  let region = $state('');
  let carAge = $state('');
  let site = $state('');
  let excluded = $state<Record<string, boolean>>({});

  const chosen = $derived(rows.filter((r) => !excluded[r.id]));
  const dupes = $derived(new Set(chosen.map((c) => c.change)).size !== chosen.length);

  const payload = $derived<Report | null>(
    ageBand && region && carAge && ncd && cover && site && baselineRuns >= 1 && chosen.length && !dupes
      ? ({
          v: 1,
          profile: { ageBand, region, carAge, ncd, cover, site } as Report['profile'],
          baselineRuns: Math.min(10, baselineRuns),
          noisePct: Math.min(50, noisePct),
          results: chosen.map((c) => ({ change: c.change, pct: Math.round(c.pct * 10) / 10, repeats: Math.min(10, c.repeats) })),
        } as Report)
      : null,
  );
  const canSend = $derived(!!payload && consent && ownData && !usingSample && !!token && !!SITEKEY && status !== 'sending');

  async function send() {
    if (!canSend || !payload) return;
    status = 'sending';
    errorMsg = '';
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, report: payload }),
      });
      const d = await res.json();
      if (!res.ok) throw Object.assign(new Error(d.error ?? 'failed'), { code: res.status });
      code = d.code;
      status = 'done';
    } catch (e: any) {
      errorMsg =
        e?.message === 'Failed to fetch' ? 'Could not reach the server. Nothing was sent.'
        : e?.code === 403 ? 'The bot check failed. Please try again.'
        : e?.code === 429 ? 'Too many reports right now. Please try again in an hour.'
        : e?.code === 503 ? 'Sharing is not available yet.'
        : `The server rejected this report (${e?.message}).`;
      status = 'error';
    } finally {
      // A Turnstile token works once. Ask for a fresh one.
      token = '';
      try { (window as any).turnstile?.reset(tsId); } catch {}
    }
  }

  async function del() {
    delMsg = '';
    try {
      const res = await fetch('/api/report', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: delCode.trim() }),
      });
      const d = await res.json();
      delMsg = res.ok ? `Deleted ${d.deleted} row(s).` : 'That code is not valid.';
    } catch {
      delMsg = 'Could not reach the server.';
    }
  }
</script>

<section class="card panel" aria-labelledby="sh-h">
  <div class="head">
    <h2 id="sh-h">Help improve the findings</h2>
    <button class="btn btn-ghost" type="button" onclick={() => (open = !open)} aria-expanded={open}>{open ? 'Close' : 'Share anonymously'}</button>
  </div>
  <p class="lead">
    Optional. Share <strong>only the percentage changes</strong> from your tests, with broad bands for your profile. No prices, name, address, email or IP address are sent.
  </p>

  {#if open}
    {#if usingSample}
      <p class="warn">You are looking at example data. Enter your own prices first, then share.</p>
    {:else if rows.length === 0}
      <p class="warn">Finish at least one test (with a baseline) to share it.</p>
    {/if}

    <h3>About your quotes</h3>
    <div class="fields">
      <label><span>Age band</span>
        <select bind:value={ageBand}><option value="">Choose</option>{#each AGE_BANDS as o}<option>{o}</option>{/each}</select></label>
      <label><span>Region</span>
        <select bind:value={region}><option value="">Choose</option>{#each REGIONS as o}<option>{o}</option>{/each}</select></label>
      <label><span>Car age</span>
        <select bind:value={carAge}><option value="">Choose</option>{#each CAR_AGE_BANDS as o}<option>{o}</option>{/each}</select></label>
      <label><span>No-claims years</span>
        <select bind:value={ncd}><option value="">Choose</option>{#each NCD_BANDS as o}<option>{o}</option>{/each}</select></label>
      <label><span>Baseline cover</span>
        <select bind:value={cover}><option value="">Choose</option>{#each COVER as o}<option>{o}</option>{/each}</select></label>
      <label><span>Comparison site</span>
        <select bind:value={site}><option value="">Choose</option>{#each SITES as o}<option>{o}</option>{/each}</select></label>
    </div>

    <h3>Which tests to share</h3>
    <p class="hint">Only tests with a standard type can be shared. Your own custom tests and anything about names or personal details never are.</p>
    <ul class="map">
      {#each rows as r (r.id)}
        <li>
          <label class="inc">
            <input type="checkbox" checked={!excluded[r.id]} onchange={() => (excluded[r.id] = !excluded[r.id])} />
            <span><strong>{r.label}</strong> <em>{CHANGES[r.change]}</em></span>
          </label>
          <span class="pc">{r.pct > 0 ? '+' : ''}{r.pct.toFixed(1)}%</span>
        </li>
      {/each}
    </ul>
    <p class="hint">Baseline runs: {baselineRuns}. Measured noise: {noisePct.toFixed(1)}%.</p>
    {#if dupes}<p class="warn">Each standard type can be used once per report.</p>{/if}

    <details open={!!payload}>
      <summary>Exactly what will be sent</summary>
      <pre>{payload ? JSON.stringify(payload, null, 2) : 'Complete every field above to see the report.'}</pre>
    </details>

    <label class="consent">
      <input type="checkbox" bind:checked={ownData} />
      <span>These results come from my own genuine test quotes, and nothing here is personal data about anyone else.</span>
    </label>
    <label class="consent">
      <input type="checkbox" bind:checked={consent} />
      <span>I agree to share this banded, anonymous report. I understand it is published only as group averages once enough people have contributed, and I can delete it with the code shown after sending. See the <a href="/privacy/">privacy notice</a> and <a href="/terms/">terms</a>.</span>
    </label>

    {#if SITEKEY}
      <div class="ts" bind:this={tsEl}></div>
      <p class="hint">A Cloudflare bot check runs here. It does not use tracking cookies.</p>
    {:else}
      <p class="warn">Sharing is switched off: no bot-check key is configured on this build.</p>
    {/if}

    <button class="btn btn-primary" type="button" disabled={!canSend} onclick={send}>
      {status === 'sending' ? 'Sending…' : 'Send report'}
    </button>

    {#if status === 'done'}
      <div class="ok">
        <strong>Thank you. Keep this code to delete your report later:</strong>
        <code>{code}</code>
        <span>It is shown once and is not stored in readable form.</span>
      </div>
    {/if}
    {#if status === 'error'}<p class="warn" role="alert">{errorMsg}</p>{/if}

    <details class="del">
      <summary>Delete a report I sent</summary>
      <div class="delrow">
        <input type="text" placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX" bind:value={delCode} />
        <button class="btn btn-ghost" type="button" onclick={del}>Delete</button>
      </div>
      {#if delMsg}<p class="hint" aria-live="polite">{delMsg}</p>{/if}
    </details>
  {/if}
</section>

<style>
  .panel { padding: 22px; }
  .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  h2 { margin: 0; font-size: 1.15rem; letter-spacing: -0.01em; }
  h3 { margin: 20px 0 6px; font-size: 0.95rem; }
  .lead { color: var(--muted); margin: 10px 0 0; max-width: 70ch; }
  .hint { color: var(--muted); font-size: 0.85rem; margin: 6px 0; }
  .fields { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
  label span { display: block; font-size: 0.76rem; font-weight: 600; color: var(--muted); margin-bottom: 4px; }
  select, input[type='text'] { font: inherit; color: var(--text); background: var(--surface-2); border: 1px solid var(--line); border-radius: 12px; padding: 9px 11px; width: 100%; box-sizing: border-box; }
  .map { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  .map li { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); }
  .inc { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; }
  .inc input { width: 18px; height: 18px; accent-color: var(--accent); margin-top: 3px; flex: none; }
  .inc span { margin: 0; font-size: 0.92rem; color: var(--text); font-weight: 400; }
  .inc em { display: block; color: var(--muted); font-style: normal; font-size: 0.8rem; }
  .pc { font-variant-numeric: tabular-nums; color: var(--muted); }
  details { margin-top: 16px; }
  summary { cursor: pointer; font-weight: 600; }
  pre { background: var(--surface-2); border: 1px solid var(--line); border-radius: 12px; padding: 12px; overflow: auto; font-size: 0.78rem; max-height: 240px; }
  .consent { display: flex; gap: 10px; align-items: flex-start; margin: 12px 0; }
  .consent a { color: var(--accent); font-weight: 600; }
  .consent input { width: 18px; height: 18px; accent-color: var(--accent); margin-top: 3px; flex: none; }
  .consent span { margin: 0; font-size: 0.88rem; color: var(--text); font-weight: 400; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .warn { background: var(--warn-soft); padding: 10px 14px; border-radius: 12px; font-size: 0.88rem; margin: 14px 0 0; }
  .ok { display: grid; gap: 6px; background: var(--good-soft); color: var(--good); padding: 14px; border-radius: 14px; margin-top: 14px; }
  .ok code { font-size: 1.05rem; font-weight: 800; letter-spacing: 0.04em; user-select: all; }
  .delrow { display: flex; gap: 8px; margin-top: 10px; }
</style>
