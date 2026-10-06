import { defineConfig } from 'astro/config';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('.env', import.meta.url));
if (existsSync(envFile)) loadEnvFile(envFile);

// Netlify's URL follows the primary production domain, including project renames.
const deploymentSite = process.env.NETLIFY === 'true' ? process.env.URL : undefined;

export default defineConfig({
  site: deploymentSite || process.env.PUBLIC_SITE_URL || 'https://example.com',
  output: 'static',
});
