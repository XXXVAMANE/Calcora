import { defineConfig } from 'astro/config';
import { siteOrigin } from './lib/site.mjs';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('.env', import.meta.url));
if (existsSync(envFile)) loadEnvFile(envFile);

export default defineConfig({
  site: siteOrigin() || 'https://example.com',
  output: 'static',
  vite: { build: { assetsInlineLimit: 0 } },
});
