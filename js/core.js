/* 말씀 — 공통: 선택자, 저장소, 상태, 책 데이터 불러오기 */
const $ = s => document.querySelector(s);
const store = {
  get(k, d){ try{ const v = localStorage.getItem('bible.'+k); return v==null?d:JSON.parse(v);}catch(e){return d;} },
  set(k, v){ try{ localStorage.setItem('bible.'+k, JSON.stringify(v)); }catch(e){} }
};
let BOOKS = [], cache = {};
const state = { b:0, c:0, mode: store.get('mode','both'), fs: store.get('fs',17), sel:new Set() };
// 하이라이트·저장한 구절은 js/userdata.js(UD)에 저장 — 아래는 화면용으로 만든 보기
let marks = {}, saved = [];   // marks["b-c-v"] = 기록 id, saved = [{id,b,c,v,t}]
function refreshViews(){
  marks = {}; UD.list('highlight').forEach(r=>{ for(let v=r.ref.v; v<=(r.ref.v2||r.ref.v); v++) marks[`${r.ref.b}-${r.ref.c}-${v}`]=r.id; });
  saved = UD.list('saved').sort((a,b)=>b.createdAt-a.createdAt).map(r=>({id:r.id,b:r.ref.b,c:r.ref.c,v:r.ref.v,t:r.data.text}));
}
refreshViews(); UD.onChange(refreshViews);

const pad = n => String(n).padStart(2,'0');
async function loadBook(i){
  if(!cache[i]) cache[i] = fetch(`data/${pad(i+1)}.json`).then(r=>{ if(!r.ok) throw 0; return r.json(); });
  return cache[i];
}
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.h); toast.h=setTimeout(()=>t.classList.remove('show'),1500); }
const esc = s => s.replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
