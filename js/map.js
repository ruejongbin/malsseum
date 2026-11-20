/* 말씀 — 시각화 카드: 장소(구글 지도) */
/* --- places: Google Maps (satellite) --- */
// Optional: paste a Maps Embed API key here for the official embed. Left empty, the keyless embed is used.
const GMAPS_KEY = '';
function gmapSrc(P){
  return GMAPS_KEY
    ? `https://www.google.com/maps/embed/v1/view?key=${GMAPS_KEY}&center=${P.lat},${P.lon}&zoom=10&maptype=satellite&language=ko`
    : `https://maps.google.com/maps?q=${P.lat},${P.lon}&t=k&z=10&hl=ko&output=embed`;
}
let gmPick = 0;
function drawPlaces(body){
  const D = vz.data, [,ls] = vz.rec;
  const chap = D.verses[state.c]||[]; const order=[];
  chap.forEach(r=>r&&r[1].forEach(i=>{ if(!order.includes(i)) order.push(i); }));
  const geo = i=>D.places[i].lat!=null;
  const own = ls.filter(geo);
  const list = (own.length? own : order.filter(geo)).slice(0,6);
  const unknown = [...new Set([...ls, ...order])].filter(i=>!geo(i)).map(i=>D.places[i].n);
  if(!list.length){ body.innerHTML = `<div class="vz-stage"><div class="vz-empty">이 장에는 위치를 알 수 있는 장소가 없어요.</div></div>`; return; }
  if(gmPick>=list.length) gmPick=0;
  const P = D.places[list[gmPick]];
  body.innerHTML =
    (list.length>1? `<div class="chips">${list.map((i,k)=>`<button data-k="${k}" class="${k===gmPick?'on':''}">${esc(D.places[i].n)}</button>`).join('')}</div>`:'') +
    `<div class="gm-wrap"><iframe class="gm" src="${gmapSrc(P)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen title="${esc(P.n)} 구글 지도"></iframe></div>` +
    `<div class="vz-note">${own.length? `<b>${esc(P.n)}</b> — 이 구절에 나오는 장소예요.` : `이 구절에는 장소가 나오지 않아서, 이 장에 나오는 <b>${esc(P.n)}</b>을(를) 보여드려요.`}`+
    `<br>지도를 움직이거나 확대해서 주변 지형을 볼 수 있어요.`+
    (unknown.length? `<br>정확한 위치를 알 수 없는 곳: ${unknown.map(esc).join(', ')}`:'')+`</div>`;
  body.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{ gmPick=+b.dataset.k; drawPlaces(body); });
}
