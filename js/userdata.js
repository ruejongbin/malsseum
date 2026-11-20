/* 말씀 — 내 기록 저장소 (책갈피 · 하이라이트 · 펜 표시 · 메모 · 저장한 구절)
 *
 * 지금은 이 기기(localStorage)에 저장하고, 나중에 계정 동기화를 붙일 수 있게 설계했다.
 *
 * 기록 한 개(record) 형식 — 스키마 v1
 * {
 *   id:        "rec_lx2k9a_8f3c1e"   전 세계에서 겹치지 않는 아이디(기기에서 직접 만듦 → 서버 없이도 생성 가능)
 *   type:      "bookmark" | "highlight" | "pen" | "note" | "saved"
 *   ref:       { b, c, v, v2?, start?, end? }   책(0~65)·장(0부터)·절(1부터), 범위 끝 절, 글자 위치(손 하이라이트·펜용)
 *   data:      종류별 내용
 *                bookmark  { name, symbol, color }            변신 책갈피: symbol = 멈춘 구절의 상징
 *                highlight { color, style }                   style: "full" | "stroke"(민 만큼만)
 *                pen       { tool, color, path? }             tool: underline·circle·bracket·arrow·mark
 *                note      { text, kind, place, color }       place: "sticky"(포스트잇)·"margin"(옆 여백, 세로)·"between"(행간, 가로)
 *                saved     { text }
 *   createdAt, updatedAt: 밀리초 시각
 *   deletedAt: null | 시각   — 지워도 바로 없애지 않고 '지움 표시'만(다른 기기에 지운 사실을 전하기 위해)
 *   device:    이 기록을 마지막으로 고친 기기 아이디
 *   rev:       고친 횟수
 * }
 *
 * 동기화 규칙(나중에 서버를 붙일 때)
 *   1) 올리기: changesSince(마지막 동기화 시각) 를 서버로 보낸다.
 *   2) 받기:   서버에서 받은 기록을 merge() 한다 — updatedAt이 더 최근인 쪽이 이긴다(같으면 device 아이디 순).
 *   3) 지운 기록도 deletedAt 으로 전해지므로, 한 기기에서 지우면 다른 기기에서도 지워진다.
 */
const UD = (() => {
  const KEY = 'malsseum.ud.v1', DEV = 'malsseum.device', SCHEMA = 1;
  const TYPES = ['bookmark','highlight','pen','note','saved'];
  const rid = p => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  let device; try { device = localStorage.getItem(DEV) || (localStorage.setItem(DEV, rid('dev')), localStorage.getItem(DEV)); } catch(e) { device = rid('dev'); }

  let db = { schema: SCHEMA, items: {}, meta: { lastSync: 0, created: Date.now() } };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.items) db = Object.assign(db, s); } catch(e) {}

  const listeners = new Set();
  let timer = null;
  function persist(){ clearTimeout(timer); timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch(e) { console.warn('저장 공간이 부족해요', e); } }, 120); }
  function changed(rec){ persist(); listeners.forEach(f => { try { f(rec); } catch(e) {} }); }

  const api = {
    SCHEMA, TYPES, get device(){ return device; },
    add(type, ref, data = {}){
      if (!TYPES.includes(type)) throw new Error('알 수 없는 기록 종류: ' + type);
      const now = Date.now();
      const rec = { id: rid('rec'), type, ref: { ...ref }, data: { ...data }, createdAt: now, updatedAt: now, deletedAt: null, device, rev: 1 };
      db.items[rec.id] = rec; changed(rec); return rec;
    },
    update(id, patch = {}){
      const r = db.items[id]; if (!r || r.deletedAt) return null;
      if (patch.ref) r.ref = { ...r.ref, ...patch.ref };
      if (patch.data) r.data = { ...r.data, ...patch.data };
      r.updatedAt = Date.now(); r.device = device; r.rev++; changed(r); return r;
    },
    remove(id){
      const r = db.items[id]; if (!r || r.deletedAt) return;
      r.deletedAt = r.updatedAt = Date.now(); r.device = device; r.rev++; changed(r);
    },
    get(id){ const r = db.items[id]; return r && !r.deletedAt ? r : null; },
    list(type, pred){ return Object.values(db.items).filter(r => !r.deletedAt && (!type || r.type === type) && (!pred || pred(r))); },
    atVerse(b, c, v, type){ return api.list(type, r => r.ref.b === b && r.ref.c === c && v >= r.ref.v && v <= (r.ref.v2 || r.ref.v)); },
    inChapter(b, c, type){ return api.list(type, r => r.ref.b === b && r.ref.c === c); },
    count(type){ return api.list(type).length; },
    onChange(f){ listeners.add(f); return () => listeners.delete(f); },

    /* ── 동기화 준비 ── */
    changesSince(ts = 0){ return Object.values(db.items).filter(r => r.updatedAt > ts); },
    merge(records = []){
      let n = 0;
      records.forEach(x => {
        if (!x || !x.id || !TYPES.includes(x.type)) return;
        const cur = db.items[x.id];
        if (!cur || x.updatedAt > cur.updatedAt || (x.updatedAt === cur.updatedAt && x.device > cur.device)) { db.items[x.id] = x; n++; }
      });
      if (n) changed(null); return n;
    },
    markSynced(ts = Date.now()){ db.meta.lastSync = ts; persist(); },
    get lastSync(){ return db.meta.lastSync; },

    /* ── 백업 파일 ── */
    exportJSON(){ return JSON.stringify({ app: 'malsseum', schema: SCHEMA, exportedAt: Date.now(), device, items: Object.values(db.items) }, null, 1); },
    importJSON(text){ const o = JSON.parse(text); if (o.app !== 'malsseum') throw new Error('말씀 백업 파일이 아니에요'); return api.merge(o.items || []); },

    /* ── 정리: 30일 지난 '지움 표시'는 동기화가 끝난 뒤에만 실제로 지운다 ── */
    compact(days = 30){
      const cut = Date.now() - days * 864e5; let n = 0;
      Object.values(db.items).forEach(r => { if (r.deletedAt && r.deletedAt < cut && r.deletedAt <= db.meta.lastSync) { delete db.items[r.id]; n++; } });
      if (n) persist(); return n;
    },
  };

  /* ── 예전 형식(bible.marks, bible.saved)에서 한 번만 옮겨오기 ── */
  try {
    if (!db.meta.migrated) {
      const oldMarks = JSON.parse(localStorage.getItem('bible.marks') || '{}');
      Object.keys(oldMarks).forEach(k => { const [b, c, v] = k.split('-').map(Number); api.add('highlight', { b, c, v }, { color: 'yellow', style: 'full' }); });
      const oldSaved = JSON.parse(localStorage.getItem('bible.saved') || '[]');
      oldSaved.slice().reverse().forEach(s => api.add('saved', { b: s.b, c: s.c, v: s.v }, { text: s.t }));
      db.meta.migrated = Date.now(); persist();
    }
  } catch(e) {}

  return api;
})();
