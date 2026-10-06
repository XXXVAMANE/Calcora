import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canIndex } from '../src/utils/seo.ts';

test('only configured production domains can be indexed; Netlify previews remain private to search',()=>{
  const previousNetlify=process.env.NETLIFY,previousContext=process.env.CONTEXT;
  try{
    delete process.env.NETLIFY;delete process.env.CONTEXT;
    assert.equal(canIndex(undefined),false);
    assert.equal(canIndex(new URL('https://example.com')),false);
    assert.equal(canIndex(new URL('https://calcora.test')),true);
    process.env.NETLIFY='true';process.env.CONTEXT='production';
    assert.equal(canIndex(new URL('https://calcora.test')),true);
    process.env.CONTEXT='deploy-preview';
    assert.equal(canIndex(new URL('https://calcora.test')),false);
    process.env.CONTEXT='branch-deploy';
    assert.equal(canIndex(new URL('https://calcora.test')),false);
  }finally{
    if(previousNetlify===undefined)delete process.env.NETLIFY;else process.env.NETLIFY=previousNetlify;
    if(previousContext===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=previousContext;
  }
});
