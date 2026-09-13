const CACHE='mis-cosas-v77';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./sw-v77.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url);
 const shell=['/index.html','/app.js','/styles.css','/manifest.webmanifest','/sw-v77.js'].some(x=>url.pathname.endsWith(x))||url.pathname==='/'||url.pathname.endsWith('/');
 if(shell){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));return;}
 e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match('./index.html'))));
});
self.addEventListener('message',e=>{if(e.data?.type==='SHOW_NOTIFICATION'){self.registration.showNotification(e.data.title||'Mis cosas',{body:e.data.body||'',icon:'./icon-192.png',badge:'./icon-192.png'})}});
