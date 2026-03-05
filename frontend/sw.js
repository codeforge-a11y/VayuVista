const CACHE = "weather-v1";

self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(CACHE).then(cache=>
      cache.addAll([
        "./",
        "./index.html",
        "./style.css",
        "./script.js",
        "./manifest.json"
      ])
    )
  );
});

self.addEventListener("fetch", e=>{
  if(e.request.url.includes("api.openweathermap")){
    e.respondWith(
      fetch(e.request).then(res=>{
        const clone = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
        return res;
      }).catch(()=>caches.match(e.request))
    );
  }else{
    e.respondWith(
      caches.match(e.request).then(res=>res||fetch(e.request))
    );
  }
});