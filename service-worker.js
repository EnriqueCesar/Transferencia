'use strict';
const CACHE_NAME='transferencias-starbucks-v2-auditoria-basica-operativa';
const APP_SHELL=['./','./index.html','./css/styles.css','./js/app.js','./manifest.json','./data/manifest-data.json','./assets/images/transferencia.png','./assets/icons/icon.svg','./assets/icons/icon-192.svg','./assets/icons/icon-512.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.pathname.includes('/data/chunks/')){event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));return;}event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match('./index.html'))));});
