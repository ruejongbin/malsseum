// 말씀 — 연결 구절 하이퍼루프 (cross-reference ride)
// ride({from:[b,c,v], to:[b,c,v], fromLabel, toLabel, books}) → resolves when the ride has arrived
import * as THREE from './three.module.min.js';

let DATA = null, OFF = null;
async function data(){
  if(DATA) return DATA;
  DATA = await fetch('data/arcs-lite.json').then(r=>r.json());
  // chapter start offsets per book, so (b,c,v) → verse ordinal
  OFF = []; let n = 0, ci = 0;
  DATA.books.forEach((bk, bi)=>{ const arr=[]; let s=bk.start; while(s < bk.end){ arr.push(s); s += DATA.chapters[ci++]; } OFF.push(arr); });
  return DATA;
}
const ordinal = ([b,c,v]) => (OFF[b][c] ?? DATA.books[b].start) + v - 1;

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const lerp=(a,b,t)=>a+(b-a)*t;
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const stops=[[0,[0.36,0.24,1.0]],[0.12,[0.75,0.25,1.0]],[0.3,[1.0,0.25,0.38]],[0.55,[0.24,0.85,0.45]],[1,[0.95,0.9,0.25]]];
function spanColor(s){ s=Math.pow(s,.85); for(let i=1;i<stops.length;i++){ if(s<=stops[i][0]){ const [a,ca]=stops[i-1],[b,cb]=stops[i]; const k=(s-a)/(b-a); return ca.map((v,j)=>v+(cb[j]-v)*k);} } return stops[stops.length-1][1]; }

let webGeo = null;
function buildWeb(L, X){
  if(webGeo) return webGeo;
  let rs=7; const rnd=()=>{ rs=(rs*16807)%2147483647; return (rs-1)/2147483646; };
  const pos=[], col=[];
  for(let i=0;i<DATA.arcs.length;i+=2){
    const xa=X(DATA.arcs[i]), xb=X(DATA.arcs[i+1]), cx=(xa+xb)/2, r=Math.abs(xb-xa)/2, th=(rnd()-.5)*0.7;
    const n=6+Math.round(Math.sqrt(r/500)*30), c=spanColor(r*2/L); let prev=null;
    for(let k=0;k<=n;k++){ const ph=Math.PI*(1-k/n); const p=[cx+r*Math.cos(ph), r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th)];
      if(prev){ pos.push(...prev,...p); col.push(...c,...c); } prev=p; }
  }
  webGeo=new THREE.BufferGeometry();
  webGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  webGeo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  return webGeo;
}

export async function ride({from, to, fromLabel, toLabel, books, note='', kind=''}){
  await data();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const L=1000, X=i=>-L/2+(i/DATA.total)*L;
  const a=ordinal(from), b=ordinal(to);
  const JX=X(a), MX=X(b), GC=(JX+MX)/2, GR=Math.max(Math.abs(MX-JX)/2, 0.6), dir=Math.sign(MX-JX)||1;

  // overlay
  const wrap=document.createElement('div');
  wrap.className='loop-overlay';
  wrap.innerHTML=`<canvas></canvas><div class="loop-hud"></div><div class="loop-flash"></div>
    <button class="loop-skip">건너뛰기 ›</button>`;
  document.body.appendChild(wrap);
  const canvas=wrap.querySelector('canvas'), hud=wrap.querySelector('.loop-hud'), flash=wrap.querySelector('.loop-flash');
  const renderer=new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
  renderer.setPixelRatio(Math.min(2, devicePixelRatio||1));
  const size=()=>{ renderer.setSize(innerWidth, innerHeight, false); cam.aspect=innerWidth/innerHeight; cam.updateProjectionMatrix(); };
  const scene=new THREE.Scene(); scene.background=new THREE.Color(0x05040a);
  const cam=new THREE.PerspectiveCamera(40, innerWidth/innerHeight, Math.max(0.002, GR*0.002), 6000);
  size(); addEventListener('resize', size);

  // the whole web of cross references
  const webMat=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.045,blending:THREE.AdditiveBlending,depthWrite:false});
  { const p=[]; let v=0; DATA.chapters.forEach(n=>{ const x=X(v+n/2); p.push(x,-1,0, x,-1-n*0.09,0); v+=n; });
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    scene.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xbdb7ad,transparent:true,opacity:.7}))); }
  scene.add(new THREE.LineSegments(buildWeb(L,X), webMat));
  const base=new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(-L/2,-.3,0),V3(L/2,-.3,0)]),new THREE.LineBasicMaterial({color:0x6b7cff}));
  scene.add(base);

  // golden arc for this connection
  const pts=[]; for(let k=0;k<=240;k++){ const ph=Math.PI*(1-k/240); const x = dir>0 ? GC+GR*Math.cos(ph) : GC-GR*Math.cos(ph); pts.push(V3(x, GR*Math.sin(ph), 0)); }
  const curve=new THREE.CatmullRomCurve3(pts);
  const tubeR=GR*0.05;
  const tubeMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{uDraw:{value:0}},
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`varying vec2 vUv; uniform float uDraw;
      void main(){ if(vUv.x>uDraw) discard;
        float rings=pow(0.5+0.5*sin(vUv.x*700.0),18.0)*0.65; float seam=pow(abs(sin(vUv.y*3.14159*6.0)),40.0);
        float head=smoothstep(uDraw-0.03,uDraw,vUv.x)*(1.0-step(0.999,uDraw));
        gl_FragColor=vec4(vec3(1.0,0.78,0.32)*(0.06+rings*0.35+seam*0.08+head*1.2),1.0); }`});
  const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,500,tubeR,20,false),tubeMat); tube.visible=false; scene.add(tube);
  const lineGeo=new THREE.BufferGeometry().setFromPoints(curve.getSpacedPoints(400));
  const goldLine=new THREE.Line(lineGeo,new THREE.LineBasicMaterial({color:0xffd76a,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));
  scene.add(goldLine);
  // streaks
  { let rs=11; const rnd=()=>{ rs=(rs*16807)%2147483647; return (rs-1)/2147483646; }; const p=[];
    for(let i=0;i<700;i++){ const u=rnd()*0.98, du=0.004+rnd()*0.01, ang=rnd()*Math.PI*2, rr=tubeR*(0.55+rnd()*0.9);
      const T=curve.getTangentAt(u), N=V3(0,0,1), B=new THREE.Vector3().crossVectors(T,N).normalize();
      const off=N.clone().multiplyScalar(Math.cos(ang)*rr).add(B.multiplyScalar(Math.sin(ang)*rr));
      const s=curve.getPointAt(u).add(off), e=curve.getPointAt(Math.min(1,u+du)).add(off); p.push(s.x,s.y,s.z,e.x,e.y,e.z); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    var streakMat=new THREE.LineBasicMaterial({color:0xfff2c4,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
    scene.add(new THREE.LineSegments(g,streakMat)); }
  // glowing ends
  const c2=document.createElement('canvas'); c2.width=c2.height=128; const x2=c2.getContext('2d'); const gr=x2.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,250,230,1)'); gr.addColorStop(.25,'rgba(255,215,106,.8)'); gr.addColorStop(1,'rgba(255,200,80,0)'); x2.fillStyle=gr; x2.fillRect(0,0,128,128);
  const gtex=new THREE.CanvasTexture(c2);
  const gA=new THREE.Sprite(new THREE.SpriteMaterial({map:gtex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  const gB=new THREE.Sprite(gA.material.clone()); gA.position.set(JX,0,0); gB.position.set(MX,0,0); gA.scale.setScalar(GR*.35); gB.scale.setScalar(GR*.35); scene.add(gA,gB);

  // camera path: overview → dive to the gate → ride inside the arc
  const fitFull = () => { const tn=Math.tan(THREE.MathUtils.degToRad(40/2)); const asp=innerWidth/innerHeight;
    const d=Math.max((L/2*1.08)/(tn*asp), (L/2*0.62)/tn); return { p:V3(0, L*0.21, d), l:V3(0, L*0.21, 0) }; };
  const full = fitFull();
  const near = { p:V3(GC - dir*GR*1.4, GR*0.9 + 2, GR*3.4 + 8), l:V3(GC, GR*0.4, 0) };
  const gate = { p:curve.getPointAt(0).add(V3(0,-tubeR*.2,tubeR*.15)), l:curve.getPointAt(0.03) };
  const tWeb=[0,1.0], tDraw=[0.9,1.7], tZoom=[1.8,3.4], tDive=[3.4,4.1], tRide=[4.1,7.2], tEnd=7.55;
  const dolly=(a,b,k)=>{ const da=a.p.distanceTo(a.l), db=b.p.distanceTo(b.l); const d=Math.exp(lerp(Math.log(da),Math.log(db),k));
    const l=new THREE.Vector3().lerpVectors(a.l,b.l,k); const dA=a.p.clone().sub(a.l).normalize(), dB=b.p.clone().sub(b.l).normalize();
    cam.position.copy(l).add(dA.lerp(dB,k).normalize().multiplyScalar(d)); cam.lookAt(l); };
  const bookAt=i=>{ for(let k=0;k<DATA.books.length;k++) if(i<DATA.books[k].end) return k; return DATA.books.length-1; };

  return new Promise(resolve=>{
    let t0=null, raf=0, done=false;
    const finish=()=>{ if(done) return; done=true; cancelAnimationFrame(raf); removeEventListener('resize',size);
      wrap.classList.add('out'); setTimeout(()=>{ renderer.dispose(); wrap.remove(); },450); resolve(); };
    wrap.querySelector('.loop-skip').onclick=finish;
    const frame=now=>{
      if(t0==null) t0=now; let t=(now-t0)/1000; if(reduce) t=tRide[1]-0.3+t;   // reduced motion: just a soft flash
      // the web sweeps in left→right, then the connection is drawn as a thin gold line
      webGeo.setDrawRange(0, Math.floor(webGeo.attributes.position.count*ease(seg(t,...tWeb))));
      lineGeo.setDrawRange(0, Math.floor(401*ease(seg(t,...tDraw))));
      webMat.opacity = lerp(.045,.035,seg(t,...tZoom));
      goldLine.visible = t < tRide[0]+.1; tube.visible = t > tDive[0]+.3;
      tubeMat.uniforms.uDraw.value = 1;
      let html='';
      if(t<tZoom[0]){ cam.position.copy(full.p); cam.lookAt(full.l); cam.fov=40; }
      else if(t<tDive[0]){ dolly(full,near,ease(seg(t,...tZoom))); cam.fov=40; }
      else if(t<tRide[0]){ const k=ease(seg(t,...tDive)); cam.position.lerpVectors(near.p,gate.p,k); const l=new THREE.Vector3().lerpVectors(near.l,gate.l,k); cam.fov=lerp(40,55,k); cam.lookAt(l); }
      else { const k=seg(t,...tRide), u=0.985*ease(k), p=curve.getPointAt(u);
        cam.position.copy(p); cam.up.set(0,1,0); cam.lookAt(curve.getPointAt(Math.min(1,u+0.03)));
        const sp=Math.sin(Math.PI*k); cam.fov=55+30*sp; cam.rotateZ(Math.sin(k*Math.PI*2)*0.07);
        const vi=Math.round((p.x+L/2)/L*DATA.total); html+=`<div class="loop-book">지나는 중<b>${books[bookAt(vi)].kor}</b></div>`;
        const na=seg(t,tRide[0]+.5,tRide[0]+1.0)*(1-seg(t,tRide[1]-.4,tRide[1]));
        if(note||kind) html+=`<div class="loop-note" style="opacity:${na}">${kind?`<small>${kind}</small>`:''}${note}</div>`; }
      cam.updateProjectionMatrix();
      streakMat.opacity = seg(t,tRide[0]-.3,tRide[0]+.2)*(1-seg(t,tRide[1]-.3,tRide[1]))*0.9;
      if(t<tRide[0]+.2) html+=`<div class="loop-route" style="opacity:${seg(t,.2,.6)*(1-seg(t,tRide[0]-.2,tRide[0]+.2))}"><span>${fromLabel}</span><i></i><span class="to">${toLabel}</span></div>`;
      if(t<tZoom[0]+.4){ const a=seg(t,.6,1.1)*(1-seg(t,tZoom[0],tZoom[0]+.4));
        html+=`<div class="loop-cap" style="opacity:${a}">성경 전체를 잇는 연결선 — 금빛 선이 이 구절의 연결이에요</div>`; }
      hud.innerHTML=html;
      flash.style.opacity = seg(t,tRide[1]-.25,tRide[1])*(1-seg(t,tRide[1],tEnd))*0.9;
      renderer.render(scene,cam);
      if(t>=tEnd) return finish();
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
  });
}
