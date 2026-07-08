const CACHE_NAME='transferencias-v6-auditoria-desfase-ingreso-pdf';
const APP_SHELL=['./','./index.html','./css/styles.css','./js/app.js','./manifest.json','./assets/icons/icon.svg','./assets/icons/icon-192.svg','./assets/icons/icon-512.svg','./assets/images/transferencia.png','./data/manifest-data.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.pathname.includes('/data/chunks/')){
    event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();if(event.request.method==='GET')caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));return response;})).catch(()=>caches.match('./index.html')));
});
