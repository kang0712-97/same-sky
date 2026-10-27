// 내 방: 160×100 도트 칸 위에 가구·소품을 자유 배치. 스프라이트는 전부 코드로 그림(이미지 파일 없음).
(function () {
  const RW = 160, RH = 100, FLOOR = 58, MAX_ITEMS = 30;
  const C = { k: '#1f2420', w: '#f7f1de', r: '#d9534f', p: '#f2a0b5', o: '#e8a24a', y: '#f2d45c', g: '#6fae5a', G: '#3f7a3a', b: '#6aa5d8', B: '#3d6fa8', n: '#a8734a', N: '#7a4e2e', s: '#c9c3b0', S: '#8f8a7a', u: '#b58ad6', c: '#bfe3f5', t: '#8fd3e8' };

  // [이름, 종류(wall|floor), 가로, 세로, 사각형 목록[색,x,y,w,h]]
  const DEFS = {
    bed: ['침대', 'floor', 30, 16, [['N', 0, 0, 4, 16], ['N', 26, 8, 4, 8], ['n', 4, 10, 22, 6], ['w', 4, 6, 22, 5], ['b', 10, 6, 16, 5], ['B', 10, 10, 16, 1], ['w', 5, 3, 8, 4]]],
    desk: ['책상', 'floor', 26, 22, [['S', 5, 0, 10, 1], ['s', 5, 1, 10, 6], ['t', 6, 2, 8, 4], ['n', 0, 8, 26, 3], ['N', 0, 11, 26, 1], ['N', 1, 12, 2, 10], ['N', 23, 12, 2, 10], ['n', 15, 12, 8, 6], ['N', 18, 15, 2, 1], ['r', 20, 4, 3, 4], ['w', 20, 4, 3, 1]]],
    sofa: ['소파', 'floor', 28, 14, [['B', 0, 0, 28, 8], ['b', 2, 2, 24, 6], ['B', 0, 6, 4, 8], ['B', 24, 6, 4, 8], ['b', 4, 8, 20, 5], ['B', 4, 13, 20, 1], ['p', 8, 3, 5, 5]]],
    table: ['탁자', 'floor', 14, 14, [['w', 9, 0, 3, 4], ['r', 9, 0, 3, 1], ['n', 0, 4, 14, 3], ['N', 0, 7, 14, 1], ['N', 6, 8, 2, 4], ['N', 3, 12, 8, 2]]],
    shelf: ['책장', 'floor', 18, 26, [['N', 0, 0, 18, 26], ['n', 1, 1, 16, 24], ['N', 1, 8, 16, 1], ['N', 1, 17, 16, 1], ['r', 2, 2, 2, 6], ['b', 4, 3, 2, 5], ['y', 6, 2, 2, 6], ['g', 9, 3, 2, 5], ['p', 11, 2, 3, 6], ['u', 2, 10, 3, 7], ['o', 5, 11, 2, 6], ['B', 7, 10, 2, 7], ['w', 10, 12, 4, 5], ['g', 2, 19, 4, 6], ['r', 8, 20, 2, 5], ['y', 11, 19, 3, 6]]],
    tv: ['TV', 'floor', 22, 18, [['k', 0, 0, 22, 14], ['t', 2, 2, 18, 10], ['w', 4, 3, 5, 1], ['N', 4, 14, 2, 4], ['N', 16, 14, 2, 4], ['r', 18, 12, 2, 1]]],
    lamp: ['스탠드', 'floor', 8, 20, [['y', 0, 0, 8, 7], ['o', 0, 6, 8, 1], ['S', 3, 7, 2, 11], ['N', 1, 18, 6, 2]]],
    plant: ['화분', 'floor', 10, 18, [['G', 1, 4, 3, 4], ['g', 3, 2, 4, 10], ['g', 6, 1, 3, 5], ['G', 7, 5, 3, 4], ['g', 0, 6, 3, 3], ['o', 2, 12, 6, 6], ['N', 2, 12, 6, 1]]],
    rug: ['러그', 'floor', 36, 12, [['p', 1, 0, 34, 12], ['p', 0, 1, 36, 10], ['w', 4, 3, 28, 6], ['r', 8, 5, 20, 2]]],
    cat: ['고양이', 'floor', 12, 9, [['o', 0, 2, 2, 5], ['o', 1, 3, 9, 5], ['o', 7, 0, 5, 5], ['N', 3, 3, 1, 2], ['N', 5, 3, 1, 2], ['k', 8, 2, 1, 1], ['k', 10, 2, 1, 1], ['p', 9, 3, 1, 1]]],
    teddy: ['곰인형', 'floor', 10, 11, [['n', 1, 0, 3, 3], ['n', 6, 0, 3, 3], ['n', 2, 2, 6, 5], ['n', 1, 7, 8, 4], ['w', 4, 5, 2, 2], ['k', 3, 4, 1, 1], ['k', 6, 4, 1, 1], ['r', 4, 7, 2, 1]]],
    cushion: ['하트 쿠션', 'floor', 10, 9, [['r', 1, 0, 3, 2], ['r', 6, 0, 3, 2], ['r', 0, 1, 10, 3], ['r', 1, 4, 8, 2], ['r', 2, 6, 6, 1], ['r', 4, 7, 2, 1], ['p', 2, 1, 1, 1]]],
    window: ['창문', 'wall', 20, 22, [['N', 0, 0, 20, 22], ['c', 2, 2, 7, 8], ['c', 11, 2, 7, 8], ['c', 2, 12, 7, 8], ['c', 11, 12, 7, 8], ['w', 3, 4, 4, 2], ['w', 12, 14, 4, 2]]],
    poster: ['포스터', 'wall', 12, 16, [['w', 0, 0, 12, 16], ['c', 1, 1, 10, 9], ['G', 1, 7, 10, 3], ['g', 1, 9, 10, 1], ['y', 7, 2, 2, 2], ['r', 3, 12, 6, 2]]],
    clock: ['시계', 'wall', 10, 10, [['w', 1, 0, 8, 10], ['w', 0, 1, 10, 8], ['k', 5, 2, 1, 4], ['k', 5, 5, 3, 1]]],
    frame: ['사진 액자', 'wall', 14, 12, [['n', 0, 0, 14, 12], ['w', 2, 2, 10, 8], ['p', 4, 4, 2, 2], ['p', 8, 4, 2, 2], ['p', 4, 5, 6, 2], ['p', 5, 7, 4, 1], ['p', 6, 8, 2, 1]]]
  };
  const TYPES = Object.keys(DEFS);
  const WALLS = ['#f2d7c9', '#cfe3d4', '#cfdcf0', '#f4e7b5', '#d9cdea'];
  const FLOORS = ['#c58f5c', '#a9b5a0', '#d9c7a3', '#8a7a9a'];

  const cache = {};
  function sprite(t) {   // 사각형 → 캔버스(바깥 1칸 먹색 윤곽선 자동) → data URL
    if (cache[t]) return cache[t];
    const d = DEFS[t], w = d[2] + 2, h = d[3] + 2;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d');
    d[4].forEach(r => { x.fillStyle = C[r[0]]; x.fillRect(r[1] + 1, r[2] + 1, r[3], r[4]); });
    const src = x.getImageData(0, 0, w, h), out = x.createImageData(w, h), ink = [31, 36, 32];
    const a = (i, j) => i < 0 || j < 0 || i >= w || j >= h ? 0 : src.data[(j * w + i) * 4 + 3];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4;
      if (a(i, j)) { for (let k = 0; k < 4; k++) out.data[o + k] = src.data[o + k]; }
      else if (a(i - 1, j) || a(i + 1, j) || a(i, j - 1) || a(i, j + 1)) { out.data[o] = ink[0]; out.data[o + 1] = ink[1]; out.data[o + 2] = ink[2]; out.data[o + 3] = 255; }
    }
    x.putImageData(out, 0, 0);
    return cache[t] = cv.toDataURL();
  }
  const size = t => [DEFS[t][2] + 2, DEFS[t][3] + 2];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // 서버/저장소에서 온 값은 믿지 않고 항상 걸러서 쓴다
  function sanitize(r) {
    const o = { wall: 0, floor: 0, items: [] };
    if (!r || typeof r !== 'object') return o;
    if (Number.isInteger(r.wall) && r.wall >= 0 && r.wall < WALLS.length) o.wall = r.wall;
    if (Number.isInteger(r.floor) && r.floor >= 0 && r.floor < FLOORS.length) o.floor = r.floor;
    (Array.isArray(r.items) ? r.items : []).slice(0, MAX_ITEMS).forEach(it => {
      if (!it || !DEFS[it.t] || typeof it.x !== 'number' || typeof it.y !== 'number') return;
      const s = size(it.t);
      o.items.push({ t: it.t, x: clamp(Math.round(it.x), 0, RW - s[0]), y: clamp(Math.round(it.y), 0, RH - s[1]), f: it.f ? 1 : 0 });
    });
    return o;
  }
  const demoRoom = () => ({ wall: 2, floor: 2, items: [
    { t: 'window', x: 14, y: 12, f: 0 }, { t: 'poster', x: 70, y: 18, f: 0 }, { t: 'clock', x: 92, y: 14, f: 0 }, { t: 'frame', x: 112, y: 20, f: 0 },
    { t: 'rug', x: 52, y: 78, f: 0 }, { t: 'bed', x: 6, y: 52, f: 0 }, { t: 'shelf', x: 134, y: 34, f: 0 }, { t: 'lamp', x: 40, y: 44, f: 0 }, { t: 'cat', x: 66, y: 82, f: 0 }, { t: 'plant', x: 120, y: 48, f: 0 }
  ] });
  const emptyRoom = () => ({ wall: 0, floor: 0, items: [] });

  // 한 방을 stage(div)에 그린다. editable이면 끌어서 옮기고 선택/삭제/뒤집기 가능.
  function mount(stage, opts) {
    opts = opts || {};
    let room = sanitize(opts.room), sel = -1;
    const bg = document.createElement('div'); bg.className = 'rbg';
    const wallEl = document.createElement('div'), floorEl = document.createElement('div'); wallEl.className = 'rwall'; floorEl.className = 'rfloor';
    bg.appendChild(wallEl); bg.appendChild(floorEl);
    const layer = document.createElement('div'); layer.className = 'rlayer';
    stage.innerHTML = ''; stage.appendChild(bg); stage.appendChild(layer);
    stage.classList.toggle('edit', !!opts.editable);
    const u = () => stage.clientWidth / RW;
    const fit = () => stage.style.setProperty('--u', (u() || 4) + 'px');
    if (window.ResizeObserver) { if (stage._ro) stage._ro.disconnect(); stage._ro = new ResizeObserver(fit); stage._ro.observe(stage); } fit();

    const sort = it => it.y + size(it.t)[1] + (DEFS[it.t][1] === 'wall' ? -200 : 0) + (it.t === 'rug' ? -100 : 0);
    function place(img, it) {
      const s = size(it.t);
      img.style.left = 'calc(var(--u)*' + it.x + ')'; img.style.top = 'calc(var(--u)*' + it.y + ')';
      img.style.width = 'calc(var(--u)*' + s[0] + ')'; img.style.height = 'calc(var(--u)*' + s[1] + ')';
      img.style.transform = it.f ? 'scaleX(-1)' : ''; img.style.zIndex = String(300 + sort(it));
    }
    function draw() {
      wallEl.style.background = WALLS[room.wall]; floorEl.style.background = FLOORS[room.floor];
      layer.innerHTML = '';
      room.items.forEach((it, i) => {
        const img = document.createElement('img'); img.src = sprite(it.t); img.alt = DEFS[it.t][0]; img.className = 'ritem' + (i === sel ? ' sel' : ''); img.draggable = false;
        place(img, it);
        if (opts.editable) {
          img.addEventListener('pointerdown', e => down(e, i, img));
          img.tabIndex = 0; img.setAttribute('role', 'button'); img.alt = DEFS[it.t][0] + ' (방향키로 옮기기, Delete로 치우기)';
          img.addEventListener('focus', () => { if (sel !== i) { sel = i; layer.querySelectorAll('.ritem').forEach((m, k) => m.classList.toggle('sel', k === i)); if (opts.onSelect) opts.onSelect(it); } });
          img.addEventListener('keydown', e => key(e, i, img));
        }
        layer.appendChild(img);
      });
      if (opts.onSelect) opts.onSelect(sel >= 0 ? room.items[sel] : null);
    }
    function key(e, i, img) {   // 방향키 1칸(Shift는 5칸), Delete 치우기
      const it = room.items[i], s = size(it.t), wall = DEFS[it.t][1] === 'wall', k = e.shiftKey ? 5 : 1, d = { ArrowLeft: [-k, 0], ArrowRight: [k, 0], ArrowUp: [0, -k], ArrowDown: [0, k] }[e.key];
      if (d) { e.preventDefault(); it.x = clamp(it.x + d[0], 0, RW - s[0]); it.y = clamp(it.y + d[1], 0, wall ? FLOOR + 2 - s[1] : RH - s[1]); place(img, it); clearTimeout(img._kt); img._kt = setTimeout(changed, 300); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); sel = i; room.items.splice(i, 1); sel = -1; draw(); changed(); }
    }
    function down(e, i, img) {
      e.preventDefault(); e.stopPropagation();
      sel = i; const it = room.items[i], sx = e.clientX, sy = e.clientY, ox = it.x, oy = it.y, s = size(it.t), wall = DEFS[it.t][1] === 'wall';
      layer.querySelectorAll('.ritem').forEach((m, k) => m.classList.toggle('sel', k === i)); if (opts.onSelect) opts.onSelect(it);
      try { img.setPointerCapture(e.pointerId); } catch (x) { }
      let moved = false;
      const mv = ev => {
        const k = u() || 1;
        const nx = clamp(Math.round(ox + (ev.clientX - sx) / k), 0, RW - s[0]);
        const ny = clamp(Math.round(oy + (ev.clientY - sy) / k), 0, wall ? FLOOR + 2 - s[1] : RH - s[1]);
        if (nx !== it.x || ny !== it.y) { it.x = nx; it.y = ny; moved = true; place(img, it); }
      };
      const up = () => { img.removeEventListener('pointermove', mv); img.removeEventListener('pointerup', up); img.removeEventListener('pointercancel', up); if (moved && opts.onChange) opts.onChange(room); };
      img.addEventListener('pointermove', mv); img.addEventListener('pointerup', up); img.addEventListener('pointercancel', up);
    }
    stage.addEventListener('pointerdown', () => { if (opts.editable && sel >= 0) { sel = -1; draw(); } });   // 가구는 stopPropagation 하므로 빈 곳을 누르면 선택 해제
    draw();
    const changed = () => { if (opts.onChange) opts.onChange(room); };
    return {
      get room() { return room; },
      set(r) { room = sanitize(r); sel = -1; draw(); },
      add(t) {
        if (!DEFS[t] || room.items.length >= MAX_ITEMS) return false;
        const s = size(t), wall = DEFS[t][1] === 'wall';
        const n = room.items.length;   // 새로 놓을 때마다 자리를 달리해서 겹쳐 쌓이지 않게
        const px = 6 + (n * 41) % Math.max(1, RW - s[0] - 12);
        room.items.push({ t, x: clamp(px, 0, RW - s[0]), y: wall ? clamp(8 + (n % 3) * 4, 0, FLOOR - s[1]) : clamp(64 + (n * 7) % 22, 0, RH - s[1]), f: 0 });
        sel = room.items.length - 1; draw(); changed(); return true;
      },
      flip() { if (sel < 0) return; room.items[sel].f = room.items[sel].f ? 0 : 1; draw(); changed(); },
      remove() { if (sel < 0) return; room.items.splice(sel, 1); sel = -1; draw(); changed(); },
      deselect() { sel = -1; draw(); },
      theme(kind, step) { const L = kind === 'wall' ? WALLS : FLOORS; room[kind] = (room[kind] + step + L.length) % L.length; draw(); changed(); },
      clear() { room.items = []; sel = -1; draw(); changed(); },
      hasSel: () => sel >= 0
    };
  }

  window.SSRoom = { RW, RH, FLOOR, MAX_ITEMS, DEFS, TYPES, sprite, size, sanitize, demoRoom, emptyRoom, mount };
})();
