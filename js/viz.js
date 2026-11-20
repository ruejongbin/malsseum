/* 말씀 — 시각화 카드: 인물(가계도) · 시간(타임라인) */
/* ---------- visual card ---------- */
const VIZ = {};   // book index -> data promise (only Genesis for now)
function loadViz(b){
  const file = {0:'01', 8:'09', 31:'32'}[b];
  if(!file) return Promise.resolve(null);
  if(!VIZ[b]) VIZ[b] = fetch(`data/viz-${file}.json`).then(r=>r.json()).catch(()=>null);
  return VIZ[b];
}
let LAND = null;
function loadLand(){
  if(!LAND) LAND = fetch('data/land-50m.json').then(r=>r.json()).then(t=>topojson.feature(t,t.objects.land)).catch(()=>null);
  return LAND;
}
const vz = { n:0, tab: store.get('vzTab','people'), person:null, data:null, rec:null };
const BC = y => y==null ? '' : (y<=0 ? `BC ${(1-y).toLocaleString()}년` : `AD ${y}년`);

async function openViz(n){
  const B = BOOKS[state.b];
  const ch = (await loadBook(state.b))[state.c];
  vz.n = n; vz.person = null; gmPick = 0;
  $('#vzRef').innerHTML = `${B.kor} ${state.c+1}:${n}<small>${B.eng} ${state.c+1}:${n}</small>`;
  const [ko,en] = ch[n-1];
  $('#vzText').textContent = state.mode==='en' ? en : (ko||en);
  vz.data = await loadViz(state.b);
  vz.rec = vz.data ? (vz.data.verses[state.c]||[])[n-1] : null;
  if(vz.rec){
    const [ps,ls] = vz.rec;
    const pc = ps.filter(i=>!vz.data.people[i].notree).length;
    const counts = {people:ps.length, place:ls.length};
    document.querySelectorAll('#vzTabs button').forEach(b=>{
      const c = counts[b.dataset.t]; b.innerHTML = {people:'인물',place:'장소',time:'시간'}[b.dataset.t] + (c?`<i>${c}</i>`:'');
    });
    // choose a sensible tab: keep the last one if it has something, otherwise first non-empty
    if(vz.tab==='people' && !pc) vz.tab = ls.length ? 'place' : 'time';
    else if(vz.tab==='place' && !ls.length) vz.tab = pc ? 'people' : 'time';
  }
  $('#vzTabs').hidden = !vz.rec;
  $('#aPlay').hidden = !(window.VERSE_ANIM && VERSE_ANIM[`${state.b}-${state.c}-${n}`]);
  drawViz();
  openSheet('#vizSheet');
  const el = document.getElementById('v'+n);
  if(el){ const top = el.getBoundingClientRect().top + scrollY - 120; window.scrollTo({top, behavior:'smooth'}); }
}
document.querySelectorAll('#vzTabs button').forEach(b=>b.onclick=()=>{ vz.tab=b.dataset.t; store.set('vzTab',vz.tab); drawViz(); });

function drawViz(){
  document.querySelectorAll('#vzTabs button').forEach(b=>b.classList.toggle('on', b.dataset.t===vz.tab));
  const body = $('#vzBody');
  if(!vz.rec){
    body.innerHTML = `<div class="vz-stage"><div class="vz-empty">그림 자료는 지금 <b>창세기</b> · <b>사무엘상</b> · <b>요나 1장</b>에 준비돼 있어요.<br>다른 책은 차례로 추가할 예정이에요.</div></div>`;
    return;
  }
  if(vz.tab==='people') drawPeople(body);
  else if(vz.tab==='place') drawPlaces(body);
  else drawTime(body);
}

/* --- people: family tree --- */
function drawPeople(body){
  const D = vz.data, [ps] = vz.rec;
  const list = ps.filter(i=>!D.people[i].notree);
  const godOnly = ps.length && !list.length;
  if(!list.length){
    body.innerHTML = `<div class="vz-stage"><div class="vz-empty">${godOnly?'이 구절에는 하나님만 나와요.<br>가족 관계도는 사람 인물에게만 그려져요.':'이 구절에는 이름이 나오는 인물이 없어요.'}<br>‘장소’나 ‘시간’ 탭을 눌러 보세요.</div></div>`;
    return;
  }
  if(vz.person==null || !(vz.person in D.people)) vz.person = list[0];
  const chips = list.length>1 || vz.person!==list[0] ? `<div class="chips">${list.map(i=>`<button data-p="${i}" class="${i===vz.person?'on':''}">${D.people[i].n}</button>`).join('')}${list.includes(vz.person)?'':`<button class="on">${D.people[vz.person].n}</button>`}</div>` : '';
  body.innerHTML = chips + `<div class="vz-stage" id="treeStage"></div><div class="vz-note" id="treeNote"></div>`;
  body.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{ vz.person=+b.dataset.p; drawPeople(body); });
  drawTree(vz.person);
}
function drawTree(pi){
  const D = vz.data, P = D.people, me = P[pi];
  const cap = (a,k)=>a.slice(0,k);
  const parents = [...me.f, ...me.m];
  const sibs = cap(me.s.filter(i=>i!==pi), 6);
  const partners = cap(me.p, 3);
  const kids = cap(me.c, 12);
  const NW=70, NH=30, GX=10, GY=58;
  const rows = [parents, [...sibs, pi, ...partners], kids];
  const widthOf = r => r.length*NW + Math.max(0,r.length-1)*GX;
  const W = Math.max(340, ...rows.map(widthOf)) + 20;
  const yFor = [16, 16+NH+GY, 16+2*(NH+GY)];
  const used = rows.map(r=>r.length>0);
  // collapse empty parent row
  const y0 = used[0]?0:1;
  const H = (used[2]? yFor[2] : yFor[1]) - yFor[y0] + NH + 40;
  const pos = {};
  rows.forEach((r,ri)=>{ const w=widthOf(r); let x=(W-w)/2; r.forEach(i=>{ pos[ri+':'+i]={x, y:yFor[ri]-yFor[y0]+16}; x+=NW+GX; }); });
  let svg = `<svg class="wide" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  const mid = (a)=>({x:a.x+NW/2, y:a.y});
  // marriage lines
  partners.forEach((q,k)=>{ const a=pos['1:'+pi], b=pos['1:'+q];
    if(k===0) svg+=`<path class="edge marry" d="M${a.x+NW} ${a.y+NH/2-3}H${b.x}M${a.x+NW} ${a.y+NH/2+3}H${b.x}"/>`;
    else { const x1=a.x+NW/2, x2=b.x+NW/2, yy=a.y; svg+=`<path class="edge marry" d="M${x1} ${yy}C${x1} ${yy-22-k*6},${x2} ${yy-22-k*6},${x2} ${yy}"/>`; } });
  if(parents.length===2){ const a=pos['0:'+parents[0]], b=pos['0:'+parents[1]]; svg+=`<path class="edge marry" d="M${a.x+NW} ${a.y+NH/2-3}H${b.x}M${a.x+NW} ${a.y+NH/2+3}H${b.x}"/>`; }
  // parents -> me + siblings
  if(parents.length){
    const ps=parents.map(i=>pos['0:'+i]); const px=(ps[0].x+ps[ps.length-1].x+NW)/2, py=ps[0].y+NH/2;
    const busY = pos['1:'+pi].y-GY/2;
    const kidsRow=[...sibs,pi].map(i=>pos['1:'+i]);
    svg+=`<path class="edge" d="M${px} ${parents.length===2?py:py+NH/2}V${busY}"/>`;
    svg+=`<path class="edge" d="M${Math.min(px,...kidsRow.map(k=>k.x+NW/2))} ${busY}H${Math.max(px,...kidsRow.map(k=>k.x+NW/2))}"/>`;
    kidsRow.forEach(k=>svg+=`<path class="edge" d="M${k.x+NW/2} ${busY}V${k.y}"/>`);
  }
  // me -> children
  if(kids.length){
    const a=pos['1:'+pi]; const sx = partners.length ? (a.x+NW + pos['1:'+partners[0]].x)/2 : a.x+NW/2;
    const sy = partners.length ? a.y+NH/2 : a.y+NH;
    const ks=kids.map(i=>pos['2:'+i]); const busY=ks[0].y-GY/2;
    svg+=`<path class="edge" d="M${sx} ${sy}V${busY}"/>`;
    svg+=`<path class="edge" d="M${Math.min(sx,ks[0].x+NW/2)} ${busY}H${Math.max(sx,ks[ks.length-1].x+NW/2)}"/>`;
    ks.forEach(k=>svg+=`<path class="edge" d="M${k.x+NW/2} ${busY}V${k.y}"/>`);
  }
  const inVerse = new Set(vz.rec[0]);
  Object.entries(pos).forEach(([k,p])=>{
    const i=+k.split(':')[1], o=P[i];
    const rel = o.f.length+o.m.length+o.c.length+o.p.length+o.s.length;
    const cls = i===pi?'focus':(inVerse.has(i)?'inverse':'');
    const name = o.n.length>6? o.n.slice(0,6)+'…' : o.n;
    svg+=`<g class="node ${cls} ${i!==pi&&rel?'link':''}" data-p="${i}"><rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="8"/><text x="${p.x+NW/2}" y="${p.y+NH/2+4.5}" text-anchor="middle">${esc(name)}</text></g>`;
  });
  const lbl=(ri,t)=>{ const r=rows[ri]; if(!r.length) return; const p=pos[ri+':'+r[0]]; svg+=`<text class="rowlbl" x="${Math.max(4,p.x-6)}" y="${p.y-6}">${t}</text>`; };
  lbl(0,'부모'); lbl(2,'자녀');
  if(partners.length){ const p=pos['1:'+partners[0]]; svg+=`<text class="rowlbl" x="${p.x+NW/2}" y="${p.y+NH+13}" text-anchor="middle">${partners.length>1?'아내들':(me.g==='F'?'남편':'아내')}</text>`; }
  svg+='</svg>';
  $('#treeStage').innerHTML = svg;
  const st=$('#treeStage'), fp=pos['1:'+pi]; st.scrollLeft = Math.max(0, fp.x+NW/2 - st.clientWidth/2);
  $('#treeStage').querySelectorAll('.node.link').forEach(g=>g.onclick=()=>{ vz.person=+g.dataset.p; drawPeople($('#vzBody')); });
  const life = me.by!=null ? `${BC(me.by)} 출생${me.dy!=null?` · ${BC(me.dy)} 죽음 (${me.dy-me.by}세)`:''}` : '';
  const more = [me.s.length>sibs.length+ (me.s.includes(pi)?1:0)?`형제 ${me.s.length}명 중 일부만`:null, me.c.length>12?`자녀 ${me.c.length}명 중 12명만`:null].filter(Boolean);
  $('#treeNote').innerHTML = `<b>${esc(me.n)}</b>${me.n!==me.en?` <span style="font-family:var(--en);font-style:italic">${esc(me.en)}</span>`:''}${life?' · '+life:''}<br>`+
    `이름을 누르면 그 사람의 가족으로 옮겨가요.${more.length?' ('+more.join(', ')+' 표시)':''}`;
}


/* --- time: timeline --- */
function drawTime(body){
  const D = vz.data, [ps,,es,year] = vz.rec;
  const W=340, L=14, R=W-14;
  // each book has its own span and three eras; each era gets the same width
  const TL = {
    0: [[-4004,-2347,'태초 ~ 홍수','#c9a27a'],[-2347,-1995,'홍수 이후','#8fa9b8'],[-1995,-1630,'족장 시대','#a7b48a']],
    8: [[-1170,-1094,'엘리 · 사무엘','#c9a27a'],[-1094,-1055,'사울 왕','#8fa9b8'],[-1055,-1010,'다윗 왕','#a7b48a']],
    31: [[-930,-860,'왕국 분열 후','#c9a27a'],[-860,-790,'엘리사 · 요나','#8fa9b8'],[-790,-722,'북이스라엘 멸망까지','#a7b48a']],
  }[state.b];
  const eras = TL.map(([a,b,t,c])=>({a,b,t,c}));
  const ymin=TL[0][0], ymax=TL[TL.length-1][1];
  const brk=[...TL.map(e=>e[0]), ymax], nE=TL.length, seg=(R-L)/nE;
  const ev = D.events.filter(e=>!e.life && e.y!=null && e.y>=ymin && e.y<=ymax);
  const x = y=>{ y=Math.min(Math.max(y,ymin),ymax); let k=0; while(k<nE-1 && y>brk[k+1]) k++; return L+seg*k+(y-brk[k])/(brk[k+1]-brk[k])*seg; };
  const lifes = ps.map(i=>D.people[i]).filter(p=>!p.notree && p.by!=null && p.dy!=null).slice(0,6);
  const top = 30, lifeY = top+64;
  const H = lifeY + lifes.length*24 + 18;
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  eras.forEach(e=>{ svg+=`<rect class="era" x="${x(e.a)}" y="${top}" width="${x(e.b)-x(e.a)}" height="16" fill="${e.c}" rx="3"/><text class="tl-era" x="${(x(e.a)+x(e.b))/2}" y="${top-7}" text-anchor="middle">${e.t}</text>`; });
  ev.forEach(e=>{ const h=es.some(k=>D.events[k]===e); svg+=`<circle class="tl-ev ${h?'hot':''}" cx="${x(e.y)}" cy="${top+30}" r="${h?4:2}"/>`; });
  brk.map((y,i)=>[y, i===0?'start':(i===brk.length-1?'end':'middle')]).forEach(([y,a])=>svg+=`<text class="tl-txt" x="${x(y)}" y="${top+50}" text-anchor="${a}">BC ${(1-y).toLocaleString()}</text>`);
  lifes.forEach((p,k)=>{ const yy=lifeY+k*24; const a=x(p.by), b=Math.max(x(p.dy),a+3);
    const inside = b-a>90;
    svg+=`<rect class="life" x="${a}" y="${yy}" width="${b-a}" height="16" rx="4"/><text class="life-lbl" x="${inside?a+6:(a>W/2?a-6:b+6)}" y="${yy+12}" text-anchor="${inside||a<=W/2?'start':'end'}">${esc(p.n)} · ${p.dy-p.by}년</text>`; });
  if(year!=null){ const nx=x(year); svg+=`<line class="now" x1="${nx}" x2="${nx}" y1="${top-2}" y2="${H-6}"/>`; }
  svg+='</svg>';
  const evNames = es.map(k=>D.events[k]).filter(e=>!e.life).map(e=>`<b>${esc(e.t)}</b>`);
  const lifeNames = es.map(k=>D.events[k]).filter(e=>e.life).map(e=>esc(e.t));
  body.innerHTML = `<div class="vz-stage">${svg}</div><div class="vz-note">`+
    (year!=null? `빨간 세로선이 이 구절의 시점, 약 <b>${BC(year)}</b>이에요.`:'이 구절은 정확한 시점을 정하기 어려워요.')+
    (evNames.length? `<br>사건: ${evNames.join(', ')}`: (lifeNames.length?`<br>${lifeNames.join(', ')} 중의 일이에요.`:''))+
    (lifes.length? '<br>막대는 이 구절에 나오는 사람이 살았던 기간이에요.':'')+
    '<br>세 시대를 같은 너비로 그려서, 시대마다 눈금 간격이 달라요.'+
    `<br><span style="font-size:12px">연대는 전통적인 성경 연대 계산(F. N. Jones) 기준이라 학자마다 다를 수 있어요.</span></div>`;
}
