import type { APIRoute } from 'astro';
import { canIndex } from '../utils/seo';
export const GET: APIRoute = ({ site }) => new Response(canIndex(site) ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${new URL('/sitemap.xml',site).href}\n` : 'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
