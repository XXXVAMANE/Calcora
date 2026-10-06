/** Preview deployments must not become competing search results. */
export function canIndex(site: URL | undefined): boolean {
  return Boolean(site && site.hostname !== 'example.com' &&
    !(process.env.NETLIFY === 'true' && process.env.CONTEXT !== 'production'));
}
