// 말씀 — 하이브리드 검색 (키워드 + 비슷한 말 + 맥락 DB)
// keyword  : 같은 단어(어절)가 들어 있는 구절 · BM25 방식 점수
// vector   : 글자 2-gram TF-IDF 코사인 유사도 — 띄어쓰기·어미가 달라도 비슷하면 찾음
// context  : 성경 이야기 178개에 붙인 일상 표현(“세상 만든 이야기” 등)으로 맥락 추천
(function(){
const PARTICLES = ['으로부터','에게서','으로서','이었던','되었던','하였던','했었던','이라는','이라고','에서는','으로는','이었지','였었지','이었나',
  '했던','됐던','되던','하던','였던','였지','이야','에서','에게','으로','부터','까지','이랑','하고','처럼','보다','라는','라고','이고','이며','이나','이든',
  '될','할','던','거','건','게','이','가','을','를','은','는','에','의','로','와','과','도','만','랑','요','죠','지','네','야','나','든'];
const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const grams = s => { const t=s.replace(/\s+/g,''); const out=[]; if(t.length===1) out.push(t); for(let i=0;i<t.length-1;i++) out.push(t.slice(i,i+2)); return out; };
function stem(w){ for(const p of PARTICLES){ if(w.length>p.length+1 && w.endsWith(p)) return w.slice(0,-p.length); } return w; }

let IDX=null;
function build(books, getChapters){
  // books: [{kor}], getChapters(b) → [[ [ko,en], ... ], ...]
  const V=[], postings=new Map(), df=new Map();
  books.forEach((B,b)=>{ getChapters(b).forEach((vs,c)=>vs.forEach(([ko,en],i)=>{
    const id=V.length; const text=ko||en||''; V.push({b,c,v:i+1,t:text,n:norm(text)});
    const tf=new Map(); grams(norm(text)).forEach(g=>tf.set(g,(tf.get(g)||0)+1));
    tf.forEach((n,g)=>{ let p=postings.get(g); if(!p){ p=[]; postings.set(g,p); } p.push(id,n); df.set(g,(df.get(g)||0)+1); });
  })); });
  const N=V.length, idf=g=>Math.log(1+N/(df.get(g)||N));
  const norms=new Float32Array(N);
  postings.forEach((p,g)=>{ const w=idf(g); for(let i=0;i<p.length;i+=2){ const x=p[i+1]*w; norms[p[i]]+=x*x; } });
  for(let i=0;i<N;i++) norms[i]=Math.sqrt(norms[i])||1;
  IDX={V,postings,idf,norms,N};
}

function analyze(q, DB){
  const words = norm(q).split(' ').filter(Boolean);
  const stops = new Set(DB.stop);
  const terms=[]; words.forEach(w=>{ if(stops.has(w)) return; let s=stem(w); if(stops.has(s)||s.length<1) return; if(s.length===1 && !/[가-힣]/.test(s)) return; if(!terms.includes(s)) terms.push(s); });
  const expanded=[]; terms.forEach(t=>{ Object.entries(DB.syn).forEach(([k,list])=>{ if(t.includes(k)||k.includes(t)&&t.length>=2) list.forEach(x=>{ if(!terms.includes(x)&&!expanded.includes(x)) expanded.push(x); }); }); });
  return {terms, expanded};
}

function keywordScores(terms, expanded){
  const {V,N}=IDX, sc=new Float32Array(N), hits=new Map(), core=new Uint8Array(N);
  const all=[...terms.map(t=>[t,1]), ...expanded.map(t=>[t,.55])];
  all.forEach(([t,wt])=>{ if(t.length<1) return; let df=0; const ids=[];
    for(let i=0;i<N;i++){ if(V[i].n.includes(t)){ df++; ids.push(i); } }
    if(!df) return; const idf=Math.log(1+(N-df+.5)/(df+.5));
    ids.forEach(i=>{ const len=V[i].n.length; sc[i]+=wt*idf*(2.2/(1+1.2*(0.25+0.75*len/60))); if(wt===1) core[i]++; const h=hits.get(i)||[]; h.push(t); hits.set(i,h); }); });
  // reward verses that contain more of the question's key words
  if(terms.length>1) for(let i=0;i<N;i++) if(sc[i]) sc[i]*=Math.pow((core[i]+0.5)/(terms.length+0.5),2);
  return {sc,hits};
}
function vectorScores(text){
  const {postings,idf,norms,N}=IDX, sc=new Float32Array(N);
  const qtf=new Map(); grams(norm(text)).forEach(g=>qtf.set(g,(qtf.get(g)||0)+1));
  let qn=0; qtf.forEach((n,g)=>{ const w=n*idf(g); qn+=w*w; const p=postings.get(g); if(!p) return; const wg=idf(g);
    for(let i=0;i<p.length;i+=2) sc[p[i]]+=w*p[i+1]*wg; });
  qn=Math.sqrt(qn)||1; for(let i=0;i<N;i++) if(sc[i]) sc[i]/= (qn*norms[i]);
  return sc;
}
function storyScores(DB, q, terms, expanded){
  const qg=new Set(grams(norm([...terms,...expanded].join(' ')||q)));
  return DB.stories.map(s=>{
    const text=norm(s.t+' '+s.k); const sg=grams(text); const set=new Set(sg);
    let inter=0; qg.forEach(g=>{ if(set.has(g)) inter++; });
    const matched=[...terms,...expanded].filter(t=>t.length>=1 && text.includes(t));
    const score = (qg.size? inter/Math.sqrt(qg.size*Math.max(set.size,1)) : 0) + matched.filter(m=>terms.includes(m)).length*0.18 + matched.length*0.05;
    return {s,score,matched};
  }).filter(x=>x.score>0.12).sort((a,b)=>b.score-a.score);
}

function search(q, DB, mode='hybrid'){
  const {terms,expanded}=analyze(q,DB);
  const core=terms.join(' ')||norm(q);
  const kw = (mode!=='vector') ? keywordScores(terms, mode==='hybrid'?expanded:[]) : null;
  const vec = (mode!=='keyword') ? vectorScores(core + (mode==='hybrid' && expanded.length ? ' '+expanded.join(' ') : '')) : null;
  const stories = mode==='hybrid' ? storyScores(DB,q,terms,expanded) : [];
  const {N,V}=IDX; const out=[];
  const kmax = kw ? Math.max(...kw.sc,1e-6) : 1, vmax = vec ? Math.max(...vec,1e-6) : 1;
  const boost=new Map();
  stories.slice(0,3).forEach((x,rank)=>{ const s=x.s; const w=x.score*(1-rank*.2);
    for(let i=0;i<N;i++){ const r=V[i]; if(r.b!==s.b) continue; const inRange=(r.c>s.c||(r.c===s.c&&r.v>=s.v))&&(r.c<s.c2||(r.c===s.c2&&r.v<=s.v2));
      if(inRange){ const first=(r.c===s.c&&r.v===s.v); boost.set(i,(boost.get(i)||0)+w*(first?1.2:.25)); } } });
  for(let i=0;i<N;i++){
    const k = kw ? kw.sc[i]/kmax : 0, v = vec ? vec[i]/vmax : 0, b = boost.get(i)||0;
    const s = mode==='keyword' ? k : mode==='vector' ? v : (0.45*k + 0.40*v + 1.1*b);
    if(s>0.04) out.push({i,s,k,v,b});
  }
  out.sort((a,b)=>b.s-a.s);
  const top=out.slice(0,40).map(x=>({...V[x.i], score:x.s, how: x.b>0.05?'context':(x.k>=x.v?'keyword':'vector'), hits:(kw&&kw.hits.get(x.i))||[]}));
  return {terms, expanded, stories:stories.slice(0,3), verses:top, total:out.length};
}
window.BibleSearch = { build, search, analyze, ready:()=>!!IDX };
})();
