import {fmt,formatHalfUnits} from './core.js';

export const MAX_BATCHES=20;
export const MAX_READINGS=500;

const isUnits=n=>Number.isSafeInteger(n) && n>=0;
const isTimestamp=n=>Number.isSafeInteger(n) && n>0;

export function createBatch(calculation,{id,name,createdAt=Date.now()}){
 if(!calculation || !isUnits(calculation.nominal) || !isUnits(calculation.min) ||
    !isUnits(calculation.max) || calculation.min>calculation.max ||
    !Number.isSafeInteger(calculation.targetHalfUnits) ||
    !id || typeof id!=='string' || !isTimestamp(createdAt)){
  throw new Error('Некорректные данные партии');
 }
 return {
  id:id.slice(0,96),
  name:(String(name||'').trim().slice(0,48)||'Новая партия'),
  createdAt,
  nominal:calculation.nominal,
  min:calculation.min,
  max:calculation.max,
  targetHalfUnits:calculation.targetHalfUnits,
  readings:[]
 };
}

export function isValidBatch(batch){
 return !!batch && typeof batch==='object' && typeof batch.id==='string' &&
  batch.id.length>0 && batch.id.length<=96 && typeof batch.name==='string' &&
  batch.name.length<=48 && isTimestamp(batch.createdAt) &&
  isUnits(batch.nominal) && batch.nominal>0 && isUnits(batch.min) &&
  isUnits(batch.max) && batch.min<=batch.max &&
  Number.isSafeInteger(batch.targetHalfUnits) &&
  batch.targetHalfUnits===batch.min+batch.max &&
  Array.isArray(batch.readings) && batch.readings.length<=MAX_READINGS &&
  batch.readings.every(r=>r && typeof r.id==='string' && r.id.length>0 &&
   isUnits(r.units) && isTimestamp(r.at));
}

export function addReading(batch,units,{id,at=Date.now()}){
 if(!isValidBatch(batch))throw new Error('Некорректная партия');
 if(!isUnits(units))throw new Error('Замер не может быть отрицательным');
 if(batch.readings.length>=MAX_READINGS)throw new Error('Лимит партии: 500 замеров');
 if(!id || typeof id!=='string')throw new Error('Некорректный идентификатор');
 return {...batch,readings:[...batch.readings,{id:id.slice(0,96),units,at}]};
}

export function removeLastReading(batch){
 if(!isValidBatch(batch))throw new Error('Некорректная партия');
 return {...batch,readings:batch.readings.slice(0,-1)};
}

export function readingIsGood(batch,units){
 return units>=batch.min && units<=batch.max;
}

export function batchStats(batch){
 if(!isValidBatch(batch))throw new Error('Некорректная партия');
 const total=batch.readings.length;
 let good=0,min=null,max=null,sum=0n;
 for(const {units} of batch.readings){
  if(readingIsGood(batch,units))good++;
  min=min===null?units:Math.min(min,units);
  max=max===null?units:Math.max(max,units);
  sum+=BigInt(units);
 }
 return {total,good,bad:total-good,min,max,
  mean:total?Number((sum+BigInt(Math.floor(total/2)))/BigInt(total)):null,
  yieldPercent:total?Math.round(1000*good/total)/10:null};
}

const csvCell=value=>{
 const s=String(value);
 // Protect spreadsheet programs from interpreting user-controlled strings as formulas.
 const safe=/^[=+@\-\t\r]/.test(s)?'\''+s:s;
 return '"'+safe.replaceAll('"','""')+'"';
};

export function batchToCSV(batch){
 if(!isValidBatch(batch))throw new Error('Некорректная партия');
 const rows=[
  ['Партия',batch.name],
  ['Номинал, мм',fmt(batch.nominal,6)],
  ['MIN, мм',fmt(batch.min,6)],
  ['MAX, мм',fmt(batch.max,6)],
  [],
  ['№','Время','Замер, мм','Отклонение от цели, мм','Статус']
 ];
 batch.readings.forEach((r,index)=>{
  const delta=formatHalfUnits(2*r.units-batch.targetHalfUnits,7);
  rows.push([index+1,new Date(r.at).toLocaleString('ru-RU'),fmt(r.units,6),
   delta,readingIsGood(batch,r.units)?'Годен':'Брак']);
 });
 return rows.map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n';
}
