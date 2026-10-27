(function () {
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  const A = window.SS_ASSETS, Geo = window.SSGeo, Av = window.SSAvatar, Remote = window.SSApi, Globe = window.SSGlobe;
  const $ = id => document.getElementById(id);
  const KEY = 'samesky.v2', LKEY = 'samesky.v2.local';
  const KL = { night: '맑음 · 밤', clear: '맑음', cloudy: '흐림', rain: '비', sunset: '노을', snow: '눈' };
  const MOONN = ['신월', '초승달', '상현달', '상현망', '보름달', '하현망', '하현달', '그믐달'];
  const SKYSET = { me: 'seoul', pt: 'ny' };
  const SIDES = ['me', 'pt'];
  const DEMO_PARTNER = { slot: 'b', name: '무노', avatar: { char: 'boy' }, city: { name: '뉴욕', country: '미국', cc: 'US', lat: 40.71, lon: -74.01, tz: 'America/New_York' }, profile: null };

  /* ---------- 상태 ---------- */
  let S = null, L = { photos: [], notes: [] };
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { }
  try { L = JSON.parse(localStorage.getItem(LKEY)) || L; } catch (e) { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
  const saveL = () => { try { localStorage.setItem(LKEY, JSON.stringify(L)); } catch (e) { toast('저장 공간이 부족해요'); } };
  const W = { me: { kind: 'clear', temp: '-' }, pt: { kind: 'night', temp: '-' } };
  let D = { partner: null, photos: [], notes: [] };
  const invite = (() => {   // 초대 링크(?code=XXXXXX)로 들어왔는지
    let c = ''; try { c = (new URLSearchParams(location.search).get('code') || '').trim().toUpperCase(); } catch (e) { }
    if (c) { try { history.replaceState(null, '', location.pathname); } catch (e) { } }
    return /^[0-9A-F]{4,8}$/.test(c) ? c : '';
  })();
  let draft = null, townSide = 'pt', notesTab = 'in', editing = false, pending = null, pendingMe = null;
  const otherSlot = () => S.slot === 'a' ? 'b' : 'a';

  /* ---------- 저장소: 서버(Supabase) 또는 이 기기(체험) ---------- */
  const localApi = {
    async getCouple() { return { exists: true, members: [{ slot: S.slot, ...S.me }, S.demoPartner || DEMO_PARTNER] }; },
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
    async getState() { return { p: L.photos.length + ':' + L.photos.reduce((s, x) => s + (x.hearts || []).length, 0), n: L.notes.length }; }
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
    if (e.code === 'no_config' || e.code === 'no_schema') return '서버 준비가 아직 안 됐어요. (관리자: supabase/schema.sql 을 Supabase에서 실행해야 해요) — 지금은 "혼자 체험하기"를 쓸 수 있어요.';
    if (e.code === 'limit') return '오늘 3장을 모두 보냈어요.';
    if (e.code === 'too_big') return '사진 용량이 너무 커요.';
    return '서버와 통신하지 못했어요. 잠시 후 다시 시도해 주세요.';
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
    paintTown(); paintStrip(); photoBtn(); paintRoute(); paintNews();
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
  function view(id) { document.querySelectorAll('.view').forEach(v => v.classList.remove('on')); $(id).classList.add('on'); }
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
  const seen = () => S.seen || (S.seen = { p: '', n: '', h: [] });
  const hearted = p => (p.hearts || []).filter(h => h !== S.slot).length > 0;
  function unread() {
    const sn = seen();
    return {
      np: D.photos.filter(p => p.slot !== S.slot && p.taken_at > sn.p).length,
      nn: D.notes.filter(n => n.slot !== S.slot && n.created_at > sn.n).length,
      nh: D.photos.filter(p => p.slot === S.slot && hearted(p) && !(sn.h || []).includes(p.id)).length
    };
  }
  function markPhotosSeen() { const sn = seen(); const t = D.photos.filter(p => p.slot !== S.slot).map(p => p.taken_at).sort().pop(); if (t) sn.p = t; sn.h = D.photos.filter(p => p.slot === S.slot && hearted(p)).map(p => p.id); save(); paintNews(); }
  function markNotesSeen() { const sn = seen(); const t = D.notes.filter(n => n.slot !== S.slot).map(n => n.created_at).sort().pop(); if (t) sn.n = t; save(); paintNews(); }
  function paintNews() {
    if (!S || !D.partner) { $('news').hidden = true; return; }
    const u = unread(), box = $('news'), parts = [];
    if (u.np) parts.push('사진 ' + u.np); if (u.nn) parts.push('쪽지 ' + u.nn); if (u.nh) parts.push('♥ ' + u.nh);
    box.hidden = !parts.length;
    if (parts.length) box.textContent = '● ' + D.partner.name + '의 새 소식이 도착했어요 · ' + parts.join(' · ');
    $('goPhotos').textContent = '사진함' + (u.np + u.nh ? ' ●' + (u.np + u.nh) : ''); $('goNotes').textContent = '쪽지함' + (u.nn ? ' ●' + u.nn : '');
  }
  let prevU = null;
  function notifyArrivals() {
    const u = unread();
    if (prevU && D.partner) {
      const m = [];
      if (u.np > prevU.np) m.push('새 사진'); if (u.nn > prevU.nn) m.push('새 쪽지'); if (u.nh > prevU.nh) m.push('내 사진에 하트 ♥');
      if (m.length) toast(D.partner.name + '님이 보냈어요 · ' + m.join(' · '));
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
      const sig = (p2, ph2, nt2) => JSON.stringify([p2, ph2.map(p => p.id + ':' + (p.hearts || []).join('')), nt2.map(n => n.id)]);
      const changed = sig(pt, ph, nt) !== sig(D.partner, D.photos, D.notes);
      const hadPt = !!D.partner;
      D = { partner: pt, photos: ph, notes: nt };
      notifyArrivals();
      if (changed || !quiet) { paint(); if (!hadPt && pt) real(); drawPhotos(); drawNotesBox(); }
    } catch (e) { if (!quiet) toast(explain(e)); }
  }

  /* ---------- 사진 ---------- */
  function myToday() { return D.photos.filter(p => p.slot === S.slot && p.local_date === today()).length; }
  function photoBtn() { const n = myToday(); $('photo').textContent = n >= 3 ? '▣ 오늘 3장 모두 보냈어요' : '▣ 오늘의 사진 보내기 (' + n + '/3)'; $('photo').disabled = n >= 3; }
  function paintStrip() {
    const box = $('strip'), theirs = D.photos.filter(p => p.slot !== S.slot).slice(0, 3);
    box.innerHTML = '';
    if (!theirs.length) { box.innerHTML = '<span class="muted">' + (D.partner ? esc(D.partner.name) + '님이 아직 사진을 보내지 않았어요' : '') + '</span>'; return; }
    box.innerHTML = '<span class="muted">' + esc(D.partner.name) + '의 사진</span>';
    theirs.forEach(p => box.appendChild(thumbEl(p)));
  }
  function thumbEl(p) {
    const w = document.createElement('div'); w.className = 'thw';
    const i = document.createElement('img'); i.className = 'th' + (isPix(p.data) ? ' pix' : ''); i.alt = ''; i.src = p.data; i.onclick = () => openPhoto(p); w.appendChild(i);
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
    const dates = [...new Set(D.photos.map(p => p.local_date))].sort().reverse();
    dates.forEach(d => {
      const day = D.photos.filter(p => p.local_date === d), wrap = document.createElement('div'); wrap.className = 'day';
      const h = document.createElement('div'); h.className = 'dh'; h.textContent = d; wrap.appendChild(h);
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

  /* ---------- 상대/내 동네 + 쪽지 ---------- */
  function townNotes() { return townSide === 'pt' ? D.notes.filter(n => n.slot === S.slot) : D.notes.filter(n => n.slot !== S.slot); }
  function paintTown() {
    const el = $('st-town'); if (!el.firstChild) return;
    const p = person(townSide); if (!p) return;
    apply(el, townSide);
    $('townTitle').textContent = p.name + '의 동네 · ' + p.city.name + ' · ' + KL[W[townSide].kind] + ' ' + W[townSide].temp + '°';
    $('tabPt').classList.toggle('on', townSide === 'pt'); $('tabMe').classList.toggle('on', townSide === 'me');
    $('noteForm').hidden = townSide !== 'pt';
    const box = el.querySelector('.notes'); box.innerHTML = '';
    const list = townNotes();
    list.forEach(n => {
      const i = document.createElement('img'); i.src = A.note; i.className = 'note'; i.alt = ''; i.style.left = n.x + '%'; i.style.top = n.y + '%';
      i.onclick = e => { e.stopPropagation(); say(el, n.body); };
      box.appendChild(i);
    });
    $('noteEmpty').textContent = townSide === 'pt' ? '아직 보낸 쪽지가 없어요. 첫 쪽지를 남겨보세요.' : '아직 받은 쪽지가 없어요.';
    $('noteEmpty').style.display = list.length ? 'none' : 'block';
  }
  let sending = false;
  async function addNote() {
    const v = $('noteIn').value.trim(); if (!v || sending) return;
    sending = true; $('addNote').disabled = true;
    try {
      await api().addNote(S.code, S.slot, { body: v, x: 8 + Math.random() * 78, y: 77 + Math.random() * 13 });
      $('noteIn').value = ''; toast('쪽지를 붙였어요'); await refresh(false);
    } catch (e) { toast(explain(e)); }
    sending = false; $('addNote').disabled = false;
  }
  function drawNotesBox() {
    const box = $('noteList'); if (!box || !S) return;
    const list = D.notes.filter(n => notesTab === 'in' ? n.slot !== S.slot : n.slot === S.slot);
    $('tabIn').classList.toggle('on', notesTab === 'in'); $('tabOut').classList.toggle('on', notesTab === 'out');
    box.innerHTML = list.length ? list.map(n => '<div class="nrow"><div class="nm2">' + esc(nameOf(n.slot)) + ' <span class="muted">· ' + when(n.created_at) + '</span></div><div>' + esc(n.body) + '</div></div>').join('') : '<div class="emptyhint" style="display:block">쪽지가 없어요.</div>';
  }

  /* ---------- 등록 화면 ---------- */
  function renderSetupAvatar() {
    const a = draft.avatar, box = $('chars'); box.innerHTML = '';
    Av.list().forEach(c => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'av' + (!a.custom && a.char === c.id ? ' on' : '');
      b.title = c.name; b.innerHTML = '<img alt="" src="' + Av.thumbUrl({ char: c.id }) + '">';
      b.onclick = () => { draft.avatar = { char: c.id, hair: null, top: null, bottom: null }; renderSetupAvatar(); }; box.appendChild(b);
    });
    $('avPrev').src = Av.thumbUrl(a);
    $('colors').hidden = !!a.custom;
    [['hair', '머리색'], ['top', '상의색'], ['bottom', '하의색']].forEach(([k, label]) => {
      const row = $('c-' + k); row.innerHTML = '<span class="cl">' + label + '</span>';
      const def = document.createElement('button'); def.type = 'button'; def.className = 'sw2 def' + (!a[k] ? ' on' : ''); def.textContent = '기본'; def.onclick = () => { a[k] = null; renderSetupAvatar(); }; row.appendChild(def);
      Av.SWATCH[k].forEach(c => { const s = document.createElement('button'); s.type = 'button'; s.className = 'sw2' + (a[k] === c ? ' on' : ''); s.style.background = c; s.setAttribute('aria-label', c); s.onclick = () => { a[k] = c; renderSetupAvatar(); }; row.appendChild(s); });
    });
    // 머리 모양 · 소품 · 안경/목도리 · 무늬
    const sb = $('styles'); sb.innerHTML = ''; sb.hidden = !!a.custom;
    if (!a.custom) {
      const ch = Av.byId(a.char);
      const row = label => { const r = document.createElement('div'); r.className = 'crow'; r.innerHTML = '<span class="cl">' + label + '</span>'; sb.appendChild(r); return r; };
      const chip = (r, text, on, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (on ? ' on' : ''); b.textContent = text; b.onclick = () => { fn(); renderSetupAvatar(); }; r.appendChild(b); };
      if (ch.hairStyles && ch.hairStyles.length > 1) { const r = row('머리모양'); ch.hairStyles.forEach(s => chip(r, s.name, (a.hairStyle || ch.hairStyles[0].id) === s.id, () => { a.hairStyle = s.id; })); }
      const rh = row('소품'); Av.headItems().forEach(s => chip(rh, s.name, (a.head || 'none') === s.id, () => { a.head = s.id; }));
      const rf = row('꾸미기'); chip(rf, '안경', !!a.glasses, () => { a.glasses = !a.glasses; }); chip(rf, '목도리', !!a.scarf, () => { a.scarf = !a.scarf; });
      if ((a.head && a.head !== 'none') || a.scarf) {
        const rc = row('소품색'); Av.SWATCH.accent.forEach(c => { const s = document.createElement('button'); s.type = 'button'; s.className = 'sw2' + ((a.accent || Av.SWATCH.accent[0]) === c ? ' on' : ''); s.style.background = c; s.setAttribute('aria-label', c); s.onclick = () => { a.accent = c; renderSetupAvatar(); }; rc.appendChild(s); });
      }
      const rt = row('상의무늬'); Av.patterns().forEach(s => chip(rt, s.name, (a.tpat || 'none') === s.id, () => { a.tpat = s.id; }));
      const rb = row('하의무늬'); Av.patterns().forEach(s => chip(rb, s.name, (a.bpat || 'none') === s.id, () => { a.bpat = s.id; }));
    }
  }
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
    draft = { avatar: me ? JSON.parse(JSON.stringify(me.avatar)) : { char: 'girl', hair: null, top: null, bottom: null }, profile: me ? me.profile : null, place: { cc: me ? me.city.cc : 'KR', city: me && me.city.isCapital === false ? me.city : null } };
    $('name').value = me ? me.name : '';
    $('country').value = draft.place.cc; $('city').value = draft.place.city ? draft.place.city.name : ''; $('cities').innerHTML = '';
    $('setupTitle').textContent = isEdit ? '내 정보 수정' : '먼저 내 정보를 등록해요'; $('setupErr').textContent = ''; $('prev').hidden = true;
    $('setupCancel').hidden = !isEdit; $('resetEdit').hidden = !isEdit; renderSetupAvatar(); renderPicked(); view('v-setup');
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
      if (invite) { $('joinCode').value = invite; $('inviteHint').hidden = false; }
    }
  }
  async function onUpload(file) {
    try {
      const im = await loadImg(file), mode = document.querySelector('input[name="mode"]:checked').value; let cv;
      if (mode === 'full') {
        cv = dotify(im, { size: 30, ratio: 2, colors: 10, contrast: 1.15, sat: 1.3, sharpen: .6, outline: true, rmbg: true, tol: 40 });
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
      S = { code, slot: 'a', mode: 'remote', me: pendingMe }; await Remote.saveMember(code, 'a', S.me); save(); startHome();
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
      S = { code, slot, mode: 'remote', me: pendingMe }; await Remote.saveMember(code, slot, S.me); save(); startHome();
    } catch (e) { $('connErr').textContent = explain(e); }
  }
  function connectDemo() { S = { code: 'DEMO', slot: 'a', mode: 'local', me: pendingMe }; save(); if (!L.photos.length && !L.notes.length) demoPartnerSends(2); startHome(); }

  /* ---------- 홈 ---------- */
  let started = false;
  function startHome() {
    if (!started) {
      mk($('st-me')); mk($('st-pt')); mk($('st-town'));
      $('st-me').addEventListener('click', e => heart($('st-me'), e));
      $('st-pt').addEventListener('click', e => heart($('st-pt'), e));
      $('st-town').addEventListener('click', e => { if (!e.target.classList.contains('note')) heart($('st-town'), e); });   // 하트만, 말풍선 없음
      started = true;
    }
    $('editMe').hidden = false; $('demo').hidden = S.mode !== 'local'; $('codeBtn').hidden = S.mode === 'local';
    $('codeBtn').textContent = '코드 ' + S.code;
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
  $('goTown').onclick = () => { townSide = 'pt'; paintTown(); view('v-town'); };
  $('tabPt').onclick = () => { townSide = 'pt'; paintTown(); }; $('tabMe').onclick = () => { townSide = 'me'; paintTown(); markNotesSeen(); };
  $('back').onclick = () => view('v-home');
  $('addNote').onclick = addNote; enterKey($('noteIn'), addNote);
  $('goPhotos').onclick = () => { drawPhotos(); view('v-photos'); markPhotosSeen(); }; $('backP').onclick = () => view('v-home');
  $('goNotes').onclick = () => { drawNotesBox(); view('v-notes'); markNotesSeen(); }; $('backN').onclick = () => view('v-home');
  $('tabIn').onclick = () => { notesTab = 'in'; drawNotesBox(); }; $('tabOut').onclick = () => { notesTab = 'out'; drawNotesBox(); };
  $('photo').onclick = () => { pending = null; $('pPrev').hidden = true; $('pCap').value = ''; $('pSend').disabled = true; $('pdot').checked = false; $('pFile').value = ''; $('m-photo').hidden = false; };
  $('pFile').onchange = e => { if (e.target.files[0]) onPhotoFile(e.target.files[0]); };
  $('pdot').onchange = () => { if (!pending || !pending.im) return; pending.data = prepare(pending.im, $('pdot').checked); $('pPrev').src = pending.data; $('pPrev').className = $('pdot').checked ? 'pix' : ''; };
  $('pCancel').onclick = () => { $('m-photo').hidden = true; }; $('pSend').onclick = sendPhoto;
  $('m-view').onclick = () => { $('m-view').hidden = true; };
  $('lbHeart').onclick = async e => {
    e.stopPropagation(); if (!curPhoto) return;
    try { await api().heartPhoto(S.code, curPhoto.id, S.slot); await refresh(true); const np = D.photos.find(x => String(x.id) === String(curPhoto.id)); if (np) openPhoto(np); }
    catch (err) { toast(explain(err)); }
  };
  $('news').onclick = () => { const u = unread(); if (u.np || u.nh) { drawPhotos(); view('v-photos'); markPhotosSeen(); } else { notesTab = 'in'; drawNotesBox(); view('v-notes'); markNotesSeen(); } };
  $('demoSend').onclick = async () => { demoPartnerSends(1); await refresh(true); };
  $('real').onclick = real;
  $('reset').onclick = $('resetEdit').onclick = () => { if (confirm('이 기기에 저장된 정보를 지우고 처음부터 다시 할까요? (서버의 사진·쪽지는 코드로 다시 들어오면 볼 수 있어요)')) { try { localStorage.removeItem(KEY); localStorage.removeItem(LKEY); } catch (e) { } location.reload(); } };
  SIDES.forEach(s => {
    const sel = $('sel-' + s);
    Object.keys(KL).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = KL[k]; sel.appendChild(o); });
    sel.onchange = () => { W[s].kind = sel.value; W[s].night = sel.value === 'night'; paint(); };
  });

  /* ---------- 시작 ---------- */
  Globe.attach($('globe')); initRegions();
  setInterval(clock, 1000);
  let lastState = '';
  async function poll() {   // 숨겨진 탭에서는 멈추고, 바뀐 게 있을 때만 전체를 다시 받음
    if (!S || !S.code || document.hidden) return;
    let st = null; try { st = JSON.stringify(await api().getState(S.code)); } catch (e) { }
    if (st && st === lastState) return; if (st) lastState = st;
    await refresh(true);
  }
  setInterval(poll, 40000); document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  setInterval(() => { if (S) real(); }, 10 * 60 * 1000);
  Geo.COUNTRIES.forEach(c => { const o = document.createElement('option'); o.value = c.cc; o.textContent = c.name; $('country').appendChild(o); });
  if (S && S.me && S.me.city) S.me.city = cleanCity(S.me.city);
  Av.load().then(() => { if (S && S.me) { startHome(); if (invite && invite !== S.code) toast('이 기기는 이미 등록돼 있어요. 새로 연결하려면 정보 초기화 후 다시 열어 주세요.'); } else openSetup(false); });
})();
