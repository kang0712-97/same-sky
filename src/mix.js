// 파츠 조합 캐릭터: 몸 → 신발 → 하의 → 상의 → 원피스 → 머리 → 눈 순서로 겹쳐 그린다 (assets/parts, scripts/build-parts.py 로 생성)
(function () {
  const BASE = 'assets/parts/';
  const HAIR_REF = 95;   // 원본 머리색(갈색)의 대표 밝기. 이 값 기준으로 새 색의 음영을 만든다.
  let man = null; const imgs = {}, byId = {}, tinted = {};
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = c => .299 * c[0] + .587 * c[1] + .114 * c[2];

  async function load() {
    if (man) return man;
    const m = await (await fetch(BASE + 'manifest.json')).json();
    const all = [{ id: 'body', file: m.body }].concat(...Object.values(m.kinds));
    await Promise.all(all.map(e => new Promise(res => { const im = new Image(); im.onload = () => { imgs[e.file] = im; res(); }; im.onerror = res; im.src = BASE + e.file; })));
    all.forEach(e => { byId[e.id] = e; });
    man = m;
    return m;
  }

  function tint(file, target, ref) {   // 원본의 밝기 차이(외곽선·음영)를 살린 채 색만 바꾼다
    const key = file + target; if (tinted[key]) return tinted[key];
    const im = imgs[file], c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const id = x.getImageData(0, 0, c.width, c.height), d = id.data, t = rgb(target);
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const k = lum([d[i], d[i + 1], d[i + 2]]) / ref;
      d[i] = Math.min(255, Math.round(t[0] * k)); d[i + 1] = Math.min(255, Math.round(t[1] * k)); d[i + 2] = Math.min(255, Math.round(t[2] * k));
    }
    x.putImageData(id, 0, 0);
    return tinted[key] = c;
  }

  function render(av) {
    const c = document.createElement('canvas'); c.width = man.w; c.height = man.h;
    const x = c.getContext('2d'), m = av.mix || {};
    const skin = HEX.test(av.skin || '') ? av.skin : null, hc = HEX.test(av.hc || '') ? av.hc : null;
    const draw = (file, color, ref) => { if (!imgs[file]) return; x.drawImage(color ? tint(file, color, ref) : imgs[file], 0, 0); };
    draw(man.body, skin, lum(rgb(man.skin)));
    man.order.slice(1).forEach(kind => {
      if (m.one && (kind === 'top' || kind === 'bottom')) return;   // 원피스는 상의·하의를 대신한다
      const e = byId[m[kind]]; if (!e || !e.id.startsWith(kind + '-')) return;
      draw(e.file, kind === 'hair' ? hc : null, HAIR_REF);
    });
    return c;
  }

  function defaultMix() {
    const k = man.kinds, first = n => k[n][0].id;
    return { char: 'g01', mix: { hair: k.hair[1].id, eyes: k.eyes[1].id, top: first('top'), bottom: first('bottom'), shoes: first('shoes'), one: null }, skin: null, hc: null };
  }

  window.SSMix = { load, render, defaultMix, ready: () => !!man, kinds: k => (man ? man.kinds[k] || [] : []) };
})();
