'use strict';
// Revisioned graph: an updated HTML document never pulls stale CSS or JS from an old cache.
const RELEASE='3.0.0';
const CACHE='precision-gauge-v11';
const PREFIX='precision-gauge-';
const CORE_FILES=[
 './','./index.html',
 './src/styles.css?v='+RELEASE,
 './src/app.js?v='+RELEASE,
 './src/core.js?v='+RELEASE,
 './src/batch.js?v='+RELEASE,
 './src/batch-core.js?v='+RELEASE,
 './src/inspection.js?v='+RELEASE,
 './src/display.js?v='+RELEASE,
 './src/backup.js?v='+RELEASE,
 './manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE_FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>(k.startsWith(PREFIX)||k.startsWith('tolerance-pro-'))&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const response=await fetch(req);
    if(response.ok){
     const cache=await caches.open(CACHE);
     await cache.put('./index.html',response.clone());
    }
    return response;
   }catch{return (await caches.match('./index.html'))||Response.error()}
  })());
  return;
 }
 // Immutable release URLs are safe to serve cache-first. Unversioned URLs are network-first.
 if(url.searchParams.get('v')===RELEASE){
  event.respondWith((async()=>{
   const cached=await caches.match(req);
   if(cached)return cached;
   const response=await fetch(req);
   if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone())}
   return response;
  })());
  return;
 }
 event.respondWith((async()=>{
  try{
   const response=await fetch(req);
   if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone())}
   return response;
  }catch{return (await caches.match(req))||Response.error()}
 })());
});
