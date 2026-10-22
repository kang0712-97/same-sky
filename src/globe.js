// 선택한 두 도시에 맞춰 도트 지구본을 그린다 (정사영 투영 + 간략 해안선 폴리곤)
(function () {
  const POLYS = {"eurasia":[[-9,38],[-9,43.5],[-1.5,43.5],[-4.5,48],[-1,49.5],[2,51],[5,53],[8,54],[8.5,57],[10.5,57.5],[11,59],[5,58.5],[5,62],[10,64],[15,68],[20,70],[28,71],[33,69.5],[41,67],[44,68],[54,68.5],[60,69],[68,70],[73,72.5],[80,73],[87,75],[100,77],[110,76],[113,73.5],[125,73],[140,72],[150,71],[160,69.5],[170,70],[178,69],[180,67],[176,64.5],[171,60.5],[164,60],[160,53],[156.5,51],[156,57],[150,59.5],[143,59.2],[137,54],[141,52],[140.5,48],[135.5,43.5],[131,42.5],[129.5,41],[129.5,37],[129.2,35.2],[126.5,34.5],[126.3,37],[125,38],[125.2,39.7],[121.5,39],[121,40.5],[118,39],[119,37.2],[122.5,37],[120,35],[121.8,31.5],[122,29.5],[119.5,25.5],[116,22.8],[111,21.5],[108,21.5],[106,19],[108.5,15],[109,11.5],[105,9],[104.5,10.5],[100.5,13],[99.5,9.5],[101,6.5],[103.5,1.5],[100,4],[98.5,8],[98.5,16.5],[94.5,16.5],[94,19.5],[91.5,22.5],[87,21.5],[80.5,15.5],[80,10],[77.5,8],[75,12],[73,17],[72.8,20.5],[70,21],[68,23.5],[66.5,25.5],[61.5,25],[57,25.5],[56.5,27],[51,28],[48.5,30],[50.5,26],[51.5,24],[54,24.5],[56.5,26],[59.5,22.5],[57.5,19],[52,16],[45,13],[43,13],[39,21],[35,28],[32,31],[35,33],[36,36.5],[30,36.5],[27,37],[26,40],[23,40],[24,37],[22.5,36.5],[21,38.5],[19.5,41.5],[16,42],[18.5,40],[16.5,38],[15.5,40],[12,42],[9,44.5],[3.5,43],[0.5,39],[-0.5,37.5],[-5.5,36.2]],"namerica":[[-168,65],[-156,71],[-125,70],[-95,70],[-82,68],[-78,60],[-64,60],[-56,52],[-66,45],[-70,42],[-76,37],[-81,31],[-80,25],[-84,30],[-90,29],[-97,26],[-97,21],[-88,21],[-84,16],[-79,9],[-83,8],[-92,14],[-105,20],[-110,24],[-115,30],[-117,33],[-124,40],[-124,48],[-130,54],[-140,60],[-150,60],[-158,57],[-165,60]],"greenland":[[-73,78],[-60,82],[-30,83],[-18,78],[-20,70],[-43,60],[-52,65],[-58,75]],"japan":[[131,33],[136,34],[140,35],[142,39],[142,43],[145,44],[141,45],[140,41],[139,37],[135,36],[131,34]],"africa":[[-17,21],[-17,14],[-8,5],[5,5],[9,4],[9,-1],[13,-12],[12,-17],[15,-27],[19,-35],[26,-34],[32,-28],[35,-22],[40,-15],[40,-3],[44,2],[51,12],[43,12],[39,21],[35,28],[32,31],[25,32],[10,37],[0,36],[-6,36],[-10,30]],"samerica":[[-80,9],[-72,12],[-62,10],[-52,5],[-35,-5],[-39,-14],[-48,-26],[-58,-38],[-65,-42],[-68,-52],[-72,-53],[-75,-45],[-72,-30],[-70,-18],[-76,-14],[-81,-5],[-80,0]],"australia":[[114,-22],[122,-18],[130,-12],[137,-12],[142,-11],[146,-19],[153,-26],[151,-34],[147,-39],[140,-38],[135,-34],[129,-32],[116,-35],[113,-26]],"arabia":[[35,28],[39,21],[43,13],[52,16],[58,19],[59,22],[56,26],[51,24],[48,30],[40,32]]};
  const SIZE = 81, R = SIZE / 2 - .5, C = (SIZE - 1) / 2;
  const INK = [31, 36, 32], PAPER = [247, 241, 222], RED = [224, 83, 61], BLUE = [61, 125, 224];
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const normLon = l => ((l + 180) % 360 + 360) % 360 - 180;
  function inPoly(lon, lat, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function project(lat, lon, lat0, lon0) {
    const la = rad(lat), lo = rad(lon), la0 = rad(lat0), lo0 = rad(lon0);
    const cosc = Math.sin(la0) * Math.sin(la) + Math.cos(la0) * Math.cos(la) * Math.cos(lo - lo0);
    return { x: C + R * Math.cos(la) * Math.sin(lo - lo0), y: C - R * (Math.cos(la0) * Math.sin(la) - Math.sin(la0) * Math.cos(la) * Math.cos(lo - lo0)), vis: cosc };
  }
  function midpoint(a, b) {
    const la1 = rad(a.lat), lo1 = rad(a.lon), la2 = rad(b.lat), lo2 = rad(b.lon);
    const x = Math.cos(la1) * Math.cos(lo1) + Math.cos(la2) * Math.cos(lo2), y = Math.cos(la1) * Math.sin(lo1) + Math.cos(la2) * Math.sin(lo2), z = Math.sin(la1) + Math.sin(la2);
    return { lat: deg(Math.atan2(z, Math.hypot(x, y))), lon: deg(Math.atan2(y, x)) };
  }
  function arc(a, b, n) {
    const la1 = rad(a.lat), lo1 = rad(a.lon), la2 = rad(b.lat), lo2 = rad(b.lon);
    const d = Math.acos(Math.min(1, Math.max(-1, Math.sin(la1) * Math.sin(la2) + Math.cos(la1) * Math.cos(la2) * Math.cos(lo2 - lo1))));
    const out = []; if (d < 1e-6) return out;
    for (let t = 0; t <= n; t++) {
      const f = t / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2), y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2), z = A * Math.sin(la1) + B * Math.sin(la2);
      out.push({ lat: deg(Math.atan2(z, Math.hypot(x, y))), lon: deg(Math.atan2(y, x)) });
    }
    return out;
  }
  function km(a, b) {
    const la1 = rad(a.lat), la2 = rad(b.lat), dl = rad(b.lon - a.lon);
    const h = Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dl / 2) ** 2;
    return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
  }
  let base = null, cv = null, state = null, tick = 0;
  function renderBase(lat0, lon0) {
    const b = document.createElement('canvas'); b.width = b.height = SIZE;
    const x = b.getContext('2d'), id = x.createImageData(SIZE, SIZE), d = id.data, la0 = rad(lat0);
    const inside = new Uint8Array(SIZE * SIZE);
    const put = (px, py, c) => { const i = (py * SIZE + px) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
    for (let py = 0; py < SIZE; py++) for (let px = 0; px < SIZE; px++) {
      const dx = (px - C) / R, dy = (C - py) / R, dd = dx * dx + dy * dy; if (dd > 1) continue;
      inside[py * SIZE + px] = 1;
      const rho = Math.sqrt(dd), cc = Math.asin(Math.min(1, rho)); let lat, lon;
      if (rho < 1e-9) { lat = lat0; lon = lon0; }
      else {
        lat = deg(Math.asin(Math.max(-1, Math.min(1, Math.cos(cc) * Math.sin(la0) + dy * Math.sin(cc) * Math.cos(la0) / rho))));
        lon = normLon(lon0 + deg(Math.atan2(dx * Math.sin(cc), rho * Math.cos(la0) * Math.cos(cc) - dy * Math.sin(la0) * Math.sin(cc))));
      }
      let land = false; for (const k in POLYS) if (inPoly(lon, lat, POLYS[k])) { land = true; break; }
      const glat = Math.abs(((lat + 15) % 30 + 30) % 30 - 15) < .9, glon = Math.abs(((lon + 15) % 30 + 30) % 30 - 15) < .9 / Math.max(.2, Math.cos(rad(lat)));
      put(px, py, land ? INK : ((glat || glon) && (px + py) % 2 === 0 ? INK : PAPER));
    }
    for (let py = 0; py < SIZE; py++) for (let px = 0; px < SIZE; px++) {
      if (!inside[py * SIZE + px]) continue;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => { const xx = px + a, yy = py + c; return xx < 0 || yy < 0 || xx >= SIZE || yy >= SIZE || !inside[yy * SIZE + xx]; });
      const dx = (px - C) / R, dy = (C - py) / R;
      if (edge) put(px, py, INK);
      else if (dx > .55 && dy < -.1 && dx * dx + dy * dy > .62 && (px + py) % 2 === 0 && d[(py * SIZE + px) * 4] === PAPER[0]) put(px, py, INK);
    }
    x.putImageData(id, 0, 0); return b;
  }
  function frame() {
    if (!cv || !base) return;
    const x = cv.getContext('2d'); x.clearRect(0, 0, SIZE, SIZE); x.drawImage(base, 0, 0);
    const { a, b, lat0, lon0 } = state, dot = (px, py, col) => { x.fillStyle = 'rgb(' + col + ')'; x.fillRect(Math.round(px), Math.round(py), 1, 1); };
    if (b) {
      let i = 0;
      arc(a, b, 60).forEach(p => { const q = project(p.lat, p.lon, lat0, lon0); if (q.vis > .08) { const k = i++; if ((k + tick) % 3 !== 2) dot(q.x, q.y, RED); } });
    }
    const marker = (p, col) => {
      const q = project(p.lat, p.lon, lat0, lon0); if (q.vis <= 0) return;
      const px = Math.round(q.x), py = Math.round(q.y);
      for (let ox = -3; ox <= 3; ox++) for (let oy = -3; oy <= 3; oy++) if (Math.abs(ox) + Math.abs(oy) <= 4) dot(px + ox, py + oy, PAPER);
      for (let ox = -2; ox <= 2; ox++) for (let oy = -2; oy <= 2; oy++) if (Math.abs(ox) + Math.abs(oy) <= 3) dot(px + ox, py + oy, INK);
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) dot(px + ox, py + oy, tick % 2 === 0 ? col : PAPER);
    };
    marker(a, RED); if (b) marker(b, BLUE);
  }
  window.SSGlobe = {
    km,
    attach(canvas) { cv = canvas; setInterval(() => { tick++; frame(); }, 350); },
    set(a, b) {
      const key = JSON.stringify([a.lat, a.lon, b && b.lat, b && b.lon]); if (state && state.key === key) return;
      const m = b ? midpoint(a, b) : { lat: a.lat, lon: a.lon };
      const lat0 = Math.max(-60, Math.min(70, m.lat * 0.8 + 10)), lon0 = m.lon;
      state = { key, a, b, lat0, lon0 }; base = renderBase(lat0, lon0); frame();
    }
  };
})();
