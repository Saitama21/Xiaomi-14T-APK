'use strict';
const CACHE='precision-gauge-v10';
const PREFIX='precision-gauge-';
const FILES=['./','./index.html','./src/styles.css','./src/app.js','./src/core.js','./src/batch.js','./src/batch-core.js','./src/inspection.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>(k.startsWith(PREFIX)||k.startsWith('tolerance-pro-'))&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})());
});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith((async()=>{try{const response=await fetch(req);if(response.ok){const cache=await caches.open(CACHE);cache.put('./index.html',response.clone())}return response}catch{return (await caches.match('./index.html'))||Response.error()}})());return;
 }
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});
