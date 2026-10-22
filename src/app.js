(function () {
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  const A = window.SS_ASSETS;
  const $ = id => document.getElementById(id);
  const KEY = 'samesky.v1';
  const KL = { night: '맑음 · 밤', clear: '맑음', cloudy: '흐림', rain: '비', sunset: '노을', snow: '눈' };
  const MOONN = ['신월', '초승달', '상현달', '상현망', '보름달', '하현망', '하현달', '그믐달'];
  const SKYSET = { me: 'seoul', pt: 'ny' };           // 건물 실루엣 스타일
  const PRESETS = { girl: 'assets/characters/girl.png', boy: 'assets/characters/boy.png' };
  const SIDES = ['me', 'pt'];

  /* ---------- 상태 ---------- */
  let S = null;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
  const W = { me: { kind: 'clear', temp: '-' }, pt: { kind: 'clear', temp: '-' } };
  let draft = null;

  /* ---------- 장면 ---------- */
  function mk(el, side) {
    el.className = 'stage';
    el.innerHTML = '<img class="L bg" alt="" src="' + BLANK + '"><div class="L stars"><img class="L sa" alt="" src="' + BLANK + '"><img class="L sb" alt="" src="' + BLANK + '"></div><img class="L moon" alt="" src="' + BLANK + '"><div class="L drift"><div class="in"></div></div><img class="L shadow" alt="" src="' + BLANK + '"><img class="L char" alt="" src="' + BLANK + '"><div class="L precip"><div class="in"></div></div><div class="bubble"></div><div class="notes"></div>';
    el.querySelector('.sa').src = A.starsA; el.querySelector('.sb').src = A.starsB; el.querySelector('.shadow').src = A.shadow;
  }
  function avatarUrl(p) { return p.avatar.type === 'custom' ? p.avatar.url : PRESETS[p.avatar.id]; }
  function moonIdx() { const d = (Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5; const p = ((d / 29.530588) % 1 + 1) % 1; return { i: Math.round(p * 8) % 8, p }; }
  function apply(el, side) {
    const k = W[side].kind, night = k === 'night';
    el.querySelector('.bg').src = A.bg[k][SKYSET[side]];
    el.querySelector('.char').src = avatarUrl(S[side]);
    el.querySelector('.stars').style.display = night ? 'block' : 'none';
    const m = el.querySelector('.moon'); m.style.display = night ? 'block' : 'none'; m.src = A.moons[moonIdx().i];
    el.querySelector('.drift .in').style.backgroundImage = A.clouds[k] ? 'url(' + A.clouds[k] + ')' : 'none';
    const pr = el.querySelector('.precip .in');
    pr.style.backgroundImage = A.precip[k] ? 'url(' + A.precip[k] + ')' : 'none';
    pr.className = 'in ' + (k === 'rain' ? 'rain' : k === 'snow' ? 'snow' : '');
  }
  function paint() {
    if (!S) return;
    SIDES.forEach(s => { apply($('st-' + s), s); $('w-' + s).textContent = KL[W[s].kind] + ' ' + W[s].temp + '°'; $('n-' + s).textContent = S[s].name + ' · ' + S[s].city.name; });
    apply($('st-town'), 'pt');
    const d = $('desk'); d.style.setProperty('--l', A.sky[W.me.kind][0]); d.style.setProperty('--r', A.sky[W.pt.kind][0]);
    $('townTitle').textContent = S.pt.name + '의 동네 · ' + S.pt.city.name + ' · ' + KL[W.pt.kind] + ' ' + W.pt.temp + '°';
    SIDES.forEach(s => { const pf = $('pf-' + s), prof = S[s].profile; pf.hidden = !prof; if (prof) pf.src = prof; });
  }

  /* ---------- 시계 ---------- */
  const fmt = tz => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const off = tz => { const d = new Date(); return (new Date(d.toLocaleString('en-US', { timeZone: tz })) - new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }))) / 36e5; };
  function clock() {
    if (!S) return;
    const on = Math.floor(Date.now() / 1000) % 2 === 0;
    SIDES.forEach(s => { const t = fmt(S[s].city.tz).split(':'); $('t-' + s).innerHTML = t[0] + '<span style="opacity:' + (on ? 1 : .2) + '">:</span>' + t[1]; });
    const df = Math.abs(off(S.me.city.tz) - off(S.pt.city.tz));
    $('diff').textContent = df === 0 ? '같은 시간대' : '시차 ' + (Number.isInteger(df) ? df : df.toFixed(1)) + '시간';
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
        const c = S[s].city;
        const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + c.lat + '&longitude=' + c.lon + '&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&timezone=auto&forecast_days=1';
        const j = await (await fetch(u)).json();
        W[s].kind = kindFrom(j.current.weather_code, j.current.is_day, j.current.time, j.daily.sunrise[0], j.daily.sunset[0]);
        W[s].temp = Math.round(j.current.temperature_2m); $('sel-' + s).value = W[s].kind;
      }
      $('status').textContent = '✓ 실시간 날씨 적용됨 (Open-Meteo)'; $('live').textContent = '● LIVE';
    } catch (e) { $('status').textContent = '날씨 불러오기 실패 — 임시값 표시'; $('live').textContent = 'OFFLINE'; }
    paint();
  }

  /* ---------- 상호작용 ---------- */
  function heart(stage, e) {
    const r = stage.getBoundingClientRect(), h = document.createElement('img');
    h.src = A.heart; h.className = 'heart';
    h.style.left = ((e.clientX - r.left) / r.width * 100 - 4) + '%'; h.style.top = ((e.clientY - r.top) / r.height * 100 - 4) + '%';
    stage.appendChild(h); setTimeout(() => h.remove(), 1200);
  }
  function say(stage, text) {
    const b = stage.querySelector('.bubble'); b.textContent = text; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
    clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('on'), 2600);
  }
  function toast(t) { const e = $('toast'); e.textContent = t; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 2200); }
  function view(id) { document.querySelectorAll('.view').forEach(v => v.classList.remove('on')); $(id).classList.add('on'); }

  function drawNotes() {
    const box = $('st-town').querySelector('.notes'); box.innerHTML = '';
    S.notes.forEach(n => {
      const i = document.createElement('img'); i.src = A.note; i.className = 'note'; i.style.left = n.x + '%'; i.style.top = n.y + '%';
      i.onclick = e => { e.stopPropagation(); say($('st-town'), n.t); };
      box.appendChild(i);
    });
    $('noteEmpty').style.display = S.notes.length ? 'none' : 'block';
  }
  function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: S.me.city.tz }).format(new Date()); }
  function shots() { if (!S.shots || S.shots.d !== today()) S.shots = { d: today(), n: 0 }; return S.shots; }
  function photoBtn() { const n = shots().n; $('photo').textContent = n >= 3 ? '▣ 오늘 3장 모두 보냈어요' : '▣ 오늘의 사진 (' + n + '/3)'; $('photo').disabled = n >= 3; }

  /* ---------- 등록 화면 ---------- */
  function crop(url) {
    return new Promise(res => {
      const im = new Image(); im.onload = () => {
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
        for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3]) { x0 = Math.min(x0, xx); x1 = Math.max(x1, xx); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
        o.getContext('2d').drawImage(im, x0, y0, o.width, o.height, 0, 0, o.width, o.height); res(o.toDataURL());
      }; im.src = url;
    });
  }
  const thumbs = {};
  async function buildThumbs() { for (const k of Object.keys(PRESETS)) thumbs[k] = await crop(PRESETS[k]); }
  function renderAvs(side) {
    const box = $(side + '-avs'); box.innerHTML = '';
    const cur = draft[side].avatar;
    Object.keys(PRESETS).forEach(id => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'av' + (cur.type === 'preset' && cur.id === id ? ' on' : '');
      b.innerHTML = '<img src="' + thumbs[id] + '">'; b.onclick = () => { draft[side].avatar = { type: 'preset', id }; renderAvs(side); }; box.appendChild(b);
    });
    if (cur.type === 'custom') {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'av on'; b.innerHTML = '<img src="' + cur.thumb + '">'; box.appendChild(b);
    }
  }
  function renderPicked(side) {
    const c = draft[side].city;
    $(side + '-picked').textContent = c ? '✓ ' + c.name + ' (' + c.tz + ')' : '아직 선택 안 함';
  }
  async function search(side) {
    const q = $(side + '-q').value.trim(), list = $(side + '-list'); if (!q) return;
    list.textContent = '검색 중…';
    try {
      const j = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=5&language=ko&name=' + encodeURIComponent(q))).json();
      list.innerHTML = '';
      if (!j.results || !j.results.length) { list.textContent = '결과가 없어요. 다른 이름으로 검색해 보세요.'; return; }
      j.results.forEach(r => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'city';
        b.textContent = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
        b.onclick = () => { draft[side].city = { name: r.name, lat: r.latitude, lon: r.longitude, tz: r.timezone }; list.innerHTML = ''; renderPicked(side); };
        list.appendChild(b);
      });
    } catch (e) { list.textContent = '검색에 실패했어요. 인터넷 연결을 확인해 주세요.'; }
  }
  function onUpload(file) {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const mode = document.querySelector('input[name="me-mode"]:checked').value;
        let cv;
        if (mode === 'full') {
          cv = dotify(im, { size: 30, ratio: 2, colors: 8, contrast: 1.15, sat: 1.3, sharpen: .6, outline: true, rmbg: true, tol: 40 });
          const layer = document.createElement('canvas'); layer.width = 110; layer.height = 120;
          layer.getContext('2d').drawImage(cv, Math.round((110 - cv.width) / 2), 108 - cv.height);
          draft.me.avatar = { type: 'custom', url: layer.toDataURL(), thumb: cv.toDataURL() };
          renderAvs('me');
        } else {
          cv = dotify(im, { size: 32, ratio: 1, colors: 8, contrast: 1.15, sat: 1.3, sharpen: .6, outline: true, rmbg: false, tol: 40 });
          draft.me.profile = cv.toDataURL();
        }
        const p = $('me-prev'); p.src = cv.toDataURL(); p.hidden = false;
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }
  function openSetup(editing) {
    draft = editing && S ? JSON.parse(JSON.stringify({ me: S.me, pt: S.pt })) : {
      me: { name: '', avatar: { type: 'preset', id: 'girl' }, city: null }, pt: { name: '', avatar: { type: 'preset', id: 'boy' }, city: null }
    };
    $('setupTitle').textContent = editing ? '내 정보 수정' : '먼저 내 정보를 등록해요';
    $('me-name').value = draft.me.name; $('pt-name').value = draft.pt.name;
    $('me-q').value = ''; $('pt-q').value = ''; $('me-list').innerHTML = ''; $('pt-list').innerHTML = ''; $('me-prev').hidden = true; $('setupErr').textContent = '';
    $('setupCancel').hidden = !editing; $('live').textContent = '';
    renderAvs('me'); renderAvs('pt'); renderPicked('me'); renderPicked('pt'); view('v-setup');
  }
  function finishSetup(e) {
    e.preventDefault();
    draft.me.name = $('me-name').value.trim(); draft.pt.name = $('pt-name').value.trim();
    if (!draft.me.name || !draft.pt.name) { $('setupErr').textContent = '이름을 입력해 주세요.'; return; }
    if (!draft.me.city || !draft.pt.city) { $('setupErr').textContent = '두 사람의 지역을 검색해서 선택해 주세요.'; return; }
    S = { me: draft.me, pt: draft.pt, notes: (S && S.notes) || [], shots: (S && S.shots) || null };
    save(); startHome();
  }

  function startHome() {
    mk($('st-me'), 'me'); mk($('st-pt'), 'pt'); mk($('st-town'), 'pt');
    SIDES.forEach(s => $('st-' + s).addEventListener('click', e => heart($('st-' + s), e)));   // 하트만, 메시지 없음
    $('st-town').addEventListener('click', e => { if (!e.target.classList.contains('note')) heart($('st-town'), e); });
    $('editMe').hidden = false; $('demo').hidden = false; photoBtn(); paint(); clock(); view('v-home'); real();
  }

  /* ---------- 이벤트 연결 ---------- */
  $('setupForm').addEventListener('submit', finishSetup);
  $('setupCancel').onclick = () => view('v-home');
  $('editMe').onclick = () => openSetup(true);
  SIDES.forEach(s => {
    $(s + '-go').onclick = () => search(s);
    $(s + '-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); search(s); } });
  });
  $('me-file').onchange = e => { if (e.target.files[0]) onUpload(e.target.files[0]); };
  $('goTown').onclick = () => { drawNotes(); view('v-town'); };
  $('back').onclick = () => view('v-home');
  $('addNote').onclick = () => {
    const v = $('noteIn').value.trim(); if (!v) return;
    S.notes.push({ x: 8 + Math.random() * 78, y: 77 + Math.random() * 13, t: v }); save();
    $('noteIn').value = ''; drawNotes(); toast('쪽지를 붙였어요');
  };
  $('noteIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('addNote').click(); });
  $('photo').onclick = () => { const s = shots(); if (s.n >= 3) return; s.n++; save(); toast('사진을 보냈어요 (' + s.n + '/3)'); photoBtn(); };
  $('real').onclick = real;
  $('reset').onclick = () => { if (confirm('저장된 정보와 쪽지를 모두 지우고 처음부터 다시 할까요?')) { try { localStorage.removeItem(KEY); } catch (e) { } S = null; location.reload(); } };
  SIDES.forEach(s => {
    const sel = $('sel-' + s);
    Object.keys(KL).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = KL[k]; sel.appendChild(o); });
    sel.onchange = () => { W[s].kind = sel.value; paint(); };
  });

  /* ---------- 시작 ---------- */
  let g = 0; setInterval(() => { g = (g + 1) % A.globe.length; $('globe').src = A.globe[g]; }, 350); $('globe').src = A.globe[0];
  setInterval(clock, 1000);
  setInterval(() => { if (S) real(); }, 10 * 60 * 1000);
  buildThumbs().then(() => { if (S) startHome(); else openSetup(false); });
})();
