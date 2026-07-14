const CACHE='compras-centro-norte-v2';
const ASSETS=['./','./index.html','./css/styles.css','./js/app.js','./vendor/xlsx.full.min.js','./manifest.json','./assets/images/compras.png','./assets/icons/icon.svg','./assets/icons/icon-192.png','./assets/icons/icon-512.png','./data/Compras_Dtto_EC.xlsx'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));});
