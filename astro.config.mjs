import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  integrations: [preact()],
  adapter: cloudflare({ imageService: 'passthrough' }),
  output: 'static',
  session: false,
  devToolbar: { enabled: false },
});
