// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// Static output. Cloudflare Pages serves ./dist and runs ./functions later.
export default defineConfig({
  integrations: [svelte()],
  vite: { plugins: [tailwindcss()] },
});
