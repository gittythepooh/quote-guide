<script lang="ts">
  import {
    CHANGES, AGE_BANDS, REGIONS, CAR_AGE_BANDS, NCD_BANDS, COVER, SITES,
    type ChangeKey, type Report,
  } from '../lib/report-schema';

  let { rows, usingSample }: { rows: { id: string; label: string; pct: number }[]; usingSample: boolean } = $props();

  const SITEKEY = import.meta.env.PUBLIC_TURNSTILE_SITEKEY as string | undefined;
  const NONE = '';
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
  let status = $state<'idle' | 'sending' | 'done' | 'error'>('idle');
  let code = $state('');
  let errorMsg = $state('');
  let delCode = $state('');
  let delMsg = $state('');

  let ageBand = $state(NONE), region = $state(NONE), carAge = $state(NONE), ncd = $state(NONE), cover = $state(NONE), site = $state(NONE);
  let baselineRuns = $state<number | null>(3);
  let noisePct = $state<number | null>(null);
  let mapping = $state<Record<string, { change: string; repeats: number }>>({});

  const changeOptions = Object.entries(CHANGES) as [ChangeKey, string][];

  const chosen = $derived(
    rows
      .map((r) => ({ ...r, ...(mapping[r.id] ?? { change: NONE, repeats: 1 }) }))
      .filter((r) => r.change !== NONE),
  );
  const dupes = $derived(new Set(chosen.map((c) => c.change)).size !== chosen.length);

  const payload = $derived<Report | null>(
    ageBand && region && carAge && ncd && cover && site && baselineRuns && noisePct !== null && chosen.length && !dupes
      ? ({
          v: 1,
          profile: { ageBand, region, carAge, ncd, cover, site } as Report['profile'],
          baselineRuns: baselineRuns!,
          noisePct: noisePct!,
          results: chosen.map((c) => ({ change: c.change as ChangeKey, pct: Math.round(c.pct * 10) / 10, repeats: c.repeats })),
        } as Report)
      : null,
  );
  const canSend = $derived(!!payload && consent && !usingSample && !!token && !!SITEKEY && status !== 'sending');

  function setMap(id: string, patch: Partial<{ change: string; repeats: number }>) {
    mapping[id] = { change: mapping[id]?.change ?? NONE, repeats: mapping[id]?.repeats ?? 1, ...patch };
  }

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
    Optional. Share <strong>only the percentage changes</strong> from your own test, with broad bands for your profile. No prices, name, address, email or IP address are sent.
  </p>

  {#if open}
    {#if usingSample}
      <p class="warn">You are looking at sample data. Enter your own quotes first, then share.</p>
    {/if}

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
      <label><span>Baseline runs you did</span>
        <input type="number" min="1" max="10" bind:value={baselineRuns} /></label>
      <label><span>Baseline spread (%)</span>
        <input type="number" min="0" max="50" step="0.1" placeholder="(max−min)/avg" bind:value={noisePct} /></label>
    </div>

    <h3>Match each of your changes to a standard type</h3>
    <p class="hint">Leave a row blank to keep it private. Name, spelling and other personal-detail tests cannot be shared.</p>
    <ul class="map">
      {#each rows as r (r.id)}
        <li>
          <div class="l"><strong>{r.label || 'Unnamed change'}</strong><span>{r.pct > 0 ? '+' : ''}{r.pct.toFixed(1)}%</span></div>
          <select aria-label="Standard type" value={mapping[r.id]?.change ?? ''} onchange={(e) => setMap(r.id, { change: (e.target as HTMLSelectElement).value })}>
            <option value="">Do not share</option>
            {#each changeOptions as [k, label]}<option value={k}>{label}</option>{/each}
          </select>
          <label class="rep"><span>Runs</span>
            <input type="number" min="1" max="10" value={mapping[r.id]?.repeats ?? 1} oninput={(e) => setMap(r.id, { repeats: Math.max(1, Number((e.target as HTMLInputElement).value) || 1) })} /></label>
        </li>
      {/each}
    </ul>
    {#if dupes}<p class="warn">Each standard type can be used once per report.</p>{/if}

    <details open={!!payload}>
      <summary>Exactly what will be sent</summary>
      <pre>{payload ? JSON.stringify(payload, null, 2) : 'Complete every field and match at least one change to see the report.'}</pre>
    </details>

    <label class="consent">
      <input type="checkbox" bind:checked={consent} />
      <span>I agree to share this banded, anonymous report. I understand it is published only as group averages once enough people have contributed, and I can delete it with the code shown after sending.</span>
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
  .panel { padding: 24px; margin-top: 18px; grid-column: 1 / -1; }
  .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  h2 { margin: 0; font-size: 1.2rem; letter-spacing: -0.01em; }
  h3 { margin: 22px 0 4px; font-size: 1rem; }
  .lead { color: var(--muted); margin: 10px 0 0; max-width: 70ch; }
  .hint { color: var(--muted); font-size: 0.85rem; margin: 0 0 10px; }
  .fields { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); margin-top: 16px; }
  label span { display: block; font-size: 0.76rem; font-weight: 600; color: var(--muted); margin-bottom: 4px; }
  select, input[type='number'], input[type='text'] {
    font: inherit; color: var(--text); background: var(--surface-2); border: 1px solid var(--line);
    border-radius: 12px; padding: 9px 11px; width: 100%; box-sizing: border-box;
  }
  .map { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .map li { display: grid; grid-template-columns: 1.1fr 1.4fr 80px; gap: 10px; align-items: end; padding: 10px 0; border-bottom: 1px solid var(--line); }
  @media (max-width: 640px) { .map li { grid-template-columns: 1fr 80px; } .map li .l { grid-column: 1 / -1; } }
  .l { display: flex; justify-content: space-between; gap: 8px; align-self: center; font-size: 0.92rem; }
  .l span { color: var(--muted); font-variant-numeric: tabular-nums; }
  details { margin-top: 16px; }
  summary { cursor: pointer; font-weight: 600; }
  pre { background: var(--surface-2); border: 1px solid var(--line); border-radius: 12px; padding: 12px; overflow: auto; font-size: 0.78rem; max-height: 240px; }
  .consent { display: flex; gap: 10px; align-items: flex-start; margin: 16px 0; }
  .consent input { width: 18px; height: 18px; accent-color: var(--accent); margin-top: 3px; flex: none; }
  .consent span { margin: 0; font-size: 0.88rem; color: var(--text); font-weight: 400; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .warn { background: var(--warn-soft); padding: 10px 14px; border-radius: 12px; font-size: 0.88rem; margin: 14px 0 0; }
  .ok { display: grid; gap: 6px; background: var(--good-soft); color: var(--good); padding: 14px; border-radius: 14px; margin-top: 14px; }
  .ok code { font-size: 1.05rem; font-weight: 800; letter-spacing: 0.04em; user-select: all; }
  .delrow { display: flex; gap: 8px; margin-top: 10px; }
</style>
