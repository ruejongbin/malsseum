/* 말씀 — 꾹 누르기 → 영상/애니메이션 */
/* ---------- long press → animation ---------- */
const lp = { timer:null, raf:null, fired:false, x:0, y:0, v:null, t0:0 };
const HOLD = 550;
function lpCancel(){ clearTimeout(lp.timer); cancelAnimationFrame(lp.raf); $('#press').classList.remove('on'); lp.v=null; }
$('#reader').addEventListener('pointerdown', e=>{
  const v=e.target.closest('.verse'); if(!v || e.button>0 || e.target.closest('.xr')) return;
  lp.v=v; lp.x=e.clientX; lp.y=e.clientY; lp.t0=performance.now(); lp.fired=false;
  const pr=$('#press'); pr.style.left=lp.x+'px'; pr.style.top=lp.y+'px'; pr.style.setProperty('--p',0);
  const tick=()=>{ const p=Math.min(1,(performance.now()-lp.t0)/HOLD); if(p>0.15) pr.classList.add('on'); pr.style.setProperty('--p',p); if(p<1) lp.raf=requestAnimationFrame(tick); };
  lp.raf=requestAnimationFrame(tick);
  lp.timer=setTimeout(()=>{ const n=+lp.v.dataset.v; lpCancel(); lp.fired=true; try{navigator.vibrate&&navigator.vibrate(12);}catch(_){} playAnim(n); }, HOLD);
});
$('#reader').addEventListener('pointermove', e=>{ if(lp.v && Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>10) lpCancel(); });
['pointerup','pointercancel','pointerleave'].forEach(ev=>$('#reader').addEventListener(ev, lpCancel));
$('#reader').addEventListener('contextmenu', e=>{ if(e.target.closest('.verse')) e.preventDefault(); });

let animCtl=null;
/* 영상 소리 켜기/끄기 — 선택은 기억해 둔다 */
const SND_ON='<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const SND_OFF='<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6M22 9l-5 6"/></svg>';
function applySound(){ const on=store.get('sound',false); const b=$('#animSound'); b.innerHTML=on?SND_ON:SND_OFF; b.setAttribute('aria-label',on?'소리 끄기':'소리 켜기');
  $('#animStage').querySelectorAll('video,audio').forEach(v=>{ v.muted=!on; if(on) v.volume=1; }); }
$('#animSound').onclick=e=>{ e.stopPropagation(); const on=!store.get('sound',false); store.set('sound',on); applySound(); toast(on?'소리를 켰어요':'소리를 껐어요'); };
function playAnim(n){
  const key=`${state.b}-${state.c}-${n}`;
  const make = window.VERSE_ANIM && VERSE_ANIM[key];
  if(!make){ toast('영상은 지금 창세기 1:3 · 사무엘상 17:49 · 요나 1:17에 준비돼 있어요'); return; }
  closeSheets(); clearSel();
  const st=$('#animStage'); const box=$('#anim');
  box.classList.remove('done','lit');
  animCtl && animCtl.stop();
  animCtl = make(st);
  st.addEventListener('anim-done', ()=>box.classList.add('done'), {once:false});
  new MutationObserver(()=>box.classList.toggle('lit', st.classList.contains('lit'))).observe(st,{attributes:true,attributeFilter:['class']});
  box.classList.add('show'); applySound();
}
function closeAnim(){ const box=$('#anim'); box.classList.remove('show'); setTimeout(()=>{ animCtl&&animCtl.stop(); animCtl=null; $('#animStage').innerHTML=''; $('#animStage').className=''; box.classList.remove('done','lit','land'); },400); }
$('#aPlay').onclick=()=>playAnim(vz.n);
$('#animClose').onclick=closeAnim; $('#animDone').onclick=closeAnim;
$('#animAgain').onclick=()=>{ $('#anim').classList.remove('done'); animCtl&&animCtl.restart(); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && $('#anim').classList.contains('show')) closeAnim(); });
