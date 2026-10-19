<script lang="ts">
  import { tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { STEPS, advise, CLAIM_PCT, MUST_BE_TRUE, BAND_HIGH, BAND_MEDIUM, type Answers, type Community, type Item } from '../lib/advisor';

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

  // The explorer builds the test plan itself from these answers, so there is nothing to copy across.
  function openPlan() {
    location.href = '/explorer/';
  }

  const calm = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slide = (y: number, delay = 0) => ({ y: calm ? 0 : y, duration: calm ? 0 : 320, delay: calm ? 0 : delay });

  // Count the score up from 0 when a card appears.
  function countUp(node: HTMLElement, to: number) {
    if (calm) return;
    const t0 = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const k = Math.min(1, (now - t0) / 800);
      node.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    });
    return { destroy: () => cancelAnimationFrame(raf) };
  }

  // Number keys pick an answer.
  function onKey(e: KeyboardEvent) {
    if (!current || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    const i = Number(e.key) - 1;
    if (Number.isInteger(i) && i >= 0 && i < current.options.length) { e.preventDefault(); pick(current.options[i].value); }
  }

  const tone = (l: Item['band']) => (l === 'High' ? 'hi' : l === 'Medium' ? 'mid' : 'lo');
</script>

<svelte:window onkeydown={onKey} />

<header class="intro">
  {#if !done}
    <span class="pill">Guided check · about 2 minutes</span>
    <h1>What is worth testing for you?</h1>
    <p>Answer a few quick questions. You get a short list of what to try first, how well each fits you, and what must stay true when you buy.</p>
    {#if answered.length > 0}
      <p class="saved">Continuing where you left off on this device. <button class="link" type="button" onclick={restart}>Start again</button></p>
    {/if}
  {:else}
    <span class="pill">Your result</span>
    <h1>Your test priorities</h1>
    <p>Based on your answers. Change any answer below and the list updates.</p>
    <p class="saved">Saved on this device only. Using a shared computer? <button class="link" type="button" onclick={restart}>Clear my answers</button></p>
  {/if}
</header>

{#if !done}
  <div class="chat">
    <div class="prog" role="progressbar" aria-label="Question progress" aria-valuemin="0" aria-valuemax={STEPS.length} aria-valuenow={answered.length}>
      <div style="width:{(answered.length / STEPS.length) * 100}%"></div>
    </div>
    <p class="count">Question {answered.length + 1} of {STEPS.length}</p>

    <ol class="thread" aria-live="polite">
      {#each answered as s (s.id)}
        <li class="row ai"><div class="bub ai-b">{s.question}</div></li>
        <li class="row me" in:fly={slide(10)}><div class="bub me-b">{labelFor(s.id, answers[s.id] as string)}</div></li>
      {/each}
      {#if current}
        <li class="row ai" in:fly={slide(14, 120)}>
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
      <p class="keyhint">Tip: press 1 to {current.options.length} on your keyboard to answer.</p>
    {/if}

    {#if answered.length > 0}
      <div class="nav"><button class="btn btn-ghost sm" type="button" onclick={back}>← Back</button></div>
    {/if}
  </div>
{:else}
  <section class="summary" aria-labelledby="sum-h" bind:this={sumEl}>
    <h2 id="sum-h" class="sr">In priority order</h2>
    <div class="topcta">
      <div><strong>{[...start, ...also].filter((i) => i.testLabel).length} tests to run, in this order</strong><span>Plus a few free tips. About 20 to 30 minutes in all. You can stop and come back any time.</span></div>
      <button class="btn btn-primary" type="button" onclick={openPlan}>Open my test plan →</button>
    </div>
    <p class="lead">
      General information for profiles like yours, from broad answers and limited data. Each item has a <strong>FOG score</strong> and the list is in score order. Each item is something to <strong>test</strong> with honest options. It is not a recommendation to you.
      {#if claimPct !== null}Your claim feeling is treated as about {claimPct}% for the excess advice.{/if}
    </p>

    <details class="scoreinfo">
      <summary>How the FOG score works</summary>
      <div class="si">
        <p><strong>FOG score = Fit × Outcome × Grounding</strong>, each as a percentage, giving 0 to 100. It shows how much a change is likely to matter for profiles like yours, based on limited data.</p>
        <ul>
          <li><strong>F is for Fit:</strong> how well the change matches your answers (for example, a black box suits young drivers most).</li>
          <li><strong>O is for Outcome:</strong> how much the change moved prices in our tests (40% or more counts as the maximum). Where nothing is measured yet, the outcome is an assumption and says so.</li>
          <li><strong>G is for Grounding:</strong> how solid the evidence is. A small early test counts for less than community reports.</li>
        </ul>
        <p>Because the three are multiplied, a weak one pulls the score down. <strong>High</strong> is {BAND_HIGH} or more, <strong>Medium</strong> is {BAND_MEDIUM} to {BAND_HIGH - 1}, <strong>Low</strong> is under {BAND_MEDIUM}. The score will change as community data arrives. It is a general indicator, not a promise or a recommendation. <a href="/guide/#score">Read more in the guide</a>.</p>
      </div>
    </details>

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

    {#snippet itemCard(it: Item, n: number)}
      <li class="card item" class:lowtier={it.group === 'skip'} in:fly={slide(18, Math.min(n, 8) * 70)}>
        <div class="top">
          <span class="num">{n}</span>
          <div class="t">
            <strong>{it.title}</strong>
            <span class="badge {tone(it.band)}" title="The FOG score: effect x fit x evidence. A general indicator, not a promise or a recommendation.">FOG score <span use:countUp={Math.round(it.score)}>{Math.round(it.score)}</span> · {it.band}</span>
          </div>
        </div>
        <p>{it.why}</p>
        <p class="size"><b>Size:</b> {it.size}</p>
        {#if it.mustBeTrue}<p class="must">✓ {it.mustBeTrue}</p>{/if}
        {#if it.caution}<p class="caut">⚠ {it.caution}</p>{/if}
        <details>
          <summary>How this score was worked out</summary>
          <div class="parts" aria-label="Score breakdown">
            <div><span>Fit</span><i><b style="width:{it.fit}%"></b></i><em>{it.fit}</em></div>
            <div><span>Outcome</span><i><b style="width:{it.effect}%"></b></i><em>{it.effect}</em></div>
            <div><span>Grounding</span><i><b style="width:{it.evidence}%"></b></i><em>{it.evidence}</em></div>
          </div>
          <p class="basis">{it.fit}% × {it.effect} × {it.evidence}% = <strong>{it.score.toFixed(1)}</strong>. {it.basis}</p>
        </details>
      </li>
    {/snippet}

    <h3>Start here <span class="tierhint">High · {BAND_HIGH}+</span></h3>
    <ol class="cards">
      {#each start as it, n (it.id)}{@render itemCard(it, n + 1)}{/each}
    </ol>

    {#if also.length}
      <h3>Also worth testing <span class="tierhint">Medium · {BAND_MEDIUM} to {BAND_HIGH - 1}</span></h3>
      <ol class="cards">
        {#each also as it, n (it.id)}{@render itemCard(it, start.length + n + 1)}{/each}
      </ol>
    {/if}

    {#if skip.length}
      <h3>Low priority <span class="tierhint">Low · under {BAND_MEDIUM}</span> <span class="opt">optional</span></h3>
      <p class="lowhint">These fit you less, or rarely moved quotes in our data. Try them if you have time.</p>
      <ol class="cards">
        {#each skip as it, n (it.id)}{@render itemCard(it, start.length + also.length + n + 1)}{/each}
      </ol>
    {/if}

    <h3>Before you buy, these must be true</h3>
    <ul class="check">{#each MUST_BE_TRUE as m}<li>{m}</li>{/each}</ul>

    <div class="actions">
      <button class="btn btn-primary" type="button" onclick={openPlan}>Open my test plan →</button>
      <button class="btn btn-ghost" type="button" onclick={restart}>Start over</button>
    </div>
    {#if msg}<p class="warn" role="alert">{msg}</p>{/if}
    <p class="fine">
      The <a href="/explorer/">test plan</a> lists these changes in this order, tells you exactly what to change on a comparison site, and shows which really moved your price.
      Information only, not advice or a recommendation. Fog Off is not authorised by the FCA and does not sell or arrange insurance. We save your answers in this browser only. See the <a href="/terms/">terms</a>.
    </p>
  </section>
{/if}

<style>
  .intro { margin: 0 0 22px; }
  .intro h1 { font-size: clamp(2rem, 5vw, 3rem); letter-spacing: -0.03em; line-height: 1.1; margin: 16px 0 10px; }
  .intro p { color: var(--muted); max-width: 60ch; margin: 0; }
  .intro .saved { margin-top: 10px; font-size: 0.86rem; }
  .intro .link { background: none; border: 0; padding: 0; color: var(--accent); font: inherit; font-weight: 600; cursor: pointer; text-decoration: underline; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .topcta { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; background: var(--accent-soft); border-radius: 16px; padding: 16px 18px; margin: 0 0 16px; }
  .topcta div { display: grid; gap: 2px; }
  .topcta span { color: var(--muted); font-size: 0.88rem; }
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
  .keyhint { margin: 10px 2px 0; font-size: 0.8rem; color: var(--muted); }
  .scoreinfo { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 12px 16px; margin: 0 0 12px; }
  .si { font-size: 0.9rem; color: var(--muted); display: grid; gap: 8px; margin-top: 10px; }
  .si p { margin: 0; } .si ul { margin: 0; padding-left: 18px; display: grid; gap: 4px; } .si strong { color: var(--text); }
  .parts { display: grid; gap: 6px; margin: 10px 0 6px; }
  .parts div { display: grid; grid-template-columns: 70px 1fr 34px; gap: 8px; align-items: center; font-size: 0.8rem; color: var(--muted); }
  .parts i { height: 8px; background: var(--surface-2); border-radius: 999px; overflow: hidden; display: block; }
  .parts b { display: block; height: 100%; background: var(--accent); border-radius: 999px; }
  .parts em { font-style: normal; text-align: right; font-variant-numeric: tabular-nums; }
  .tierhint { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--accent); background: var(--accent-soft); border-radius: 999px; padding: 2px 9px; vertical-align: 2px; margin-left: 6px; }
  .opt { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); background: var(--surface-2); border-radius: 999px; padding: 2px 9px; vertical-align: 2px; margin-left: 6px; }
  .lowhint { color: var(--muted); font-size: 0.88rem; margin: -4px 0 10px; }
  .lowtier { border-style: dashed; } /* a cue that does not lower text contrast (opacity would) */
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
  .why { color: var(--muted); font-size: 0.92rem; }
  .check { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
  .actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 28px 0 8px; }
  .fine { color: var(--muted); font-size: 0.85rem; }
  .warn { background: var(--warn-soft); padding: 10px 14px; border-radius: 12px; font-size: 0.88rem; }
  a { color: var(--accent); font-weight: 600; }
  @media (max-width: 520px) { .recap li { grid-template-columns: 1fr auto; } .rq { grid-column: 1 / -1; font-size: 0.8rem; } }
</style>
