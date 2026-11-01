import test from 'node:test';
import assert from 'node:assert/strict';
import {getCalculation,parseUnits} from '../src/core.js';
import {
 MAX_READINGS,MAX_BATCHES,createBatch,isValidBatch,addReading,
 removeLastReading,batchStats,readingIsGood,batchToCSV
} from '../src/batch-core.js';

const initial=()=>createBatch(getCalculation({
 mode:'manual',nominal:'25,000',upper:'+0,050',lower:'0,000',measured:''
}),{id:'lot-001',name:'Партия 42',createdAt:1_700_000_000_000});
const reading=(batch,size,id)=>addReading(batch,parseUnits(size),{id,at:1_700_000_000_000});
test('a batch snapshots the exact tolerance and starts empty',()=>{
 const b=initial();
 assert.equal(b.nominal,25_000_000);
 assert.equal(b.min,25_000_000);
 assert.equal(b.max,25_050_000);
 assert.equal(b.targetHalfUnits,50_050_000);
 assert.equal(b.readings.length,0);
 assert.equal(isValidBatch(b),true);
 assert.deepEqual(batchStats(b),{total:0,good:0,bad:0,min:null,max:null,mean:null,yieldPercent:null});
});
test('inclusive limits and exact results on precision readings',()=>{
 let b=initial();
 for(const [i,size] of ['25,000000','25,050000','25,025001','24,999999','25,050001'].entries()){
  b=reading(b,size,'m-'+i);
 }
 const s=batchStats(b);
 assert.deepEqual([s.total,s.good,s.bad],[5,3,2]);
 assert.equal(s.yieldPercent,60);
 assert.equal(s.min,24_999_999);
 assert.equal(s.max,25_050_001);
 assert.equal(s.mean,25_025_000);
 assert.equal(readingIsGood(b,25_050_000),true);
 assert.equal(readingIsGood(b,25_050_001),false);
 assert.equal(readingIsGood(b,24_999_999),false);
});
test('undo last keeps original and restores statistical totals',()=>{
 const a=initial(),b=reading(a,'25,020','1'),c=reading(b,'26','2');
 const undone=removeLastReading(c);
 assert.equal(c.readings.length,2);
 assert.equal(undone.readings.length,1);
 assert.equal(batchStats(undone).bad,0);
 assert.equal(batchStats(c).bad,1);
});
test('reject invalid, negative and exhausted samples',()=>{
 const b=initial();
 assert.throws(()=>addReading(b,-1,{id:'no'}));
 assert.throws(()=>addReading(b,1.5,{id:'no'}));
 assert.throws(()=>addReading(b,0,{id:''}));
 const invalid={...b,readings:[{id:'x',units:NaN,at:1700000000000}]};
 assert.equal(isValidBatch(invalid),false);
 assert.equal(MAX_BATCHES,20);
 let current=b;
 for(let i=0;i<MAX_READINGS;i++)current=addReading(current,25_000_000,{id:'id'+i,at:1_700_000_000_000+i});
 assert.equal(batchStats(current).total,500);
 assert.throws(()=>addReading(current,25_000_000,{id:'overflow'}),/Лимит партии/);
});
test('CSV contains all readings and protects formula-like names',()=>{
 let b=createBatch(getCalculation({
  mode:'manual',nominal:'25',upper:'0,05',lower:'0',measured:''
 }),{id:'2',name:'=IMPORTDATA("bad")',createdAt:1700000000000});
 b=reading(b,'25,012345','r1');b=reading(b,'25,050001','r2');
 const csv=batchToCSV(b);
 assert.match(csv,/Партия/);
 assert.match(csv,/'=IMPORTDATA/);
 assert.match(csv,/25,012345/);
 assert.match(csv,/25,050001/);
 assert.match(csv,/Годен/);
 assert.match(csv,/Брак/);
 assert.equal(csv.trim().split(/\r\n/).length,8);
});
test('zero tolerance: exact measurement alone is accepted',()=>{
 const c=getCalculation({mode:'manual',nominal:'18',upper:'0',lower:'0',measured:''});
 let b=createBatch(c,{id:'zero',name:'',createdAt:1700000000000});
 b=reading(b,'18','1');b=reading(b,'18,000001','2');
 assert.equal(batchStats(b).good,1);
 assert.equal(batchStats(b).bad,1);
});
