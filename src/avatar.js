// 캐릭터 목록(manifest.json) + 머리/상의/하의 색 바꾸기 (밝기·음영은 유지)
(function () {
  const BASE = 'assets/characters/';
  const SWATCH = {
    hair: ['#262425', '#6e462d', '#e2be64', '#aa3c2d', '#ec8caa', '#466ebe', '#bec3cd', '#78509f'],
    top: ['#f9ebdb', '#323237', '#c8463c', '#466ebe', '#509664', '#ebc85a', '#eb96b4', '#7d5aaa', '#969ba0', '#82604a'],
    bottom: ['#364c4f', '#323237', '#c8463c', '#466ebe', '#509664', '#ebc85a', '#eb96b4', '#7d5aaa', '#969ba0', '#82604a']
  };
  let manifest = null; const imgs = {}, cache = {};
  const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = c => .299 * c[0] + .587 * c[1] + .114 * c[2];

  async function load() {
    if (manifest) return manifest;
    manifest = (await (await fetch(BASE + 'manifest.json')).json()).characters;
    await Promise.all(manifest.map(c => new Promise(res => { const im = new Image(); im.onload = () => { imgs[c.id] = im; res(); }; im.onerror = res; im.src = BASE + c.file; })));
    return manifest;
  }
  const byId = id => manifest.find(c => c.id === id) || manifest[0];

  function bbox(d, w, h) {
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1 };
  }

  // avatar: { char, hair, top, bottom }  → 110x120 레이어 canvas
  function render(avatar) {
    const ch = byId(avatar.char), im = imgs[ch.id];
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const id = x.getImageData(0, 0, c.width, c.height), d = id.data, bb = bbox(d, c.width, c.height), H = bb.y1 - bb.y0 + 1;
    ['hair', 'top', 'bottom'].forEach(part => {
      const base = avatar[part], spec = ch.parts[part];
      if (!base || !spec) return;
      const target = rgb(base), main = lum(rgb(spec.colors[0])), set = new Set(spec.colors);
      for (let yy = bb.y0; yy <= bb.y1; yy++) {
        const f = (yy - bb.y0) / H; if (f < spec.rows[0] || f > spec.rows[1]) continue;
        for (let xx = bb.x0; xx <= bb.x1; xx++) {
          const i = (yy * c.width + xx) * 4; if (!d[i + 3]) continue;
          if (!set.has(hex(d[i], d[i + 1], d[i + 2]))) continue;
          const k = lum([d[i], d[i + 1], d[i + 2]]) / main;
          d[i] = Math.min(255, target[0] * k); d[i + 1] = Math.min(255, target[1] * k); d[i + 2] = Math.min(255, target[2] * k);
        }
      }
    });
    x.putImageData(id, 0, 0);
    return c;
  }
  function layerUrl(avatar) {
    if (avatar.custom) return avatar.url;
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
  window.SSAvatar = { load, SWATCH, layerUrl, thumbUrl, list: () => manifest, byId };
})();
