const C="fuel-love-v2";
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(["/","/index.html","/manifest.webmanifest","/icon.svg"])));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{if(e.request.method==="GET")e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).catch(()=>caches.match("/index.html"))))});
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){}e.waitUntil(self.registration.showNotification(d.title||"Fuel & Love 💛",{body:d.body||"Maa, a little reminder from someone who loves you: take good care of yourself. 💛",icon:"/icon.svg",tag:d.tag||"fuel-love",data:{url:d.url||"/"}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{for(const c of cs){if("focus"in c){c.navigate(e.notification.data.url||"/");return c.focus()}}return self.clients.openWindow(e.notification.data.url||"/")}))});
