// Shared by the static build and serverless checkout. Netlify TOML variables
// are build configuration and must not be assumed to exist in Functions.
export const productionSite = 'https://numvori.com';
export function siteOrigin(env = process.env) {
  if (env.NETLIFY === 'true' && env.CONTEXT === 'production') return productionSite;
  return env.PUBLIC_SITE_URL || (env.NETLIFY === 'true' ? env.URL : undefined);
}
