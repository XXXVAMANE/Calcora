import { defineConfig } from 'astro/config';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('.env', import.meta.url));
if (existsSync(envFile)) loadEnvFile(envFile);

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://example.com',
  output: 'static',
});
