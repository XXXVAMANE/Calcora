import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCheckout } from '../lib/checkout.mjs';
import handler, { config } from '../netlify/functions/checkout.mjs';
const env = { STRIPE_SECRET_KEY: 'sk_test_fake', PUBLIC_SITE_URL: 'https://calcora-ai.netlify.app' };
const data = { items: [{ slug: 'casio-fx-300es-plus', quantity: 2, price: 0 }], locale: 'en', attempt: '11111111-1111-4111-8111-111111111111' };
const req = (body=data, headers={}) => new Request(env.PUBLIC_SITE_URL+'/api/checkout', {method:'POST',headers:{'content-type':'application/json',origin:env.PUBLIC_SITE_URL,...headers},body:JSON.stringify(body)});
test('checkout is callable on Netlify; missing keys, live keys and previews do not contact Stripe', async()=>{
 assert.equal(config.path,'/api/checkout'); assert.equal(typeof handler,'function');
 for(const settings of [{}, {...env,STRIPE_SECRET_KEY:'sk_live_fake'}, {...env,NETLIFY:'true',CONTEXT:'deploy-preview'}]) {
  assert.equal((await createCheckout({env:settings,fetchProvider:()=>{throw Error('No calls allowed')}})(req())).status,503);
 }
});
test('Stripe checkout uses server prices, USD, US shipping and localized fixed return URLs',async()=>{
 for(const locale of ['en','ru']) {
  const checkout=createCheckout({env,fetchProvider:async(url,options)=>{
   assert.equal(url,'https://api.stripe.com/v1/checkout/sessions');assert.equal(options.headers.Authorization,'Bearer sk_test_fake');
   const form=new URLSearchParams(options.body);assert.equal(form.get('line_items[0][price_data][unit_amount]'),'2499');
   assert.equal(form.get('line_items[0][quantity]'),'2');assert.equal(form.get('line_items[0][price_data][currency]'),'usd');
   assert.equal(form.get('shipping_address_collection[allowed_countries][0]'),'US');assert.equal(form.get('payment_method_types[0]'),'card');
   assert.equal(form.get('shipping_options[0][shipping_rate_data][fixed_amount][currency]'),'usd');
   assert.equal(form.get('success_url'),env.PUBLIC_SITE_URL+(locale==='ru'?'/ru':'')+'/checkout/success/?session_id={CHECKOUT_SESSION_ID}');
   assert.equal(options.headers['Idempotency-Key'],'calcora-'+data.attempt);
   return Response.json({livemode:false,id:'cs_test_example',url:'https://checkout.stripe.com/c/pay/cs_test_example'});
  }});
  const result=await checkout(req({...data,locale,success_url:'https://attacker.invalid'}));assert.equal(result.status,200);assert.equal((await result.json()).test,true);
 }
});
test('invalid carts, duplicates, concepts, quantities, origins and oversized requests are rejected',async()=>{
 const checkout=createCheckout({env,fetchProvider:()=>{throw Error('Unexpected call')}});
 for(const body of [null,{...data,items:[]},{...data,items:[{slug:'calcora-ai-one',quantity:1}]},{...data,items:[{slug:'__proto__',quantity:1}]},{...data,items:[{slug:['casio-fx-300es-plus'],quantity:1}]},...[-1,0,21,1.5,'2'].map(quantity=>({...data,items:[{slug:'casio-fx-300es-plus',quantity}]})),{...data,items:[...data.items,...data.items]},{...data,attempt:'bad'},{...data,locale:'xx'}]) assert.equal((await checkout(req(body))).status,400);
 assert.equal((await checkout(req(data,{origin:'https://attacker.invalid'}))).status,403);
 assert.equal((await checkout(req({...data,padding:'x'.repeat(5000)}))).status,413);
 assert.equal((await checkout(new Request(env.PUBLIC_SITE_URL+'/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:'{bad'}))).status,400);
});
test('confirmation trusts Stripe paid/complete state, never the return URL; no buyer details are exposed',async()=>{
 for (const payment_status of ['paid','unpaid']) {
  const checkout=createCheckout({env,fetchProvider:async()=>Response.json({livemode:false,metadata:{store:'calcora-demo'},status:'complete',payment_status,currency:'usd',amount_total:4998,customer_details:{email:'private@example.com'},shipping_details:{address:'private'}})});
  const r=await checkout(new Request(env.PUBLIC_SITE_URL+'/api/checkout?session_id=cs_test_example&paid=true'));assert.equal(r.status,200);
  const body=await r.json();assert.equal(body.paid,payment_status==='paid');assert.equal(body.amount,4998);assert.equal(JSON.stringify(body).includes('private'),false);
 }
});
test('foreign/live sessions, unexpected redirects and provider failures are never accepted or leaked',async()=>{
 const get=new Request(env.PUBLIC_SITE_URL+'/api/checkout?session_id=cs_test_example');
 for(const session of [{livemode:true,metadata:{store:'calcora-demo'},currency:'usd'},{livemode:false,metadata:{store:'other'},currency:'usd'},{livemode:false,metadata:{store:'calcora-demo'},currency:'eur'}]) assert.equal((await createCheckout({env,fetchProvider:async()=>Response.json(session)})(get)).status,404);
 const bad=createCheckout({env,fetchProvider:async()=>Response.json({livemode:false,id:'cs_test_example',url:'https://attacker.invalid'})});assert.equal((await bad(req())).status,502);
 const fail=createCheckout({env,fetchProvider:async()=>{throw Error('sk_test_fake sensitive upstream details')}});const r=await fail(req());assert.equal(r.status,502);assert.equal((await r.text()).includes('sensitive'),false);
 assert.equal((await fail(new Request(env.PUBLIC_SITE_URL+'/api/checkout?session_id=cs_live_foo'))).status,400);
});
