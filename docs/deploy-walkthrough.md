# Deploy walkthrough: GitHub + Cloudflare Pages

Safe order: put the site live first with sharing switched OFF (no Turnstile key, no database).
The explorer, comparer, guide and findings page all work without the server. Turn sharing on later.

## Stage 1. GitHub (about 5 minutes)
The local repo exists on branch `main` with one commit. Secrets are not tracked (`.env`, `.dev.vars` are ignored).

Before the first push, decide:
- **Commit email.** Commits carry `gitty@pymc.co`. On a public repo that email is visible. To hide it, use your GitHub no-reply address: `git config user.email "<id>+<user>@users.noreply.github.com"` (in this repo only), then `git commit --amend --reset-author --no-edit`.
- **Licence.** No licence file yet. Without one, others cannot legally reuse the code. Common choices: MIT (very open), AGPL (keeps forks open). Pick before publishing.
- **Public or private.** Cloudflare Pages works with both. Public builds trust ("check the code"). Do not publish until you are happy to.

Then (Claude can run this once you say yes; it creates a public repo on your account):
```sh
gh repo create quote-guide --public --source . --remote origin --push
```
Turn on 2FA for GitHub. In the repo: Settings, Branches, protect `main`.

## Stage 2. Cloudflare Pages, static site only (about 10 minutes)
You do this in the Cloudflare dashboard (login is yours).
1. Workers & Pages, Create, Pages, **Connect to Git**, pick `quote-guide`.
2. Production branch `main`. Framework preset: **Astro**.
3. Build command `npm run build`. Output directory `dist`.
4. Environment variable `NODE_VERSION` = `22` (Astro 7 needs Node 22.22 or newer; if the build says the version is too old, set `NODE_VERSION` to `22.22.0` or `24`).
5. Save and Deploy. You get `https://quote-guide.pages.dev`.
6. Check every page loads: `/`, `/guide/`, `/explorer/`, `/compare/`, `/findings/`, `/privacy/`.
7. The share panel will say "Sharing is switched off". That is correct for now.

Note: `wrangler.toml` makes Pages read config from the file. If the deploy complains about the D1 placeholder id, remove the `[[d1_databases]]` block until Stage 3, or finish Stage 3 first.

## Stage 3. Turn on sharing (only when ready)
Do this after the rate-limit rule and legal review are done (see `launch-checklist.md`).
1. `npx wrangler login` (opens your browser).
2. `npx wrangler d1 create quote-guide`. Copy the `database_id` into `wrangler.toml`, commit and push.
3. `npx wrangler d1 execute quote-guide --remote --file db/schema.sql`
4. Pages project, Settings, Functions, D1 database bindings: add `DB` = `quote-guide` (production and preview).
5. Turnstile: create the widget (hostnames: your domain and `quote-guide.pages.dev`). Put the **site key** in Pages env var `PUBLIC_TURNSTILE_SITEKEY`. Add the **secret** yourself: `npx wrangler pages secret put TURNSTILE_SECRET --project-name quote-guide` (type it at the prompt; do not paste it into chat or a file).
6. WAF rate-limit rule for `/api/report` (see `cloudflare-setup.md`).
7. Redeploy. Open a **preview** deployment first. Run a test in the explorer, share it, and confirm you get a delete code. Then delete it with the code.
8. Check no IP logging is switched on for `/api/*`.

## Stage 4. Domain
Pages project, Custom domains, add yours. Cloudflare issues HTTPS. Turn on "Always use HTTPS" and HSTS. Add the domain to the Turnstile hostnames.

## Stage 5. Before telling anyone
- Legal review done and the privacy page updated with a contact address.
- Donation link added (home page button currently links to `#`).
- Monthly reminder for `db/purge.sql`.
- Remove the placeholder brand "Quote Guide" if you rename.
