import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUnits,isoDeviations,calculate,getCalculation,fmt,formatHalfUnits,DimensionError} from '../src/core.js';
const u=parseUnits;
test('locale plus/minus and exact six digits',()=>{
  assert.equal(u('+0,050'),50000);assert.equal(u('−0.062'),-62000);
  assert.equal(u('34,938001'),34938001);assert.equal(u('  - 0,1  '),-100000);
  assert.throws(()=>u('0,1234567'),DimensionError);
  assert.throws(()=>u('1,2,3'),DimensionError);
  assert.throws(()=>u('NaN'),DimensionError);
});
test('original drawing Ø25 +0.05/0',()=>{
  const a=getCalculation({mode:'manual',nominal:'25',upper:'+0,05',lower:'0',measured:'25,032'});
  assert.equal(fmt(a.min),'25,000');assert.equal(fmt(a.max),'25,050');
  assert.equal(formatHalfUnits(a.targetHalfUnits),'25,025');assert.equal(a.inTolerance,true);
});
test('original drawing Ø35 0/-0.062',()=>{
 const a=getCalculation({mode:'manual',nominal:'35',upper:'0',lower:'-0,062',measured:'34,937'});
 assert.equal(fmt(a.min),'34,938');assert.equal(fmt(a.max),'35,000');
 assert.equal(formatHalfUnits(a.targetHalfUnits),'34,969');assert.equal(a.inTolerance,false);
});
test('ISO H9/h9 correctly uses nominal diameter steps',()=>{
 const h=isoDeviations(u('25'),'H',9);assert.equal(h.upper,52000);assert.equal(h.lower,0);
 const shaft=isoDeviations(u('35'),'h',9);assert.equal(shaft.upper,0);assert.equal(shaft.lower,-62000);
 const boundary=isoDeviations(u('30'),'H',9);assert.equal(boundary.upper,52000);
 assert.equal(isoDeviations(u('30,000001'),'H',9).upper,62000);
 assert.throws(()=>isoDeviations(u('501'),'H',9),DimensionError);
});
test('inclusive limits, sign patterns, zero tolerance, near-edge',()=>{
 const base={nominal:u('20'),lower:u('-0.02'),upper:u('+0.04')};
 assert.equal(calculate({...base,measured:u('19.98')}).inTolerance,true);
 assert.equal(calculate({...base,measured:u('20.04')}).inTolerance,true);
 assert.equal(calculate({...base,measured:u('19.979999')}).inTolerance,false);
 assert.equal(calculate({...base,measured:u('20.035')}).nearLimit,true);
 assert.equal(calculate({nominal:u('20'),lower:0,upper:0,measured:u('20')}).inTolerance,true);
 assert.throws(()=>calculate({nominal:u('10'),lower:u('.02'),upper:u('.01')}),DimensionError);
 assert.throws(()=>calculate({nominal:u('10'),lower:u('-11'),upper:0}),DimensionError);
});
test('midpoint can be half a nanometre without rounding loss',()=>{
 const a=getCalculation({mode:'manual',nominal:'10',lower:'0',upper:'+0,000001',measured:''});
 assert.equal(a.targetPrecision,7);
 assert.equal(formatHalfUnits(a.targetHalfUnits,7),'10,0000005');
});
