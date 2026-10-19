// Shared helpers for the API. Files starting with "_" are not routed by Pages Functions.

export const SEC_HEADERS = {
  'content-type': 'application/json',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cross-origin-resource-policy': 'same-origin',
};

export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...SEC_HEADERS, 'cache-control': 'no-store', ...extra } });

/** Browsers always send Origin on cross-site POST/DELETE. Reject any that is not this site. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // non-browser client: cannot be stopped by this check
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** Read a JSON body with a hard size cap, even when there is no content-length header. */
export async function readJson(request: Request, maxBytes = 8_000): Promise<{ ok: true; body: unknown } | { ok: false; res: Response }> {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return { ok: false, res: json({ error: 'content-type must be application/json' }, 415) };
  }
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, res: json({ error: 'empty body' }, 400) };
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return { ok: false, res: json({ error: 'too large' }, 413) };
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(buf)) };
  } catch {
    return { ok: false, res: json({ error: 'bad json' }, 400) };
  }
}

/** Monday of the current ISO week (UTC), YYYY-MM-DD. Coarser than a day, so harder to link a report to a person. */
export function weekStart(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}

/** Verify a Cloudflare Turnstile token. The visitor's IP is deliberately NOT sent. */
export async function verifyTurnstile(token: unknown, secret: string, verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'): Promise<boolean> {
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  try {
    const r = await fetch(verifyUrl, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(5000), // never hang a request on the bot-check service
    });
    const d = (await r.json()) as { success?: boolean };
    return d.success === true;
  } catch {
    return false; // fail closed
  }
}

/**
 * Circuit breaker against floods. Counts accepted reports per hour and per day in D1.
 * It is not per person (no IP is kept). It caps how much a flood can add before it is stopped.
 */
export async function underCap(db: D1Database, perHour = 60, perDay = 400): Promise<boolean> {
  const now = new Date().toISOString();
  const hour = 'h:' + now.slice(0, 13);
  const day = 'd:' + now.slice(0, 10);
  const bump = (b: string) =>
    db.prepare('INSERT INTO limits (bucket, n) VALUES (?1, 1) ON CONFLICT(bucket) DO UPDATE SET n = n + 1 RETURNING n').bind(b);
  const [h, d] = await db.batch<{ n: number }>([bump(hour), bump(day)]);
  return (h.results?.[0]?.n ?? 0) <= perHour && (d.results?.[0]?.n ?? 0) <= perDay;
}

export async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
