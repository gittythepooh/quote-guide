<script lang="ts">
  import { tick } from 'svelte';
  import { STEPS, advise, CLAIM_PCT, MUST_BE_TRUE, type Answers, type Community, type Item } from '../lib/advisor';

  const KEY = 'qg-advisor-v1';
  const SHORT: Record<string, string> = {
    age: 'Age', ncd: 'No-claims years', cover: 'Cover', job: 'Work', household: 'Other drivers', mileage: 'Mileage',
    excess: 'Voluntary excess', claim: 'Claim chance', payment: 'Payment', blackbox: 'Black box', renewal: 'Start date',
  };

  let answers = $state<Answers>({});
  let community = $state<Community>({});
  let loaded = $state(false);
  let msg = $state('');
  let editId = $state<string | null>(null);
  let sumEl = $state<HTMLElement>();

  $effect.pre(() => {
    if (loaded) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) answers = JSON.parse(raw);
    } catch {}
    loaded = true;
  });
  $effect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(answers)); } catch {}
  });
  $effect(() => {
    // Use community medians when the server has enough reports. Quietly ignore if unavailable.
    fetch('/api/findings')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { community = Object.fromEntries((d.findings as any[]).map((f) => [f.change, f])); })
      .catch(() => {});
  });

  const stepIndex = $derived(STEPS.findIndex((s) => answers[s.id] === undefined));
  const done = $derived(stepIndex === -1);
  const current = $derived(done ? null : STEPS[stepIndex]);
  const answered = $derived(STEPS.filter((s) => answers[s.id] !== undefined));
  const editStep = $derived(editId ? STEPS.find((s) => s.id === editId) ?? null : null);
  const items = $derived(done ? advise(answers, community) : []);
  const start = $derived(items.filter((i) => i.group === 'start'));
  const also = $derived(items.filter((i) => i.group === 'also'));
  const skip = $derived(items.filter((i) => i.group === 'skip'));
  const claimPct = $derived(answers.claim ? CLAIM_PCT[answers.claim] : null);

  const labelFor = (id: string, value: string) => STEPS.find((s) => s.id === id)!.options.find((o) => o.value === value)?.label ?? value;

  // Put the newest question just under the sticky header (or the top of the results when finished).
  async function reveal() {
    await tick();
    await new Promise((r) => requestAnimationFrame(() => r(null))); // let layout settle
    let top: number | null = null;
    if (done) top = sumEl ? sumEl.getBoundingClientRect().top - 84 : null;
    else {
      const bubbles = document.querySelectorAll('.ai-b');
      const last = bubbles[bubbles.length - 1];
      top = last ? last.getBoundingClientRect().top - 110 : null;
    }
    if (top !== null) window.scrollTo({ top: Math.max(0, window.scrollY + top), behavior: 'smooth' });
  }

  function pick(value: string) {
    const step = editStep ?? current;
    if (!step) return;
    (answers as any)[step.id] = value;
    editId = null;
    reveal();
  }
  function back() {
    const last = answered[answered.length - 1];
    if (last) delete (answers as any)[last.id];
  }
  function restart() {
    answers = {};
    editId = null;
    msg = '';
    window.scrollTo({ top: 0 });
  }

  // Add this plan's tests to the explorer without touching quotes the user already entered.
  function planExplorer() {
    const labels = [...start, ...also].map((i) => i.testLabel).filter((l): l is string => !!l);
    try {
      let baseline: number | null = null;
      let scenarios: { id: string; label: string; price: number | null }[] = [];
      const raw = localStorage.getItem('qg-whatif-v1');
      if (raw) {
        const d = JSON.parse(raw);
        if (d && !d.usingSample) {
          baseline = typeof d.baseline === 'number' ? d.baseline : null;
          scenarios = (d.scenarios ?? []).filter((s: any) => (s.label ?? '').trim() || typeof s.price === 'number');
        }
      }
      const have = new Set(scenarios.map((s) => s.label.trim().toLowerCase()));
      for (const label of labels) {
        if (!have.has(label.toLowerCase())) scenarios.push({ id: crypto.randomUUID(), label, price: null });
      }
      localStorage.setItem('qg-whatif-v1', JSON.stringify({ baseline, usingSample: false, scenarios }));
      location.href = '/explorer/';
    } catch {
      msg = 'Could not save your plan in this browser.';
    }
  }

  const tone = (l: Item['likelihood']) => (l === 'High' ? 'hi' : l === 'Medium' ? 'mid' : 'lo');
</script>

{#if !done}
  <div class="chat">
    <div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax={STEPS.length} aria-valuenow={answered.length}>
      <div style="width:{(answered.length / STEPS.length) * 100}%"></div>
    </div>
    <p class="count">Question {answered.length + 1} of {STEPS.length}</p>

    <ol class="thread" aria-live="polite">
      {#each answered as s (s.id)}
        <li class="row ai"><div class="bub ai-b">{s.question}</div></li>
        <li class="row me"><div class="bub me-b">{labelFor(s.id, answers[s.id] as string)}</div></li>
      {/each}
      {#if current}
        <li class="row ai">
          <div class="bub ai-b">
            {current.question}
            {#if current.hint}<small>{current.hint}</small>{/if}
          </div>
        </li>
      {/if}
    </ol>

    {#if current}
      <div class="chips" role="group" aria-label="Answer options">
        {#each current.options as o (o.value)}
          <button type="button" class="chip" onclick={() => pick(o.value)}>{o.label}</button>
        {/each}
      </div>
    {/if}

    {#if answered.length > 0}
      <div class="nav"><button class="btn btn-ghost sm" type="button" onclick={back}>← Back</button></div>
    {/if}
  </div>
{:else}
  <section class="summary" aria-labelledby="sum-h" bind:this={sumEl}>
    <h2 id="sum-h">What to focus on</h2>
    <p class="lead">
      Based on your answers and the data we have. Each item is something to <strong>test</strong> with honest options, not a trick.
      {#if claimPct !== null}Your claim feeling is treated as about {claimPct}% for the excess advice.{/if}
    </p>

    <details class="answers">
      <summary>Your answers ({STEPS.length}) · change any</summary>
      {#if editStep}
        <div class="edit">
          <strong>{editStep.question}</strong>
          <div class="chips left">
            {#each editStep.options as o (o.value)}
              <button type="button" class="chip" class:on={answers[editStep.id] === o.value} onclick={() => pick(o.value)}>{o.label}</button>
            {/each}
          </div>
          <button class="btn btn-ghost sm" type="button" onclick={() => (editId = null)}>Cancel</button>
        </div>
      {:else}
        <ul class="recap">
          {#each STEPS as s (s.id)}
            <li>
              <span class="rq">{SHORT[s.id]}</span>
              <span class="ra">{labelFor(s.id, answers[s.id] as string)}</span>
              <button class="link" type="button" onclick={() => (editId = s.id)}>Change</button>
            </li>
          {/each}
        </ul>
      {/if}
    </details>

    <h3>Start here</h3>
    <ol class="cards">
      {#each start as it, n (it.id)}
        <li class="card item">
          <div class="top">
            <span class="num">{n + 1}</span>
            <div class="t">
              <strong>{it.title}</strong>
              <span class="badge {tone(it.likelihood)}" title="How likely this is to help you, from how well it fits you and how strong the evidence is">Chance it helps: {it.likelihood}</span>
            </div>
          </div>
          <p>{it.why}</p>
          <p class="size"><b>Size:</b> {it.size}</p>
          {#if it.mustBeTrue}<p class="must">✓ {it.mustBeTrue}</p>{/if}
          {#if it.caution}<p class="caut">⚠ {it.caution}</p>{/if}
          <details><summary>Where this comes from</summary><p class="basis">{it.basis}</p></details>
        </li>
      {/each}
    </ol>

    {#if also.length}
      <h3>Also worth a quick look</h3>
      <ul class="plain">
        {#each also as it (it.id)}
          <li>
            <strong>{it.title}</strong> <span class="badge {tone(it.likelihood)}">{it.likelihood}</span>
            <span class="why">{it.why}</span>
            {#if it.mustBeTrue}<span class="must small">✓ {it.mustBeTrue}</span>{/if}
            {#if it.caution}<span class="caut small">⚠ {it.caution}</span>{/if}
          </li>
        {/each}
      </ul>
    {/if}

    {#if skip.length}
      <details class="skip">
        <summary>Probably not worth your time ({skip.length})</summary>
        <ul class="plain">
          {#each skip as it (it.id)}<li><strong>{it.title}</strong><span class="why">{it.why}</span>{#if it.mustBeTrue}<span class="must small">✓ {it.mustBeTrue}</span>{/if}</li>{/each}
        </ul>
      </details>
    {/if}

    <h3>Before you buy, these must be true</h3>
    <ul class="check">{#each MUST_BE_TRUE as m}<li>{m}</li>{/each}</ul>

    <div class="actions">
      <button class="btn btn-primary" type="button" onclick={planExplorer}>Add these tests to my explorer →</button>
      <button class="btn btn-ghost" type="button" onclick={restart}>Start over</button>
    </div>
    {#if msg}<p class="warn" role="alert">{msg}</p>{/if}
    <p class="fine">
      This adds the changes above to the <a href="/explorer/">explorer</a> and keeps any quotes you already entered. Run each one on a comparison site, type in the prices, and see which really moved yours.
      Information only, not advice. We save your answers in this browser only.
    </p>
  </section>
{/if}

<style>
  .chat { max-width: 680px; }
  .prog { height: 6px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
  .prog > div { height: 100%; background: var(--accent); transition: width 0.35s ease; }
  .count { color: var(--muted); font-size: 0.82rem; margin: 8px 0 18px; }
  .thread { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .row { display: flex; animation: pop 0.25s ease both; }
  .row.me { justify-content: flex-end; }
  .bub { max-width: 88%; padding: 12px 16px; border-radius: 18px; }
  .ai-b { background: var(--surface); border: 1px solid var(--line); border-top-left-radius: 6px; }
  .ai-b small { display: block; color: var(--muted); margin-top: 4px; font-size: 0.85rem; }
  .me-b { background: var(--accent); color: var(--accent-text); font-weight: 600; border-top-right-radius: 6px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin-top: 14px; scroll-margin-bottom: 28px; }
  .chips.left { justify-content: flex-start; margin: 10px 0; }
  .chip { font: inherit; font-weight: 600; font-size: 0.92rem; padding: 10px 16px; border-radius: 999px; background: var(--surface); color: var(--text); border: 1.5px solid var(--accent); cursor: pointer; transition: all 0.15s ease; }
  .chip:hover, .chip.on { background: var(--accent); color: var(--accent-text); }
  .chip:hover { transform: translateY(-1px); }
  .nav { margin-top: 16px; }
  .sm { padding: 7px 14px; font-size: 0.85rem; }
  @keyframes pop { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

  .summary { max-width: 760px; scroll-margin-top: 84px; animation: pop 0.3s ease both; }
  h2 { font-size: 1.6rem; letter-spacing: -0.02em; margin: 0 0 6px; }
  h3 { font-size: 1.1rem; margin: 28px 0 10px; }
  .lead { color: var(--muted); margin: 0 0 14px; }
  .answers { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 16px; }
  .recap { list-style: none; margin: 12px 0 4px; padding: 0; display: grid; gap: 2px; }
  .recap li { display: grid; grid-template-columns: 130px 1fr auto; gap: 10px; align-items: baseline; padding: 6px 0; border-bottom: 1px solid var(--line); font-size: 0.92rem; }
  .recap li:last-child { border-bottom: 0; }
  .rq { color: var(--muted); }
  .ra { font-weight: 600; }
  .link { background: none; border: 0; color: var(--accent); font: inherit; font-weight: 600; cursor: pointer; padding: 4px; }
  .edit { padding: 10px 0 4px; }
  .cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
  .item { padding: 18px; }
  .item p { margin: 8px 0 0; }
  .top { display: flex; gap: 12px; align-items: flex-start; }
  .num { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-weight: 800; }
  .t { display: grid; gap: 6px; }
  .badge { display: inline-block; justify-self: start; font-size: 0.74rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
  .badge.hi { background: var(--good-soft); color: var(--good); }
  .badge.mid { background: var(--warn-soft); color: var(--warn); }
  .badge.lo { background: var(--surface-2); color: var(--muted); }
  .size { font-size: 0.9rem; color: var(--muted); }
  .must { background: var(--accent-soft); color: var(--text); padding: 8px 12px; border-radius: 12px; font-size: 0.88rem; }
  .caut { background: var(--warn-soft); color: var(--text); padding: 8px 12px; border-radius: 12px; font-size: 0.88rem; }
  .small { display: block; margin-top: 6px; }
  details { margin-top: 10px; }
  .answers { margin-top: 0; }
  summary { cursor: pointer; font-weight: 600; font-size: 0.9rem; }
  .basis { color: var(--muted); font-size: 0.88rem; }
  .plain { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
  .plain li { display: grid; gap: 4px; padding-bottom: 14px; border-bottom: 1px solid var(--line); }
  .why { color: var(--muted); font-size: 0.92rem; }
  .check { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
  .actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 28px 0 8px; }
  .fine { color: var(--muted); font-size: 0.85rem; }
  .warn { background: var(--warn-soft); padding: 10px 14px; border-radius: 12px; font-size: 0.88rem; }
  a { color: var(--accent); font-weight: 600; }
  @media (max-width: 520px) { .recap li { grid-template-columns: 1fr auto; } .rq { grid-column: 1 / -1; font-size: 0.8rem; } }
</style>
