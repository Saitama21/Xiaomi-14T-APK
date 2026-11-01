import {getCalculation,fmt,fmtSigned,formatHalfUnits,DimensionError,precisionOf} from './core.js';
const $=id=>document.getElementById(id);
const KEYS={inputs:'precision-gauge-inputs-v1',history:'precision-gauge-history-v1',theme:'precision-gauge-theme-v1'};
const defaults={mode:'manual',nominal:'25,000',upper:'+0,050',lower:'0,000',fit:'H',grade:'9',measured:''};
let state={...defaults},current=null,activePage='calc',historyPage=0,toastTimeout;
const PAGE_SIZE=4,MAX_HISTORY=40;
const memoryStore=new Map();
const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key));return v??memoryStore.get(key)??fallback}catch{return memoryStore.get(key)??fallback}};
const store=(key,value)=>{memoryStore.set(key,value);try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').hidden=true,2200)}
function restore(){const saved=read(KEYS.inputs,null);if(saved&&typeof saved==='object'){for(const k of Object.keys(defaults))if(typeof saved[k]==='string')state[k]=saved[k]}if(!['manual','iso'].includes(state.mode))state.mode='manual';if(!['H','h'].includes(state.fit))state.fit='H';if(!['5','6','7','8','9','10','11','12'].includes(state.grade))state.grade='9';for(const k of ['nominal','upper','lower','fit','grade','measured'])$(k).value=state[k];const theme=read(KEYS.theme,'dark');document.documentElement.dataset.theme=theme==='light'?'light':'dark';document.querySelector('meta[name=theme-color]').content=theme==='light'?'#f0f4f8':'#090f1a';setMode(state.mode,false)}
function snapshot(){for(const k of ['nominal','upper','lower','fit','grade','measured'])state[k]=$(k).value;store(KEYS.inputs,state)}
function setMode(mode,shouldUpdate=true){state.mode=mode;const manual=mode==='manual';$('manual-fields').hidden=!manual;$('iso-fields').hidden=manual;$('iso-note').hidden=manual;for(const [key,pressed] of [['manual',manual],['iso',!manual]]){$('mode-'+key).classList.toggle('is-active',pressed);$('mode-'+key).setAttribute('aria-pressed',String(pressed))}if(shouldUpdate)update()}
function update(){snapshot();$('clear-measured').hidden=state.measured.trim()==='';try{current=getCalculation(state);const r=current,d=r.decimals;$('calc-error').textContent='';$('target').textContent=formatHalfUnits(r.targetHalfUnits,r.targetPrecision);$('min').textContent=fmt(r.min,d);$('max').textContent=fmt(r.max,d);$('gauge-min').textContent=fmt(r.min,d);$('gauge-max').textContent=fmt(r.max,d);$('save-result').disabled=false;$('copy-result').disabled=false;
 if(state.mode==='iso')$('iso-note').textContent=`ISO ${state.fit}${state.grade} · допуск ${fmt(r.span,d)} мм`;
 const marker=$('gauge-marker'),low=$('gauge-low'),high=$('gauge-high'),gauge=$('tolerance-gauge'),feedback=$('gauge-feedback');
 const status=$('status'),delta=$('delta');status.className='';$('gauge-span').textContent=`ПОЛЕ ${fmt(r.span,d)} мм`;
 gauge.setAttribute('aria-label',`Поле допуска от ${fmt(r.min,d)} до ${fmt(r.max,d)} миллиметров. ${r.measured===null?'Замер не введён':`Фактический размер ${fmt(r.measured,d)} миллиметров, ${r.inTolerance?'в допуске':'вне допуска'}`}`);
 low.hidden=true;high.hidden=true;marker.hidden=true;gauge.dataset.state=r.measured===null?'empty':r.inTolerance?(r.nearLimit?'warning':'good'):'bad';
 if(r.measured===null){status.textContent='ОЖИДАНИЕ';status.classList.add('status-empty');delta.textContent='Введи замер';feedback.textContent='Введи фактический замер для контроля'}
 else {
  if(!r.inTolerance){
   const below=r.measured<r.min;
   low.hidden=!below;high.hidden=below;
   feedback.textContent=below?`Ниже MIN на ${fmt(r.min-r.measured,d)} мм`:`Выше MAX на ${fmt(r.measured-r.max,d)} мм`;
   status.textContent=below?'✕ НИЖЕ МИНИМУМА':'✕ ВЫШЕ МАКСИМУМА';status.classList.add('status-bad');
  }else{
   marker.hidden=false;marker.style.left=`${Math.max(0,Math.min(100,r.proximity*100))}%`;
   marker.style.background=r.nearLimit?'var(--amber)':'var(--ink)';
   if(r.nearLimit){status.textContent='⚠ У ГРАНИЦЫ';status.classList.add('status-warning');feedback.textContent='В допуске, но близко к границе'}
   else{status.textContent='✓ В ДОПУСКЕ';status.classList.add('status-good');feedback.textContent='Фактический размер внутри поля допуска'}
  }
  const doubledDelta=2*r.measured-r.targetHalfUnits;const sign=doubledDelta>0?'+':'';
  delta.textContent=`${sign}${formatHalfUnits(doubledDelta,r.targetPrecision)} мм от цели`;
 }
 }catch(error){current=null;$('calc-error').textContent=error instanceof DimensionError?error.message:'Ошибка ввода размера';for(const id of ['target','min','max','gauge-min','gauge-max'])$(id).textContent='—';$('gauge-span').textContent='ПОЛЕ —';$('gauge-marker').hidden=true;$('gauge-low').hidden=true;$('gauge-high').hidden=true;$('gauge-feedback').textContent='Проверь параметры расчёта';$('tolerance-gauge').dataset.state='error';$('tolerance-gauge').setAttribute('aria-label','Ошибка в параметрах расчёта');$('status').className='status-bad';$('status').textContent='НЕТ РАСЧЁТА';$('delta').textContent='Проверь значения';$('save-result').disabled=true;$('copy-result').disabled=true}}
function switchPage(page){activePage=page;for(const key of ['calc','history','settings']){$('view-'+key).hidden=key!==page;$('tab-'+key).classList.toggle('is-active',key===page);if(key===page)$('tab-'+key).setAttribute('aria-current','page');else $('tab-'+key).removeAttribute('aria-current')}if(page==='history')renderHistory()}
function historyItems(){const data=read(KEYS.history,[]);return Array.isArray(data)?data.filter(x=>x&&typeof x==='object'&&typeof x.nominal==='string').slice(0,MAX_HISTORY):[]}
function save(){if(!current)return;const items=historyItems();items.unshift({mode:state.mode,nominal:state.nominal,upper:state.upper,lower:state.lower,fit:state.fit,grade:state.grade,measured:state.measured,timestamp:Date.now()});store(KEYS.history,items.slice(0,MAX_HISTORY));historyPage=0;toast('Расчёт сохранён на устройстве')}
function loadHistory(item){for(const k of Object.keys(defaults))if(typeof item[k]==='string')state[k]=item[k];for(const k of ['nominal','upper','lower','fit','grade','measured'])$(k).value=state[k];setMode(state.mode);switchPage('calc');toast('Расчёт восстановлен')}
function renderHistory(){const items=historyItems(),pages=Math.max(1,Math.ceil(items.length/PAGE_SIZE));historyPage=Math.max(0,Math.min(historyPage,pages-1));const list=$('history-list');list.replaceChildren();if(items.length===0){const p=document.createElement('p');p.className='empty';p.textContent='Пока нет сохранённых расчётов. Нажми ☆ на экране расчёта.';list.append(p)}for(const item of items.slice(historyPage*PAGE_SIZE,(historyPage+1)*PAGE_SIZE)){const entry=document.createElement('div');entry.className='history-entry';const info=document.createElement('div');const title=document.createElement('strong');const sub=document.createElement('small');try{const r=getCalculation(item);title.textContent=`⌀ ${fmt(r.nominal,r.decimals)}${item.mode==='iso'?' '+item.fit+item.grade:''}`;sub.textContent=`${fmt(r.min,r.decimals)} — ${fmt(r.max,r.decimals)} мм · цель ${formatHalfUnits(r.targetHalfUnits,r.targetPrecision)}`}catch{continue}info.append(title,sub);const btn=document.createElement('button');btn.type='button';btn.textContent='Открыть';btn.addEventListener('click',()=>loadHistory(item));entry.append(info,btn);list.append(entry)}$('history-page').textContent=`${historyPage+1} / ${pages}`;$('history-prev').disabled=historyPage<=0;$('history-next').disabled=historyPage>=pages-1}
function report(){const r=current;if(!r)return '';const d=r.decimals;return `⌀ ${fmt(r.nominal,d)} мм${state.mode==='iso'?' '+state.fit+state.grade:''}\nВерхнее отклонение: ${fmtSigned(r.upper,d)} мм\nНижнее отклонение: ${fmtSigned(r.lower,d)} мм\nМинимум: ${fmt(r.min,d)} мм\nМаксимум: ${fmt(r.max,d)} мм\nЦентр допуска: ${formatHalfUnits(r.targetHalfUnits,r.targetPrecision)} мм\nШирина допуска: ${fmt(r.span,d)} мм${r.measured!==null?'\nЗамер: '+fmt(r.measured,d)+' мм — '+(r.inTolerance?'В ДОПУСКЕ':'ВНЕ ДОПУСКА'):''}`}
async function copy(){if(!current)return;const text=report();try{await navigator.clipboard.writeText(text);toast('Расчёт скопирован')}catch{const area=document.createElement('textarea');area.value=text;area.style.position='absolute';area.style.left='-9999px';document.body.appendChild(area);area.select();let ok=false;try{ok=document.execCommand('copy')}catch{}area.remove();toast(ok?'Расчёт скопирован':'Не удалось скопировать расчёт')}}
function toggleTheme(){const next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;document.querySelector('meta[name=theme-color]').content=next==='light'?'#f0f4f8':'#090f1a';store(KEYS.theme,next)}
function toggleDeviationSign(id){
 const input=$(id),value=input.value.trim().replace(/[−–—]/g,'-');
 if(!value){input.value='-0'}else if(value.startsWith('-')){input.value='+'+value.slice(1)}else{input.value='-'+value.replace(/^\+/,'')}
 update();input.focus();
}
function clearMeasurement(){ $('measured').value='';update();$('measured').focus() }
const ENTER_ORDER=['nominal','upper','lower','measured'];
for(let i=0;i<ENTER_ORDER.length;i++){
 $(ENTER_ORDER[i]).addEventListener('keydown',event=>{
  if(event.key!=='Enter')return;
  event.preventDefault();const next=$(ENTER_ORDER[i+1]);
  if(next && !next.closest('[hidden]')){next.focus();next.select()}else{$(ENTER_ORDER[i]).blur()}
 });
}
$('upper-sign').addEventListener('click',()=>toggleDeviationSign('upper'));
$('lower-sign').addEventListener('click',()=>toggleDeviationSign('lower'));
$('clear-measured').addEventListener('click',clearMeasurement);
restore();update();
for(const k of ['nominal','upper','lower','fit','grade','measured'])$(k).addEventListener(k==='fit'||k==='grade'?'change':'input',update);
$('mode-manual').addEventListener('click',()=>setMode('manual'));$('mode-iso').addEventListener('click',()=>setMode('iso'));
for(const page of ['calc','history','settings'])$('tab-'+page).addEventListener('click',()=>switchPage(page));
$('save-result').addEventListener('click',save);$('copy-result').addEventListener('click',copy);$('theme-toggle').addEventListener('click',toggleTheme);$('theme-setting').addEventListener('click',toggleTheme);
$('clear-history').addEventListener('click',()=>{if(historyItems().length===0)return;if(window.confirm('Очистить все сохранённые расчёты на этом устройстве?')){store(KEYS.history,[]);historyPage=0;renderHistory();toast('История очищена')}});
$('history-prev').addEventListener('click',()=>{historyPage--;renderHistory()});$('history-next').addEventListener('click',()=>{historyPage++;renderHistory()});
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}))}
