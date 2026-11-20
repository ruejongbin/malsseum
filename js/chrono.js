/* 말씀 — 시대순 읽기 */
/* ---------- chronological storyline (시대순으로 읽기) ---------- */
let CHRONO=null, SEQ=[], SEQI={};
async function loadChrono(){
  if(CHRONO) return CHRONO;
  CHRONO = await fetch('data/chrono.json').then(r=>r.json());
  CHRONO.forEach((sg,si)=>sg.r.forEach(([b,a,z])=>{ for(let c=a;c<=z;c++){ SEQI[`${b}-${c-1}`]=SEQ.length; SEQ.push([b,c-1,si]); } }));
  return CHRONO;
}
state.chrono = store.get('chrono', false);
const rangeText = ([b,a,z]) => { const B=BOOKS[b]; return (a===1 && z===B.chapters) ? `${B.kor} 전체` : (a===z ? `${B.kor} ${a}장` : `${B.kor} ${a}–${z}장`); };
function chronoPos(){ const k=SEQI[`${state.b}-${state.c}`]; return k==null?null:k; }
function chronoBar(){
  if(!state.chrono || !CHRONO) return '';
  const k=chronoPos(); if(k==null) return '';
  const si=SEQ[k][2], sg=CHRONO[si];
  return `<div class="chrono-bar"><div class="top">🕰 시대순 읽기 · ${esc(sg.era)}<button id="chronoOff">끝내기</button></div>
    <div class="tt">${esc(sg.title)} <span style="font-weight:400;color:var(--muted);font-size:13px">${esc(sg.date)}</span></div>
    <div class="prog"><i style="width:${((k+1)/SEQ.length*100).toFixed(2)}%"></i></div>
    <div class="meta"><span>${k+1} / ${SEQ.length}장</span><span>${si+1} / ${CHRONO.length} 장면</span></div></div>`;
}
function drawChrono(){
  const k = state.chrono ? chronoPos() : null;
  const cur = k!=null ? SEQ[k][2] : -1;
  const saved = store.get('chronoAt', null);
  let h = `<p class="ch-intro">성경을 쓰인 순서가 아니라 <b>일어난 순서</b>대로 읽어요. 창조부터 요한계시록까지 1,189장 전체가 하나의 이야기로 이어져요. 장면을 누르면 거기서부터 읽기 시작하고, 아래 ‘다음’ 버튼이 시대순으로 이어져요.</p>
    <div class="ch-start"><button class="pri" id="chFromStart">처음부터 시작</button>${saved?`<button class="sec" id="chResume">이어 읽기 · ${BOOKS[saved[0]].kor} ${saved[1]+1}장</button>`:''}</div>`;
  let era=null;
  CHRONO.forEach((sg,si)=>{
    if(sg.era!==era){
      if(era) h+='</div>';
      if(sg.era==='예수의 생애') h+=`<div class="ch-gap">⏳ 말라기 이후 약 400년 — 성경이 기록되지 않은 ‘침묵의 시간’</div>`;
      era=sg.era; h+=`<div class="ch-era"><h3><i></i>${esc(era)}</h3>`;
    }
    h+=`<button class="ch-seg ${si===cur?'cur':''}" data-s="${si}"><div class="d">${esc(sg.date)}</div><div class="t">${esc(sg.title)}</div><div class="r">${sg.r.map(rangeText).join(' · ')}</div></button>`;
  });
  h+='</div><p class="ch-intro" style="margin-top:14px;font-size:12px">연대와 순서는 전통적인 성경 연대 추정 중 하나를 따른 대략적인 것이고, 시편처럼 여러 시대에 걸친 책은 묶어서 배치했어요.</p>';
  $('#chronoBody').innerHTML=h;
  const start = (b,c)=>{ state.chrono=true; store.set('chrono',true); closeSheets(); go(b,c); };
  $('#chronoBody').querySelectorAll('[data-s]').forEach(x=>x.onclick=()=>{ const [b,a]=CHRONO[+x.dataset.s].r[0]; start(b,a-1); });
  $('#chFromStart').onclick=()=>start(0,0);
  if($('#chResume')) $('#chResume').onclick=()=>start(saved[0],saved[1]);
  const curEl=$('#chronoBody .ch-seg.cur'); if(curEl) setTimeout(()=>curEl.scrollIntoView({block:'center'}),300);
}
$('#setBtn').onclick=e=>{ e.stopPropagation(); $('#moreMenu').classList.toggle('open'); };
document.addEventListener('click',e=>{ if(!e.target.closest('#moreMenu')) $('#moreMenu').classList.remove('open'); if(!e.target.closest('#ktNewMenu')&&!e.target.closest('#ktNew')) $('#ktNewMenu').classList.remove('open'); });
$('#mSettings').onclick=()=>{ $('#moreMenu').classList.remove('open'); openSheet('#setSheet'); };
const openChrono=async()=>{ $('#moreMenu').classList.remove('open'); await loadChrono(); drawChrono(); openSheet('#chronoSheet'); };
document.querySelectorAll('#readMode button').forEach(b=>b.onclick=async()=>{
  if(b.dataset.r==='chrono') openChrono();
  else if(state.chrono){ state.chrono=false; store.set('chrono',false); render(); }
});
if(state.chrono) loadChrono().then(()=>{ if(BOOKS.length) render(); });
