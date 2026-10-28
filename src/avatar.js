// 캐릭터 목록(manifest.json) + 색 바꾸기 + 머리 모양/소품/무늬 (모두 코드로 그림, 밝기·음영은 유지)
(function () {
  const BASE = 'assets/characters/';
  const SWATCH = {
    hair: ['#262425', '#6e462d', '#e2be64', '#aa3c2d', '#ec8caa', '#466ebe', '#bec3cd', '#78509f'],
    top: ['#f9ebdb', '#323237', '#c8463c', '#466ebe', '#509664', '#ebc85a', '#eb96b4', '#7d5aaa', '#969ba0', '#82604a'],
    bottom: ['#364c4f', '#323237', '#c8463c', '#466ebe', '#509664', '#ebc85a', '#eb96b4', '#7d5aaa', '#969ba0', '#82604a'],
    skin: ['#f6d5b8', '#e9b48f', '#d49a74', '#b57a52', '#8a5636', '#5e3a24'],
    accent: ['#c8463c', '#466ebe', '#ebc85a', '#509664', '#eb96b4', '#7d5aaa', '#f9ebdb', '#323237']
  };
  const INK = [31, 36, 32];
  const CUT = 113;   // 머리·얼굴과 옷을 나누는 가로줄(목)
  let manifest = null, chars = [], headItems = [], patterns = []; const imgs = {}, cache = {};
  const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = c => .299 * c[0] + .587 * c[1] + .114 * c[2];
  const shade = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v * k))));
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  async function load() {
    if (manifest) return chars;
    manifest = await (await fetch(BASE + 'manifest.json')).json();
    chars = manifest.characters; headItems = manifest.headItems; patterns = manifest.patterns;
    await Promise.all(chars.map(c => c.builder ? null : new Promise(res => { const im = new Image(); im.onload = () => { imgs[c.id] = im; res(); }; im.onerror = res; im.src = BASE + c.file; })));
    return chars;
  }
  const LEGACY = { girl: 'g01', boy: 'b01', make: 'g01' };   // 예전에 저장된 캐릭터 이름은 새 캐릭터로 연결
  const byId = id => chars.find(c => c.id === id) || chars.find(c => c.id === LEGACY[id]) || chars[0];

  function bbox(d, w, h) {
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1 };
  }

  // avatar: { char, hair, top, bottom, hairStyle, head, glasses, scarf, accent, tpat, bpat }
  function render(av) {
    if (av.set) {   // 머리·얼굴과 옷을 목 위치(CUT)에서 나눠 서로 다른 캐릭터에서 가져온다
      const c = document.createElement('canvas'), x = c.getContext('2d'), h = imgs[byId(av.set.head).id], o = imgs[byId(av.set.outfit).id]; c.width = o.width; c.height = o.height;
      x.drawImage(o, 0, CUT, o.width, o.height - CUT, 0, CUT, o.width, o.height - CUT); x.drawImage(h, 0, 0, h.width, CUT, 0, 0, h.width, CUT); return c;
    }
    if (av.mix && window.SSMix && SSMix.ready()) return SSMix.render(av);   // (예전) 파츠 조합 캐릭터
    const ch = byId(av.char), im = ch.builder ? window.SSBuilder.build(av) : imgs[ch.id], an = ch.anchors || {};
    if (ch.v2) { const c0 = document.createElement('canvas'); c0.width = im.width; c0.height = im.height; c0.getContext('2d').drawImage(im, 0, 0); return c0; }   // 새 캐릭터는 완성된 그림 그대로
    const W = im.width, Hh = im.height;
    const c = document.createElement('canvas'); c.width = W; c.height = Hh;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const id = x.getImageData(0, 0, W, Hh), d = id.data, bb = ch.builder ? { x0: 44, y0: 42, x1: 65, y1: 107 } : bbox(d, W, Hh), H = bb.y1 - bb.y0 + 1;
    const ox = bb.x0, oy = bb.y0, MX = 21;             // MX: 좌우 대칭 변환 (x' = 21 - x)
    const idx = (lx, ly) => ((oy + ly) * W + (ox + lx)) * 4;
    const inb = (lx, ly) => ox + lx >= 0 && ox + lx < W && oy + ly >= 0 && oy + ly < Hh;
    const op = (lx, ly) => inb(lx, ly) && d[idx(lx, ly) + 3] > 0;
    const get = (lx, ly) => { const i = idx(lx, ly); return hex(d[i], d[i + 1], d[i + 2]); };
    const put = (lx, ly, col) => { if (!inb(lx, ly)) return; const i = idx(lx, ly); d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; };
    const clear = (lx, ly) => { if (inb(lx, ly)) d[idx(lx, ly) + 3] = 0; };
    const isInk = (lx, ly) => op(lx, ly) && get(lx, ly) === '#1f2420';
    const hairSet = new Set((ch.parts.hair || { colors: [] }).colors);

    /* 1) 머리 모양: 길이 자르기 / 모자 벗기 */
    const hs = (ch.hairStyles || []).find(s => s.id === av.hairStyle);
    if (hs && hs.cut) {
      const { row, endRow, xl, xr } = hs.cut, edge = [];
      for (let ly = row; ly <= endRow; ly++) for (let lx = -2; lx <= 23; lx++) {
        if ((lx <= xl || lx >= xr) && op(lx, ly) && hairSet.has(get(lx, ly))) { clear(lx, ly); edge.push([lx, ly]); }
      }
      for (let pass = 0; pass < 2; pass++) for (let ly = row - 1; ly <= endRow + 1; ly++) for (let lx = -2; lx <= 23; lx++) {   // 홀로 남은 외곽선 정리
        if (isInk(lx, ly) && (lx <= xl + 1 || lx >= xr - 1) && !N4.some(([a, b]) => op(lx + a, ly + b) && !isInk(lx + a, ly + b))) clear(lx, ly);
      }
      for (let ly = row - 1; ly <= endRow + 1; ly++) for (let lx = -2; lx <= 23; lx++) {   // 잘린 경계에 새 외곽선
        if (op(lx, ly) && !isInk(lx, ly) && N4.some(([a, b]) => !op(lx + a, ly + b)) && (lx <= xl + 2 || lx >= xr - 2)) put(lx, ly, INK);
      }
    }
    if (hs && hs.removeCap) {
      const capHex = hs.removeCap.color, hairHex = rgb(ch.parts.hair.colors[0]);
      for (let ly = 0; ly <= hs.removeCap.toRow; ly++) for (let lx = 0; lx < 22; lx++) if (op(lx, ly) && get(lx, ly) === capHex) put(lx, ly, (lx * 3 + ly * 5) % 11 === 0 ? rgb(ch.parts.hair.colors[1]) : hairHex);
    }

    /* 2) 부위 마스크 → 색 바꾸기 → 무늬 */
    const masks = {};
    ['skin', 'hair', 'top', 'bottom'].forEach(part => {
      const spec = ch.parts[part]; if (!spec) return; const set = new Set(spec.colors), list = [];
      for (let ly = -6; ly < H; ly++) {
        const f = ly / H; if (f < spec.rows[0] || f > spec.rows[1]) continue;
        for (let lx = 0; lx < 22; lx++) if (op(lx, ly) && set.has(get(lx, ly))) list.push([lx, ly]);
      }
      masks[part] = list;
      const base = av[part]; if (!base) return;
      const target = rgb(base), main = lum(rgb(spec.colors[0]));
      list.forEach(([lx, ly]) => { const i = idx(lx, ly), k = lum([d[i], d[i + 1], d[i + 2]]) / main; put(lx, ly, shade(target, k)); });
    });
    const pattern = (list, kind) => {
      if (!kind || kind === 'none') return;
      list.forEach(([lx, ly]) => {
        const i = idx(lx, ly), col = [d[i], d[i + 1], d[i + 2]];
        let k = 1;
        if (kind === 'stripe') k = ly % 3 === 0 ? .72 : 1;
        else if (kind === 'dot') k = (lx % 3 === 1 && ly % 3 === 1) ? .7 : 1;
        else if (kind === 'check') k = (((lx >> 1) + (ly >> 1)) % 2 === 0) ? .78 : 1;
        if (k !== 1) put(lx, ly, shade(col, k));
      });
    };
    pattern(masks.top, av.tpat); pattern(masks.bottom, av.bpat);

    /* 3) 소품 */
    const acc = rgb(av.accent || SWATCH.accent[0]);
    const mir = pts => pts.concat(pts.map(([a, b]) => [MX - a, b]));
    const shape = (pts, fill) => {            // 채우고, 투명한 바깥쪽에만 먹색 외곽선
      const key = new Set(pts.map(p => p[0] + ',' + p[1]));
      pts.forEach(([a, b]) => put(a, b, typeof fill === 'function' ? fill(a, b) : fill));
      pts.forEach(([a, b]) => N4.forEach(([e, f]) => { if (!key.has((a + e) + ',' + (b + f)) && !op(a + e, b + f)) put(a + e, b + f, INK); }));
    };
    const extent = ly => { let l = 99, r = -99; for (let lx = -3; lx < 25; lx++) if (op(lx, ly)) { l = Math.min(l, lx); r = Math.max(r, lx); } return [l, r]; };

    const head = av.head;
    if (head === 'band' && an.band) {
      for (let ly = an.band[0]; ly <= an.band[1]; ly++) { const [l, r] = extent(ly); for (let lx = l + 1; lx <= r - 1; lx++) if (op(lx, ly)) put(lx, ly, ly === an.band[0] ? shade(acc, 1.12) : acc); }
    } else if (head === 'bow' && an.bow) {
      const P = ['.AA.AA.', 'AAAKAAA', 'AAAKAAA', '.AA.AA.'], pts = [];
      P.forEach((row, j) => [...row].forEach((ch2, i) => { if (ch2 !== '.') pts.push([an.bow[0] + i, an.bow[1] + j, ch2]); }));
      const key = {}; pts.forEach(p => key[p[0] + ',' + p[1]] = p[2]);
      shape(pts.map(p => [p[0], p[1]]), (a, b) => key[a + ',' + b] === 'K' ? shade(acc, .7) : acc);
    } else if (head === 'beanie' && an.beanie != null) {
      const B = an.beanie;
      for (let ly = -1; ly <= B; ly++) for (let lx = -3; lx < 25; lx++) if (op(lx, ly) && !isInk(lx, ly)) put(lx, ly, ly >= B - 1 ? (lx % 2 ? shade(acc, .78) : shade(acc, .9)) : (ly % 2 ? acc : shade(acc, 1.08)));
      const [l, r] = extent(B + 1); for (let lx = l; lx <= r; lx++) if (op(lx, B + 1) && !isInk(lx, B + 1)) put(lx, B + 1, INK);
      shape([[9, -2], [10, -2], [11, -2], [12, -2], [9, -3], [10, -3], [11, -3], [12, -3]].filter(p => !op(p[0], p[1])), shade(acc, 1.1));
    } else if (head === 'cat' && an.cat) {
      const L = [[0, -2], [0, -1], [1, -1], [0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2], [4, 2]].map(([a, b]) => [an.cat[0] + a, an.cat[1] + b]);
      shape(mir(L), acc);
      [[an.cat[0] + 1, an.cat[1] + 0], [an.cat[0] + 1, an.cat[1] + 1]].forEach(([a, b]) => { put(a, b, shade(acc, 1.25)); put(MX - a, b, shade(acc, 1.25)); });
    } else if (head === 'crown') {
      const pts = []; for (let lx = 8; lx <= 13; lx++) pts.push([lx, -1]); [8, 10, 11, 13].forEach(lx => pts.push([lx, -2]));
      shape(pts, (a, b) => b === -1 ? shade(acc, .85) : shade(acc, 1.15));
    } else if (head === 'bunny') {
      const L = []; for (let ly = -7; ly <= -1; ly++) { L.push([7, ly], [8, ly]); }
      shape(mir(L), (a, b) => (b > -6 && (a === 8 || a === 13)) ? [255, 190, 205] : [250, 240, 232]);
    } else if (head === 'flower') {
      const cx = 4, cy = 5, P = [[0, -1], [-1, 0], [1, 0], [0, 1]];
      P.forEach(([a, b]) => put(cx + a, cy + b, acc)); put(cx, cy, [250, 215, 90]);
    } else if (head === 'halo') {
      const pts = []; for (let lx = 8; lx <= 13; lx++) pts.push([lx, -4]);
      shape(pts, [250, 215, 90]);
    } else if (head === 'phones' && an.cups) {
      const band = [];
      for (let ly = 0; ly <= an.cups[0] - 1; ly++) { const [l, r] = extent(ly); if (l > r) continue; band.push([l - 1, ly], [l - 2, ly], [r + 1, ly], [r + 2, ly]); }
      const [t0, t1] = extent(0); for (let lx = t0 - 2; lx <= t1 + 2; lx++) { band.push([lx, -1], [lx, -2]); }
      shape(band, acc);
      const [l, r] = extent(an.cups[0]), cups = [];
      for (let ly = an.cups[0]; ly <= an.cups[1]; ly++) for (let k = 1; k <= 4; k++) { cups.push([l - k, ly]); cups.push([r + k, ly]); }
      shape(cups, (a, b) => (b === an.cups[0] || b === an.cups[1]) ? shade(acc, .78) : shade(acc, 1.05));
    }
    if (av.glasses && an.glasses) {
      const g = an.glasses, kind = av.glasses === true ? 'square' : av.glasses, pts = [];
      for (let ly = g.y[0]; ly <= g.y[1]; ly++) for (let lx = g.lx[0]; lx <= g.lx[1]; lx++) {
        const edge = ly === g.y[0] || ly === g.y[1] || lx === g.lx[0] || lx === g.lx[1];
        const corner = (ly === g.y[0] || ly === g.y[1]) && (lx === g.lx[0] || lx === g.lx[1]);
        if (kind === 'sun' ? true : kind === 'round' ? edge && !corner : edge) pts.push([lx, ly]);
      }
      pts.concat(pts.map(([a, b]) => [MX - a, b])).forEach(([a, b]) => put(a, b, kind === 'sun' ? [38, 40, 52] : INK));
      for (let lx = g.bridge[0]; lx <= g.bridge[1]; lx++) put(lx, Math.round((g.y[0] + g.y[1]) / 2), INK);
    }
    const fc = an.face;
    if (fc) {
      const two = (lx, ly, col) => { put(lx, ly, col); put(MX - lx, ly, col); };
      if (av.cheek === 'blush') { const [cy, cx] = fc.cheek; [[0, 0], [1, 0]].forEach(([a, b]) => two(cx + a, cy + b, [238, 140, 150])); }
      if (av.cheek === 'freckle') { const [cy, cx] = fc.cheek; [[0, 0], [2, 0], [1, 1]].forEach(([a, b]) => two(cx + a, cy + b - 1, [170, 105, 78])); }
      if (av.cheek === 'mole') put(fc.mole[1], fc.mole[0], INK);
      const [my, mx] = fc.mouth, red = [214, 84, 90];
      if (av.mouth === 'smile') { put(mx - 1, my, INK); put(mx + 2, my, INK); put(mx, my + 1, INK); put(mx + 1, my + 1, INK); }
      else if (av.mouth === 'open') { put(mx, my, INK); put(mx + 1, my, INK); put(mx, my + 1, red); put(mx + 1, my + 1, red); }
      else if (av.mouth === 'flat') { put(mx, my, INK); put(mx + 1, my, INK); }
      else if (av.mouth === 'tongue') { put(mx - 1, my, INK); put(mx + 2, my, INK); put(mx, my + 1, INK); put(mx + 1, my + 1, INK); put(mx + 1, my + 2, [236, 120, 130]); }
      else if (av.mouth === 'pout') { put(mx + 1, my, INK); put(mx + 2, my, INK); }
    }
    if (av.neck && an.scarf) {
      const s = an.scarf, y = s.y[0], cx = 10;
      if (av.neck === 'choker') for (let lx = s.x[0] + 2; lx <= s.x[1] - 2; lx++) put(lx, y, shade(acc, .9));
      else if (av.neck === 'bow') shape([[cx - 2, y], [cx - 1, y], [cx + 2, y], [cx + 3, y], [cx - 2, y + 1], [cx - 1, y + 1], [cx + 2, y + 1], [cx + 3, y + 1], [cx, y], [cx + 1, y], [cx, y + 1], [cx + 1, y + 1]], (a, b) => (a === cx || a === cx + 1) ? shade(acc, .7) : acc);
      else if (av.neck === 'necklace') { [[cx - 2, y], [cx - 1, y + 1], [cx, y + 2], [cx + 1, y + 2], [cx + 2, y + 1], [cx + 3, y]].forEach(([a, b]) => put(a, b, [236, 200, 90])); put(cx, y + 3, acc); put(cx + 1, y + 3, acc); }
    }
    if (av.scarf && an.scarf) {
      const s = an.scarf, pts = [];
      for (let ly = s.y[0]; ly <= s.y[1]; ly++) for (let lx = s.x[0]; lx <= s.x[1]; lx++) pts.push([lx, ly]);
      for (let ly = s.tailY[0]; ly <= s.tailY[1]; ly++) for (let lx = s.tailX[0]; lx <= s.tailX[1]; lx++) pts.push([lx, ly]);
      shape(pts, (a, b) => ((a + (b > s.y[1] ? 0 : 1)) % 3 === 0) ? shade(acc, .72) : acc);
    }
    x.putImageData(id, 0, 0);
    return c;
  }

  function layerUrl(avatar) {
    if (avatar.custom) return /^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(avatar.url || '') ? avatar.url : 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    const k = JSON.stringify(avatar);
    return cache[k] || (cache[k] = render(avatar).toDataURL());
  }
  function thumbUrl(avatar) {
    if (avatar.custom) return avatar.thumb;
    const c = render(avatar), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data, bb = bbox(d, c.width, c.height);
    const o = document.createElement('canvas'); o.width = bb.x1 - bb.x0 + 1; o.height = bb.y1 - bb.y0 + 1;
    o.getContext('2d').drawImage(c, bb.x0, bb.y0, o.width, o.height, 0, 0, o.width, o.height);
    return o.toDataURL();
  }
  const hcache = {};
  function headUrl(avatar) {   // 머리·얼굴 위주 확대 썸네일 (옵션 격자용)
    if (avatar.custom) return avatar.thumb;
    const k = JSON.stringify(avatar); if (hcache[k]) return hcache[k];
    const ch = byId(avatar.char); let bb;
    if (avatar.mix || avatar.set) {   // 파츠·세트 조합: 머리 중심 정사각형
      const c = render(avatar), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, b = bbox(d, c.width, c.height), cx = Math.round((b.x0 + b.x1) / 2), o = document.createElement('canvas'); o.width = o.height = 48;
      const ox = o.getContext('2d'); ox.imageSmoothingEnabled = false; ox.drawImage(c, cx - 28, b.y0 - 2, 56, 56, 0, 0, 48, 48); return hcache[k] = o.toDataURL();
    }
    if (ch.v2) {   // 머리 중심으로 정사각 잘라내기
      const c = render(avatar), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, b = bbox(d, c.width, c.height), sw = b.x1 - b.x0 + 1, o = document.createElement('canvas'); o.width = o.height = 48;
      const ox = o.getContext('2d'); ox.imageSmoothingEnabled = false; ox.drawImage(c, b.x0 - 2, b.y0 - 2, sw + 4, sw + 4, 0, 0, 48, 48); return hcache[k] = o.toDataURL();
    }
    if (ch.builder) bb = { x0: 44, y0: 42 }; else { const im = imgs[ch.id], c0 = document.createElement('canvas'); c0.width = im.width; c0.height = im.height; const x0 = c0.getContext('2d'); x0.drawImage(im, 0, 0); bb = bbox(x0.getImageData(0, 0, im.width, im.height).data, im.width, im.height); }
    const o = document.createElement('canvas'); o.width = 26; o.height = 26;
    o.getContext('2d').drawImage(render(avatar), bb.x0 - 2, bb.y0 - 8, 26, 26, 0, 0, 26, 26);
    return hcache[k] = o.toDataURL();
  }
  const OPT = {
    mouth: [['none', '기본'], ['smile', '미소'], ['open', '활짝'], ['tongue', '메롱'], ['flat', '무표정'], ['pout', '삐죽']],
    cheek: [['none', '없음'], ['blush', '볼터치'], ['freckle', '주근깨'], ['mole', '점']],
    glasses: [['none', '없음'], ['square', '네모'], ['round', '동그라미'], ['sun', '선글라스']],
    faceShape: [['round', '둥근형'], ['oval', '갸름'], ['square', '각진']],
    eyes: [['dot', '동그란'], ['tall', '큰 눈'], ['sleepy', '졸린'], ['happy', '웃는']],
    brows: [['none', '없음'], ['flat', '일자'], ['thick', '굵은'], ['sad', '처진']],
    beard: [['none', '없음'], ['mustache', '콧수염'], ['goatee', '턱수염'], ['full', '풀수염']],
    topStyle: [['tee', '티셔츠'], ['hoodie', '후디'], ['jacket', '재킷'], ['sweater', '니트']],
    bottomStyle: [['pants', '긴바지'], ['shorts', '반바지'], ['skirt', '치마']],
    neck: [['none', '없음'], ['scarf', '목도리'], ['choker', '초커'], ['bow', '나비넥타이'], ['necklace', '목걸이']]
  };
  window.SSAvatar = { headUrl, OPT, load, SWATCH, layerUrl, thumbUrl, list: () => chars, byId, headItems: () => headItems, patterns: () => patterns };
})();
