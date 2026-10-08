import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createExplainer } from './lib/explain.mjs';
import { createCheckout } from './lib/checkout.mjs';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, 'dist');
const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.woff':'font/woff','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json' };

const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};

export function createApp() {
  const explain = createExplainer();
  const checkout = createCheckout();
  let authOrigin = '';
  try {
    const authUrl = new URL(process.env.PUBLIC_SUPABASE_URL || '');
    if(authUrl.protocol === 'https:' && authUrl.hostname.endsWith('.supabase.co')) authOrigin = ' ' + authUrl.origin;
  } catch {}

  const server = createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'${authOrigin}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`);
    let pathname;
    try {pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);} catch{return json(res,400,{error:'Invalid URL'});}
    if(pathname==='/api/explain' || pathname==='/api/checkout'){
      const request = new Request(new URL(req.url, 'http://localhost:' + (process.env.PORT || 4321)), {
        method: req.method, headers: req.headers,
        ...(!['GET', 'HEAD'].includes(req.method) ? { body: Readable.toWeb(req), duplex: 'half' } : {}),
      });
      const response = await (pathname === '/api/checkout' ? checkout : explain)(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
      return;
    }
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Method not allowed'});
    if(pathname.startsWith('/api/'))return json(res,404,{error:'Not found'});
    let target=resolve(dist,'.'+pathname);
    if(!target.startsWith(dist+'/') && target!==dist)return json(res,403,{error:'Forbidden'});
    let status=200;
    try{
      if((await stat(target)).isDirectory()){
        if(!pathname.endsWith('/')){res.writeHead(308,{Location:pathname+'/'});res.end();return;}
        target=resolve(target,'index.html');
      }
      const bytes=await readFile(target);
      res.writeHead(status,{'Content-Type':mime[extname(target)]||'application/octet-stream','Cache-Control':pathname.startsWith('/_astro/')?'public, max-age=31536000, immutable':'public, max-age=60'});
      res.end(req.method==='HEAD'?undefined:bytes);
    }catch{
      try{const bytes=await readFile(resolve(dist,pathname.startsWith('/ru/')?'ru/404/index.html':'404.html'));res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?undefined:bytes);}catch{json(res,404,{error:'Build the site with npm run build first'});}
    }
  });
  server.requestTimeout=15000;
  return server;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))createApp().listen(Number(process.env.PORT||4321),'0.0.0.0',()=>console.log(`Numvori server started on port ${process.env.PORT||4321}`));
