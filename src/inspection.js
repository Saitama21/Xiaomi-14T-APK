/**
 * Precision Gauge inspection helpers.
 * All engineering dimensions remain integer micro-millimetres (10⁻⁶ mm).
 * Display decisions only: never change nominal, limits or pass/fail semantics.
 */
export function gaugeVisualState(calculation){
 const {min,max,measured,span,inTolerance}=calculation;
 if(measured===null)return {kind:'empty',percent:null,low:null,high:null,margin:null};
 if(!Number.isSafeInteger(measured)||!Number.isSafeInteger(min)||!Number.isSafeInteger(max)||min>max)throw new Error('Invalid gauge data');
 const low=measured-min,high=max-measured;
 const percent=span===0?50:Math.max(0,Math.min(100,100*(measured-min)/span));
 const margin=Math.min(low,high);
 const near=!!inTolerance && span>0 && margin*10<=span;
 return {kind:inTolerance?(near?'warning':'good'):'bad',
  percent,low,high,margin,below:measured<min};
}

export function inspectReading(batch,reading){
 if(!reading)return null;
 const {units}=reading;
 if(!Number.isSafeInteger(units))throw new Error('Invalid reading');
 const low=units-batch.min,high=batch.max-units;
 const inTolerance=low>=0 && high>=0;
 const margin=Math.min(low,high);
 const span=batch.max-batch.min;
 return {
  units,inTolerance,low,high,margin,
  nearLimit:inTolerance && span>0 && margin*10<=span,
  deltaHalfUnits:2*units-batch.targetHalfUnits
 };
}

/** Report only an observed monotonic trend; this is NOT a wear forecast. */
export function recentTrend(batch){
 const tail=batch.readings.slice(-5).map(r=>r.units);
 if(tail.length<5)return {kind:'insufficient',message:'Для тенденции нужно 5 замеров'};
 const differences=tail.slice(1).map((n,i)=>n-tail[i]);
 const rising=differences.every(d=>d>=0) && differences.some(d=>d>0);
 const falling=differences.every(d=>d<=0) && differences.some(d=>d<0);
 if(rising)return {kind:'rising',message:'Последние 5: размер увеличивается'};
 if(falling)return {kind:'falling',message:'Последние 5: размер уменьшается'};
 if(differences.every(d=>d===0))return {kind:'flat',message:'Последние 5: одинаковый размер'};
 return {kind:'mixed',message:'Последние 5: без устойчивого направления'};
}
