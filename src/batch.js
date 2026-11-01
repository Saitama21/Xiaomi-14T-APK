import {parseUnits,fmt,formatHalfUnits} from './core.js';
import {
 MAX_BATCHES,MAX_READINGS,createBatch,isValidBatch,addReading,
 removeLastReading,batchStats,readingIsGood,batchToCSV
} from './batch-core.js';
import {inspectReading,recentTrend} from './inspection.js';

const $=id=>document.getElementById(id);
const STORAGE_KEY='precision-gauge-batches-v1';
const SVG='http://www.w3.org/2000/svg';
let batches=[],selectedId='',creationVisible=false,selectedReadingId='';
let getCalculation,notify;

const currentBatch=()=>batches.find(b=>b.id===selectedId)||null;
const id=()=>typeof crypto!=='undefined' && crypto.randomUUID
 ? crypto.randomUUID()
 : Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const text=(element,value)=>{element.textContent=String(value)};
const mm=units=>fmt(units,6).replace(/(,\d{3})0+$/,'$1');

function load(){
 try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
  if(!saved || saved.version!==1 || !Array.isArray(saved.batches))return;
  batches=saved.batches.filter(isValidBatch).slice(0,MAX_BATCHES);
  selectedId=batches.some(b=>b.id===saved.selectedId)?saved.selectedId:(batches.at(-1)?.id||'');
 }catch{notify('Не удалось прочитать локальный журнал партий')}
}
function commit(nextBatches,nextSelected){
 try{
  localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,batches:nextBatches,selectedId:nextSelected}));
 }catch{
  notify('Сохранение недоступно. Проверь свободную память устройства');
  return false;
 }
 batches=nextBatches;selectedId=nextSelected;
 return true;
}
function svg(tag,attributes={}){
 const element=document.createElementNS(SVG,tag);
 for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));
 return element;
}
function renderInspector(batch){
 const selected=batch.readings.find(r=>r.id===selectedReadingId)||batch.readings.at(-1);
 const label=$('batch-inspector-label'),value=$('batch-inspector-value'),detail=$('batch-inspector-detail'),state=$('batch-inspector-state');
 $('batch-trend-note').textContent=recentTrend(batch).message;
 if(!selected){
  selectedReadingId='';label.textContent='ПОСЛЕДНИЙ ЗАМЕР';value.textContent='—';
  detail.textContent='Коснись точки графика';state.textContent='Нет данных';state.className='batch-inspector-state';
  return;
 }
 selectedReadingId=selected.id;
 const position=batch.readings.indexOf(selected)+1;
 const result=inspectReading(batch,selected);
 label.textContent=`ЗАМЕР #${position} · ИЗ ${batch.readings.length}`;
 value.textContent=`${fmt(selected.units,6)} мм`;
 detail.textContent=`${result.deltaHalfUnits>0?'+':''}${formatHalfUnits(result.deltaHalfUnits,7)} мм от цели`;
 state.className='batch-inspector-state '+(result.inTolerance?(result.nearLimit?'edge':'pass'):'reject');
 state.textContent=result.inTolerance?(result.nearLimit?'⚠ У ГРАНИЦЫ':'✓ ГОДЕН'):(result.low<0?'✕ НИЖЕ MIN':'✕ ВЫШЕ MAX');
}
function selectReading(batch,readingId){
 if(!batch.readings.some(r=>r.id===readingId))return;
 selectedReadingId=readingId;
 renderInspector(batch);drawChart(batch);
}
function drawChart(batch){
 const chart=$('batch-chart');
 chart.replaceChildren();
 const subset=batch.readings.slice(-24);
 if(!subset.length){
  chart.append(svg('line',{x1:12,y1:48,x2:308,y2:48,stroke:'var(--line)','stroke-width':1,'stroke-dasharray':'4 4'}));
  chart.append(svg('text',{x:160,y:42,'text-anchor':'middle',fill:'var(--muted)','font-size':11}));
  chart.lastChild.textContent='Начни измерения';
  chart.setAttribute('aria-label','График пуст: замеры ещё не записаны');
  return;
 }
 const left=12,right=308,top=8,bottom=85;
 let lo=Math.min(batch.min,...subset.map(r=>r.units));
 let hi=Math.max(batch.max,...subset.map(r=>r.units));
 // Zero-tolerance ranges still display a meaningful centre line.
 if(hi===lo){lo-=1;hi+=1}
 const pad=Math.max(1,(hi-lo)*0.1);lo-=pad;hi+=pad;
 const x=i=>left+(right-left)*(subset.length===1?0.5:i/(subset.length-1));
 const y=v=>bottom-(v-lo)/(hi-lo)*(bottom-top);
 const band=svg('rect',{x:left,y:y(batch.max),width:right-left,
  height:Math.max(.7,y(batch.min)-y(batch.max)),fill:'var(--mint)',opacity:.10,rx:2});
 chart.append(band);
 for(const [units,colour,dashed] of [[batch.min,'var(--blue)','3 3'],[batch.max,'var(--blue)','3 3'],[batch.targetHalfUnits/2,'var(--mint)','2 5']]){
  chart.append(svg('line',{x1:left,y1:y(units),x2:right,y2:y(units),
   stroke:colour,'stroke-width':1,'stroke-dasharray':dashed,opacity:.7}));
 }
 const points=subset.map((r,i)=>[x(i),y(r.units)]);
 if(points.length>1){
  chart.append(svg('polyline',{points:points.map(p=>p.join(',')).join(' '),
   fill:'none',stroke:'var(--ink)','stroke-width':1.65,'stroke-linejoin':'round','stroke-linecap':'round'}));
 }
 for(let i=0;i<points.length;i++){
  const reading=subset[i],good=readingIsGood(batch,reading.units);
  const selected=reading.id===selectedReadingId;
  const group=svg('g',{'class':'batch-chart-point'+(selected?' selected':''),
   'data-reading-id':reading.id,role:'button',tabindex:'0',
   'aria-label':`Замер №${batch.readings.length-subset.length+i+1}: ${fmt(reading.units,6)} мм, ${good?'годен':'брак'}`});
  const halo=svg('circle',{cx:points[i][0],cy:points[i][1],r:selected?8:6.5,
   fill:'none',stroke:selected?'var(--ink)':'transparent','stroke-width':1.5,'pointer-events':'none'});
  const dot=svg('circle',{cx:points[i][0],cy:points[i][1],r:selected?4.5:good?3.5:4,
   fill:good?'var(--mint)':'var(--red)',stroke:'var(--surface)','stroke-width':1.5,'pointer-events':'none'});
  const hit=svg('circle',{cx:points[i][0],cy:points[i][1],r:12,fill:'transparent'});
  group.append(halo,dot,hit);chart.append(group);
 }
 chart.setAttribute('aria-label',`Последние ${subset.length} измерений; выбери точку для просмотра размера и статуса`);
}
function renderRecent(batch){
 const list=$('batch-readings');list.replaceChildren();
 const recent=batch.readings.slice(-4).reverse();
 if(!recent.length){
  const p=document.createElement('p');p.className='batch-reading-empty';
  p.textContent='Измерений ещё нет';list.append(p);return;
 }
 recent.forEach((r,i)=>{
  const good=readingIsGood(batch,r.units),line=document.createElement('div');
  line.className='batch-reading';const num=document.createElement('span');
  num.textContent='#'+(batch.readings.length-i);
  const value=document.createElement('strong');value.textContent=mm(r.units)+' мм';
  const state=document.createElement('span');state.className=good?'batch-pass':'batch-reject';
  state.textContent=good?'✓ Годен':'✕ Брак';
  line.append(num,value,state);list.append(line);
 });
}
function render(){
 const picker=$('batch-picker'),batch=currentBatch();
 picker.replaceChildren();
 if(!batches.length){
  const option=document.createElement('option');option.value='';option.textContent='Нет партий';picker.append(option);
  picker.disabled=true;
 }else{
  picker.disabled=false;
  for(const item of batches){
   const option=document.createElement('option');option.value=item.id;
   option.textContent=item.name;picker.append(option);
  }
  picker.value=selectedId;
 }
 $('batch-creation').hidden=!creationVisible;
 $('batch-empty').hidden=!!batch||creationVisible;
 $('batch-workspace').hidden=!batch;
 const calc=getCalculation();
 $('batch-calculation-preview').textContent=calc
  ?`⌀ ${mm(calc.nominal)} · MIN ${mm(calc.min)} · MAX ${mm(calc.max)}`
  :'Нужен корректный размер на вкладке «Расчёт»';
 $('batch-create').disabled=!calc || batches.length>=MAX_BATCHES;
 $('batch-new').disabled=batches.length>=MAX_BATCHES && !creationVisible;
 if(!batch){selectedReadingId='';$('batch-trend-note').textContent='Для тенденции нужно 5 замеров';return}
 text($('batch-nominal'),mm(batch.nominal));
 text($('batch-min'),mm(batch.min));
 text($('batch-max'),mm(batch.max));
 const stats=batchStats(batch);
 text($('batch-count'),stats.total);text($('batch-good'),stats.good);text($('batch-bad'),stats.bad);
 text($('batch-yield'),stats.total?`Годных ${stats.yieldPercent}%`:'Нет измерений');
 text($('batch-observed-min'),stats.min===null?'Факт MIN —':`Факт MIN ${mm(stats.min)}`);
 text($('batch-observed-mean'),stats.mean===null?'Среднее —':`Среднее ${fmt(stats.mean,6)}`);
 text($('batch-observed-max'),stats.max===null?'Факт MAX —':`Факт MAX ${mm(stats.max)}`);
 $('batch-add').disabled=stats.total>=MAX_READINGS;
 $('batch-undo').disabled=stats.total===0;
 $('batch-export').disabled=stats.total===0;
 $('batch-error').textContent=stats.total>=MAX_READINGS?'Партия заполнена. Экспортируй CSV или создай новую.':'';
 renderInspector(batch);drawChart(batch);renderRecent(batch);
}
function showCreation(){
 creationVisible=!creationVisible;
 $('batch-name').value='';
 render();
 if(creationVisible)$('batch-name').focus();
}
function startBatch(){
 const calc=getCalculation();
 if(!calc){notify('Сначала задай корректный размер в «Расчёт»');return}
 if(batches.length>=MAX_BATCHES){notify('Лимит 20 партий. Экспортируй и удали старые');return}
 const name=$('batch-name').value.trim()||`Партия ${String(batches.length+1).padStart(2,'0')} · ⌀${mm(calc.nominal)}`;
 const next=createBatch(calc,{id:id(),name});
 if(!commit([...batches,next],next.id))return;
 creationVisible=false;selectedReadingId='';$('batch-measurement').value='';render();
 notify('Партия создана · допуск зафиксирован');$('batch-measurement').focus();
}
function record(){
 const batch=currentBatch();if(!batch)return;
 const field=$('batch-measurement');
 let units;
 try{units=parseUnits(field.value,'Замер');if(units<0)throw new Error('Размер не может быть отрицательным')}
 catch(error){$('batch-error').textContent=error.message||'Некорректный замер';field.focus();return}
 try{
  const next=addReading(batch,units,{id:id()});
  if(!commit(batches.map(b=>b.id===next.id?next:b),selectedId))return;
  field.value='';selectedReadingId=next.readings.at(-1).id;render();notify(readingIsGood(batch,units)?'✓ Замер в допуске':'✕ Замер вне допуска');
  field.focus();
 }catch(error){$('batch-error').textContent=error.message}
}
function undo(){
 const batch=currentBatch();if(!batch?.readings.length)return;
 const next=removeLastReading(batch);
 if(commit(batches.map(b=>b.id===batch.id?next:b),selectedId)){
  if(selectedReadingId===batch.readings.at(-1).id)selectedReadingId='';render();notify('Последний замер удалён');
 }
}
function deleteBatch(){
 const batch=currentBatch();if(!batch)return;
 if(!confirm(`Удалить «${batch.name}» и все ${batch.readings.length} замеров? Это нельзя отменить.`))return;
 const others=batches.filter(b=>b.id!==batch.id);
 if(commit(others,others.at(-1)?.id||'')){selectedReadingId='';render();notify('Партия удалена')}
}
function exportCSV(){
 const batch=currentBatch();if(!batch)return;
 const filename=`precision-gauge-${new Date(batch.createdAt).toISOString().slice(0,10)}-${batch.id.slice(0,8)}.csv`;
 const content='\uFEFF'+batchToCSV(batch);
 const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=filename;
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
 notify('CSV подготовлен для сохранения');
}
export function initBatch({getCurrent,toast}){
 getCalculation=getCurrent;notify=toast;
 load();
 $('batch-new').addEventListener('click',showCreation);
 $('batch-first').addEventListener('click',showCreation);
 $('batch-create').addEventListener('click',startBatch);
 $('batch-name').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();startBatch()}});
 $('batch-picker').addEventListener('change',e=>{
  if(commit(batches,e.target.value)){selectedReadingId='';$('batch-measurement').value='';render()}
 });
 $('batch-add').addEventListener('click',record);
 $('batch-measurement').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();record()}});
 $('batch-measurement').addEventListener('input',()=>{$('batch-error').textContent=''});
 $('batch-chart').addEventListener('click',event=>{
  const node=event.target.closest?.('[data-reading-id]');
  if(node)selectReading(currentBatch(),node.dataset.readingId);
 });
 $('batch-chart').addEventListener('keydown',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;
  const node=event.target.closest?.('[data-reading-id]');
  if(!node)return;
  event.preventDefault();
  const id=node.dataset.readingId;
  selectReading(currentBatch(),id);
  $('batch-chart').querySelectorAll('[data-reading-id]').forEach(point=>{
   if(point.dataset.readingId===id)point.focus();
  });
 });
 $('batch-undo').addEventListener('click',undo);
 $('batch-delete').addEventListener('click',deleteBatch);
 $('batch-export').addEventListener('click',exportCSV);
 render();
}
export function refreshBatch(){render()}
