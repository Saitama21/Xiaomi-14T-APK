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
 assert.match(css, /\.measure-card\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('offline installation caches all application entrypoints',()=>{
 for(const path of ['./index.html','./src/styles.css','./src/app.js','./src/core.js','./manifest.webmanifest']){
  assert.ok(worker.includes(`'${path}'`),`Missing offline asset ${path}`);
 }
 assert.match(html,/rel="manifest"/);
});
