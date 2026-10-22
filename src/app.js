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
  let draft = null, townSide = 'pt', notesTab = 'in', editing = false, pending = null, pendingMe = null;
  const otherSlot = () => S.slot === 'a' ? 'b' : 'a';

  /* ---------- 저장소: 서버(Supabase) 또는 이 기기(체험) ---------- */
  const localApi = {
    async getCouple() { return { exists: true, members: [{ slot: S.slot, ...S.me }, S.demoPartner || DEMO_PARTNER] }; },
    async saveMember() { },
    async addPhoto(code, slot, p) {
      if (L.photos.filter(x => x.slot === slot && x.local_date === p.date).length >= 3) { const e = new Error('limit'); e.code = 'limit'; throw e; }
      L.photos.unshift({ id: 'l' + Date.now(), slot, local_date: p.date, caption: p.caption || '', weather: p.weather || '', data: p.data, taken_at: new Date().toISOString() }); saveL();
    },
    async listPhotos() { return L.photos; },
    async addNote(code, slot, n) { L.notes.unshift({ id: 'l' + Date.now(), slot, body: n.body, x: n.x, y: n.y, created_at: new Date().toISOString() }); saveL(); },
    async listNotes() { return L.notes; }
  };
  const api = () => S && S.mode === 'local' ? localApi : Remote;
  function explain(e) {
    if (e.code === 'no_config' || e.code === 'no_schema') return '서버 준비가 아직 안 됐어요. (관리자: supabase/schema.sql 을 Supabase에서 실행해야 해요) — 지금은 "혼자 체험하기"를 쓸 수 있어요.';
    if (e.code === 'limit') return '오늘 3장을 모두 보냈어요.';
    if (e.code === 'too_big') return '사진 용량이 너무 커요.';
    return '서버와 통신하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }

  /* ---------- 장면 ---------- */
  function mk(el) {
    el.className = 'stage';
    el.innerHTML = '<img class="L bg" alt="" src="' + BLANK + '"><div class="L stars"><img class="L sa" alt="" src="' + BLANK + '"><img class="L sb" alt="" src="' + BLANK + '"></div><img class="L moon" alt="" src="' + BLANK + '"><div class="L drift"><div class="in"></div></div><img class="L shadow" alt="" src="' + BLANK + '"><img class="L char" alt="" src="' + BLANK + '"><div class="L precip"><div class="in"></div></div><div class="bubble"></div><div class="notes"></div>';
    el.querySelector('.sa').src = A.starsA; el.querySelector('.sb').src = A.starsB; el.querySelector('.shadow').src = A.shadow;
  }
  function person(side) { return side === 'me' ? S.me : D.partner; }
  function moonIdx() { const d = (Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5; const p = ((d / 29.530588) % 1 + 1) % 1; return { i: Math.round(p * 8) % 8, p }; }
  function apply(el, side) {
    const p = person(side), k = W[side].kind, night = k === 'night';
    el.querySelector('.bg').src = A.bg[k][SKYSET[side]];
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
    SIDES.forEach(s => { const pf = $('pf-' + s), pr = person(s) && person(s).profile; pf.hidden = !pr; if (pr) pf.src = pr; });
    paintTown(); paintStrip(); photoBtn(); paintRoute();
  }
  // 지구본 + "서울 ━ 뉴욕 · 거리 · 시차" 요약
  function paintRoute() {
    const a = S.me.city, b = D.partner && D.partner.city;
    Globe.set(a, b);
    if (!b) { $('route').textContent = a.name + ' · 상대를 기다리는 중'; $('rg-sum').textContent = ''; return; }
    const df = Math.abs(off(a.tz) - off(b.tz)), dtxt = df === 0 ? '시차 없음' : '시차 ' + (Number.isInteger(df) ? df : df.toFixed(1)) + '시간';
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
      $('diff').textContent = df === 0 ? '같은 시간대' : '시차 ' + (Number.isInteger(df) ? df : df.toFixed(1)) + '시간';
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
        W[s].kind = kindFrom(j.current.weather_code, j.current.is_day, j.current.time, j.daily.sunrise[0], j.daily.sunset[0]);
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
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- 데이터 새로고침 ---------- */
  async function refresh(quiet) {
    if (!S || !S.code) return;
    try {
      const c = await api().getCouple(S.code);
      const pt = (c.members || []).find(m => m.slot !== S.slot) || null;
      const ph = await api().listPhotos(S.code), nt = await api().listNotes(S.code);
      const changed = JSON.stringify([pt, ph.map(p => p.id), nt.map(n => n.id)]) !== JSON.stringify([D.partner, D.photos.map(p => p.id), D.notes.map(n => n.id)]);
      const hadPt = !!D.partner;
      D = { partner: pt, photos: ph, notes: nt };
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
    theirs.forEach(p => { const i = document.createElement('img'); i.src = p.data; i.alt = ''; i.className = 'th' + (isPix(p.data) ? ' pix' : ''); i.onclick = () => openPhoto(p); box.appendChild(i); });
  }
  function thumbs(list) {
    if (!list.length) return '<div class="muted">—</div>';
    return list.map(p => '<img class="th' + (isPix(p.data) ? ' pix' : '') + '" data-id="' + p.id + '" alt="" src="' + p.data + '">').join('');
  }
  function drawPhotos() {
    const box = $('photoList'); if (!box || !S) return;
    if (!D.photos.length) { box.innerHTML = '<div class="emptyhint" style="display:block">아직 사진이 없어요. 오늘의 사진을 보내 보세요.</div>'; return; }
    const dates = [...new Set(D.photos.map(p => p.local_date))].sort().reverse();
    box.innerHTML = dates.map(d => {
      const day = D.photos.filter(p => p.local_date === d);
      return '<div class="day"><div class="dh">' + d + '</div><div class="cols"><div><div class="who2">' + esc(S.me.name) + '</div>' + thumbs(day.filter(p => p.slot === S.slot)) + '</div><div><div class="who2">' + esc(D.partner ? D.partner.name : '상대') + '</div>' + thumbs(day.filter(p => p.slot !== S.slot)) + '</div></div></div>';
    }).join('');
    box.querySelectorAll('img.th').forEach(i => i.onclick = () => openPhoto(D.photos.find(p => String(p.id) === i.dataset.id)));
  }
  function openPhoto(p) {
    $('lbImg').src = p.data; $('lbImg').className = isPix(p.data) ? 'pix' : '';
    $('lbMeta').textContent = nameOf(p.slot) + ' · ' + when(p.taken_at) + (p.weather ? ' · ' + p.weather : '');
    $('lbCap').textContent = p.caption || ''; $('m-view').hidden = false;
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
    [['hair', '머리'], ['top', '상의'], ['bottom', '하의']].forEach(([k, label]) => {
      const row = $('c-' + k); row.innerHTML = '<span class="cl">' + label + '</span>';
      const def = document.createElement('button'); def.type = 'button'; def.className = 'sw2 def' + (!a[k] ? ' on' : ''); def.textContent = '기본'; def.onclick = () => { a[k] = null; renderSetupAvatar(); }; row.appendChild(def);
      Av.SWATCH[k].forEach(c => { const s = document.createElement('button'); s.type = 'button'; s.className = 'sw2' + (a[k] === c ? ' on' : ''); s.style.background = c; s.setAttribute('aria-label', c); s.onclick = () => { a[k] = c; renderSetupAvatar(); }; row.appendChild(s); });
    });
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
    $('setupCancel').hidden = !isEdit; renderSetupAvatar(); renderPicked(); view('v-setup');
  }
  function submitSetup(e) {
    e.preventDefault();
    const name = $('name').value.trim(), q = $('city').value.trim();
    if (!name) { $('setupErr').textContent = '이름을 입력해 주세요.'; return; }
    if (q && !draft.place.city) { $('setupErr').textContent = '도시를 목록에서 골라 주세요. (비워두면 수도로 설정돼요)'; return; }
    const cn = Geo.country(draft.place.cc);
    const city = draft.place.city ? { name: draft.place.city.name, country: cn.name, cc: cn.cc, lat: draft.place.city.lat, lon: draft.place.city.lon, tz: draft.place.city.tz, isCapital: false } : { ...Geo.capitalOf(cn.cc), isCapital: true };
    const me = { name, avatar: draft.avatar, city, profile: draft.profile };
    if (editing && S) { S.me = me; save(); api().saveMember(S.code, S.slot, me).catch(() => { }); startHome(); }
    else { pendingMe = me; $('connErr').textContent = ''; view('v-connect'); }
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
  function connectDemo() { S = { code: 'DEMO', slot: 'a', mode: 'local', me: pendingMe }; save(); startHome(); }

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
    $('editMe').hidden = false; $('demo').hidden = false; $('codeBtn').hidden = S.mode === 'local';
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
  $('codeBtn').onclick = () => { try { navigator.clipboard.writeText(S.code); toast('코드를 복사했어요: ' + S.code); } catch (e) { toast('코드: ' + S.code); } };
  $('copyWait').onclick = $('codeBtn').onclick;
  $('goTown').onclick = () => { townSide = 'pt'; paintTown(); view('v-town'); };
  $('tabPt').onclick = () => { townSide = 'pt'; paintTown(); }; $('tabMe').onclick = () => { townSide = 'me'; paintTown(); };
  $('back').onclick = () => view('v-home');
  $('addNote').onclick = addNote; enterKey($('noteIn'), addNote);
  $('goPhotos').onclick = () => { drawPhotos(); view('v-photos'); }; $('backP').onclick = () => view('v-home');
  $('goNotes').onclick = () => { drawNotesBox(); view('v-notes'); }; $('backN').onclick = () => view('v-home');
  $('tabIn').onclick = () => { notesTab = 'in'; drawNotesBox(); }; $('tabOut').onclick = () => { notesTab = 'out'; drawNotesBox(); };
  $('photo').onclick = () => { pending = null; $('pPrev').hidden = true; $('pCap').value = ''; $('pSend').disabled = true; $('pdot').checked = false; $('pFile').value = ''; $('m-photo').hidden = false; };
  $('pFile').onchange = e => { if (e.target.files[0]) onPhotoFile(e.target.files[0]); };
  $('pdot').onchange = () => { if (!pending || !pending.im) return; pending.data = prepare(pending.im, $('pdot').checked); $('pPrev').src = pending.data; $('pPrev').className = $('pdot').checked ? 'pix' : ''; };
  $('pCancel').onclick = () => { $('m-photo').hidden = true; }; $('pSend').onclick = sendPhoto;
  $('m-view').onclick = () => { $('m-view').hidden = true; };
  $('real').onclick = real;
  $('reset').onclick = () => { if (confirm('이 기기에 저장된 정보를 지우고 처음부터 다시 할까요? (서버의 사진·쪽지는 코드로 다시 들어오면 볼 수 있어요)')) { try { localStorage.removeItem(KEY); localStorage.removeItem(LKEY); } catch (e) { } location.reload(); } };
  SIDES.forEach(s => {
    const sel = $('sel-' + s);
    Object.keys(KL).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = KL[k]; sel.appendChild(o); });
    sel.onchange = () => { W[s].kind = sel.value; paint(); };
  });

  /* ---------- 시작 ---------- */
  Globe.attach($('globe')); initRegions();
  setInterval(clock, 1000);
  setInterval(() => { if (S && S.code) refresh(true); }, 25000);
  setInterval(() => { if (S) real(); }, 10 * 60 * 1000);
  Geo.COUNTRIES.forEach(c => { const o = document.createElement('option'); o.value = c.cc; o.textContent = c.name; $('country').appendChild(o); });
  Av.load().then(() => { if (S && S.me) startHome(); else openSetup(false); });
})();
