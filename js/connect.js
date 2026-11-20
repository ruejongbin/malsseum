/* 말씀 — 연결 구절: 왜 연결될까요? · 하이퍼루프 */
/* ---------- why are these two verses connected? ---------- */
let XN=null; const loadXN=()=> XN ? Promise.resolve(XN) : fetch('data/xnotes.json').then(r=>r.json()).then(d=>XN=d).catch(()=>XN={});
const STEMP=['에게서','으로','에서','에게','부터','까지','하니라','하시니라','이니라','니라','하리라','리라','하시매','하매','하고','하며','하여','이라','라','은','는','이','가','을','를','에','의','와','과','도','로'];
const STOPW=new Set(['그','이','저','것','자','때','곧','또','및','그러나','그리고','이에','내가','네가','그가','우리','너희','그들','하나','있으니라','하였더라','있더라']);
function wordsOf(t){ return t.replace(/[^\p{L}\s]/gu,' ').split(/\s+/).map(w=>{ for(const p of STEMP){ if(w.length>p.length+1&&w.endsWith(p)) return w.slice(0,-p.length); } return w; }).filter(w=>w.length>=2&&!STOPW.has(w)&&!/^(있|하|되|이르|가로|그러|아니|말하)/.test(w)); }
function relKind(a,b){
  const ot=x=>x[0]<39;
  if(ot(a)&&!ot(b)) return {k:'구약 → 신약 · 예언과 성취', d:'구약의 말씀이나 사건이 신약에서 다시 인용되거나 이루어진 것으로 연결돼요.'};
  if(!ot(a)&&ot(b)) return {k:'신약 → 구약 · 인용과 배경', d:'신약이 구약의 말씀을 인용하거나, 그 배경이 되는 구약 장면을 가리켜요.'};
  if(a[0]===b[0]) return {k:'같은 책 안의 연결', d:'같은 책 안에서 같은 사건이나 표현이 다시 나와요.'};
  return {k:`같은 주제 · ${ot(a)?'구약':'신약'} 안에서`, d:'다른 책이지만 같은 주제나 비슷한 표현을 다루는 말씀이에요.'};
}
async function connectionInfo(from,to){
  await loadXN();
  const [fa,ta] = await Promise.all([from,to].map(async ([b,c,v])=>((await loadBook(b))[c]||[])[v-1]||['','']));
  const wa=wordsOf(fa[0]), wb=new Set(wordsOf(ta[0]));
  const common=[...new Set(wa.filter(w=>wb.has(w)||[...wb].some(x=>x.length>=2&&(x.startsWith(w)||w.startsWith(x)))))].slice(0,6);
  const note = XN[`${from.join('-')}>${to.join('-')}`] || '';
  return {kind:relKind(from,to), note, common, ft:fa[0], tt:ta[0]};
}
function showWhy(from,to,info){
  const hl=t=>{ let h=esc(t); info.common.forEach(w=>{ h=h.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'),m=>`<mark>${m}</mark>`); }); return h; };
  $('#whyBody').innerHTML = `<div class="why-kind">${info.kind.k}</div>
    <div class="why-pair"><div class="why-v"><div class="r">${refLabel(from)}</div><div class="t">${hl(info.ft)}</div></div>
    <div class="why-arrow">⌒ ↓</div>
    <div class="why-v"><div class="r">${refLabel(to)}</div><div class="t">${hl(info.tt)}</div></div></div>
    <div class="why-note"><b>${info.note?'해설':'연결 단서'}</b>${info.note ? esc(info.note) : esc(info.kind.d)+(info.common.length?` 두 구절에 함께 나오는 말을 비교해 보세요.`:'')}</div>
    ${info.common.length?`<div class="why-words">함께 나오는 말 ${info.common.map(w=>`<span>${esc(w)}</span>`).join('')}</div>`:''}
    <div class="why-src">구절 연결: OpenBible.info 교차참조(CC BY) · 해설은 이 앱에서 쓴 짧은 요약이라, 깊은 해석은 주석이나 설교와 함께 보세요.</div>`;
  openSheet('#whySheet');
}

/* ---------- connected verses: hyperloop ride ---------- */
const XR = {};
function loadXref(b){ if(!XR[b]) XR[b]=fetch(`data/xref/${pad(b+1)}.json`).then(r=>r.json()).catch(()=>null); return XR[b]; }
const XR_ICON = '<svg viewBox="0 0 24 24"><path d="M3 18c0-7 4-12 9-12s9 5 9 12"/><path d="M18 15l3 3 3-3" transform="translate(-3 0)"/></svg>';
const refLabel = ([b,c,v]) => `${BOOKS[b].kor} ${c+1}:${v}`;
async function openXr(n){
  const list = ((await loadXref(state.b))||[])[state.c]?.[n-1] || [];
  if(!list.length) return;
  const from=[state.b,state.c,n];
  $('#xrTitle').textContent = `${refLabel(from)}과 연결된 구절`;
  const items = await Promise.all(list.map(async ([b,c,v])=>{ const ch=(await loadBook(b))[c]||[]; const vv=ch[v-1]||['','']; return {b,c,v,t: state.mode==='en'?vv[1]:(vv[0]||vv[1])}; }));
  $('#xrBody').innerHTML = `<p class="xr-from">이 구절과 함께 읽으면 좋은 구절이에요. 누르면 성경 전체를 잇는 연결선을 타고 그 구절로 이동해요.</p>` +
    items.map((it,i)=>`<button class="xr-item" data-i="${i}"><div class="ref">${XR_ICON}${refLabel([it.b,it.c,it.v])}<span>타고 가기 ›</span></div><div class="t">${esc(it.t||'')}</div></button>`).join('') +
    `<p class="xr-from" style="font-size:12px;margin-top:6px">교차참조: OpenBible.info (CC BY)</p>`;
  $('#xrBody').querySelectorAll('.xr-item').forEach(el=>el.onclick=()=>{ const it=items[+el.dataset.i]; rideTo(from,[it.b,it.c,it.v]); });
  openSheet('#xrSheet');
}
async function rideTo(from,to){
  closeSheets(); clearSel();
  try{
    const mod = await import(new URL('lib/loop.js', document.baseURI).href);
    var info = await connectionInfo(from,to);
    await mod.ride({from, to, fromLabel: refLabel(from), toLabel: refLabel(to), books: BOOKS, note: info.note || info.kind.d, kind: info.kind.k});
  }catch(e){ console.warn('ride failed', e); }
  await go(to[0],to[1],to[2]);
  if(info) setTimeout(()=>showWhy(from,to,info), 350);
  const bc=$('#backChip'); bc.textContent=`← ${refLabel(from)}(으)로 돌아가기`; bc.classList.add('show');
  bc.onclick=()=>{ bc.classList.remove('show'); go(from[0],from[1],from[2]); };
  clearTimeout(rideTo.h); rideTo.h=setTimeout(()=>bc.classList.remove('show'),12000);
}
