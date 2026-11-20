/* 말씀 — 앱 설치 안내 · 오프라인(서비스 워커) */
/* 앱 설치(홈 화면에 추가) 안내 + 오프라인 저장 */
(function(){
  if('serviceWorker' in navigator) addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
  var el=document.getElementById('install'),go=document.getElementById('installGo'),how=document.getElementById('installHow'),deferred=null;
  var inApp=matchMedia('(display-mode: standalone)').matches||navigator.standalone, framed=window.top!==window.self;
  var seen=false; try{seen=localStorage.getItem('installSeen')==='1'}catch(e){}
  function show(){ if(!inApp&&!framed&&!seen) setTimeout(()=>el.classList.add('show'),2500) }
  function hide(){ el.classList.remove('show'); try{localStorage.setItem('installSeen','1')}catch(e){} }
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;show()});
  var iOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(iOS){ how.textContent='공유 버튼(□↑) → "홈 화면에 추가"를 눌러 주세요'; go.textContent='알겠어요'; show(); }
  go.onclick=()=>{ if(deferred){deferred.prompt();deferred.userChoice.finally(hide)} else hide() };
  document.getElementById('installX').onclick=hide;
})();
