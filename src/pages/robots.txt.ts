import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) => new Response(site && site.hostname !== 'example.com' ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${new URL('/sitemap.xml',site).href}\n` : 'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
