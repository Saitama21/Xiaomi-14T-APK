import test from 'node:test';
import assert from 'node:assert/strict';
import {getCalculation,parseUnits} from '../src/core.js';
import {exactHalfUnits,signedExactHalfUnits} from '../src/display.js';
import {createBackup,parseBackup} from '../src/backup.js';
import {createBatch,addReading} from '../src/batch-core.js';

const inputs={mode:'iso',nominal:'12',upper:'+0,050',lower:'0,000',fit:'h',grade:'6',measured:'11,994'};
const calc=getCalculation(inputs);
const batch=createBatch(calc,{id:'safe',name:'Full Pro',createdAt:1700000000000});
const archiveRecord={version:1,batches:[addReading(batch,parseUnits('11,994'),{id:'r1',at:1700000001000})],selectedId:'safe'};
test('h6 target includes exact half-micrometre and negative delta',()=>{
 assert.equal(exactHalfUnits(calc.targetHalfUnits),'11,9945');
 assert.equal(signedExactHalfUnits(2*calc.measured-calc.targetHalfUnits),'-0,0005');
 assert.equal(signedExactHalfUnits(0),'0,000');
 assert.equal(signedExactHalfUnits(1000),'+0,0005');
});
test('round-trip archive preserves measurements, theme and half-precision',()=>{
 const json=createBackup({inputs,history:[{...inputs,timestamp:1700000000000}],theme:'dark',batchRecord:archiveRecord});
 const data=parseBackup(json);
 assert.deepEqual(data.batches,archiveRecord);
 assert.equal(data.theme,'dark');
 assert.equal(data.inputs.nominal,'12');
 assert.equal(data.history.length,1);
});
test('backup rejects accidental file, corrupted records and unknown version',()=>{
 assert.throws(()=>parseBackup('{}'),/не является архивом/);
 const valid=JSON.parse(createBackup({inputs,history:[],theme:'auto',batchRecord:archiveRecord}));
 valid.version=8;
 assert.throws(()=>parseBackup(JSON.stringify(valid)));
 valid.version=1;valid.data.batches.batches[0].readings[0].units=NaN;
 assert.throws(()=>parseBackup(JSON.stringify(valid)),/повреждён/);
});
test('archive is bounded, validates user dimensions and duplicate ids',()=>{
 const valid=JSON.parse(createBackup({inputs,history:[],theme:'light',batchRecord:archiveRecord}));
 valid.data.inputs.nominal='нет';
 assert.throws(()=>parseBackup(JSON.stringify(valid)),/повреждён/);
 valid.data.inputs.nominal='12';
 valid.data.batches.batches=[valid.data.batches.batches[0],valid.data.batches.batches[0]];
 assert.throws(()=>parseBackup(JSON.stringify(valid)),/повреждён/);
});
