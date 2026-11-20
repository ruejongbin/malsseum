/* 말씀 — 모임(카카오톡형) — 하단 탭에서 빠짐, 코드만 보관 */
/* ---------- 모임: KakaoTalk-style chats ---------- */
const AVC=['#7aa5f0','#f08a6c','#6cc4a4','#b892f0','#f2b84b','#ef7fa8','#5fb6d9'];
const avColor = s => AVC[[...s].reduce((a,c)=>a+c.charCodeAt(0),0)%AVC.length];
const nameOf = id => id.includes('@') ? id.split('@')[0] : id.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/,'$1-****-$3');
const initial = id => { const n=nameOf(id); return /[가-힣]/.test(n[0]) ? n[0] : n.slice(0,2).toUpperCase(); };
const now = () => new Date();
const hhmm = d => { d=new Date(d); const h=d.getHours(); return `${h<12?'오전':'오후'} ${((h+11)%12)+1}:${String(d.getMinutes()).padStart(2,'0')}`; };
let rooms = store.get('rooms', null);
if(!rooms){
  const t=Date.now();
  rooms=[{id:'r0', name:'화요 말씀 묵상 (예시)', members:['minji@example.com','010-2345-6789','joon@example.com'], unread:2, msgs:[
    {from:'minji@example.com', text:'이번 주는 사무엘상 17장 같이 읽어요!', at:t-3600e3},
    {from:'010-2345-6789', verse:{ref:'사무엘상 17:47', text:'또 여호와의 구원하심이 칼과 창에 있지 아니함을 이 무리로 알게 하리라 전쟁은 여호와께 속한 것인즉 그가 너희를 우리 손에 붙이시리라'}, at:t-3500e3},
    {from:'joon@example.com', text:'다윗이 칼 없이 이긴 게 핵심이네요 🙏', at:t-3400e3}]}];
  store.set('rooms', rooms);
}
const saveRooms = () => store.set('rooms', rooms);
let curRoom=null, chatFilter='all';
function avatarFor(room){
  if(room.members.length===1){ const m=room.members[0]; return `<div class="av" style="background:${avColor(m)}">${esc(initial(m))}</div>`; }
  return `<div class="av grid">${room.members.slice(0,4).map(m=>`<span style="background:${avColor(m)}">${esc(initial(m))}</span>`).join('')}</div>`;
}
function lastText(m){ return !m ? '' : m.verse ? `📖 ${m.verse.ref}` : m.text; }
function drawRooms(){
  const list = rooms.filter(r=>chatFilter==='all'||r.unread).sort((a,b)=>(b.msgs.at(-1)?.at||0)-(a.msgs.at(-1)?.at||0));
  const un = rooms.reduce((a,r)=>a+(r.unread||0),0); $('#unreadN').textContent = un||'';
  $('#roomList').innerHTML = list.length ? list.map(r=>{ const m=r.msgs.at(-1);
    return `<button class="room" data-r="${r.id}">${avatarFor(r)}<div class="mid"><div class="nm">${esc(r.name)}<em>${r.members.length+1}</em></div><div class="last">${esc(lastText(m))}</div></div>
      <div class="side">${m?hhmm(m.at):''}${r.unread?`<br><span class="badge">${r.unread}</span>`:''}</div></button>`; }).join('')
    : `<div class="kt-empty">아직 모임이 없어요.<br>오른쪽 위 말풍선 ＋ 버튼으로 이메일이나 휴대폰 번호를 추가해 모임을 만들어 보세요.</div>`;
  $('#roomList').querySelectorAll('.room').forEach(b=>b.onclick=()=>openRoom(b.dataset.r));
}
function openRoom(id){
  curRoom = rooms.find(r=>r.id===id); if(!curRoom) return;
  curRoom.unread=0; saveRooms();
  $('#krName').textContent=curRoom.name; $('#krCount').textContent=curRoom.members.length+1;
  $('#chatRoom').hidden=false; $('#tabbar').style.display='none'; drawMsgs();
}
function drawMsgs(){
  let h=`<div class="kr-day"><span>${new Date(curRoom.msgs[0]?.at||Date.now()).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'long'})}</span></div>`;
  if(curRoom.created) h+=`<div class="kr-sys">${esc(curRoom.members.map(nameOf).join(', '))}님을 초대했어요.</div>`;
  curRoom.msgs.forEach(m=>{
    const me = m.from==='me';
    const body = m.verse ? `<div class="b verse"><div class="vh">📖 ${esc(m.verse.ref)}</div><div class="vt">${esc(m.verse.text)}</div></div>` : `<div class="b">${esc(m.text)}</div>`;
    h += me ? `<div class="msg me"><div><div class="row">${body}<span class="tm">${hhmm(m.at)}</span></div></div></div>`
            : `<div class="msg"><div class="av" style="background:${avColor(m.from)}">${esc(initial(m.from))}</div><div><div class="who">${esc(nameOf(m.from))}</div><div class="row">${body}<span class="tm">${hhmm(m.at)}</span></div></div></div>`;
  });
  $('#krMsgs').innerHTML=h; $('#krMsgs').scrollTop=1e9;
}
function closeRoom(){ $('#chatRoom').hidden=true; $('#tabbar').style.display=''; curRoom=null; drawRooms(); }
$('#krBack').onclick=closeRoom;
$('#krForm').onsubmit=e=>{ e.preventDefault(); const v=$('#krText').value.trim(); if(!v||!curRoom) return; curRoom.msgs.push({from:'me',text:v,at:Date.now()}); $('#krText').value=''; saveRooms(); drawMsgs(); };
$('#krPlus').onclick=async()=>{ if(!curRoom) return; const ch=(await loadBook(state.b))[state.c]; const v=(state.sel.size?[...state.sel][0]:1);
  const B=BOOKS[state.b]; curRoom.msgs.push({from:'me',verse:{ref:`${B.kor} ${state.c+1}:${v}`, text:ch[v-1][0]||ch[v-1][1]},at:Date.now()}); saveRooms(); drawMsgs(); toast('지금 읽던 구절을 보냈어요'); };
$('#krMembers').onclick=()=>toast(`멤버: 나, ${curRoom.members.map(nameOf).join(', ')}`);
document.querySelectorAll('.kt-chips button').forEach(b=>b.onclick=()=>{ chatFilter=b.dataset.f; document.querySelectorAll('.kt-chips button').forEach(x=>x.classList.toggle('on',x===b)); drawRooms(); });
$('#ktNew').onclick=e=>{ e.stopPropagation(); $('#ktNewMenu').classList.toggle('open'); };
$('#ktSearch').onclick=()=>toast('채팅 검색은 준비 중이에요');
// invite flow: add people by email or phone, then form a group chat
let invitees=[], inviteMode='group';
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, PHONE=/^01[016789]-?\d{3,4}-?\d{4}$/;
function normId(v){ v=v.trim(); if(EMAIL.test(v)) return v.toLowerCase(); const d=v.replace(/[\s-]/g,''); if(PHONE.test(d)) return d.replace(/^(\d{3})(\d{3,4})(\d{4})$/,'$1-$2-$3'); return null; }
function drawInvite(){
  $('#invList').innerHTML = invitees.map((m,i)=>`<div class="inv-p"><div class="av" style="background:${avColor(m)}">${esc(initial(m))}</div><div class="id"><b>${esc(nameOf(m))}</b><small>${m.includes('@')?'이메일':'휴대폰'} · ${esc(m)}</small></div><button data-x="${i}">삭제</button></div>`).join('');
  $('#invList').querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{ invitees.splice(+b.dataset.x,1); drawInvite(); });
  const n=invitees.length, go=$('#invGo');
  go.disabled = !n || (inviteMode==='one' && n!==1);
  go.textContent = !n ? '사람을 추가해 주세요' : inviteMode==='one' ? (n===1?'1:1 채팅 시작':'1:1 채팅은 한 명만 추가할 수 있어요') : `${n}명과 그룹 채팅 만들기`;
  $('.inv-name').style.display = inviteMode==='one' ? 'none' : '';
}
document.querySelectorAll('#ktNewMenu [data-k]').forEach(b=>b.onclick=()=>{ inviteMode=b.dataset.k; invitees=[]; $('#invName').value=''; $('#invHint').textContent='예: friend@example.com · 010-1234-5678'; $('#invHint').classList.remove('err');
  $('#invTitle').textContent = inviteMode==='one' ? '1:1 채팅' : '그룹 채팅 만들기'; $('#ktNewMenu').classList.remove('open'); drawInvite(); openSheet('#inviteSheet'); setTimeout(()=>$('#invInput').focus(),250); });
$('#invForm').onsubmit=e=>{ e.preventDefault(); const raw=$('#invInput').value; const id=normId(raw); const hint=$('#invHint');
  if(!id){ hint.textContent='이메일(예: name@mail.com)이나 휴대폰 번호(예: 010-1234-5678) 형식으로 입력해 주세요.'; hint.classList.add('err'); return; }
  if(invitees.includes(id)){ hint.textContent='이미 추가한 사람이에요.'; hint.classList.add('err'); return; }
  invitees.push(id); $('#invInput').value=''; hint.textContent=`${nameOf(id)}님을 추가했어요. 계속 추가할 수 있어요.`; hint.classList.remove('err'); drawInvite(); };
$('#invGo').onclick=()=>{ if(!invitees.length) return;
  const name = $('#invName').value.trim() || (invitees.length===1 ? nameOf(invitees[0]) : invitees.slice(0,3).map(nameOf).join(', ')+(invitees.length>3?' 외':''));
  const r={id:'r'+Date.now(), name, members:[...invitees], unread:0, created:true, msgs:[{from:'me',text:'모임을 만들었어요! 같이 말씀 읽어요 📖',at:Date.now()}]};
  rooms.push(r); saveRooms(); closeSheets(); drawRooms(); openRoom(r.id); };
drawRooms();
