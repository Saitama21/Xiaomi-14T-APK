import {formatHalfUnits,fmt} from './core.js?v=3.0.0';

/** Exact presentation of doubled integer micrometre units, never rounds away a nonzero deviation. */
export function exactHalfUnits(halfUnits,minimumDigits=3){
 const raw=formatHalfUnits(halfUnits,7);
 if(raw==='—')return raw;
 const [whole,fraction='']=raw.split(',');
 let trim=fraction;
 const min=Math.max(0,Math.min(7,minimumDigits));
 while(trim.length>min && trim.endsWith('0'))trim=trim.slice(0,-1);
 return trim.length?`${whole},${trim}`:whole;
}
export function signedExactHalfUnits(halfUnits,minimumDigits=3){
 const formatted=exactHalfUnits(halfUnits,minimumDigits);
 return (halfUnits>0?'+':'')+formatted;
}
export function displayUnits(units,minimumDigits=3){
 return exactHalfUnits(units*2,minimumDigits);
}
export function batchPreview(batch){
 const min=fmt(batch.min,6),max=fmt(batch.max,6);
 return `MIN ${min} / MAX ${max} мм`;
}
