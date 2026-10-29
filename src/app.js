(function () {
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  const A = window.SS_ASSETS, Geo = window.SSGeo, Av = window.SSAvatar, Remote = window.SSApi, Globe = window.SSGlobe, Room = window.SSRoom;
  const $ = id => document.getElementById(id);
  const KEY = 'samesky.v2', LKEY = 'samesky.v2.local';
  const KL = { night: '맑음 · 밤', clear: '맑음', cloudy: '흐림', rain: '비', sunset: '노을', snow: '눈' };
  const MOONN = ['신월', '초승달', '상현달', '상현망', '보름달', '하현망', '하현달', '그믐달'];
  const SKYSET = { me: 'seoul', pt: 'ny' };
  const SIDES = ['me', 'pt'];
  const DEMO_PARTNER = { slot: 'b', name: '무노', avatar: { char: 'b01' }, city: { name: '뉴욕', country: '미국', cc: 'US', lat: 40.71, lon: -74.01, tz: 'America/New_York' }, profile: null };

  /* ---------- 상태 ---------- */
  let S = null, L = { photos: [], notes: [] };
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  try { L = JSON.parse(localStorage.getItem(LKEY)) || L; } catch (e) { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
  const saveL = () => { try { localStorage.setItem(LKEY, JSON.stringify(L)); } catch (e) { toast('저장 공간이 부족해요'); } };
  const W = { me: { kind: 'clear', temp: '-' }, pt: { kind: 'night', temp: '-' } };
  let D = { partner: null, photos: [], notes: [], voices: [], dday: { start: '', meet: '' }, rooms: { me: null, pt: null } };
  const invite = (() => {   // 초대 링크(?code=XXXXXX)로 들어왔는지
    let c = ''; try { c = (new URLSearchParams(location.search).get('code') || '').trim().toUpperCase(); } catch (e) { }
    if (c) { try { history.replaceState(null, '', location.pathname); } catch (e) { } }
    return /^[0-9A-F]{4,8}$/.test(c) ? c : '';
  })();
  let draft = null, notesTab = 'in', editing = false, pending = null, pendingMe = null;
  const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  const otherSlot = () => S.slot === 'a' ? 'b' : 'a';

  /* ---------- 저장소: 서버(Supabase) 또는 이 기기(체험) ---------- */
  const localApi = {
    async getCouple() { return { exists: true, start: (L.dday || {}).start || null, meet: (L.dday || {}).meet || null, members: [{ slot: S.slot, ...S.me }, S.demoPartner || DEMO_PARTNER] }; },
    async setDday(code, slot, d) { L.dday = { start: d.start || '', meet: d.meet || '' }; saveL(); },
    async saveMember() { },
    async addPhoto(code, slot, p) {
      if (L.photos.filter(x => x.slot === slot && x.local_date === p.date).length >= 3) { const e = new Error('limit'); e.code = 'limit'; throw e; }
      const id = 'l' + Date.now();
      L.photos.unshift({ id, slot, local_date: p.date, caption: p.caption || '', weather: p.weather || '', data: p.data, hearts: [], taken_at: new Date().toISOString() }); saveL();
      setTimeout(() => { const ph = L.photos.find(x => x.id === id); if (ph) { ph.hearts = ph.hearts || []; if (!ph.hearts.includes('b')) ph.hearts.push('b'); saveL(); refresh(true); } }, 6000);   // 체험: 상대가 잠시 뒤 하트를 보냄
    },
    async heartPhoto(code, id, slot) { const ph = L.photos.find(x => String(x.id) === String(id)); if (!ph) return; ph.hearts = ph.hearts || []; const i = ph.hearts.indexOf(slot); if (i >= 0) ph.hearts.splice(i, 1); else ph.hearts.push(slot); saveL(); },
    async listPhotos() { return JSON.parse(JSON.stringify(L.photos)); },   // 복사본을 돌려줘야 변경 감지가 동작
    async addNote(code, slot, n) { L.notes.unshift({ id: 'l' + Date.now(), slot, body: n.body, x: n.x, y: n.y, created_at: new Date().toISOString() }); saveL(); },
    async listNotes() { return JSON.parse(JSON.stringify(L.notes)); },
    async addVoice(code, slot, v) { (L.voices || (L.voices = [])).unshift({ id: 'l' + Date.now(), slot, mime: v.mime, dur: v.dur, data: v.data, x: v.x, y: v.y, read_at: null, created_at: new Date().toISOString() }); saveL(); },
    async listVoices() { return (L.voices || []).map(({ data, ...m }) => m); },
    async deleteItem(code, slot, id) { L.notes = L.notes.filter(x => !(x.id === id && x.slot === slot)); L.voices = (L.voices || []).filter(x => !(x.id === id && x.slot === slot)); saveL(); },
    async markRead(code, slot, ids) { const t = new Date().toISOString(); [...L.notes, ...(L.voices || [])].forEach(x => { if (x.slot !== slot && !x.read_at && (!ids || ids.includes(x.id))) x.read_at = t; }); saveL(); },
    async getVoice(code, id) { const v = (L.voices || []).find(x => String(x.id) === String(id)); return v ? { mime: v.mime, data: v.data } : null; },
    async getRooms() { const r = L.rooms || {}; return [{ slot: S.slot, room: r[S.slot] || S.room || null }, { slot: otherSlot(), room: r[otherSlot()] || Room.demoRoom() }].filter(x => x.room); },
    async saveRoom(code, slot, room) { (L.rooms || (L.rooms = {}))[slot] = room; saveL(); },
    async getState() { return { p: L.photos.length + ':' + L.photos.reduce((s, x) => s + (x.hearts || []).length, 0), n: L.notes.length, v: (L.voices || []).length, r: JSON.stringify(L.rooms || {}) }; }
  };
  const api = () => S && S.mode === 'local' ? localApi : Remote;

  // 체험 모드용 예시 사진 (캔버스로 도트 느낌 장면을 그림)
  function demoPhoto(kind) {
    const c = document.createElement('canvas'); c.width = 96; c.height = 72; const x = c.getContext('2d');
    const R = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    if (kind === 'coffee') {
      R('#e8d9b8', 0, 0, 96, 72); R('#b98a5a', 0, 52, 96, 20); R('#f7f1de', 32, 24, 28, 28); R('#1f2420', 32, 24, 28, 2); R('#1f2420', 32, 24, 2, 28); R('#1f2420', 58, 24, 2, 28); R('#1f2420', 32, 50, 28, 2);
      R('#6b4226', 34, 26, 24, 5); R('#1f2420', 60, 30, 8, 2); R('#1f2420', 66, 30, 2, 12); R('#1f2420', 60, 40, 8, 2); R('#fff', 40, 10, 2, 8); R('#fff', 48, 6, 2, 10);
    } else if (kind === 'sunset') {
      ['#6b5b95', '#c45a7a', '#e8845a', '#f5b05c', '#f7d98a'].forEach((col, i) => R(col, 0, i * 11, 96, 11)); R('#f7f1de', 58, 34, 14, 14);
      R('#1f2420', 0, 52, 96, 20); [[4, 38, 10], [16, 30, 12], [32, 40, 9], [60, 34, 12], [76, 26, 10], [88, 40, 8]].forEach(([a, t, w]) => R('#1f2420', a, t, w, 52 - t + 20));
      for (let i = 0; i < 8; i++) R('#f5b05c', 6 + i * 11, 44 + (i % 3) * 4, 2, 2);
    } else {
      for (let i = 0; i < 7; i++) R(['#78b6e8', '#8cc1ec', '#a0cdf0', '#b4d8f4', '#c8e2f8', '#dceefb', '#eef7fd'][i], 0, i * 10, 96, 10);
      R('#fff', 14, 18, 30, 10); R('#fff', 20, 12, 18, 8); R('#fff', 58, 34, 26, 9); R('#1f2420', 0, 60, 96, 12); R('#509664', 0, 56, 96, 4);
    }
    return c.toDataURL('image/png');
  }
  const DEMO_CAPS = ['출근길 커피', '노을이 예뻐서', '오늘 하늘 봐', '점심 먹으러 가는 길', '퇴근!'];
  const DEMO_NOTES = ['잘 자, 오늘도 수고했어', '보고 싶다', '밥은 먹었어?', '내일은 꼭 전화하자'];
  const dateIn = tz => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  function demoPartnerSends(n) {
    const p = (S.demoPartner || DEMO_PARTNER), now = Date.now(), kinds = ['coffee', 'sunset', 'sky'], k = L.photos.length;
    for (let i = 0; i < n; i++) {
      L.photos.unshift({ id: 'd' + now + i, slot: 'b', local_date: dateIn(p.city.tz), caption: DEMO_CAPS[(k + i) % DEMO_CAPS.length], weather: '', data: demoPhoto(kinds[(k + i) % 3]), hearts: [], taken_at: new Date(now - i * 90000).toISOString() });
      L.notes.unshift({ id: 'dn' + now + i, slot: 'b', body: DEMO_NOTES[(L.notes.length + i) % DEMO_NOTES.length], x: 14 + Math.random() * 70, y: 78 + Math.random() * 12, created_at: new Date(now - i * 60000).toISOString() });
    }
    saveL();
  }
  function explain(e) {
    if (e.code === 'no_config' || e.code === 'no_schema') return '서버 설정이 아직 적용되지 않았어요. 관리자가 SQL을 실행하면 쓸 수 있어요.';
    if (e.code === 'forbidden') return '이 자리는 다른 기기가 쓰고 있어요. 원래 쓰던 기기의 "기기 변경 열쇠"가 필요해요.';
    if (e.code === 'limit') return '오늘 3장을 모두 보냈어요.';
    if (e.code === 'too_big') return '사진 용량이 너무 커요.';
    const why = String((e && e.message) || '').replace(/\s+/g, ' ').slice(0, 70);
    return '서버와 통신하지 못했어요. 잠시 후 다시 시도해 주세요.' + (why ? ' (' + why + ')' : '');
  }

  /* ---------- 장면 ---------- */
  function mk(el) {
    el.className = 'stage';
    el.innerHTML = '<img class="L bg" alt="" src="' + BLANK + '"><div class="L veil"></div><div class="L stars"><img class="L sa" alt="" src="' + BLANK + '"><img class="L sb" alt="" src="' + BLANK + '"></div><img class="L moon" alt="" src="' + BLANK + '"><div class="L drift"><div class="in"></div></div><img class="L shadow" alt="" src="' + BLANK + '"><img class="L char" alt="" src="' + BLANK + '"><div class="L precip"><div class="in"></div></div><div class="bubble"></div><div class="notes"></div>';
    el.querySelector('.sa').src = A.starsA; el.querySelector('.sb').src = A.starsB; el.querySelector('.shadow').src = A.shadow;
  }
  function person(side) { return side === 'me' ? S.me : D.partner; }
  function moonIdx() { const d = (Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5; const p = ((d / 29.530588) % 1 + 1) % 1; return { i: Math.round(p * 8) % 8, p }; }
  function apply(el, side) {
    const p = person(side), k = W[side].kind, night = k === 'night';
    el.querySelector('.bg').src = A.bg[k][SKYSET[side]];
    el.querySelector('.veil').style.display = (W[side].night && k !== 'night') ? 'block' : 'none';   // 밤에 흐림·비·눈이어도 밤 하늘로
    const ch = el.querySelector('.char'), sh = el.querySelector('.shadow');
    if (p) { ch.src = Av.layerUrl(p.avatar); ch.style.display = sh.style.display = 'block'; } else ch.style.display = sh.style.display = 'none';
    el.querySelector('.stars').style.display = night ? 'block' : 'none';
    const m = el.querySelector('.moon'); m.style.display = night ? 'block' : 'none'; m.src = A.moons[moonIdx().i];
    el.querySelector('.drift .in').style.backgroundImage = A.clouds[k] ? 'url(' + A.clouds[k] + ')' : 'none';
    const pr = el.querySelector('.precip .in');
    pr.style.backgroundImage = A.precip[k] ? 'url(' + A.precip[k] + ')' : 'none';
    pr.className = 'in ' + (k === 'rain' ? 'rain' : k === 'snow' ? 'snow' : '');
  }
  function paint() {
    if (!S) return;
    apply($('st-me'), 'me'); apply($('st-pt'), 'pt');
    $('n-me').textContent = S.me.name + ' · ' + S.me.city.name;
    $('w-me').textContent = KL[W.me.kind] + ' ' + W.me.temp + '°';
    const pt = D.partner;
    $('n-pt').textContent = pt ? pt.name + ' · ' + pt.city.name : '상대를 기다리는 중';
    $('w-pt').textContent = pt ? KL[W.pt.kind] + ' ' + W.pt.temp + '°' : '';
    $('wait').hidden = !!pt; $('waitCode').textContent = S.code || '';
    $('goTown').disabled = !pt;
    const d = $('desk'); d.style.setProperty('--l', A.sky[W.me.kind][0]); d.style.setProperty('--r', A.sky[W.pt.kind][0]);
    SIDES.forEach(s => { const pf = $('pf-' + s), pr = person(s) && okProfile(person(s).profile) ? person(s).profile : null; pf.hidden = !pr; if (pr) pf.src = pr; });
    paintStrip(); photoBtn(); paintRoute(); paintNews();
  }
  // 지구본 + "서울 ━ 뉴욕 · 거리 · 시차" 요약
  function paintRoute() {
    const a = S.me.city, b = D.partner && D.partner.city;
    Globe.set(a, b);
    if (!b) { $('route').textContent = a.name + ' · 상대를 기다리는 중'; $('rg-sum').textContent = ''; return; }
    const df = Math.abs(off(a.tz) - off(b.tz)), dtxt = df === 0 ? '시차 없음' : '시차 ' + fmtDiff(df);
    const txt = a.name + ' ━ ' + b.name + ' · ' + Globe.km(a, b).toLocaleString() + 'km · ' + dtxt;
    $('route').textContent = txt;
    $('rg-sum').textContent = txt + ' · ' + KL[W.me.kind] + ' ' + W.me.temp + '° ↔ ' + KL[W.pt.kind] + ' ' + W.pt.temp + '°';
  }

  /* ---------- 시계 ---------- */
  const fmt = tz => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const off = tz => { const d = new Date(); return (new Date(d.toLocaleString('en-US', { timeZone: tz })) - new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }))) / 36e5; };
  function clock() {
    if (!S) return;
    const on = Math.floor(Date.now() / 1000) % 2 === 0;
    const tm = (id, tz) => { const t = fmt(tz).split(':'); $(id).innerHTML = t[0] + '<span style="opacity:' + (on ? 1 : .2) + '">:</span>' + t[1]; };
    tm('t-me', S.me.city.tz);
    if (D.partner) {
      tm('t-pt', D.partner.city.tz);
      const df = Math.abs(off(S.me.city.tz) - off(D.partner.city.tz));
      $('diff').textContent = df === 0 ? '같은 시간대' : '시차 ' + fmtDiff(df);
    } else { $('t-pt').textContent = '--:--'; $('diff').textContent = '기다리는 중'; }
    const m = moonIdx(); $('moonIcon').src = A.moonsIcon[m.i];
    $('moonTxt').textContent = '오늘의 달 · ' + MOONN[m.i] + ' (' + Math.round((1 - Math.cos(2 * Math.PI * m.p)) / 2 * 100) + '%)';
  }

  /* ---------- 날씨 API (Open-Meteo) ---------- */
  function kindFrom(code, isDay, now, sunrise, sunset) {
    let k = 'clear';
    if ([2, 3, 45, 48].includes(code)) k = 'cloudy';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) k = 'rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) k = 'snow';
    const t = new Date(now).getTime(), near = x => Math.abs(t - new Date(x).getTime()) < 45 * 60000;
    if ((k === 'clear' || k === 'cloudy') && (near(sunset) || near(sunrise))) return 'sunset';
    if (!isDay && k === 'clear') return 'night';
    if (!isDay && k === 'cloudy') return 'cloudy';
    return k;
  }
  async function real() {
    if (!S) return;
    $('status').textContent = '불러오는 중…';
    try {
      for (const s of SIDES) {
        const p = person(s); if (!p) continue;
        const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + p.city.lat + '&longitude=' + p.city.lon + '&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1';
        const j = await (await fetch(u)).json();
        W[s].kind = kindFrom(j.current.weather_code, j.current.is_day, j.current.time, j.daily.sunrise[0], j.daily.sunset[0]); W[s].night = !j.current.is_day;
        W[s].temp = Math.round(j.current.temperature_2m); $('sel-' + s).value = W[s].kind;
      }
      $('status').textContent = '✓ 실시간 날씨 적용됨 (Open-Meteo)'; $('live').textContent = '● LIVE';
    } catch (e) { $('status').textContent = '날씨 불러오기 실패 — 임시값 표시'; $('live').textContent = 'OFFLINE'; }
    paint();
  }

  /* ---------- 공통 UI ---------- */
  function toast(t) { const e = $('toast'); e.textContent = t; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 2600); }
  function view(id) { document.querySelectorAll('.view').forEach(v => v.classList.remove('on')); $(id).classList.add('on'); document.body.dataset.view = id; paintTabbar(); window.scrollTo(0, 0); }
  function paintTabbar() {   // 모바일 하단 탭바: 지금 화면 표시 + 안 본 소식 점
    const v = document.body.dataset.view, cur = v === 'v-home' ? 'tbHome' : v === 'v-room' ? (roomTab === 'pt' ? 'tbPt' : 'tbRoom') : v === 'v-photos' ? 'tbPhotos' : v === 'v-notes' ? 'tbNotes' : '';
    document.querySelectorAll('#tabbar button').forEach(b => { b.classList.toggle('on', b.id === cur); if (b.id === cur) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    document.body.classList.toggle('hasnav', !!(S && S.me && started && v !== 'v-setup' && v !== 'v-dress' && v !== 'v-connect'));
  }
  function heart(stage, e) {
    const r = stage.getBoundingClientRect(), h = document.createElement('img');
    h.src = A.heart; h.className = 'heart'; h.alt = '';
    h.style.left = ((e.clientX - r.left) / r.width * 100 - 4) + '%'; h.style.top = ((e.clientY - r.top) / r.height * 100 - 4) + '%';
    stage.appendChild(h); setTimeout(() => h.remove(), 1200);
  }
  function say(stage, text) {
    const b = stage.querySelector('.bubble'); b.textContent = text; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
    clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), 2600);
  }
  // 한글 입력(IME) 중의 Enter는 무시 → 글자가 두 번 제출되는 문제 방지
  const enterKey = (el, fn) => el.addEventListener('keydown', e => { if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return; e.preventDefault(); fn(); });
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: S.me.city.tz }).format(new Date());
  const when = iso => new Intl.DateTimeFormat('ko-KR', { timeZone: S.me.city.tz, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const nameOf = slot => slot === S.slot ? S.me.name : (D.partner ? D.partner.name : '상대');
  const isPix = d => d.startsWith('data:image/png');
  const okImg = d => typeof d === 'string' && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+\/=]+$/.test(d);
  const okProfile = d => typeof d === 'string' && /^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(d);
  const okDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
  const safeTz = tz => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz; } catch (e) { return 'UTC'; } };
  const cleanCity = c => ({ ...c, tz: safeTz(c.tz), lat: Number.isFinite(+c.lat) ? +c.lat : 0, lon: Number.isFinite(+c.lon) ? +c.lon : 0, name: String(c.name || '') });
  const fmtDiff = df => { const h = Math.floor(df), m = Math.round((df - h) * 60); return m ? h + '시간 ' + m + '분' : h + '시간'; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- 새 소식 ---------- */
  const seen = () => S.seen || (S.seen = { p: '', n: '', v: '', h: [] });
  const hearted = p => (p.hearts || []).filter(h => h !== S.slot).length > 0;
  function unread() {
    const sn = seen();
    return {
      np: D.photos.filter(p => p.slot !== S.slot && p.taken_at > sn.p).length,
      nn: D.notes.filter(n => n.slot !== S.slot && n.created_at > sn.n).length,
      nv: D.voices.filter(v => v.slot !== S.slot && v.created_at > (sn.v || '')).length,
      nh: D.photos.filter(p => p.slot === S.slot && hearted(p) && !(sn.h || []).includes(p.id)).length
    };
  }
  function markPhotosSeen() { const sn = seen(); const t = D.photos.filter(p => p.slot !== S.slot).map(p => p.taken_at).sort().pop(); if (t) sn.p = t; sn.h = D.photos.filter(p => p.slot === S.slot && hearted(p)).map(p => p.id); save(); paintNews(); }
  function markNotesSeen() { const sn = seen(); const t = D.notes.filter(n => n.slot !== S.slot).map(n => n.created_at).sort().pop(); if (t) sn.n = t; const tv = D.voices.filter(v => v.slot !== S.slot).map(v => v.created_at).sort().pop(); if (tv) sn.v = tv; save(); paintNews(); }
  function paintNews() {
    if (!S || !D.partner) { $('news').hidden = true; return; }
    const u = unread(), box = $('news'), parts = [];
    if (u.np) parts.push('사진 ' + u.np); if (u.nn) parts.push('쪽지 ' + u.nn); if (u.nv) parts.push('목소리 ' + u.nv); if (u.nh) parts.push('♥ ' + u.nh);
    box.hidden = !parts.length;
    if (parts.length) box.textContent = '● ' + D.partner.name + '님의 새 소식 · ' + parts.join(' · ');
    $('twin').classList.toggle('hasnews', !!parts.length);
    $('tbPhotos').classList.toggle('unread', !!(u.np + u.nh)); $('tbRoom').classList.toggle('unread', !!(u.nn + u.nv));
    $('goPhotos').textContent = '사진함' + (u.np + u.nh ? ' ●' + (u.np + u.nh) : ''); $('goNotes').textContent = '쪽지함' + (u.nn + u.nv ? ' ●' + (u.nn + u.nv) : '');
  }
  let newsT = 0;
  function flashNews(msg) {   // 홈 화면 아바타 영역 위에 새로 온 소식을 잠깐 크게 보여 줌
    const box = $('news'); box.hidden = false; box.textContent = msg; box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); $('twin').classList.add('hasnews');
    clearTimeout(newsT); newsT = setTimeout(() => { box.classList.remove('pop'); paintNews(); }, 8000);
  }
  let prevU = null;
  function notifyArrivals() {
    const u = unread();
    if (prevU && D.partner) {
      const m = [];
      if (u.np > prevU.np) m.push('새 사진'); if (u.nn > prevU.nn) m.push('새 쪽지'); if (u.nv > prevU.nv) m.push('목소리 쪽지'); if (u.nh > prevU.nh) m.push('내 사진에 하트 ♥');
      if (m.length) { const msg = D.partner.name + '님이 보냈어요 · ' + m.join(' · '); toast(msg); flashNews('● ' + msg); }
    }
    prevU = u;
  }

  /* ---------- 데이터 새로고침 ---------- */
  async function refresh(quiet) {
    if (!S || !S.code) return;
    try {
      const c = await api().getCouple(S.code);
      let pt = (c.members || []).find(m => m.slot !== S.slot) || null;
      if (pt) pt = { ...pt, city: cleanCity(pt.city), profile: okProfile(pt.profile) ? pt.profile : null };
      const ph = (await api().listPhotos(S.code)).filter(p => okImg(p.data) && okDate(p.local_date)), nt = await api().listNotes(S.code);
      let vo = D.voices; try { vo = (await api().listVoices(S.code) || []).filter(v => v && /^audio\/[a-z0-9.+-]+$/.test(v.mime || '')); } catch (e) { }   // 목소리 쪽지 SQL 전이어도 나머지는 동작
      const sig = (p2, ph2, nt2, vo2) => JSON.stringify([p2, ph2.map(p => p.id + ':' + (p.hearts || []).join('')), nt2.map(n => n.id), vo2.map(v => v.id)]);
      const changed = sig(pt, ph, nt, vo) !== sig(D.partner, D.photos, D.notes, D.voices);
      const hadPt = !!D.partner;
      let rooms = D.rooms;   // 방은 서버에 아직 없어도(스키마 미적용) 나머지 기능이 멈추면 안 되므로 따로 받음
      try { const rl = await api().getRooms(S.code); rooms = { me: null, pt: null }; (rl || []).forEach(x => { if (x && (x.slot === 'a' || x.slot === 'b')) rooms[x.slot === S.slot ? 'me' : 'pt'] = Room.sanitize(x.room); }); } catch (e) { }
      const roomChanged = JSON.stringify(rooms) !== JSON.stringify(D.rooms);
      if (roomChanged && D.rooms.pt && rooms.pt && JSON.stringify(rooms.pt) !== JSON.stringify(D.rooms.pt) && pt && !$('v-room').classList.contains('on')) toast(pt.name + '님이 방을 꾸몄어요');
      const dd = { start: /^\d{4}-\d{2}-\d{2}$/.test(c.start || '') ? c.start : '', meet: /^\d{4}-\d{2}-\d{2}$/.test(c.meet || '') ? c.meet : '' };
      if (JSON.stringify(dd) !== JSON.stringify(D.dday)) { D = { ...D, dday: dd }; paintDD(); }
      D = { partner: pt, photos: ph, notes: nt, voices: vo, dday: dd, rooms };
      notifyArrivals();
      if (roomChanged && !roomEditing) drawRoom();
      if (changed || !quiet) { paintDD(); paint(); if (!hadPt && pt) real(); drawPhotos(); drawNotesBox(); drawRoomNotes(); }
    } catch (e) { if (!quiet) toast(explain(e)); }
  }

  /* ---------- 사진 ---------- */
  function myToday() { return D.photos.filter(p => p.slot === S.slot && p.local_date === today()).length; }
  function photoBtn() { const n = myToday(); $('photo').textContent = n >= 3 ? '▣ 오늘 3장 모두 보냈어요' : '▣ 오늘의 사진 보내기 (' + n + '/3)'; $('photo').disabled = n >= 3; }
  // 두 도시는 날짜가 어긋나므로, 사진함·띠는 '보는 사람 도시 기준'의 같은 하루로 묶는다 (보낸 사람 기준 local_date는 하루 3장 제한에만 쓰임)
  const dayKey = p => { try { const t = new Date(p.taken_at); if (!isNaN(t)) return new Intl.DateTimeFormat('en-CA', { timeZone: S.me.city.tz }).format(t); } catch (e) { } return p.local_date; };
  const dayLabel = d => { const t = today(); if (d === t) return d + ' · 오늘'; const y = new Intl.DateTimeFormat('en-CA', { timeZone: S.me.city.tz }).format(new Date(Date.now() - 864e5)); return d === y ? d + ' · 어제' : d; };
  function paintStrip() {
    const box = $('strip'), all = D.photos.filter(p => p.slot !== S.slot), td = all.filter(p => dayKey(p) === today()), theirs = (td.length ? td : all).slice(0, 3);
    box.innerHTML = '';
    if (!theirs.length) { box.innerHTML = '<span class="muted">' + (D.partner ? esc(D.partner.name) + '님이 아직 사진을 보내지 않았어요' : '') + '</span>'; return; }
    box.innerHTML = '<span class="muted">' + esc(D.partner.name) + (td.length ? '의 오늘 사진' : '의 마지막 사진 · ' + esc(dayKey(theirs[0]).slice(5))) + '</span>';
    theirs.forEach(p => box.appendChild(thumbEl(p)));
  }
  function thumbEl(p) {
    const w = document.createElement('div'); w.className = 'thw';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'thb'; b.onclick = () => openPhoto(p);
    b.setAttribute('aria-label', nameOf(p.slot) + '의 사진 열기 · ' + when(p.taken_at) + ((p.hearts || []).length ? ' · 하트 있음' : ''));
    const i = document.createElement('img'); i.className = 'th' + (isPix(p.data) ? ' pix' : ''); i.alt = ''; i.src = p.data; b.appendChild(i); w.appendChild(b);
    if ((p.hearts || []).length) { const h = document.createElement('span'); h.className = 'hb'; h.textContent = '♥'; w.appendChild(h); }
    return w;
  }
  function addThumbs(parent, list) {
    if (!list.length) { const m = document.createElement('div'); m.className = 'muted'; m.textContent = '—'; parent.appendChild(m); return; }
    list.forEach(p => parent.appendChild(thumbEl(p)));
  }
  function drawPhotos() {
    const box = $('photoList'); if (!box || !S) return;
    box.textContent = '';
    if (!D.photos.length) { const e = document.createElement('div'); e.className = 'emptyhint'; e.style.display = 'block'; e.textContent = '아직 사진이 없어요. 오늘의 사진을 보내 보세요.'; box.appendChild(e); return; }
    const dates = [...new Set(D.photos.map(dayKey))].sort().reverse();
    dates.forEach(d => {
      const day = D.photos.filter(p => dayKey(p) === d), wrap = document.createElement('div'); wrap.className = 'day';
      const h = document.createElement('div'); h.className = 'dh'; h.textContent = dayLabel(d); wrap.appendChild(h);
      const cols = document.createElement('div'); cols.className = 'cols';
      [[S.me.name, day.filter(p => p.slot === S.slot)], [D.partner ? D.partner.name : '상대', day.filter(p => p.slot !== S.slot)]].forEach(([nm, list]) => {
        const col = document.createElement('div'), w = document.createElement('div'); w.className = 'who2'; w.textContent = nm; col.appendChild(w); addThumbs(col, list); cols.appendChild(col);
      });
      wrap.appendChild(cols); box.appendChild(wrap);
    });
  }
  let curPhoto = null;
  function openPhoto(p) {
    curPhoto = p;
    $('lbImg').src = p.data; $('lbImg').className = isPix(p.data) ? 'pix' : '';
    $('lbMeta').textContent = nameOf(p.slot) + ' · ' + when(p.taken_at) + (p.weather ? ' · ' + p.weather : '');
    $('lbCap').textContent = p.caption || '';
    const mine = p.slot === S.slot, hb = $('lbHeart'), hs = (p.hearts || []);
    hb.hidden = mine; hb.textContent = hs.includes(S.slot) ? '♥ 하트 보냄 (누르면 취소)' : '♡ 하트 보내기';
    $('lbNote').textContent = mine ? (hs.some(h => h !== S.slot) ? nameOf(otherSlot()) + '님이 하트를 보냈어요 ♥' : '') : '';
    $('m-view').hidden = false;
  }
  function loadImg(file) { return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = rej; im.src = u; }); }
  function prepare(im, dot) {
    if (dot) return dotify(im, { size: 96, ratio: 0, colors: 14, contrast: 1.1, sat: 1.2, sharpen: .4, outline: false, rmbg: false, tol: 40 }).toDataURL('image/png');
    const s = Math.min(1, 720 / Math.max(im.width, im.height)), c = document.createElement('canvas');
    c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .72);
  }
  async function onPhotoFile(file) {
    try {
      pending = { im: await loadImg(file) }; $('pdot').checked = false;
      const d = prepare(pending.im, false); pending.data = d; $('pPrev').src = d; $('pPrev').className = ''; $('pPrev').hidden = false; $('pSend').disabled = false;
    } catch (e) { toast('이미지를 불러오지 못했어요'); }
  }
  async function sendPhoto() {
    if (!pending || !pending.data) return;
    $('pSend').disabled = true;
    try {
      await api().addPhoto(S.code, S.slot, { date: today(), caption: $('pCap').value.trim(), weather: KL[W.me.kind] + ' ' + W.me.temp + '°', data: pending.data });
      $('m-photo').hidden = true; pending = null; toast('사진을 보냈어요'); await refresh(false);
    } catch (e) { toast(explain(e)); $('pSend').disabled = false; }
  }

  /* ---------- 방 위의 쪽지 (받은 쪽지는 내 방, 내가 보낸 쪽지는 상대 방) ---------- */
  const roomNotes = () => { const mine = n => roomTab === 'pt' ? n.slot === S.slot : n.slot !== S.slot; return D.notes.filter(n => mine(n) && !n.read_at).map(n => ({ ...n, kind: 'note' })).concat(D.voices.filter(v => mine(v) && !v.read_at).map(v => ({ ...v, kind: 'voice' }))); };
  const readNow = id => { if (roomTab === 'me') { const t = new Date().toISOString(); [...D.notes, ...D.voices].forEach(x => { if (x.id === id) x.read_at = t; }); api().markRead(S.code, S.slot, [id]).catch(() => { }); } };   // 받은 사람이 확인하면 방에서 사라지고 쪽지함에만 남음
  function drawRoomNotes() {
    const st = $('rstage'); if (!st || !$('v-room').classList.contains('on')) return;
    let box = st.querySelector('.rnotes'); if (box) box.remove();
    box = document.createElement('div'); box.className = 'rnotes'; st.appendChild(box);
    const bub = document.createElement('div'); bub.className = 'rbubble'; st.querySelectorAll('.rbubble').forEach(x => x.remove()); st.appendChild(bub);
    const list = roomNotes();
    list.forEach(n => {
      if (n.kind === 'voice') {   // 생김새는 글 쪽지와 같고, 열면 '재생하기' 버튼이 나온다
        const b = document.createElement('button'); b.type = 'button'; b.className = 'notebtn voice'; b.style.left = clampPct(n.x) + '%'; b.style.top = clampPct(n.y) + '%';
        b.setAttribute('aria-label', '목소리 쪽지 열기 · ' + nameOf(n.slot));
        const i = document.createElement('img'); i.src = A.note; i.className = 'note'; i.alt = ''; b.appendChild(i);
        b.onclick = e => {
          e.stopPropagation(); closeBubble(); clearTimeout(bub._t); bub.textContent = ''; void bub.offsetWidth; bub.classList.add('on');
          const sp = document.createElement('img'); sp.src = 'assets/ui/speaker.png'; sp.alt = ''; sp.className = 'spk'; bub.appendChild(sp);
          const t = document.createElement('span'); t.textContent = nameOf(n.slot) + '님의 목소리 쪽지 · ' + Math.max(1, Math.round(Number(n.dur) || 0)) + '초 '; bub.appendChild(t);
          const pb = document.createElement('button'); pb.type = 'button'; pb.className = 'btn small'; pb.textContent = '▶ 재생하기'; bub.appendChild(pb);
          if (n.slot === S.slot) { bub.appendChild(document.createTextNode(' ')); bub.appendChild(delBtn(n)); }
          bub._t = setTimeout(() => bub.classList.remove('on'), 15000);
          pb.onclick = async ev => {
            ev.stopPropagation(); if (playing) { playing.pause(); playing = null; pb.textContent = '▶ 재생하기'; sp.classList.remove('on'); return; }
            let fin = false, tm = 0; pb.textContent = '■ 멈춤'; clearTimeout(bub._t); sp.classList.add('on');
            const finish = ok => { if (fin) return; fin = true; clearTimeout(tm); sp.classList.remove('on'); pb.textContent = '▶ 재생하기'; if (ok && roomTab === 'me') { readNow(n.id); b.remove(); bub.classList.remove('on'); } else bub._t = setTimeout(() => bub.classList.remove('on'), 8000); };   // 잘 들렸을 때만 방에서 사라짐(실패하면 다시 누를 수 있음)
            tm = setTimeout(() => finish(!!playing), (Number(n.dur) || 3) * 1000 + 1500);
            await playVoice(n.id, null, finish);
          };
        };
        box.appendChild(b); return;
      }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'notebtn'; b.style.left = clampPct(n.x) + '%'; b.style.top = clampPct(n.y) + '%';
      b.setAttribute('aria-label', '쪽지 읽기 · ' + nameOf(n.slot));
      const i = document.createElement('img'); i.src = A.note; i.className = 'note'; i.alt = ''; b.appendChild(i);
      b.onclick = e => {
        e.stopPropagation(); closeBubble(); bub.textContent = ''; const t = document.createElement('span'); t.textContent = nameOf(n.slot) + ': ' + n.body + ' '; bub.appendChild(t);
        if (n.slot === S.slot) bub.appendChild(delBtn(n));   // 내가 보낸 쪽지는 삭제 가능
        void bub.offsetWidth; bub.classList.add('on'); clearTimeout(bub._t); bub._t = setTimeout(() => bub.classList.remove('on'), 12000); if (roomTab === 'me') { readNow(n.id); b.remove(); }
      };
      box.appendChild(b);
    });
    $('noteForm').hidden = roomTab !== 'pt' || !D.partner;
    if (roomTab === 'me') markNotesSeen();
    const hint = $('roomEmpty');
    if (roomTab === 'pt' && D.partner && !list.length && D.rooms.pt && D.rooms.pt.items.length) hint.textContent = '쪽지를 써서 ' + D.partner.name + '님의 방에 붙여 보세요.';
  }
  const clampPct = v => Math.max(2, Math.min(88, Number(v) || 0));
  let sending = false;
  async function addNote() {
    const v = $('noteIn').value.trim(); if (!v || sending) return;
    sending = true; $('addNote').disabled = true;
    try {
      await api().addNote(S.code, S.slot, { body: v, x: 8 + Math.random() * 78, y: 8 + Math.random() * 44 });
      $('noteIn').value = ''; toast('쪽지를 붙였어요'); await refresh(false); drawRoomNotes();
    } catch (e) { toast(explain(e)); }
    sending = false; $('addNote').disabled = false;
  }
  function drawNotesBox() {
    const box = $('noteList'); if (!box || !S) return;
    const inTab = n => notesTab === 'in' ? n.slot !== S.slot : n.slot === S.slot;
    const list = D.notes.filter(inTab).map(n => ({ ...n, kind: 'note' })).concat(D.voices.filter(inTab).map(v => ({ ...v, kind: 'voice' }))).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    $('tabIn').classList.toggle('on', notesTab === 'in'); $('tabOut').classList.toggle('on', notesTab === 'out');
    box.textContent = '';
    if (!list.length) { const e = document.createElement('div'); e.className = 'emptyhint'; e.style.display = 'block'; e.textContent = '쪽지가 없어요.'; box.appendChild(e); return; }
    list.forEach(n => {
      const row = document.createElement('div'); row.className = 'nrow' + (n.kind === 'voice' ? ' voice' : '');
      const nm = document.createElement('div'); nm.className = 'nm2'; nm.textContent = nameOf(n.slot) + ' '; const sp = document.createElement('span'); sp.className = 'muted'; sp.textContent = '· ' + when(n.created_at); nm.appendChild(sp); row.appendChild(nm);
      if (n.kind === 'note') { const t = document.createElement('div'); t.textContent = n.body; row.appendChild(t); }
      else { const t = document.createElement('span'); t.textContent = '목소리 쪽지 · ' + Math.max(1, Math.round(Number(n.dur) || 0)) + '초'; const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = '▶ 재생'; b.onclick = () => playVoice(n.id, b); row.appendChild(t); row.appendChild(b); }
      if (n.slot === S.slot) { const d = delBtn(n); d.style.marginTop = '6px'; row.appendChild(d); }   // 보낸 쪽지는 보낸 사람이 삭제 가능
      box.appendChild(row);
    });
  }
  /* ---------- 목소리 쪽지 ---------- */
  function closeBubble() {   // 쪽지 말풍선을 닫고, 듣고 있던 소리는 멈춘다
    const b = document.querySelector('.rbubble'); if (b) { b.classList.remove('on'); clearTimeout(b._t); }
    if (playing) { playing.pause(); playing = null; if (playBtn) playBtn.textContent = '▶ 재생'; playBtn = null; }
  }
  document.addEventListener('click', e => { const b = document.querySelector('.rbubble.on'); if (b && !b.contains(e.target) && !(e.target.closest && e.target.closest('.notebtn'))) closeBubble(); });
  function delBtn(n) {   // 한 번 누르면 '정말 삭제?'로 바뀌고, 3초 안에 한 번 더 누르면 삭제
    const d = document.createElement('button'); d.type = 'button'; d.className = 'btn small'; d.textContent = '삭제'; let armed = false, tm = 0;
    d.onclick = async ev => {
      ev.stopPropagation();
      if (!armed) { armed = true; d.textContent = '정말 삭제?'; tm = setTimeout(() => { armed = false; d.textContent = '삭제'; }, 3000); return; }
      clearTimeout(tm);
      try { await api().deleteItem(S.code, S.slot, n.id); D.notes = D.notes.filter(x => x.id !== n.id); D.voices = D.voices.filter(x => x.id !== n.id); closeBubble(); drawRoomNotes(); drawNotesBox(); toast('쪽지를 삭제했어요'); }
      catch (e) { armed = false; d.textContent = '삭제'; toast(explain(e)); }
    };
    return d;
  }
  function markAllRead() { if (!D.notes.concat(D.voices).some(x => x.slot !== S.slot && !x.read_at)) return; const t = new Date().toISOString(); D.notes.concat(D.voices).forEach(x => { if (x.slot !== S.slot && !x.read_at) x.read_at = t; }); api().markRead(S.code, S.slot, null).catch(() => { }); }   // 쪽지함에서 확인하면 방의 쪽지도 사라짐
  let rec = null, playing = null, playBtn = null;
  function paintRec(txt) { document.querySelectorAll('.recbtn').forEach(b => { b.textContent = txt || (b.closest('#v-notes') ? '● 목소리 쪽지 남기기' : '● 목소리'); b.classList.toggle('rec', !!rec); }); document.querySelectorAll('.recx').forEach(b => { b.hidden = !rec; }); }
  async function toggleRec() {
    if (!SSVoice.supported()) { toast('이 기기에서는 녹음을 쓸 수 없어요.'); return; }
    if (rec) { finishRec(); return; }
    try { rec = await SSVoice.start(sec => paintRec('■ 보내기 · ' + sec + '초'), () => finishRec()); paintRec('■ 보내기 · 0초'); }
    catch (e) { rec = null; paintRec(); toast('마이크를 쓸 수 없어요. 브라우저의 마이크 권한을 확인해 주세요.'); }
  }
  async function finishRec() {
    const r = rec; rec = null; paintRec(); if (!r) return;
    try {
      const v = await r.stop(); if (!v) return;
      if (v.dur < 0.5) { toast('너무 짧아요. 조금 더 길게 말해 주세요.'); return; }
      v.x = 8 + Math.random() * 78; v.y = 8 + Math.random() * 44;
      await api().addVoice(S.code, S.slot, v); toast('목소리 쪽지를 보냈어요 · 상대 방에 붙였어요'); await refresh(false); drawRoomNotes();
    } catch (e) { toast(explain(e)); }
  }
  async function playVoice(id, btn, onDone) {
    const setBtn = t => { if (btn) btn.textContent = t; };
    if (playing) { playing.pause(); playing = null; if (playBtn) playBtn.textContent = '▶ 재생'; const same = !!btn && playBtn === btn; playBtn = null; if (same) return; }
    try {
      const a = SSVoice.audioFrom(await api().getVoice(S.code, id)); if (!a) { toast('소리를 불러오지 못했어요.'); onDone && onDone(false); return; }
      playing = a; playBtn = btn; setBtn('■ 멈춤');
      const done = ok => { setBtn('▶ 재생'); playing = null; playBtn = null; onDone && onDone(ok); };
      a.onended = () => done(true); a.onerror = () => { done(false); toast('이 기기에서는 재생할 수 없는 소리 형식이에요.'); };
      await a.play();
    } catch (e) { setBtn('▶ 재생'); playing = null; playBtn = null; onDone && onDone(false); if (e && e.name !== 'AbortError') toast('재생하지 못했어요.'); }
  }
  document.querySelectorAll('.recbtn').forEach(b => { b.onclick = toggleRec; });
  document.querySelectorAll('.recx').forEach(b => { b.onclick = () => { if (rec) { rec.cancel(); rec = null; paintRec(); toast('녹음을 취소했어요'); } }; });

  /* ---------- 등록 화면 ---------- */
  let avTab = 'char';
  const AVTABS = [['char', '캐릭터'], ['hair', '머리'], ['face', '얼굴'], ['cloth', '옷'], ['item', '소품']];
  const MIXTABS = [['char', '세트'], ['face', '머리·얼굴'], ['cloth', '옷']];   // 세트 = 완성 캐릭터, 머리·얼굴/옷은 서로 바꿔 끼움
  function renderSetupAvatar() {
    const mixOk = true;
    if (!draft.avatar.custom && !draft.avatar.set && avTab !== 'char') { const cid = draft.avatar.mix ? 'g01' : Av.byId(draft.avatar.char).id; draft.avatar = { char: cid, set: { head: cid, outfit: cid } }; }   // 탭에서 고르면 머리·옷을 따로 바꾸는 상태로 전환로 전환
    const a = draft.avatar, tabs = $('avTabs'), panel = $('avPanel'); tabs.innerHTML = ''; panel.innerHTML = '';
    $('avPrev').src = Av.thumbUrl(a); $('avBig').src = Av.layerUrl(a);
    const mix = !!a.set;   // 머리·얼굴과 옷을 따로 고른 캐릭터
    const simple = !!a.custom || (!mixOk && Av.byId(a.char).v2);   // 내 사진 캐릭터는 고르기만
    if (simple) avTab = 'char';
    if (mixOk && !MIXTABS.some(t => t[0] === avTab)) avTab = 'char';
    tabs.hidden = !!simple;
    (mixOk ? MIXTABS : AVTABS).forEach(([id, label]) => {
      if (simple && id !== 'char') return;
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.className = 'tab' + (avTab === id ? ' on' : ''); b.textContent = label;
      b.setAttribute('aria-selected', avTab === id); b.onclick = () => { avTab = id; renderSetupAvatar(); }; tabs.appendChild(b);
    });
    const ch = a.custom ? null : Av.byId(a.char);
    const part = (key) => {   // 24종 후보 격자(여자·남자 구분): key = head | outfit
      [['f', '여자'], ['m', '남자']].forEach(([grp, label]) => {
        title(label); const g = grid();
        Av.list().filter(c => c.group === grp).forEach((c, i) => cell(g, key === 'head' ? String(i + 1) : c.name, key === 'head' ? V({ ...a, set: { ...a.set, head: c.id } }) : Av.thumbUrl({ ...a, set: { ...a.set, outfit: c.id } }), a.set[key] === c.id, () => { a.set[key] = c.id; }));
      });
    };
    const title = t => { const d = document.createElement('div'); d.className = 'cl'; d.textContent = t; panel.appendChild(d); };
    const grid = () => { const g = document.createElement('div'); g.className = 'ogrid'; panel.appendChild(g); return g; };
    const cell = (g, label, src, on, fn) => {   // 썸네일 칸
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ocell' + (on ? ' on' : ''); b.title = label; b.setAttribute('aria-label', label);
      if (src) { const im = document.createElement('img'); im.alt = ''; im.src = src; b.appendChild(im); } else { const t = document.createElement('span'); t.className = 'none'; t.textContent = '✕'; b.appendChild(t); }
      const l = document.createElement('i'); l.textContent = label; b.appendChild(l);
      b.onclick = () => { fn(); renderSetupAvatar(); }; g.appendChild(b);
    };
    const swatches = (key, label, list) => {
      const row = document.createElement('div'); row.className = 'crow'; const cl = document.createElement('span'); cl.className = 'cl'; cl.textContent = label; row.appendChild(cl);
      const def = document.createElement('button'); def.type = 'button'; def.className = 'sw2 def' + (!a[key] ? ' on' : ''); def.textContent = '기본'; def.onclick = () => { a[key] = null; renderSetupAvatar(); }; row.appendChild(def);
      list.forEach(c => { const s = document.createElement('button'); s.type = 'button'; s.className = 'sw2' + (a[key] === c ? ' on' : ''); s.style.background = c; s.setAttribute('aria-label', c); s.onclick = () => { a[key] = c; renderSetupAvatar(); }; row.appendChild(s); });
      panel.appendChild(row);
    };
    const accRow = () => { if ((a.head && a.head !== 'none') || a.scarf || (a.neck && a.neck !== 'none')) { const al = Av.SWATCH.accent, row = document.createElement('div'); row.className = 'crow'; row.innerHTML = '<span class="cl">소품색</span>'; al.forEach(c => { const s = document.createElement('button'); s.type = 'button'; s.className = 'sw2' + ((a.accent || al[0]) === c ? ' on' : ''); s.style.background = c; s.setAttribute('aria-label', c); s.onclick = () => { a.accent = c; renderSetupAvatar(); }; row.appendChild(s); }); panel.appendChild(row); } };
    const V = (o) => Av.headUrl({ ...a, ...o });
    const T = o => Av.thumbUrl(o);
    if (mix && avTab === 'face') {
      part('head');
    } else if (mix && avTab === 'cloth') {
      part('outfit');
    } else if (avTab === 'char') {
      { const h = document.createElement('div'); h.className = 'hint'; h.textContent = mix ? '추천을 고르면 완성된 캐릭터로 바뀌어요. 지금 꾸민 모습은 취소 전까지 위 탭에서 다시 만들 수 있어요.' : '마음에 드는 캐릭터를 고르거나, 위 탭에서 하나씩 바꿔 보세요. (탭을 누르면 직접 꾸미기로 바뀌어요)'; panel.appendChild(h); }
      [['f', '여자'], ['m', '남자']].forEach(([grp, label]) => { title(label); const g = grid(); Av.list().filter(c => c.group === grp).forEach(c => cell(g, c.name, Av.thumbUrl({ char: c.id }), !a.custom && !a.mix && Av.byId(a.char).id === c.id, () => { draft.avatar = { char: c.id, hair: null, top: null, bottom: null }; })); });
      if (a.custom) { const h = document.createElement('div'); h.className = 'hint'; h.textContent = '지금은 내가 만든 캐릭터예요. 위에서 고르면 꾸미기가 켜져요.'; panel.appendChild(h); }
    } else if (avTab === 'hair') {
      if (ch.hairStyles && ch.hairStyles.length > 1) { title('머리 모양'); const g = grid(); ch.hairStyles.forEach(s => cell(g, s.name, V({ hairStyle: s.id }), (a.hairStyle || ch.hairStyles[0].id) === s.id, () => { a.hairStyle = s.id; })); }
      title('머리 색'); swatches('hair', '', Av.SWATCH.hair);
    } else if (avTab === 'face') {
      const sec = (t, key, list, def) => { title(t); const g = grid(); list.forEach(([id, name]) => cell(g, name, V({ [key]: id === 'none' ? null : id }), (a[key] || def || 'none') === id || (key === 'glasses' && id === 'square' && a.glasses === true), () => { a[key] = id === 'none' ? null : id; })); };
      if (ch.builder) { sec('얼굴형', 'faceShape', Av.OPT.faceShape, 'round'); title('피부색'); swatches('skin', '', Av.SWATCH.skin); sec('눈', 'eyes', Av.OPT.eyes, 'dot'); sec('눈썹', 'brows', Av.OPT.brows, 'flat'); sec('수염', 'beard', Av.OPT.beard); }
      sec('입', 'mouth', Av.OPT.mouth); sec('볼 · 점', 'cheek', Av.OPT.cheek); sec('안경', 'glasses', Av.OPT.glasses);
    } else if (avTab === 'cloth') {
      if (ch.builder) { const t1 = (t, key, list, def) => { title(t); const g = grid(); list.forEach(([id, name]) => cell(g, name, Av.thumbUrl({ ...a, [key]: id }), (a[key] || def) === id, () => { a[key] = id; })); }; t1('상의 종류', 'topStyle', Av.OPT.topStyle, 'tee'); t1('하의 종류', 'bottomStyle', Av.OPT.bottomStyle, 'pants'); }
      title('상의 색'); swatches('top', '', Av.SWATCH.top); title('하의 색'); swatches('bottom', '', Av.SWATCH.bottom);
      title('상의 무늬'); const g1 = grid(); Av.patterns().forEach(s => cell(g1, s.name, Av.thumbUrl({ ...a, tpat: s.id }), (a.tpat || 'none') === s.id, () => { a.tpat = s.id; }));
      title('하의 무늬'); const g2 = grid(); Av.patterns().forEach(s => cell(g2, s.name, Av.thumbUrl({ ...a, bpat: s.id }), (a.bpat || 'none') === s.id, () => { a.bpat = s.id; }));
    } else {
      title('머리 소품'); const g = grid(); Av.headItems().forEach(s => cell(g, s.name, s.id === 'none' ? null : V({ head: s.id }), (a.head || 'none') === s.id, () => { a.head = s.id; }));
      title('목 · 가슴'); const g2 = grid();
      Av.OPT.neck.forEach(([id, name]) => cell(g2, name, id === 'none' ? null : Av.thumbUrl({ ...a, scarf: id === 'scarf', neck: id === 'scarf' ? null : id }), id === 'none' ? (!a.scarf && !a.neck) : id === 'scarf' ? !!a.scarf : a.neck === id, () => { a.scarf = id === 'scarf'; a.neck = (id === 'none' || id === 'scarf') ? null : id; }));
      accRow();
    }
  }
  let dressSnap = '';
  $('openDress').onclick = () => { dressSnap = JSON.stringify(draft.avatar); avTab = 'char'; renderSetupAvatar(); view('v-dress'); };
  $('dressDone').onclick = () => { renderSetupAvatar(); view('v-setup'); };
  $('dressBack').onclick = () => { draft.avatar = JSON.parse(dressSnap); renderSetupAvatar(); view('v-setup'); };
  /* ---------- D-day ---------- */
  const dayNum = k => Math.floor(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / 864e5);
  function paintDD() {
    const el = $('dd'); if (!el || !S || !S.me) return; const dd = D.dday || {}, t = dayNum(today()); el.textContent = '';
    const chip = (txt, cls) => { const sp = document.createElement('span'); if (cls) sp.className = cls; sp.textContent = txt; el.appendChild(sp); };
    if (dd.start) chip('함께한 지 ' + (t - dayNum(dd.start) + 1) + '일');
    if (dd.meet) { const n = dayNum(dd.meet) - t; if (n === 0) chip('오늘 만나요!', 'meet'); else if (n > 0) chip('만날 때까지 D-' + n, 'meet'); }
    el.hidden = !el.childNodes.length;
  }
  function paintSettings(isEdit) {   // 설정(내 정보 수정) 화면: 코드·초대 공유, D-day
    const box = $('setBox'), on = !!(isEdit && S && S.mode === 'remote'); box.hidden = !isEdit || !S; if (box.hidden) return;
    $('setCode').textContent = S.mode === 'remote' ? S.code : '(체험 중이라 코드가 없어요)'; $('codeBtn').hidden = !on;
    $('ddStart').value = (D.dday || {}).start || ''; $('ddMeet').value = (D.dday || {}).meet || '';
    paintInst(isEdit);
  }
  $('ddSave').onclick = async () => {
    const d = { start: $('ddStart').value, meet: $('ddMeet').value };
    try { await api().setDday(S.code, S.slot, d); D.dday = { start: d.start, meet: d.meet }; paintDD(); toast('날짜를 저장했어요'); await refresh(true); }
    catch (e) { toast(explain(e)); }
  };
  $('ddClear').onclick = () => { $('ddStart').value = ''; $('ddMeet').value = ''; $('ddSave').onclick(); };

  /* ---------- 앱으로 설치 ---------- */
  let bip = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); bip = e; showInstBar(); paintInst($('setBox') && !$('setBox').hidden); });
  window.addEventListener('appinstalled', () => { bip = null; $('instBar').hidden = true; paintInst(false); toast('앱으로 설치했어요'); });
  const standaloneNow = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  function installHelp() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'Safari 아래의 공유 버튼(□↑)을 누르고 "홈 화면에 추가"를 고르세요. 홈 화면에 생긴 "같은 하늘" 아이콘으로 열면 앱처럼 쓸 수 있어요. (Safari에서 열어야 해요)';
    if (/Android/.test(ua)) return '브라우저 오른쪽 위 메뉴(⋮)를 열고 "앱 설치" 또는 "홈 화면에 추가"를 고르세요. 삼성 인터넷은 메뉴(≡) → "현재 페이지 추가" → "홈 화면"이에요.';
    return '주소창 오른쪽의 설치 아이콘을 누르거나, 브라우저 메뉴에서 "앱 설치"를 고르세요.';
  }
  function paintInst(isEdit) {
    const box = $('instBox'); if (!box) return; box.hidden = !isEdit || standaloneNow();
    if (box.hidden) return; $('instText').textContent = bip ? '버튼을 누르면 홈 화면에 앱이 설치돼요.' : installHelp(); $('instBtn').hidden = !bip;
  }
  function showInstBar() {
    let off = false; try { off = localStorage.getItem('ss.instx') === '1'; } catch (e) { }
    $('instBar').hidden = standaloneNow() || off || !(S && S.mode === 'remote');
  }
  $('instBtn').onclick = async () => { if (!bip) return; bip.prompt(); try { await bip.userChoice; } catch (e) { } bip = null; paintInst(true); };
  $('instMore').onclick = () => { if (bip) { bip.prompt(); return; } openSetup(true); setTimeout(() => $('instBox').scrollIntoView({ block: 'center' }), 60); };
  $('instX').onclick = () => { $('instBar').hidden = true; try { localStorage.setItem('ss.instx', '1'); } catch (e) { } };

  /* ---------- 알림(푸시) ---------- */
  const PUSH_TXT = {
    noserver: '알림 기능이 아직 준비되지 않았어요.',
    unsupported: '이 브라우저에서는 알림을 지원하지 않아요.',
    install: 'iPhone은 먼저 Safari 공유 버튼(□↑) → "홈 화면에 추가"를 한 뒤, 홈 화면의 "같은 하늘" 아이콘으로 열어서 켜 주세요. (iOS 16.4 이상)',
    denied: '브라우저에서 알림이 꺼져 있어요. 설정에서 이 사이트의 알림을 허용해 주세요.',
    off: '상대가 사진·쪽지·목소리·하트를 보내면 잠금화면에 알림이 와요.',
    on: '알림이 켜져 있어요. 상대가 보내면 알림이 와요.'
  };
  async function paintPush(isEdit) {
    const box = $('pushBox'); box.hidden = !(isEdit && S && S.mode === 'remote'); if (box.hidden) return;
    const st = await SSPush.state(); $('pushText').textContent = PUSH_TXT[st] || '';
    const b = $('pushBtn'); b.hidden = !(st === 'off' || st === 'on'); b.textContent = st === 'on' ? '알림 끄기' : '알림 켜기'; b.dataset.st = st;
  }
  $('pushBtn').onclick = async () => {
    const b = $('pushBtn'); b.disabled = true;
    try { if (b.dataset.st === 'on') { await SSPush.disable(S.code, S.slot); toast('알림을 껐어요'); } else { await SSPush.enable(S.code, S.slot); toast('알림을 켰어요'); } }
    catch (e) { toast(e && e.message === 'denied' ? '알림이 허용되지 않았어요.' : explain(e)); }
    b.disabled = false; paintPush(true);
  };
  function renderPicked() {
    const p = draft.place, cn = Geo.country(p.cc), el = $('picked');
    el.textContent = p.city ? '✓ ' + p.city.name + ' (' + cn.name + ')' : '도시를 입력하지 않으면 수도(' + cn.capital + ')로 설정돼요';
  }
  let st = 0;
  function onCityInput() {
    clearTimeout(st); const q = $('city').value.trim(), list = $('cities');
    draft.place.city = null; renderPicked();
    if (!q) { list.innerHTML = ''; return; }
    st = setTimeout(async () => {
      list.textContent = '검색 중…';
      const r = await Geo.search(draft.place.cc, q);
      if ($('city').value.trim() !== q) return;
      list.innerHTML = '';
      if (!r.length) { list.textContent = '"' + q + '"이(가) 포함된 도시를 찾지 못했어요. 영어 이름으로도 검색해 보세요. (비워두면 수도로 설정)'; return; }
      r.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'city'; b.textContent = c.label; b.onclick = () => { draft.place.city = c; $('city').value = c.name; list.innerHTML = ''; renderPicked(); }; list.appendChild(b); });
    }, 250);
  }
  function openSetup(isEdit) {
    editing = isEdit;
    const me = isEdit && S ? S.me : null;
    draft = { avatar: me ? JSON.parse(JSON.stringify(me.avatar)) : { char: 'g01', hair: null, top: null, bottom: null }, profile: me ? me.profile : null, place: { cc: me ? me.city.cc : 'KR', city: me && me.city.isCapital === false ? me.city : null } };
    $('name').value = me ? me.name : '';
    $('country').value = draft.place.cc; $('city').value = draft.place.city ? draft.place.city.name : ''; $('cities').innerHTML = '';
    $('setupTitle').textContent = isEdit ? '내 정보 수정' : '먼저 내 정보를 등록해요'; $('setupErr').textContent = ''; $('prev').hidden = true;
    $('setupCancel').hidden = !isEdit; $('keyBtn').hidden = !(isEdit && S && S.mode === 'remote' && S.token); $('resetEdit').hidden = !isEdit; paintPush(isEdit); paintSettings(isEdit); renderSetupAvatar(); renderPicked(); view('v-setup');
  }
  function submitSetup(e) {
    e.preventDefault();
    const name = $('name').value.trim(), q = $('city').value.trim();
    if (!name) { $('setupErr').textContent = '이름을 입력해 주세요.'; return; }
    if (q && !draft.place.city) { $('setupErr').textContent = '도시를 목록에서 골라 주세요. (비워두면 수도로 설정돼요)'; return; }
    const cn = Geo.country(draft.place.cc);
    const city = draft.place.city ? { name: draft.place.city.name, country: cn.name, cc: cn.cc, lat: draft.place.city.lat, lon: draft.place.city.lon, tz: draft.place.city.tz, isCapital: false } : { ...Geo.capitalOf(cn.cc), isCapital: true };
    const me = { name, avatar: draft.avatar, city, profile: draft.profile };
    if (editing && S) { S.me = me; save(); api().saveMember(S.code, S.slot, me).catch(() => toast('내 정보를 서버에 저장하지 못했어요. 상대 화면에는 이전 정보가 보일 수 있어요.')); startHome(); }
    else {
      pendingMe = me; $('connErr').textContent = ''; view('v-connect');
      if (invite) { $('joinCode').value = invite; $('inviteHint').hidden = false; $('connBox').classList.add('invited'); }
    }
  }
  const API_BASE = /github\.io$/.test(location.hostname) ? 'https://same-sky-hazel.vercel.app' : '';   // Pages에는 서버 함수가 없어 Vercel 쪽을 호출
  async function aiPixelize(im, mode) {   // 사진을 줄여 서버 함수로 보내고, 도트 그림을 받아 온다
    const k = Math.min(1, 768 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    $('aiStat').textContent = 'AI가 도트로 그리는 중… (20~60초)';
    let r; try { r = await fetch(API_BASE + '/api/pixelize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: c.toDataURL('image/jpeg', .85), mode }) }); } catch (e) { throw new Error('서버에 연결하지 못했어요.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.image) throw new Error({ no_key: 'AI 변환이 아직 준비되지 않았어요.', limit: '오늘은 AI 변환을 너무 많이 썼어요. 잠시 뒤에 다시 해 주세요.', rejected: '이 사진은 변환할 수 없었어요. 다른 사진을 써 보세요.' }[j.error] || 'AI 변환에 실패했어요.');
    $('aiStat').textContent = '완료! 마음에 안 들면 다시 선택해 보세요.';
    return loadImg(await (await fetch(j.image)).blob());
  }
  async function onUpload(file) {
    try {
      const mode = document.querySelector('input[name="mode"]:checked').value; let cv, im = await loadImg(file), ai = false;
      if ($('aiMode').checked) { try { im = await aiPixelize(im, mode); ai = true; } catch (e) { $('aiStat').textContent = e.message + ' 대신 기본 변환을 썼어요.'; } }
      if (mode === 'full') {
        cv = dotify(im, { size: 30, ratio: 2, colors: 10, contrast: 1.15, sat: 1.3, sharpen: .6, outline: true, rmbg: true, tol: 40, ...(ai ? { colors: 12, contrast: 1, sat: 1, sharpen: 0 } : {}) });
        const layer = document.createElement('canvas'); layer.width = 110; layer.height = 120;
        layer.getContext('2d').drawImage(cv, Math.round((110 - cv.width) / 2), 108 - cv.height);
        draft.avatar = { custom: true, url: layer.toDataURL(), thumb: cv.toDataURL() }; renderSetupAvatar();
      } else { cv = dotify(im, { size: 32, ratio: 1, colors: 10, contrast: 1.15, sat: 1.3, sharpen: .6, outline: true, rmbg: false, tol: 40 }); draft.profile = cv.toDataURL(); }
      $('prev').src = cv.toDataURL(); $('prev').hidden = false;
    } catch (e) { $('setupErr').textContent = '이미지를 불러오지 못했어요.'; }
  }

  /* ---------- 커플 연결 ---------- */
  async function connectCreate() {
    $('connErr').textContent = '';
    try {
      const code = await Remote.createCouple();
      S = { code, slot: 'a', mode: 'remote', me: pendingMe, token: newToken() }; Remote.token = S.token; await Remote.saveMember(code, 'a', S.me); save(); startHome();
    } catch (e) { $('connErr').textContent = explain(e); }
  }
  async function connectJoin() {
    const code = $('joinCode').value.trim().toUpperCase(); $('connErr').textContent = '';
    if (code.length < 4) { $('connErr').textContent = '상대가 알려준 코드를 입력해 주세요.'; return; }
    try {
      const c = await Remote.getCouple(code);
      if (!c.exists) { $('connErr').textContent = '그 코드를 찾을 수 없어요.'; return; }
      const taken = c.members.map(m => m.slot);
      if (taken.length >= 2 && $('slotRow').hidden) { $('slotRow').hidden = false; $('connErr').textContent = '이미 두 사람이 등록된 코드예요. 기기를 바꾼 경우라면 본인 자리를 골라 다시 눌러 주세요.'; return; }
      const slot = taken.length >= 2 ? $('slotPick').value : (!taken.includes('b') ? 'b' : 'a');
      const key = taken.length >= 2 ? $('slotKey').value.trim() : '';   // 기기를 바꾼 경우: 이전 기기의 열쇠
      if (taken.length >= 2 && key.length < 16) { $('connErr').textContent = '기기 변경 열쇠를 입력해 주세요. (이전 기기의 "내 정보" 화면에서 복사할 수 있어요)'; return; }
      S = { code, slot, mode: 'remote', me: pendingMe, token: key || newToken() }; Remote.token = S.token; await Remote.saveMember(code, slot, S.me); save(); startHome();
    } catch (e) { $('connErr').textContent = explain(e); }
  }
  function connectDemo() { S = { code: 'DEMO', slot: 'a', mode: 'local', me: pendingMe }; save(); if (!L.photos.length && !L.notes.length) demoPartnerSends(2); startHome(); }

  /* ---------- 홈 ---------- */
  let started = false;
  /* ---------- 내 방 ---------- */
  let roomTab = 'me', roomEditing = false, roomView = null, roomTimer = 0, roomSaveFail = false;
  const myRoom = () => D.rooms.me || (S.room && Room.sanitize(S.room)) || Room.emptyRoom();
  function drawRoom() {
    const mine = roomTab === 'me', r = mine ? myRoom() : D.rooms.pt, st = $('rstage');
    if (!$('v-room').classList.contains('on')) return;
    roomView = Room.mount(st, { avatarUrl: (mine ? S.me : D.partner) ? Av.layerUrl((mine ? S.me : D.partner).avatar) : '', room: r || Room.emptyRoom(), editable: mine, onChange: mine ? saveRoomSoon : null, onSelect: mine ? paintSel : null });
    $('tabRMe').classList.toggle('on', mine); $('tabRPt').classList.toggle('on', !mine);
    $('rtools').hidden = !mine; $('rsel').hidden = true; paintMeBtn();
    const who = mine ? S.me.name : (D.partner ? D.partner.name : '상대');
    $('roomTitle').textContent = mine ? '내 방' : who + '의 방';
    $('roomEmpty').textContent = !mine && !(r && r.items.length) ? who + '의 방은 아직 비어 있어요.' : '';
    $('roomEmpty').style.display = $('roomEmpty').textContent ? 'block' : 'none';
    drawRoomNotes(); $('roomEmpty').style.display = $('roomEmpty').textContent ? 'block' : 'none';
  }
  function paintMeBtn() { $('rMe').textContent = roomView && roomView.hasMe() ? '☺ 내 캐릭터 치우기' : '☺ 내 캐릭터 세우기'; }
  function paintSel(it) { paintMeBtn(); $('rsel').hidden = !it; $('rRot').hidden = !(it && Room.ROT.includes(it.t)); if (it) $('rselName').textContent = Room.DEFS[it.t][0] + ' 선택됨'; }
  function saveRoomSoon(room) {   // 끌기를 멈추고 0.8초 뒤 저장 (서버 호출 줄이기)
    roomEditing = true; D.rooms.me = Room.sanitize(room);
    if (S.mode !== 'local') { S.room = D.rooms.me; save(); }   // 서버가 못 받아도 이 기기엔 남김
    clearTimeout(roomTimer);
    roomTimer = setTimeout(async () => {
      try { await api().saveRoom(S.code, S.slot, D.rooms.me); roomSaveFail = false; }
      catch (e) { if (!roomSaveFail) toast(e.code === 'no_schema' ? '방 저장 기능이 서버에 아직 없어요 (관리자: schema.sql 다시 실행). 이 기기에는 저장됐어요.' : explain(e)); roomSaveFail = true; }
      roomEditing = false;
    }, 800);
  }
  function openRoom(tab) { roomTab = tab || 'me'; view('v-room'); drawRoom(); }
  function buildPalette() {
    const pal = $('rpal');
    Room.TYPES.forEach(t => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'rcell';
      const im = document.createElement('img'); im.src = Room.sprite(t); im.alt = '';
      const sp = document.createElement('span'); sp.textContent = Room.DEFS[t][0];
      b.appendChild(im); b.appendChild(sp);
      b.onclick = () => { if (roomView && !roomView.add(t)) toast('가구는 ' + Room.MAX_ITEMS + '개까지 놓을 수 있어요'); };
      pal.appendChild(b);
    });
  }

  function startHome() {
    if (!started) {
      mk($('st-me')); mk($('st-pt'));
      $('st-me').addEventListener('click', e => heart($('st-me'), e));
      $('st-pt').addEventListener('click', e => heart($('st-pt'), e));
      started = true;
    }
    if (S.mode === 'local') SSLive.stop(); else SSLive.start(S.code, () => poll());   // 상대가 바꾸면 신호로 바로 새로 받음
    $('editMe').hidden = false; $('demo').hidden = S.mode !== 'local';
    showInstBar(); paintDD();
    showRegions(); view('v-home'); paint(); clock(); refresh(false).then(real);
  }

  /* ---------- 체험: 두 사람의 지역을 각각 바꿔 보기 ---------- */
  function partnerOf() { return S.demoPartner || (S.demoPartner = JSON.parse(JSON.stringify(DEMO_PARTNER))); }
  function showRegions() {
    const on = S.mode === 'local'; $('regions').hidden = !on; if (!on) return;
    SIDES.forEach(s => {
      const c = (s === 'me' ? S.me : partnerOf()).city;
      $('rg-country-' + s).value = c.cc; $('rg-city-' + s).value = c.isCapital === false ? c.name : ''; $('rg-list-' + s).innerHTML = '';
    });
  }
  async function setRegion(side, city) {
    if (side === 'me') S.me.city = city; else partnerOf().city = city;
    save(); await refresh(false); real();
  }
  function initRegions() {
    SIDES.forEach(s => {
      const sel = $('rg-country-' + s), inp = $('rg-city-' + s), list = $('rg-list-' + s);
      Geo.COUNTRIES.forEach(c => { const o = document.createElement('option'); o.value = c.cc; o.textContent = c.name; sel.appendChild(o); });
      sel.addEventListener('change', () => { inp.value = ''; list.innerHTML = ''; setRegion(s, { ...Geo.capitalOf(sel.value), isCapital: true }); });
      let t = 0;
      inp.addEventListener('input', () => {
        clearTimeout(t); const q = inp.value.trim();
        if (!q) { list.innerHTML = ''; return; }
        t = setTimeout(async () => {
          list.textContent = '검색 중…';
          const r = await Geo.search(sel.value, q);
          if (inp.value.trim() !== q) return;
          list.innerHTML = '';
          if (!r.length) { list.textContent = '"' + q + '"이(가) 포함된 도시를 찾지 못했어요. 영어 이름도 써 보세요.'; return; }
          r.forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.className = 'city'; b.textContent = c.label; b.onclick = () => { inp.value = c.name; list.innerHTML = ''; setRegion(s, { name: c.name, country: c.country, cc: c.cc, lat: c.lat, lon: c.lon, tz: c.tz, isCapital: false }); }; list.appendChild(b); });
        }, 250);
      });
      enterKey(inp, () => { const f = list.querySelector('.city'); if (f) f.click(); });
    });
  }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('m-view').hidden = true; $('m-photo').hidden = true; } });
  $('setupForm').addEventListener('submit', submitSetup);
  $('setupCancel').onclick = () => view('v-home');
  $('editMe').onclick = () => openSetup(true);
  $('keyBtn').onclick = async () => { try { await navigator.clipboard.writeText(S.token); toast('기기 변경 열쇠를 복사했어요. 다른 사람에게 알려주지 마세요'); } catch (e) { toast('열쇠: ' + S.token); } };
  enterKey($('name'), () => $('city').focus());
  $('country').addEventListener('change', () => { draft.place = { cc: $('country').value, city: null }; $('city').value = ''; $('cities').innerHTML = ''; renderPicked(); });
  $('city').addEventListener('input', onCityInput);
  enterKey($('city'), () => { const f = $('cities').querySelector('.city'); if (f) f.click(); });
  $('file').onchange = e => { if (e.target.files[0]) onUpload(e.target.files[0]); };
  $('cCreate').onclick = connectCreate; $('cJoin').onclick = connectJoin; $('cDemo').onclick = connectDemo;
  enterKey($('joinCode'), connectJoin);
  $('cBack').onclick = () => view('v-setup');
  $('codeBtn').onclick = async () => {   // 초대 링크 공유: 공유창이 있으면 그걸로, 없으면 복사
    const url = location.origin + location.pathname + '?code=' + S.code, text = '같은 하늘에서 만나요! 링크를 열면 코드가 자동으로 입력돼요 (코드 ' + S.code + ')';
    try { if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) { await navigator.share({ title: 'Same Sky', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); toast('초대 링크를 복사했어요'); } catch (e) { toast('초대 링크: ' + url); }
  };
  $('copyWait').onclick = $('codeBtn').onclick;
  $('goTown').onclick = () => openRoom('pt');
  $('addNote').onclick = addNote; enterKey($('noteIn'), addNote);
  document.querySelectorAll('#tabbar button').forEach(b => b.onclick = () => {
    const g = b.dataset.go;
    if (g === 'home') view('v-home'); else if (g === 'room') openRoom('me'); else if (g === 'pt') { if (D.partner) openRoom('pt'); else toast('상대가 연결되면 갈 수 있어요'); }
    else if (g === 'photos') { drawPhotos(); view('v-photos'); markPhotosSeen(); } else if (g === 'notes') { drawNotesBox(); view('v-notes'); markNotesSeen(); }
  });
  $('goRoom').onclick = () => openRoom('me'); $('backR').onclick = () => view('v-home');
  $('tabRMe').onclick = () => { roomTab = 'me'; drawRoom(); paintTabbar(); }; $('tabRPt').onclick = () => { roomTab = 'pt'; drawRoom(); paintTabbar(); };
  $('rMe').onclick = () => { if (!roomView) return; if (roomView.toggleMe() === null) toast('가구는 ' + Room.MAX_ITEMS + '개까지 놓을 수 있어요'); paintMeBtn(); };
  $('rFlip').onclick = () => roomView && roomView.flip(); $('rRot').onclick = () => roomView && roomView.rotate(); $('rSm').onclick = () => roomView && roomView.resize(-1); $('rBg').onclick = () => roomView && roomView.resize(1); $('rDel').onclick = () => roomView && roomView.remove();
  $('rWall').onclick = () => roomView && roomView.theme('wall', 1); $('rFloor').onclick = () => roomView && roomView.theme('floor', 1);
  $('rClear').onclick = () => { if (roomView && roomView.room.items.length && confirm('방의 가구를 모두 치울까요?')) roomView.clear(); };
  document.addEventListener('keydown', e => { if ((e.key === 'Delete' || e.key === 'Backspace') && roomView && $('v-room').classList.contains('on') && roomTab === 'me' && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) { e.preventDefault(); roomView.remove(); } });
  $('goPhotos').onclick = () => { drawPhotos(); view('v-photos'); markPhotosSeen(); }; $('backP').onclick = () => view('v-home');
  $('goNotes').onclick = () => { drawNotesBox(); view('v-notes'); markNotesSeen(); markAllRead(); }; $('backN').onclick = () => view('v-home');
  $('tabIn').onclick = () => { notesTab = 'in'; drawNotesBox(); }; $('tabOut').onclick = () => { notesTab = 'out'; drawNotesBox(); };
  $('photo').onclick = () => { pending = null; $('pPrev').hidden = true; $('pCap').value = ''; $('pSend').disabled = true; $('pdot').checked = false; $('pFile').value = ''; $('pCam').value = ''; $('m-photo').hidden = false; };
  $('pFile').onchange = $('pCam').onchange = e => { if (e.target.files[0]) onPhotoFile(e.target.files[0]); };
  $('pdot').onchange = () => { if (!pending || !pending.im) return; pending.data = prepare(pending.im, $('pdot').checked); $('pPrev').src = pending.data; $('pPrev').className = $('pdot').checked ? 'pix' : ''; };
  $('pCancel').onclick = () => { $('m-photo').hidden = true; }; $('pSend').onclick = sendPhoto;
  $('m-view').onclick = () => { $('m-view').hidden = true; }; $('lbClose').onclick = e => { e.stopPropagation(); $('m-view').hidden = true; };
  $('lbHeart').onclick = async e => {
    e.stopPropagation(); if (!curPhoto) return;
    try { await api().heartPhoto(S.code, curPhoto.id, S.slot); await refresh(true); const np = D.photos.find(x => String(x.id) === String(curPhoto.id)); if (np) openPhoto(np); }
    catch (err) { toast(explain(err)); }
  };
  $('news').onclick = () => { const u = unread(); if (u.np || u.nh) { drawPhotos(); view('v-photos'); markPhotosSeen(); } else { openRoom('me'); } };
  $('demoSend').onclick = async () => { demoPartnerSends(1); await refresh(true); };
  $('real').onclick = real;
  $('reset').onclick = $('resetEdit').onclick = () => { if (confirm('이 기기에 저장된 정보를 지우고 처음부터 다시 할까요? (서버의 사진·쪽지는 코드로 다시 들어올 수 있지만, 내 자리로 돌아오려면 "기기 변경 열쇠"가 필요해요. 열쇠는 "내 정보"에서 복사할 수 있어요)')) { try { localStorage.removeItem(KEY); localStorage.removeItem(LKEY); } catch (e) { } location.reload(); } };
  SIDES.forEach(s => {
    const sel = $('sel-' + s);
    Object.keys(KL).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = KL[k]; sel.appendChild(o); });
    sel.onchange = () => { W[s].kind = sel.value; W[s].night = sel.value === 'night'; paint(); };
  });

  /* ---------- 접근성: 모달 포커스, 탭 상태 ---------- */
  document.querySelectorAll('.modal').forEach(m => {   // 열리면 안으로 포커스, 닫히면 원래 자리로, Tab은 안에서만 돎
    let back = null;
    new MutationObserver(() => {
      if (!m.hidden) { back = document.activeElement; const f = m.querySelector('button:not([hidden]),input:not([type=hidden]),[tabindex]'); if (f) f.focus(); }
      else if (back && back.focus) { try { back.focus(); } catch (e) { } back = null; }
    }).observe(m, { attributes: true, attributeFilter: ['hidden'] });
    m.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const f = [...m.querySelectorAll('button:not([hidden]),input:not([hidden]):not([type=hidden]),select,textarea')].filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
  });
  const tabState = t => t.setAttribute('aria-pressed', t.classList.contains('on') ? 'true' : 'false');
  document.querySelectorAll('.tabs .tab').forEach(tabState);
  new MutationObserver(ms => ms.forEach(m => { if (m.target.matches && m.target.matches('.tab')) tabState(m.target); })).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });

  /* ---------- 인트로: 앱을 열 때 한 번 ---------- */
  (function () {
    const el = $('intro'); if (!el) return; let seen = false;
    try { seen = sessionStorage.getItem('ss.intro') === '1'; sessionStorage.setItem('ss.intro', '1'); } catch (e) { }
    if (seen) { el.remove(); return; }
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 500); };
    el.onclick = close; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') close(); }; setTimeout(close, 2800);
  })();

  /* ---------- 시작 ---------- */
  Globe.attach($('globe')); initRegions(); buildPalette();
  setInterval(clock, 1000);
  let lastState = '';
  async function poll() {   // 숨겨진 탭에서는 멈추고, 바뀐 게 있을 때만 전체를 다시 받음
    if (!S || !S.code || document.hidden) return;
    let st = null; try { st = JSON.stringify(await api().getState(S.code)); } catch (e) { }
    if (st && st === lastState) return; if (st) lastState = st;
    await refresh(true);
  }
  setInterval(poll, 6000);   // 신호가 안 와도(연결 끊김 등) 6초마다 가볍게 확인 document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  setInterval(() => { if (S) real(); }, 10 * 60 * 1000);
  Geo.COUNTRIES.forEach(c => { const o = document.createElement('option'); o.value = c.cc; o.textContent = c.name; $('country').appendChild(o); });
  if (S && S.me && S.me.city) S.me.city = cleanCity(S.me.city);
  async function claimSlot() {   // 예전(토큰 도입 전) 등록자: 이 기기의 열쇠를 만들어 자리를 확정
    if (!S || S.mode !== 'remote') return;
    if (!S.token) { S.token = newToken(); save(); Remote.token = S.token; try { await Remote.saveMember(S.code, S.slot, S.me); } catch (e) { if (e.code === 'forbidden') { S.token = ''; save(); toast(explain(e)); } } }
    else Remote.token = S.token;
  }
  if (S && S.token) Remote.token = S.token;
  Av.load().then(() => { claimSlot(); if (S && S.me) { startHome(); if (invite && invite !== S.code) toast('이 기기는 이미 등록돼 있어요. 새로 연결하려면 정보 초기화 후 다시 열어 주세요.'); } else openSetup(false); });
})();
