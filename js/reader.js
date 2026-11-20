/* 말씀 — 읽기: 본문 그리기, 장 이동, 구절 선택 */
/* ---------- reader ---------- */
function applyPrefs(){
  document.documentElement.style.setProperty('--fs', state.fs+'px');
  $('#fsVal').textContent = state.fs+'px'; $('#fsRange').value=state.fs;
  document.querySelectorAll('#fsPresets button').forEach(b=>b.classList.toggle('on',+b.dataset.v===state.fs));
  $('#reader').className = 'mode-'+state.mode;
  document.querySelectorAll('#modeSeg button').forEach(b=>b.classList.toggle('on', b.dataset.m===state.mode));
  $('#verChip').textContent = {both:'개역한글 | KJV (대조)', ko:'개역한글', en:'KJV'}[state.mode];
}
async function render(scrollVerse){
  const B = BOOKS[state.b];
  $('#whereKo').textContent = `${B.kor} ${state.c+1} ${B.kor==='시편'?'편':'장'}`;
  $('#whereEn').textContent = `${B.eng} ${state.c+1}`;
  document.title = `${B.kor} ${state.c+1} — 말씀`;
  clearSel();
  let chapters;
  try{ chapters = await loadBook(state.b); }
  catch(e){ $('#reader').innerHTML = '<div class="loading">본문을 불러오지 못했어요. 새로고침해 주세요.</div>'; return; }
  const verses = chapters[state.c] || [];
  const vdata = await loadViz(state.b); const vch = vdata ? (vdata.verses[state.c]||[]) : [];
  const xrc = ((await loadXref(state.b))||[])[state.c] || [];
  const unit = B.kor==='시편'?'편':'장';
  document.querySelectorAll('#readMode button').forEach(b=>b.classList.toggle('on',(b.dataset.r==='chrono')===!!state.chrono));
  {const d=new Date().toLocaleDateString('sv'),rd=store.get('readDays',[]); if(!rd.includes(d)){rd.push(d);store.set('readDays',rd.slice(-400));}}
  let h = chronoBar();
  if(state.chrono && chronoPos()!=null) store.set('chronoAt',[state.b,state.c]);
  if(vdata && !store.get('tipDone',0)) h += `<div class="tip"><span>구절을 눌러 보세요. <b>누가 · 어디서 · 언제</b>를 그림으로 보여드려요.<br>✦ 표시가 있는 구절은 <b>꾹 누르면</b> 애니메이션이 나와요.</span><button id="tipClose">닫기</button></div>`;
  verses.forEach(([ko,en],i)=>{
    const key = `${state.b}-${state.c}-${i+1}`;
    const vr = vch[i]; const hv = vr && (vr[0].length||vr[1].length);
    const xn = (xrc[i]||[]).length; const xchip = xn ? `<button class="xr" data-xv="${i+1}" aria-label="연결된 구절 ${xn}개">${XR_ICON}${xn}</button>` : '';
    h += `<div class="verse${marks[key]?' mark':''}${hv?' has-viz':''}${window.VERSE_ANIM&&VERSE_ANIM[key]?' has-anim':''}" data-v="${i+1}" id="v${i+1}">`+
      `<div class="col ko-col"><span class="vn">${i+1}</span><div class="ko txt">${esc(ko||'')}${xchip}</div></div>`+
      `<div class="col en-col"><span class="vn">${i+1}</span><div class="en txt">${esc(en||'')}${xchip}</div></div></div>`;
  });
  const prev = neighbor(-1), next = neighbor(1);
  h += `<div class="pager"><button id="prevBtn" ${prev?'':'disabled'}>이전${prev?`<b>${BOOKS[prev[0]].short} ${prev[1]+1}</b>`:''}</button>
        <button id="nextBtn" ${next?'':'disabled'}>다음${next?`<b>${BOOKS[next[0]].short} ${next[1]+1}</b>`:''}</button></div>`;
  $('#reader').innerHTML = h;
  if($('#chronoOff')) $('#chronoOff').onclick=e=>{ e.stopPropagation(); state.chrono=false; store.set('chrono',false); render(); };
  $('#prevBtn').onclick = ()=>go(...prev);
  $('#nextBtn').onclick = ()=>go(...next);
  if(scrollVerse){
    const el = document.getElementById('v'+scrollVerse);
    if(el){ el.scrollIntoView({block:'center'}); el.classList.add('flash'); }
  } else window.scrollTo(0,0);
  store.set('pos',[state.b,state.c]);
  // prefetch neighbours
  if(next && next[0]!==state.b) loadBook(next[0]).catch(()=>{});
}
function neighbor(d){
  if(state.chrono && SEQ.length){ const k=SEQI[`${state.b}-${state.c}`]; if(k!=null){ const n=SEQ[k+d]; return n?[n[0],n[1]]:null; } }
  let b=state.b, c=state.c+d;
  if(c<0){ b--; if(b<0) return null; c=BOOKS[b].chapters-1; }
  if(c>=BOOKS[b].chapters){ b++; if(b>=BOOKS.length) return null; c=0; }
  return [b,c];
}
function go(b,c,v){
  state.b=b; state.c=c;
  const hash = `#b${b+1}-${c+1}`+(v?`-${v}`:'');
  if(location.hash!==hash) history.replaceState(null,'',hash);
  render(v);
}
function fromHash(){
  const m = /^#b(\d+)-(\d+)(?:-(\d+))?$/.exec(location.hash);
  if(m){ const b=+m[1]-1, c=+m[2]-1; if(BOOKS[b] && c>=0 && c<BOOKS[b].chapters){ state.b=b; state.c=c; return m[3]?+m[3]:0; } }
  return null;
}

/* ---------- selection ---------- */
$('#reader').addEventListener('click', e=>{
  const xb = e.target.closest('.xr'); if(xb){ e.stopPropagation(); openXr(+xb.dataset.xv); return; }
  if(e.target.closest('#tipClose')){ store.set('tipDone',1); e.target.closest('.tip').remove(); return; }
  const v = e.target.closest('.verse'); if(!v) return;
  if(lp.fired){ lp.fired=false; return; }
  clearSel();
  const n = +v.dataset.v;
  state.sel.add(n); v.classList.add('sel');
  openViz(n);
});
function updateActions(){}
function clearSel(){ state.sel.clear(); document.querySelectorAll('.verse.sel').forEach(v=>v.classList.remove('sel')); updateActions(); }
function selRef(){
  const vs=[...state.sel].sort((a,b)=>a-b); const B=BOOKS[state.b];
  let parts=[], s=vs[0], p=vs[0];
  for(let i=1;i<=vs.length;i++){ if(vs[i]===p+1){p=vs[i];continue;} parts.push(s===p?`${s}`:`${s}-${p}`); s=p=vs[i]; }
  return {vs, ko:`${B.kor} ${state.c+1}:${parts.join(',')}`, en:`${B.eng} ${state.c+1}:${parts.join(',')}`};
}
$('#aCopy').onclick = async ()=>{
  const {vs,ko,en} = selRef(); const ch = (await loadBook(state.b))[state.c];
  const lines=[];
  if(state.mode!=='en') lines.push(vs.map(v=>`${v} ${ch[v-1][0]}`).join('\n')+`\n— ${ko} (개역한글)`);
  if(state.mode!=='ko') lines.push(vs.map(v=>`${v} ${ch[v-1][1]}`).join('\n')+`\n— ${en} (KJV)`);
  try{ await navigator.clipboard.writeText(lines.join('\n\n')); toast('복사했어요'); }
  catch(e){ toast('이 화면에서는 복사가 막혀 있어요'); }
  clearSel();
};
$('#aMark').onclick = ()=>{
  const vs=[...state.sel]; const allOn = vs.every(v=>marks[`${state.b}-${state.c}-${v}`]);
  vs.forEach(v=>{ const k=`${state.b}-${state.c}-${v}`;
    if(allOn) UD.remove(marks[k]); else if(!marks[k]) UD.add('highlight',{b:state.b,c:state.c,v},{color:'yellow',style:'full'});
    document.getElementById('v'+v).classList.toggle('mark',!allOn); });
  toast(allOn?'형광펜을 지웠어요':'형광펜을 칠했어요'); clearSel();
};
$('#aSave').onclick = async ()=>{
  const ch = (await loadBook(state.b))[state.c];
  [...state.sel].sort((a,b)=>a-b).forEach(v=>{
    if(!saved.some(s=>s.b===state.b&&s.c===state.c&&s.v===v)) UD.add('saved',{b:state.b,c:state.c,v},{text:ch[v-1][0]||ch[v-1][1]});
  });
  toast('저장했어요'); clearSel();
};
['#aCopy','#aMark','#aSave'].forEach(id=>{ const f=$(id).onclick; $(id).onclick=async()=>{ const n=[...state.sel]; await f(); closeSheets(); }; });
