import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('interactive gauge and input controls have unique DOM ids',()=>{
 const ids=['nominal','upper','lower','measured','upper-sign','lower-sign','clear-measured',
  'tolerance-gauge','gauge-marker','gauge-low','gauge-high','gauge-span','gauge-feedback','status'];
 for(const id of ids){
  const occurrences=html.match(new RegExp('\\bid="'+id+'"','g'))||[];
  assert.equal(occurrences.length,1,`Expected one #${id}`);
 }
});

test('fresh users do not get a fabricated accepted measurement',()=>{
 assert.match(app,/grade:'9',measured:''/);
 assert.match(html,/<input id="measured"[^>]+placeholder="Введите размер"/);
 assert.doesNotMatch(html,/<input id="measured"[^>]+value=/);
});

test('out-of-range measurement has dedicated left and right indicators',()=>{
 assert.match(app,/low\.hidden=!below;high\.hidden=below;/);
 assert.match(app,/Ниже MIN на/);
 assert.match(app,/Выше MAX на/);
 assert.match(app,/r\.measured<r\.min/);
 assert.match(app,/r\.measured-r\.max/);
 assert.match(html,/id="gauge-low" hidden/);
 assert.match(html,/id="gauge-high" hidden/);
});

test('dock remains fixed to the browser-independent body layout',()=>{
 assert.match(html,/<\/main>\s*<nav class="dock"/);
 assert.match(css,/\.dock\{position:fixed;left:50%;transform:translateX\(-50%\);bottom:2px;width:87%;height:68px;/);
 assert.doesNotMatch(css,/\.dock\{[^}]+(?:visualViewport|innerHeight|safe-area-inset-bottom)/);
});

test('small phones and reduced-motion settings are supported',()=>{
 assert.match(css,/@media\(max-width:400px\)/);
 assert.match(css,/\.measure-card\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('offline install caches a complete revisioned dependency graph',()=>{
 for(const path of ['styles.css','app.js','core.js','batch.js','batch-core.js','inspection.js','display.js','backup.js']){
  assert.ok(worker.includes(path),`Missing offline asset ${path}`);
 }
 assert.match(html,/src="\.\/src\/app\.js\?v=3\.0\.0"/);
 assert.match(html,/href="\.\/src\/styles\.css\?v=3\.0\.0"/);
 assert.match(worker,/const RELEASE='3\.0\.0'/);
 assert.match(worker,/const CACHE='precision-gauge-v11'/);
 assert.match(worker,/url\.searchParams\.get\('v'\)===RELEASE/);
});

test('batch workspace integrates without changing dock geometry',()=>{
 assert.match(html,/id="view-batch"/);
 assert.match(html,/id="tab-batch"/);
 for(const id of ['batch-picker','batch-create','batch-measurement','batch-add','batch-chart',
  'batch-count','batch-good','batch-bad','batch-readings','batch-undo','batch-export','batch-delete']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 }
 assert.match(app,/initBatch\(\{getCurrent:\(\)=>current,toast,navigate:switchPage\}\)/);
 assert.match(css,/\.dock\{position:fixed;left:50%;transform:translateX\(-50%\);bottom:2px;width:87%;height:68px;/);
 for(const path of ['./src/batch.js','./src/batch-core.js'])assert.ok(worker.includes("'"+path+"'"));
});

test('premium theme controls support system, graphite and titanium',()=>{
 for(const preference of ['auto','dark','light']){
  assert.match(html,new RegExp('data-theme-choice="'+preference+'"'));
 }
 assert.match(app,/function applyTheme\(preference,persist=true\)/);
 assert.match(app,/matchMedia\('\(prefers-color-scheme: light\)'\)/);
 assert.match(css,/--bg:#0a1117/);
 assert.match(css,/:root\[data-theme=light\]/);
 assert.match(html,/id="history-total"/);
});
test('premium stays offline-friendly and retains fixed dock source of truth',()=>{
 assert.doesNotMatch(html,/<script[^>]+https?:\/\//);
 assert.doesNotMatch(css,/@import\s+url\(/);
 assert.match(css,/\.dock\{position:fixed;left:50%;transform:translateX\(-50%\);bottom:2px;width:87%;height:68px;/);
 assert.match(worker,/precision-gauge-v11/);
});

test('2.1 inspector provides accessible SVG chart point controls',()=>{
 assert.match(html,/id="batch-inspector"/);
 assert.match(html,/id="batch-inspector-value"/);
 assert.match(html,/id="batch-inspector-detail"/);
 assert.match(html,/id="batch-trend-note"/);
 assert.match(html,/class="gauge-safe-zone"/);
 assert.match(worker,/\.\/src\/inspection\.js/);
 const js=readFileSync(new URL('../src/batch.js',import.meta.url),'utf8');
 assert.match(js,/data-reading-id/);
 assert.match(js,/tabindex:'0'/);
 assert.match(js,/inspectReading\(batch,selected\)/);
 assert.match(js,/recentTrend\(batch\)/);
});

test('WOW polish keeps instrument semantics and settings accessible',()=>{
 assert.match(html,/id="result-card" data-state="empty"/);
 assert.match(html,/class="settings-version">V 3\.0</);
 assert.match(html,/<details class="surface engineering-help" id="engineering-help">/);
 assert.match(html,/<summary>/);
 assert.match(html,/data-theme-choice="dark"[^>]+><svg/);
 assert.match(html,/data-theme-choice="light"[^>]+><svg/);
 assert.match(app,/\$\('result-card'\)\.dataset\.state=visual\.kind/);
 assert.match(app,/\$\('result-card'\)\.dataset\.state='error'/);
 assert.match(css,/\.engineering-help summary\{/);
 assert.match(css,/\.engineering-help-content\{/);
 assert.match(css,/\.measure-status strong:before/);
 assert.doesNotMatch(css,/\.dock\{[^}]+(?:visualViewport|innerHeight|safe-area-inset-bottom)/);
});

test('Full Pro history and backup controls remain accessible',()=>{
 for(const id of ['history-panel-batches','history-panel-calcs','history-filter-all','history-filter-good',
 'history-filter-bad','history-batches','backup-file','backup-export','backup-import']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 }
 assert.match(app,/getSavedBatchOverviews\(\)/);
 assert.match(app,/openSavedBatch\(batch\.id\)/);
 assert.match(app,/parseBackup\(await file\.text\(\)\)/);
 assert.match(html,/settings-feature-indicator/);
 assert.match(html,/>OFFLINE<\/span>/);
 assert.match(html,/class="settings-version">V 3\.0/);
});
