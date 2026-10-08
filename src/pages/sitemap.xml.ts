import type { APIRoute } from 'astro';
import { tools } from '../data/i18n';
import { products } from '../data/shop';
import { guides } from '../data/guides';
import { canIndex } from '../utils/seo';
export const GET: APIRoute = ({ site }) => {
  const paths = ['/', '/privacy/', '/scientific-calculators/', '/guides/', ...guides.map(guide=>`/guides/${guide.slug}/`), ...products.map(product=>`/products/${product.slug}/`), ...tools.map(tool=>`/calculators/${tool.slug}/`)];
  const production = canIndex(site);
  const urls = production ? paths.flatMap(path=>[path,'/ru'+path]).map(path=>`<url><loc>${new URL(path,site).href.replace(/&/g,'&amp;')}</loc></url>`).join('') : '';
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
};
