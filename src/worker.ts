// One Worker serves the whole site: static pages from ./dist, and the small API under /api.
import { onRequestPost, onRequestDelete } from '../functions/api/report';
import { onRequestGet as findings } from '../functions/api/findings';
import { json, purgeOld } from '../functions/api/_util';

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  TURNSTILE_SECRET?: string; // secret: set in the Cloudflare dashboard, never in the repo
  TURNSTILE_SITEKEY?: string; // public: set in wrangler.toml [vars]
  TURNSTILE_VERIFY_URL?: string; // local testing only (ignored unless the request is to localhost)
}

async function route(request: Request, env: Env, ctx: ExecutionContext, method: string, pathname: string): Promise<Response> {
  const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) } as any;
  if (pathname === '/api/config' && method === 'GET') {
    // The public bot-check key. Sharing stays off until both this and the secret are set.
    return json({ turnstileSiteKey: env.TURNSTILE_SITEKEY || null, ready: !!(env.TURNSTILE_SITEKEY && env.TURNSTILE_SECRET && env.DB) }, 200, { 'cache-control': 'public, max-age=60' });
  }
  if (pathname === '/api/report') {
    if (method === 'POST') return onRequestPost(context);
    if (method === 'DELETE') return onRequestDelete(context);
    return json({ error: 'method not allowed' }, 405, { allow: 'POST, DELETE' });
  }
  if (pathname === '/api/findings') {
    if (method !== 'GET') return json({ error: 'method not allowed' }, 405, { allow: 'GET' });
    return findings(context);
  }
  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    // HEAD (uptime checks, curl -I) behaves like GET without a body.
    const method = request.method === 'HEAD' ? 'GET' : request.method;
    try {
      const res = await route(request, env, ctx, method, pathname);
      return request.method === 'HEAD' ? new Response(null, { status: res.status, headers: res.headers }) : res;
    } catch (e) {
      // Never leak internals. A missing database binding ends up here.
      console.error('api error', e instanceof Error ? e.message : e);
      return json({ error: 'server error' }, 500);
    }
  },

  // Monthly retention job (see [triggers] in wrangler.toml): the privacy notice promises 24 months.
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(purgeOld(env.DB));
  },
};
