import {getCalculation} from './core.js?v=3.0.0';
import {MAX_BATCHES,MAX_READINGS,isValidBatch} from './batch-core.js?v=3.0.0';

export const BACKUP_APP='precision-gauge-pro';
export const BACKUP_SCHEMA=1;
export const BACKUP_LIMIT=3_000_000;
const fieldNames=['mode','nominal','upper','lower','fit','grade','measured'];

function validateCalculation(entry){
 if(!entry || typeof entry!=='object' || !fieldNames.every(key=>typeof entry[key]==='string'))return false;
 if(!['manual','iso'].includes(entry.mode) || !['H','h'].includes(entry.fit))return false;
 if(!['5','6','7','8','9','10','11','12'].includes(entry.grade))return false;
 try{getCalculation(entry);return true}catch{return false}
}
export function createBackup({inputs,history,theme,batchRecord},timestamp=Date.now()){
 if(!validateCalculation(inputs)||!Array.isArray(history)||history.length>40||
    !history.every(validateCalculation)||!['dark','light','auto'].includes(theme)||
    !validateBatchRecord(batchRecord))throw new Error('Невозможно подготовить архив: данные повреждены');
 return JSON.stringify({application:BACKUP_APP,version:BACKUP_SCHEMA,createdAt:timestamp,
  data:{inputs,history,theme,batches:batchRecord}},null,2);
}
function validateBatchRecord(record){
 return !!record && record.version===1 && Array.isArray(record.batches) &&
  record.batches.length<=MAX_BATCHES && record.batches.every(batch=>isValidBatch(batch)&&batch.readings.length<=MAX_READINGS) &&
  new Set(record.batches.map(batch=>batch.id)).size===record.batches.length &&
  (record.selectedId==='' || record.batches.some(batch=>batch.id===record.selectedId));
}
export function parseBackup(source){
 if(typeof source!=='string'||source.length>BACKUP_LIMIT)throw new Error('Архив слишком большой');
 let payload;try{payload=JSON.parse(source)}catch{throw new Error('Файл не является корректным JSON-архивом')}
 const data=payload?.data;
 if(payload?.application!==BACKUP_APP||payload?.version!==BACKUP_SCHEMA||!data)
  throw new Error('Этот файл не является архивом Precision Gauge Pro');
 if(!validateCalculation(data.inputs)||!Array.isArray(data.history)||data.history.length>40||
    !data.history.every(validateCalculation)||!['dark','light','auto'].includes(data.theme)||
    !validateBatchRecord(data.batches))
  throw new Error('Архив повреждён или содержит недопустимые размеры');
 return data;
}
