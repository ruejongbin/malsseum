/* 말씀 — 시트 · 책 목록 · 검색 · 저장한 구절 */
/* ---------- sheets ---------- */
function openSheet(id){ closeSheets(); $('#scrim').classList.add('show'); $(id).classList.add('show'); }
function closeSheets(){ $('#scrim').classList.remove('show'); document.querySelectorAll('.sheet.show').forEach(s=>s.classList.remove('show')); }
$('#scrim').onclick = ()=>{ closeSheets(); clearSel(); };
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{ closeSheets(); clearSel(); });

let navTab = 0;
function showBooks(){
  navTab = BOOKS[state.b].nt?1:0;
  const draw = ()=>{
    $('#navTitle').textContent='성경 목록';
    $('#navBody').innerHTML = `<div class="tabs"><button data-t="0" class="${navTab?'':'on'}">구약 39</button><button data-t="1" class="${navTab?'on':''}">신약 27</button></div>
      <div class="grid-books">${BOOKS.map((B,i)=>B.nt===!!navTab?`<button data-b="${i}" class="${i===state.b?'cur':''}">${B.kor}</button>`:'').join('')}</div>`;
    $('#navBody').querySelectorAll('[data-t]').forEach(t=>t.onclick=()=>{navTab=+t.dataset.t;draw();});
    $('#navBody').querySelectorAll('[data-b]').forEach(t=>t.onclick=()=>showChapters(+t.dataset.b));
  };
  draw(); openSheet('#navSheet');
}
function showChapters(b){
  const B=BOOKS[b];
  if(B.chapters===1){ closeSheets(); go(b,0); return; }
  $('#navTitle').textContent = B.kor;
  let h = `<button class="backlink" id="backBooks">‹ 성경 목록</button><div class="grid-ch">`;
  for(let c=0;c<B.chapters;c++) h+=`<button data-c="${c}" class="${b===state.b&&c===state.c?'cur':''}">${c+1}</button>`;
  $('#navBody').innerHTML = h+'</div>';
  $('#backBooks').onclick = showBooks;
  $('#navBody').querySelectorAll('[data-c]').forEach(t=>t.onclick=()=>{closeSheets();go(b,+t.dataset.c);});
  $('#navBody').scrollTop=0;
}
$('#whereBtn').onclick = showBooks;
$('#searchBtn').onclick = ()=>{ openSheet('#searchSheet'); setTimeout(()=>$('#q').focus(),250); };
$('#bmBtn').onclick = ()=>{ drawSaved(); openSheet('#bmSheet'); };

function drawSaved(){
  if(!saved.length){ $('#bmBody').innerHTML='<div class="empty">아직 저장한 구절이 없어요.<br>본문에서 구절을 눌러 선택한 뒤 ‘저장’을 누르세요.</div>'; return; }
  $('#bmBody').innerHTML = saved.map((s,i)=>`<div class="bm"><div class="result" data-i="${i}"><div class="ref">${BOOKS[s.b].kor} ${s.c+1}:${s.v}</div><div class="t">${esc(s.t)}</div></div><button class="del" data-d="${i}">삭제</button></div>`).join('');
  $('#bmBody').querySelectorAll('.result').forEach(r=>r.onclick=()=>{const s=saved[+r.dataset.i];closeSheets();go(s.b,s.c,s.v);});
  $('#bmBody').querySelectorAll('[data-d]').forEach(d=>d.onclick=()=>{saved.splice(+d.dataset.d,1);store.set('saved',saved);drawSaved();});
}

/* ---------- search ---------- */
function parseRef(q){
  const m = /^\s*([1-3]?\s*[가-힣A-Za-z.\s]+?)\s*(\d+)(?:\s*[:장편]\s*(\d+)\s*절?)?\s*(?:장|편)?\s*$/.exec(q);
  if(!m) return null;
  const name = m[1].replace(/[\s.]/g,'').toLowerCase();
  const b = BOOKS.findIndex(B=>B.kor===name||B.short===name||B.eng.replace(/\s/g,'').toLowerCase()===name)
        ?? -1;
  let i = b;
  if(i<0) i = BOOKS.findIndex(B=>B.kor.startsWith(name) || B.eng.replace(/\s/g,'').toLowerCase().startsWith(name));
  if(i<0) return null;
  const c = +m[2]-1; if(c<0||c>=BOOKS[i].chapters) return null;
  return [i,c,m[3]?+m[3]:0];
}
let searching = 0, sMode='hybrid', SDB=null;
document.querySelectorAll('#sModes button').forEach(b=>b.onclick=()=>{ sMode=b.dataset.m; document.querySelectorAll('#sModes button').forEach(x=>x.classList.toggle('on',x===b)); if($('#q').value.trim()) $('#searchForm').requestSubmit(); });
function loadScript(src){ return new Promise((res,rej)=>{ if(document.querySelector(`script[src="${src}"]`)) return res(); const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
async function ensureIndex(onProg){
  if(!SDB) SDB = await fetch('data/search-db.json').then(r=>r.json());
  await loadScript('lib/search.js');
  if(BibleSearch.ready()) return;
  let done=0; const all = await Promise.all(BOOKS.map((B,i)=>loadBook(i).then(ch=>{ done++; onProg(done/66); return ch; }).catch(()=>[])));
  BibleSearch.build(BOOKS, b=>all[b]);
}
const fmtRange = s => s.c===s.c2 ? (s.v===s.v2 ? `${BOOKS[s.b].kor} ${s.c+1}:${s.v}` : `${BOOKS[s.b].kor} ${s.c+1}:${s.v}–${s.v2}`) : `${BOOKS[s.b].kor} ${s.c+1}:${s.v}–${s.c2+1}:${s.v2}`;
$('#searchForm').onsubmit = async e=>{
  e.preventDefault();
  const q = $('#q').value.trim(); if(!q) return;
  const ref = parseRef(q);
  if(ref){ closeSheets(); go(...ref); return; }
  const token = ++searching;
  const prog = $('#prog'), bar = prog.firstElementChild;
  $('#results').innerHTML='';
  if(/^[A-Za-z\s']+$/.test(q)){            // English: simple keyword search over KJV
    $('#searchHint').textContent='찾는 중…';
    const ql=q.toLowerCase(), hits=[];
    const all=await Promise.all(BOOKS.map((B,i)=>loadBook(i).catch(()=>[])));
    all.forEach((chs,b)=>chs.forEach((vs,c)=>vs.forEach(([ko,en],v)=>{ if(en.toLowerCase().includes(ql)) hits.push({b,c,v:v+1,t:en}); })));
    if(token!==searching) return;
    $('#searchHint').textContent = hits.length?`${hits.length}개 구절`:'찾는 구절이 없어요.';
    const re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
    $('#results').innerHTML = hits.slice(0,200).map((h,i)=>`<div class="result" data-i="${i}"><div class="ref">${BOOKS[h.b].kor} ${h.c+1}:${h.v}</div><div class="t">${esc(h.t).replace(re,m=>`<mark>${m}</mark>`)}</div></div>`).join('');
    $('#results').querySelectorAll('.result').forEach(r=>r.onclick=()=>{const h=hits[+r.dataset.i];closeSheets();go(h.b,h.c,h.v);});
    return;
  }
  if(!window.BibleSearch || !BibleSearch.ready()){ prog.hidden=false; bar.style.width='0'; $('#searchHint').textContent='처음 한 번만 성경 전체 색인을 만드는 중…'; }
  await ensureIndex(f=>{ if(token===searching) bar.style.width=(f*100)+'%'; });
  if(token!==searching) return;
  prog.hidden=true;
  const R = BibleSearch.search(q, SDB, sMode);
  const hl = (t, words) => { let h=esc(t); [...new Set(words)].filter(w=>w.length>=1).sort((a,b)=>b.length-a.length).forEach(w=>{ h=h.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'),m=>`<mark>${m}</mark>`); }); return h; };
  const words=[...R.terms,...R.expanded];
  let h = `<div class="s-sec">① 질문 이해</div><div class="s-q">핵심어 ${R.terms.length?R.terms.map(t=>`<span class="tg">${esc(t)}</span>`).join(''):'<span class="tg x">없음</span>'}
    ${R.expanded.length && sMode==='hybrid' ? `<br>함께 찾은 말 ${R.expanded.slice(0,8).map(t=>`<span class="tg x">${esc(t)}</span>`).join('')}`:''}</div>`;
  if(R.stories.length){
    h += `<div class="s-sec">② 이런 이야기를 찾으시나요?</div>`;
    h += R.stories.map((x,i)=>{ const s=x.s; const first=(BibleSearch && null); return `<button class="s-story" data-s="${i}"><div class="h"><b>${esc(s.t)}</b><span>${fmtRange(s)}</span></div><div class="t" data-first="${i}"></div><div class="w">근거: ${x.matched.length?x.matched.slice(0,5).map(m=>`‘${esc(m)}’`).join(', ')+' 이(가) 이 이야기와 맞아요':'질문과 표현이 비슷해요'} · 출처: ${fmtRange(s)} (개역한글)</div></button>`; }).join('');
  }
  h += `<div class="s-sec">${R.stories.length?'③':'②'} 근거 구절 ${R.total?`· ${R.total.toLocaleString()}개 중 상위 ${Math.min(40,R.total)}개`:''}</div>`;
  h += R.verses.length ? R.verses.map((r,i)=>`<div class="result" data-i="${i}"><div class="ref">${BOOKS[r.b].kor} ${r.c+1}:${r.v}<span class="how">${r.how==='context'?'이야기 추천':r.how==='keyword'?'같은 단어':'비슷한 뜻'}</span></div><div class="t">${hl(r.t, words)}</div></div>`).join('')
       : `<div class="empty">찾는 구절이 없어요. 다른 표현으로 물어보세요.</div>`;
  $('#searchHint').textContent = R.stories.length ? `‘${R.stories[0].s.t}’ 이야기를 먼저 추천해요.` : (R.total?`${R.total.toLocaleString()}개 구절에서 찾았어요.`:'');
  $('#results').innerHTML = h;
  // first verse of each recommended story
  R.stories.forEach(async (x,i)=>{ const ch=(await loadBook(x.s.b))[x.s.c]; const el=$(`#results [data-first="${i}"]`); if(el&&ch) el.innerHTML = hl(ch[x.s.v-1][0], words); });
  $('#results').querySelectorAll('.s-story').forEach(el=>el.onclick=()=>{ const s=R.stories[+el.dataset.s].s; closeSheets(); go(s.b,s.c,s.v); });
  $('#results').querySelectorAll('.result').forEach(el=>el.onclick=()=>{ const r=R.verses[+el.dataset.i]; closeSheets(); go(r.b,r.c,r.v); });
};
