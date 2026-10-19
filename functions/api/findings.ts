import { CHANGES, MIN_GROUP, type ChangeKey } from '../../src/lib/report-schema';
import { SEC_HEADERS } from './_util';

interface Env {
  DB: D1Database;
}

type Row = { change_key: string; pct: number; noise_pct: number };

const TTL = 3600; // seconds. Also limits how fast one new report can shift a published figure.

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const r1 = (n: number) => Math.round(n * 10) / 10;

// GET /api/findings -> aggregates only. A change is published only once it has MIN_GROUP reports.
// Raw rows are never returned. The result is cached so page views do not read the whole table.
export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const cache = (caches as any).default as Cache;
  const key = new Request(new URL('/api/findings', request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;

  const since = new Date(Date.now() - 730 * 86400_000).toISOString().slice(0, 10);
  const { results } = await env.DB.prepare('SELECT change_key, pct, noise_pct FROM results WHERE week >= ?1 LIMIT 200000')
    .bind(since)
    .all<Row>();

  const groups = new Map<string, Row[]>();
  for (const r of results ?? []) {
    if (!(r.change_key in CHANGES)) continue;
    if (!groups.has(r.change_key)) groups.set(r.change_key, []);
    groups.get(r.change_key)!.push(r);
  }

  const out = [...groups.entries()].map(([k, rows]) => {
    const n = rows.length;
    const published = n >= MIN_GROUP;
    const sorted = rows.map((r) => r.pct).sort((a, b) => a - b);
    return {
      change: k as ChangeKey,
      n,
      published,
      medianPct: published ? r1(quantile(sorted, 0.5)) : null,
      p25: published ? r1(quantile(sorted, 0.25)) : null,
      p75: published ? r1(quantile(sorted, 0.75)) : null,
      medianNoise: published ? r1(quantile(rows.map((r) => r.noise_pct).sort((a, b) => a - b), 0.5)) : null,
    };
  });

  const res = new Response(JSON.stringify({ min: MIN_GROUP, findings: out }), {
    headers: { ...SEC_HEADERS, 'cache-control': `public, max-age=${TTL}` },
  });
  waitUntil(cache.put(key, res.clone()));
  return res;
};
