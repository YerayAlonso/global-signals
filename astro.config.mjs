import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import vercel from '@astrojs/vercel';

export default defineConfig({
  integrations: [preact()],
  adapter: vercel(),
  output: 'static',
  devToolbar: { enabled: false },
});
