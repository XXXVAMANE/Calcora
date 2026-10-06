import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, futureValue, convert } from '../src/scripts/math.ts';

test('scientific calculator respects operator precedence and powers',()=>{
  for(const [expression,expected] of [['sqrt(144) + 2^3',20],['2+3*4',14],['(2+3)*4',20],['2^3^2',512],['-2^2',-4],['2^-2',.25],['200*25%',50],['1,5 + 2,5',4],['log(100)+ln(e)',3],['sin(pi/2)',1],['√(144)+2³',20],['1e3 + 1',1001]])assert.ok(Math.abs(evaluate(expression)-expected)<1e-10,expression);
});
test('scientific calculator rejects code, malformed expressions, nonfinite values',()=>{
  for(const expression of ['','1/0','sqrt(-1)','(2+3','2 3','process.exit()','constructor(1)','alert(1)','1;2','2**3','2+','1'.repeat(301)])assert.throws(()=>evaluate(expression),expression);
});
test('finance calculator handles interest, zero rates, and zero duration',()=>{
  const value=futureValue(0,250,5,10);assert.ok(Math.abs(value.total-38820.569861166)<.001);assert.equal(value.contributions,30000);
  assert.deepEqual(futureValue(1000,250,0,10),{total:31000,contributions:31000,growth:0});
  assert.deepEqual(futureValue(1000,250,5,0),{total:1000,contributions:1000,growth:0});
  assert.throws(()=>futureValue(0,10,-1,5));assert.throws(()=>futureValue(0,10,5,1.5));
});
test('unit conversions preserve exact factors and temperature offsets',()=>{
  assert.ok(Math.abs(convert(10,'length','mi','km')-16.09344)<1e-10);
  assert.equal(convert(1000,'weight','g','kg'),1);
  assert.ok(Math.abs(convert(32,'temperature','°F','°C'))<1e-10);
  assert.ok(Math.abs(convert(0,'temperature','°C','K')-273.15)<1e-10);
  assert.equal(convert(10,'length','m','m'),10);
  assert.throws(()=>convert(-1,'temperature','K','°C'));
  assert.throws(()=>convert(1,'length','__proto__','m'));
  assert.throws(()=>convert(Infinity,'length','m','km'));
});
