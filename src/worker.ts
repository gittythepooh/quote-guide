// One Worker serves the whole site: static pages from ./dist, and the small API under /api.
import { onRequestPost, onRequestDelete } from '../functions/api/report';
import { onRequestGet as findings } from '../functions/api/findings';
import { json } from '../functions/api/_util';

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  TURNSTILE_SECRET?: string; // secret: set in the Cloudflare dashboard, never in the repo
  TURNSTILE_SITEKEY?: string; // public: set in wrangler.toml [vars]
  TURNSTILE_VERIFY_URL?: string; // local testing only
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) } as any;
    try {
      if (pathname === '/api/config' && request.method === 'GET') {
        // The public bot-check key. Sharing stays off until both this and the secret are set.
        return json({ turnstileSiteKey: env.TURNSTILE_SITEKEY || null, ready: !!(env.TURNSTILE_SITEKEY && env.TURNSTILE_SECRET && env.DB) }, 200, { 'cache-control': 'public, max-age=60' });
      }
      if (pathname === '/api/report') {
        if (request.method === 'POST') return await onRequestPost(context);
        if (request.method === 'DELETE') return await onRequestDelete(context);
        return json({ error: 'method not allowed' }, 405, { allow: 'POST, DELETE' });
      }
      if (pathname === '/api/findings') {
        if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405, { allow: 'GET' });
        return await findings(context);
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      // Never leak internals. A missing database binding ends up here.
      console.error('api error', e instanceof Error ? e.message : e);
      return json({ error: 'server error' }, 500);
    }
  },
};
