<script lang="ts">
  const items = [
    { id: 'name', label: 'Name and date of birth', hint: 'Exactly as on your driving licence.' },
    { id: 'licence', label: 'Licence type and years held', hint: 'Check your licence and the DVLA record.' },
    { id: 'value', label: 'Vehicle details and value', hint: 'Use the real make, model, year and a fair value.' },
    { id: 'mods', label: 'Modifications', hint: 'Declare every change, including alloys and tuning.' },
    { id: 'mileage', label: 'Annual mileage', hint: 'Use an honest estimate. Check your last MOT readings.' },
    { id: 'parking', label: 'Where the car is kept overnight', hint: 'Driveway, garage or road, at the real postcode.' },
    { id: 'drivers', label: 'Everyone who drives it', hint: 'List only people who really drive. No fronting.' },
    { id: 'claims', label: 'Claims, accidents and convictions', hint: 'Include all in the last 5 years, even if not your fault.' },
    { id: 'job', label: 'Job title', hint: 'Choose the option that is true for what you do.' },
  ];

  const KEY = 'qg-must-be-true';
  let checked = $state<Record<string, boolean>>({});

  $effect.pre(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) checked = JSON.parse(raw);
    } catch {}
  });

  function toggle(id: string) {
    checked[id] = !checked[id];
    try { localStorage.setItem(KEY, JSON.stringify(checked)); } catch {}
  }

  const done = $derived(items.filter((i) => checked[i.id]).length);
  const pct = $derived(Math.round((done / items.length) * 100));
</script>

<div class="card" style="padding:22px; margin-top:16px;">
  <div class="top">
    <strong>{done} of {items.length} checked</strong>
    <span class="saved">Saved on this device only</span>
  </div>
  <div class="bar" role="progressbar" aria-label="Checklist progress" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
    <div class="fill" style="width:{pct}%"></div>
  </div>
  <ul>
    {#each items as item (item.id)}
      <li>
        <label>
          <input type="checkbox" checked={!!checked[item.id]} onchange={() => toggle(item.id)} />
          <span class="box" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
          <span>
            <strong>{item.label}</strong>
            <small>{item.hint}</small>
          </span>
        </label>
      </li>
    {/each}
  </ul>
  {#if done === items.length}
    <p class="all">All checked. You are ready to buy on true answers.</p>
  {/if}
</div>

<style>
  .top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .saved { color: var(--muted); font-size: 0.82rem; }
  .bar { height: 8px; background: var(--surface-2); border-radius: 999px; overflow: hidden; margin: 12px 0 8px; }
  .fill { height: 100%; background: var(--accent); border-radius: 999px; transition: width 0.35s ease; }
  ul { list-style: none; margin: 0; padding: 0; }
  li + li { border-top: 1px solid var(--line); }
  label { display: grid; grid-template-columns: 24px 1fr; gap: 14px; padding: 14px 4px; cursor: pointer; align-items: start; }
  input { position: absolute; opacity: 0; pointer-events: none; }
  .box { width: 22px; height: 22px; border-radius: 7px; border: 2px solid var(--line); display: grid; place-items: center; color: transparent; transition: all 0.15s ease; margin-top: 2px; }
  input:checked + .box { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
  input:focus-visible + .box { outline: 3px solid var(--accent); outline-offset: 2px; }
  small { display: block; color: var(--muted); font-size: 0.88rem; }
  .all { margin: 12px 0 0; padding: 12px 14px; border-radius: 12px; background: var(--good-soft); color: var(--good); font-weight: 600; }
</style>
