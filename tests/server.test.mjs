import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';

test('AI endpoint reports missing configuration without pretending to generate an answer',async()=>{
  const previous=process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const app=createApp();await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${app.address().port}`;
  try{
    const response=await fetch(url+'/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expression:'2+2=4',locale:'en'})});
    assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'AI_NOT_CONFIGURED'});
    assert.equal((await fetch(url+'/api/explain')).status,405);
    assert.equal((await fetch(url+'/api/missing')).status,404);
  }finally{app.closeAllConnections();await new Promise(resolve=>app.close(resolve));if(previous!==undefined)process.env.OPENAI_API_KEY=previous;}
});
