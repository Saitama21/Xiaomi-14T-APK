import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,parseUnits} from '../src/core.js';
import {gaugeVisualState,inspectReading,recentTrend} from '../src/inspection.js';

const p=s=>parseUnits(s);
const sample=(s)=>calculate({nominal:p('25'),lower:p('0'),upper:p('0,05'),measured:s===null?null:p(s)});
const batch=values=>({min:p('25'),max:p('25,05'),targetHalfUnits:p('25')+p('25,05'),readings:values.map((v,i)=>({id:'t'+i,units:p(v),at:1000+i}))});

test('gauge: waiting, centre, and exact inclusive limits',()=>{
 assert.deepEqual(gaugeVisualState(sample(null)),{kind:'empty',percent:null,low:null,high:null,margin:null});
 const centre=gaugeVisualState(sample('25,025'));
 assert.equal(centre.kind,'good');assert.equal(centre.percent,50);
 assert.equal(centre.low,p('0,025'));assert.equal(centre.high,p('0,025'));
 assert.equal(gaugeVisualState(sample('25')).kind,'warning');
 assert.equal(gaugeVisualState(sample('25,05')).kind,'warning');
 assert.equal(gaugeVisualState(sample('25,005')).kind,'warning');
 assert.equal(gaugeVisualState(sample('25,045')).kind,'warning');
});
test('gauge: out-of-range measurements stay labelled bad without negative progress',()=>{
 const below=gaugeVisualState(sample('24,999999'));
 const above=gaugeVisualState(sample('25,050001'));
 assert.equal(below.kind,'bad');assert.equal(below.below,true);assert.equal(below.percent,0);
 assert.equal(above.kind,'bad');assert.equal(above.below,false);assert.equal(above.percent,100);
 assert.equal(below.low,-1);assert.equal(above.high,-1);
});
test('zero-tolerance gauge shows a valid centre for exact size',()=>{
 const exact=calculate({nominal:p('18'),lower:0,upper:0,measured:p('18')});
 assert.equal(gaugeVisualState(exact).percent,50);
 assert.equal(gaugeVisualState(exact).kind,'good');
});
test('selected inspection preserves exact seventh-place midpoint delta',()=>{
 const b=batch(['25,000001']);
 b.targetHalfUnits=p('25,000001')+p('25,000002');
 const d=inspectReading(b,b.readings[0]);
 assert.equal(d.deltaHalfUnits,-1);
 assert.equal(d.inTolerance,true);
});
test('batch inspection distinguishes good, near-limit and reject',()=>{
 const b=batch(['25,025','25,001','25,051']);
 assert.equal(inspectReading(b,b.readings[0]).inTolerance,true);
 assert.equal(inspectReading(b,b.readings[0]).nearLimit,false);
 assert.equal(inspectReading(b,b.readings[1]).nearLimit,true);
 assert.equal(inspectReading(b,b.readings[2]).inTolerance,false);
 assert.equal(inspectReading(b,b.readings[2]).high,-p('0,001'));
});
test('five-point trends report only observed monotonic behaviour',()=>{
 assert.equal(recentTrend(batch(['25','25,01'])).kind,'insufficient');
 assert.equal(recentTrend(batch(['25','25,01','25,02','25,03','25,04'])).kind,'rising');
 assert.equal(recentTrend(batch(['25,04','25,03','25,02','25,01','25'])).kind,'falling');
 assert.equal(recentTrend(batch(['25','25','25','25','25'])).kind,'flat');
 assert.equal(recentTrend(batch(['25','25,01','25,005','25,02','25,015'])).kind,'mixed');
});
