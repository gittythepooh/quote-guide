import { validateReport } from '../../src/lib/report-schema';
import { json, readJson, sameOrigin, sha256Hex, underCap, verifyTurnstile, weekStart } from './_util';

interface Env {
  DB: D1Database;
  TURNSTILE_SECRET?: string; // set with: npx wrangler pages secret put TURNSTILE_SECRET
  TURNSTILE_VERIFY_URL?: string; // local testing only (a mock). Leave unset in production.
}

function newCode() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase().match(/.{1,6}/g)!.join('-');
}

// POST /api/report -> store a banded report, return a one-time delete code.
// Put a Cloudflare rate-limit rule and Turnstile in front of this route before launch.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  if (!env.TURNSTILE_SECRET) return json({ error: 'sharing is not configured' }, 503); // fail closed
  const body = await readJson(request);
  if (!body.ok) return body.res;
  const { token, report: raw } = (body.body ?? {}) as { token?: unknown; report?: unknown };
  const v = validateReport(raw); // cheap checks first
  if (!v.ok) return json({ error: v.error }, 400);
  if (!(await verifyTurnstile(token, env.TURNSTILE_SECRET, env.TURNSTILE_VERIFY_URL))) return json({ error: 'bot check failed' }, 403);
  if (!(await underCap(env.DB))) return json({ error: 'too many reports right now, try later' }, 429, { 'retry-after': '3600' });
  const { report } = v;

  const code = newCode();
  const codeHash = await sha256Hex(code);
  const week = weekStart(); // week only. No day, no time, no IP.
  const p = report.profile;

  const stmt = env.DB.prepare(
    `INSERT INTO results (code_hash, week, age_band, region, car_age, ncd, cover, site, change_key, pct, repeats, noise_pct, baseline_runs)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
  );
  await env.DB.batch(
    report.results.map((r) =>
      stmt.bind(codeHash, week, p.ageBand, p.region, p.carAge, p.ncd, p.cover, p.site, r.change, r.pct, r.repeats, report.noisePct, report.baselineRuns),
    ),
  );
  return json({ ok: true, code, rows: report.results.length });
};

// DELETE /api/report  body: {"code":"XXXXXX-XXXXXX-XXXXXX-XXXXXX" } -> delete the contributor's own rows.
// The code travels in the body, not the URL, so it does not end up in access logs.
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const body = await readJson(request, 512);
  if (!body.ok) return body.res;
  const code = String((body.body as any)?.code ?? '').trim().toUpperCase();
  if (!/^[0-9A-F]{6}(-[0-9A-F]{6}){3}$/.test(code)) return json({ error: 'bad code' }, 400);
  const res = await env.DB.prepare('DELETE FROM results WHERE code_hash = ?1').bind(await sha256Hex(code)).run();
  return json({ ok: true, deleted: res.meta.changes ?? 0 });
};
