// 말씀 서비스 워커: 앱 화면은 최신 우선, 데이터·라이브러리는 한 번 받으면 저장해 두고 오프라인에서도 읽기
const V='malsseum-v2';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./data/books.json',
  './css/base.css','./css/app.css','./css/design.css',
  ...['core','reader','chrono','connect','video','viz','map','sheets','group','app','install'].map(n=>`./js/${n}.js`)];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url); if(u.origin!==location.origin) return;      // 구글 지도·글꼴 등은 그대로
  if(r.headers.has('range')||u.pathname.endsWith('.mp4')) return;     // 영상은 스트리밍 그대로
  const isPage=r.mode==='navigate'||/\.(html|js|css)$/.test(u.pathname)&&!u.pathname.includes('/lib/')||u.pathname.endsWith('/');
  if(isPage){ // 최신 우선, 안 되면 저장본
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>x.put(r,c));return res})
      .catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))));
  } else {    // 저장본 우선
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res})));
  }
});
