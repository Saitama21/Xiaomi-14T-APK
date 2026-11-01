/** Precision Gauge arithmetic: all input dimensions are exact integers in 10⁻⁶ mm. */
export const SCALE = 1_000_000;
export const MAX_NOMINAL_MM = 100_000;
export const ISO_IT = Object.freeze([
  [3,4,6,10,14,25,40,60,100],
  [6,5,8,12,18,30,48,75,120],
  [10,6,9,15,22,36,58,90,150],
  [18,8,11,18,27,43,70,110,180],
  [30,9,13,21,33,52,84,130,210],
  [50,11,16,25,39,62,100,160,250],
  [80,13,19,30,46,74,120,190,300],
  [120,15,22,35,54,87,140,220,350],
  [180,18,25,40,63,100,160,250,400],
  [250,20,29,46,72,115,185,290,460],
  [315,23,32,52,81,130,210,320,520],
  [400,25,36,57,89,140,230,360,570],
  [500,27,40,63,97,155,250,400,630],
]);

export class DimensionError extends Error {}

export function parseUnits(input, label='Размер') {
  const s = String(input ?? '').trim().replace(/[\s\u00a0]/g, '').replace(/[\u2212\u2013\u2014]/g, '-').replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d{0,6})?|\.\d{1,6})$/.test(s)) {
    throw new DimensionError(`${label}: число с точностью до 0,000001 мм.`);
  }
  const sign = s.startsWith('-') ? -1 : 1;
  const unsigned = s.replace(/^[+-]/, '');
  const [whole, fraction=''] = unsigned.split('.');
  const val = sign * (Number(whole||'0') * SCALE + Number(fraction.padEnd(6, '0')||'0'));
  if (!Number.isSafeInteger(val)) throw new DimensionError(`${label}: слишком большое значение.`);
  return Object.is(val,-0) ? 0 : val;
}

export function precisionOf(input) {
  const s=String(input ?? '').replace(',', '.').trim();
  return (s.split('.')[1]||'').length;
}

export function formatHalfUnits(halfUnit, decimals=3) {
  if (!Number.isSafeInteger(halfUnit)) return '—';
  const negative=halfUnit<0;
  const n=Math.abs(halfUnit);
  const major=Math.floor(n / (2*SCALE));
  const fraction=String((n % (2*SCALE)) * 5).padStart(7, '0');
  const p=Math.max(0,Math.min(7,decimals));
  if(p===0) return `${negative?'-':''}${major}`;
  return `${negative?'-':''}${major},${fraction.slice(0,p)}`;
}

export function fmt(units,decimals=3) { return formatHalfUnits(units*2,decimals); }
export function fmtSigned(units, decimals=3) {return (units>0?'+':'')+fmt(units, decimals);}

export function isoDeviations(nominal,field,grade) {
  if (!['H','h'].includes(field) || !Number.isInteger(grade) || grade<5 || grade>12) {
    throw new DimensionError('ISO: поддерживаются H/h и квалитеты IT5–IT12.');
  }
  const row=ISO_IT.find(r=>nominal>0 && nominal<=r[0]*SCALE);
  if (!row) throw new DimensionError('ISO 286: номинал должен быть больше 0 и не больше 500 мм.');
  const it=row[grade-4]*1000; // ISO table micrometres → 10⁻⁶ mm
  return {upper:field==='H'?it:0,lower:field==='h'?-it:0,tolerance:it,rangeUpper:row[0]};
}

export function calculate({nominal,upper,lower,measured=null}) {
  if(!Number.isSafeInteger(nominal)||nominal<=0||nominal>MAX_NOMINAL_MM*SCALE) throw new DimensionError('Номинал: допустимо больше 0 до 100 000 мм.');
  if(!Number.isSafeInteger(upper)||!Number.isSafeInteger(lower)) throw new DimensionError('Укажите корректные отклонения.');
  if(upper<lower)throw new DimensionError('Верхнее отклонение меньше нижнего.');
  const min=nominal+lower,max=nominal+upper,span=max-min;
  if(min<0)throw new DimensionError('Минимальный размер не может быть отрицательным.');
  if(!Number.isSafeInteger(min)||!Number.isSafeInteger(max))throw new DimensionError('Превышена точность расчёта.');
  if(measured!==null && !Number.isSafeInteger(measured))throw new DimensionError('Проверьте фактический замер.');
  const targetHalfUnits=min+max;
  const inTolerance=measured===null?null:(measured>=min && measured<=max);
  const proximity=measured===null?null:(span===0?(inTolerance?0.5:measured<min?0:1):(measured-min)/span);
  const nearLimit=inTolerance && span>0 && (proximity<=0.1 || proximity>=0.9);
  return {nominal,upper,lower,min,max,span,targetHalfUnits,measured,inTolerance,nearLimit,proximity};
}

export function getCalculation(input) {
  const nominal=parseUnits(input.nominal,'Номинал');
  const {upper,lower}=input.mode==='iso'
    ? isoDeviations(nominal,input.fit,Number(input.grade))
    : {upper:parseUnits(input.upper,'Верхнее отклонение'),lower:parseUnits(input.lower,'Нижнее отклонение')};
  const measured=String(input.measured??'').trim()===''?null:parseUnits(input.measured,'Замер');
  const result=calculate({nominal,upper,lower,measured});
  const decimals=Math.min(6,Math.max(3,precisionOf(input.nominal),input.mode==='iso'?3:precisionOf(input.upper),input.mode==='iso'?3:precisionOf(input.lower),precisionOf(input.measured)));
  const targetPrecision=(result.targetHalfUnits%2!==0 && decimals===6)?7:decimals;
  return {...result,decimals,targetPrecision,mode:input.mode,fit:input.fit,grade:Number(input.grade)};
}
