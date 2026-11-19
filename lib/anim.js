/* Verse animations. window.VERSE_ANIM["book-chapter-verse"] = (stage) => controller */
(function(){
const A = window.VERSE_ANIM = window.VERSE_ANIM || {};
const ease = {
  outExpo: t => t>=1 ? 1 : 1 - Math.pow(2, -10*t),
  inOut: t => t<.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2,
  out: t => 1 - Math.pow(1-t, 3),
};
const clamp = (v,a=0,b=1) => Math.max(a, Math.min(b, v));
const seg = (t, a, b) => clamp((t-a)/(b-a));
const mix = (a,b,t) => a + (b-a)*t;
const mixRGB = (c1,c2,t) => `rgb(${c1.map((v,i)=>Math.round(mix(v,c2[i],t))).join(',')})`;

/* Genesis 1:3 — "하나님이 가라사대 빛이 있으라 하시매 빛이 있었고" */
A['0-0-3'] = function(stage){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  stage.innerHTML = `
    <canvas></canvas>
    <div class="an-text">
      <div class="an-pre">땅이 혼돈하고 공허하며<br>흑암이 깊음 위에 있고</div>
      <div class="an-say">하나님이 가라사대</div>
      <div class="an-cmd">빛이 있으라</div>
      <div class="an-then">하시매 <b>빛이 있었고</b></div>
      <div class="an-ref">창세기 1:3</div>
    </div>`;
  const cv = stage.querySelector('canvas'), cx = cv.getContext('2d');
  const el = s => stage.querySelector(s);
  let W=0, H=0, dpr=1;
  function size(){ dpr=Math.min(2, devicePixelRatio||1); W=stage.clientWidth; H=stage.clientHeight; cv.width=W*dpr; cv.height=H*dpr; cx.setTransform(dpr,0,0,dpr,0,0); }
  size(); addEventListener('resize', size);

  // particles: dust in the dark, then light motes flying out
  const rnd = (a,b)=>a+Math.random()*(b-a);
  const dust = Array.from({length:90}, ()=>({x:Math.random(), y:Math.random()*0.62, r:rnd(.4,1.4), s:rnd(.002,.008), a:rnd(.08,.3)}));
  const motes = Array.from({length:140}, ()=>({ang:rnd(0,Math.PI*2), sp:rnd(.15,1), r:rnd(.6,2.4), d:rnd(0,.6)}));
  const rays = Array.from({length:28}, (_,i)=>({ang:i/28*Math.PI*2 + rnd(-.06,.06), w:rnd(.012,.04), len:rnd(.7,1.15)}));

  const T = reduce ? {say:.2, cmd:.6, burst:1.0, then:1.6, end:2.2} : {say:1.6, cmd:3.4, burst:4.4, then:7.0, end:8.6};
  const DARK=[5,7,12], DAWN_TOP=[38,58,104], DAY_TOP=[246,228,190], DAY_BOT=[255,247,228];
  let t0=null, raf=0, done=false;

  function frame(now){
    if(t0==null) t0=now;
    const t=(now-t0)/1000;
    const horizon = H*0.64, lx=W/2, ly=H*0.40;
    const burst = seg(t, T.burst, T.burst+ (reduce?.4:1.6));        // light growth
    const day = ease.inOut(seg(t, T.burst+.2, T.burst+(reduce?.8:3.0)));  // sky turning to day

    // sky
    const g = cx.createLinearGradient(0,0,0,horizon);
    const top = day<.5 ? mixRGB(DARK, DAWN_TOP, day*2) : mixRGB(DAWN_TOP, DAY_TOP, day*2-1);
    const bot = mixRGB(DARK, DAY_BOT, day);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    cx.fillStyle=g; cx.fillRect(0,0,W,horizon+1);

    // deep waters
    const wg = cx.createLinearGradient(0,horizon,0,H);
    wg.addColorStop(0, mixRGB([8,12,20],[214,190,150],day));
    wg.addColorStop(1, mixRGB([2,3,6],[120,104,92],day));
    cx.fillStyle=wg; cx.fillRect(0,horizon,W,H-horizon);

    // drifting fog in the dark (fades away with the light)
    const fogA = (1-day)*0.5;
    if(fogA>0.01) for(let k=0;k<3;k++){
      const fx = W*(0.5+0.35*Math.sin(t*0.12+k*2.1)), fy = H*(0.3+0.12*Math.cos(t*0.09+k));
      const fr = cx.createRadialGradient(fx,fy,0,fx,fy,W*0.7);
      fr.addColorStop(0,`rgba(40,52,80,${fogA*0.35})`); fr.addColorStop(1,'rgba(40,52,80,0)');
      cx.fillStyle=fr; cx.fillRect(0,0,W,horizon);
    }
    // "the Spirit moved upon the waters": faint wind streaks before the light
    const wind = (1-seg(t,T.burst-.6,T.burst+.6)) * (reduce?0:1);
    if(wind>0){
      cx.strokeStyle=`rgba(170,190,220,${0.10*wind})`; cx.lineWidth=1;
      for(let k=0;k<7;k++){
        const y=horizon-8-k*7, off=((t*60+k*90)%(W+300))-300;
        cx.beginPath(); cx.moveTo(off,y); cx.bezierCurveTo(off+80,y-6,off+160,y+6,off+260,y-2); cx.stroke();
      }
    }
    // waves
    for(let k=0;k<14;k++){
      const y = horizon + 6 + k*k*2.2, amp = 1.2 + k*0.35, spd = 0.6 + k*0.05;
      cx.beginPath();
      for(let x=0;x<=W;x+=8) cx.lineTo(x, y + Math.sin(x*0.018 + t*spd + k)*amp);
      cx.strokeStyle = day>0.02 ? `rgba(255,236,190,${(0.06+0.22*day)*(1-k/16)})` : `rgba(120,140,170,${0.07*(1-k/16)})`;
      cx.lineWidth = 1; cx.stroke();
    }
    // dust
    dust.forEach(p=>{ p.x=(p.x+p.s*0.016)%1; const a=p.a*(1-day);
      if(a>0.01){ cx.fillStyle=`rgba(190,200,220,${a})`; cx.beginPath(); cx.arc(p.x*W, p.y*H + Math.sin(t+p.x*9)*4, p.r, 0, 7); cx.fill(); } });

    // the light
    if(t>T.burst-.15){
      const b = ease.outExpo(burst);
      const R = Math.max(W,H);
      // glow
      const gl = cx.createRadialGradient(lx,ly,0,lx,ly,R*(0.15+0.9*b));
      gl.addColorStop(0,`rgba(255,255,245,${0.95})`);
      gl.addColorStop(0.08,`rgba(255,244,210,${0.85*b+0.1})`);
      gl.addColorStop(0.35,`rgba(255,214,140,${0.35*b})`);
      gl.addColorStop(1,'rgba(255,200,120,0)');
      cx.fillStyle=gl; cx.fillRect(0,0,W,H);
      // rays
      if(!reduce){
        cx.save(); cx.translate(lx,ly); cx.rotate(t*0.04);
        cx.globalCompositeOperation='lighter';
        rays.forEach(r=>{
          const L = R*r.len*b; const a=0.10*(1-day*0.6)*(0.6+0.4*Math.sin(t*1.3+r.ang*5));
          const rg=cx.createLinearGradient(0,0,L,0); rg.addColorStop(0,`rgba(255,240,200,${a})`); rg.addColorStop(1,'rgba(255,240,200,0)');
          cx.fillStyle=rg; cx.save(); cx.rotate(r.ang); cx.beginPath(); cx.moveTo(0,0); cx.lineTo(L,-L*r.w); cx.lineTo(L,L*r.w); cx.closePath(); cx.fill(); cx.restore();
        });
        cx.restore(); cx.globalCompositeOperation='source-over';
        // shockwave ring
        const sw = seg(t,T.burst,T.burst+1.4);
        if(sw>0 && sw<1){ cx.strokeStyle=`rgba(255,250,235,${0.5*(1-sw)})`; cx.lineWidth=2+6*(1-sw);
          cx.beginPath(); cx.arc(lx,ly,R*0.9*ease.out(sw),0,7); cx.stroke(); }
        // motes
        motes.forEach(m=>{ const p=seg(t,T.burst+m.d,T.burst+m.d+3.2); if(p<=0||p>=1) return;
          const d=R*0.6*ease.out(p)*m.sp; const mx=lx+Math.cos(m.ang)*d, my=ly+Math.sin(m.ang)*d*0.8;
          cx.fillStyle=`rgba(255,246,220,${0.8*(1-p)})`; cx.beginPath(); cx.arc(mx,my,m.r,0,7); cx.fill(); });
      }
      // reflection column on the water
      const rf = cx.createLinearGradient(0,horizon,0,H);
      rf.addColorStop(0,`rgba(255,240,200,${0.55*b})`); rf.addColorStop(1,'rgba(255,240,200,0)');
      cx.fillStyle=rf;
      for(let y=horizon+3;y<H;y+=5){ const w=(14+ (y-horizon)*0.5)*b*(0.7+0.3*Math.sin(y*0.3+t*3)); cx.fillRect(lx-w/2,y,w,2); }
      // core
      cx.fillStyle='rgba(255,255,250,1)'; cx.beginPath(); cx.arc(lx,ly,3+10*b,0,7); cx.fill();
    } else if(t>T.cmd){
      // a tiny spark gathering before the burst
      const s = seg(t,T.cmd+.3,T.burst);
      cx.fillStyle=`rgba(255,250,235,${s})`; cx.beginPath(); cx.arc(lx,ly,1+2*s+Math.sin(t*20)*0.6*s,0,7); cx.fill();
    }

    // text cues
    el('.an-pre').classList.toggle('on', t>0.2 && t<T.cmd-0.7);
    el('.an-say').classList.toggle('on', t>T.say && t<T.burst+0.8);
    el('.an-cmd').classList.toggle('on', t>T.cmd);
    el('.an-cmd').classList.toggle('lit', t>T.burst+0.3);
    el('.an-then').classList.toggle('on', t>T.then);
    el('.an-ref').classList.toggle('on', t>T.then+0.5);
    stage.classList.toggle('lit', day>0.55);
    if(t>T.end && !done){ done=true; stage.dispatchEvent(new CustomEvent('anim-done')); }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return {
    restart(){ t0=null; done=false; stage.querySelectorAll('.on,.lit').forEach(n=>n.classList.remove('on','lit')); stage.classList.remove('lit'); },
    stop(){ cancelAnimationFrame(raf); removeEventListener('resize', size); }
  };
};
})();

/* 1 Samuel 17:49 — David & Goliath paper cut-out video (book index 8, chapter 17, verse 49) */
(function(){
  const A = window.VERSE_ANIM;
  A['8-16-49'] = function(stage){
    stage.innerHTML = `<video src="media/samuel-17-49.mp4" playsinline muted autoplay preload="auto"
      style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#eeebe3"></video>`;
    const v = stage.querySelector('video');
    v.addEventListener('ended', ()=>stage.dispatchEvent(new CustomEvent('anim-done')));
    v.play().catch(()=>{});
    return {
      restart(){ v.currentTime = 0; v.play().catch(()=>{}); },
      stop(){ v.pause(); }
    };
  };
})();

/* Jonah 1:17 — paper cut-out video (book index 31, chapter 1, verse 17) */
(function(){
  const A = window.VERSE_ANIM;
  A['31-0-17'] = function(stage){
    stage.innerHTML = `<video src="media/jonah-1-17.mp4" playsinline muted autoplay preload="auto"
      style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#eeebe3"></video>`;
    const v = stage.querySelector('video');
    v.addEventListener('ended', ()=>stage.dispatchEvent(new CustomEvent('anim-done')));
    v.play().catch(()=>{});
    return { restart(){ v.currentTime=0; v.play().catch(()=>{}); }, stop(){ v.pause(); } };
  };
})();
