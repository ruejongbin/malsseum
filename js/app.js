/* 말씀 — 설정 · 탭 · 키보드 · 시작 */
/* ---------- prefs & keys ---------- */
document.querySelectorAll('#modeSeg button').forEach(b=>b.onclick=e=>{e.stopPropagation();state.mode=b.dataset.m;store.set('mode',state.mode);applyPrefs();$('#modeSeg').classList.remove('open');});
$('#verBtn').onclick=e=>{e.stopPropagation();$('#modeSeg').classList.toggle('open');};
document.addEventListener('click',()=>$('#modeSeg').classList.remove('open'));
const TABS={bible:'#reader',meta:'#metaView',shorts:'#shortsView',profile:'#profileView'};
const TABNAME={meta:'메타버스',shorts:'말씀 쇼츠',profile:'프로필'};
function drawProfile(){
  const mk=Object.keys(marks).length, sv=saved.length, days=store.get('readDays',[]).length;
  $('#profileView').innerHTML=`<div class="prof-top"><div class="lamp">🪔</div><div><b>나의 말씀</b><small>등불은 읽을수록 밝아져요 (준비 중)</small></div></div>
  <div class="prof-stats"><div><b>${sv}</b><span>저장한 구절</span></div><div><b>${mk}</b><span>형광펜</span></div><div><b>${Math.max(days,1)}</b><span>읽은 날</span></div></div>
  <div class="prof-menu">
    <button id="pfSaved">저장한 구절</button>
    <button id="pfChrono">시대순 읽기 진도</button>
    <button id="pfSet">설정 · 글자 크기</button>
  </div>
  <ul class="plan"><li><span class="e">📚</span><div><b>66권 책장 · 모은 책갈피</b>다 읽은 책과 변신 책갈피가 여기 모여요 (준비 중)</div></li></ul>`;
  $('#pfSaved').onclick=()=>{drawSaved();openSheet('#bmSheet');};
  $('#pfChrono').onclick=()=>openChrono();
  $('#pfSet').onclick=()=>openSheet('#setSheet');
}
function showTab(t){
  document.querySelectorAll('#tabbar button').forEach(x=>x.classList.toggle('on',x.dataset.tab===t));
  Object.entries(TABS).forEach(([k,sel])=>$(sel).hidden=k!==t);
  $('#groupView').hidden=true; $('#readMode').hidden=t!=='bible';
  const g=t!=='bible';
  document.querySelector('.tb-icons').style.visibility=g?'hidden':'';
  $('#whereKo').textContent = g ? TABNAME[t] : `${BOOKS[state.b].kor} ${state.c+1} ${BOOKS[state.b].kor==='시편'?'편':'장'}`;
  $('#whereBtn').disabled=g; closeSheets(); window.scrollTo(0,0);
  if(t==='profile') drawProfile();
}
document.querySelectorAll('#tabbar button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));

const setFs=v=>{state.fs=Math.max(14,Math.min(28,+v));store.set('fs',state.fs);applyPrefs();};
$('#fsRange').oninput=e=>setFs(e.target.value);
document.querySelectorAll('#fsPresets button').forEach(b=>b.onclick=()=>setFs(b.dataset.v));
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ e.target.blur&&e.target.blur(); closeSheets(); clearSel(); return; }
  if(e.target.matches('input')) return;
  if(document.querySelector('.sheet.show')) return;
  if(e.key==='ArrowLeft'){ const p=neighbor(-1); if(p) go(...p); }
  if(e.key==='ArrowRight'){ const n=neighbor(1); if(n) go(...n); }
  if(e.key==='/'){ e.preventDefault(); $('#searchBtn').click(); }
});
// swipe left/right on the reader
let sx=null, sy=0;
$('#reader').addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
$('#reader').addEventListener('touchend',e=>{
  if(sx==null) return; const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy; sx=null;
  if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*2){ const t=neighbor(dx<0?1:-1); if(t) go(...t); }
});
window.addEventListener('hashchange',()=>{ const v=fromHash(); if(v!==null){ closeSheets(); render(v); } });

/* ---------- start ---------- */
applyPrefs();
fetch('data/books.json').then(r=>r.json()).then(list=>{
  BOOKS=list;
  const v = fromHash();
  if(v===null){ const p=store.get('pos',[0,0]); if(BOOKS[p[0]]&&p[1]<BOOKS[p[0]].chapters){state.b=p[0];state.c=p[1];} go(state.b,state.c); }
  else render(v);
}).catch(()=>{ $('#reader').innerHTML='<div class="loading">목록을 불러오지 못했어요.</div>'; });

/* 내 기록 백업 · 불러오기 */
$('#udExport').onclick=()=>{ const blob=new Blob([UD.exportJSON()],{type:'application/json'}); const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=`말씀-내기록-${new Date().toLocaleDateString('sv')}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); toast('백업 파일을 만들었어요'); };
$('#udImport').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try{ const n=UD.importJSON(await f.text()); toast(`${n}개 기록을 불러왔어요`); render(); }catch(err){ toast(err.message||'불러오지 못했어요'); } e.target.value=''; };
