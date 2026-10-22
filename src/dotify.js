// 이미지 → 컬러 도트 변환 (브라우저 canvas만 사용)
(function () {
  const INK = [31, 36, 32];
  const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const M = Math.max(r, g, b), m = Math.min(r, g, b);
    let h = 0, s = 0; const l = (M + m) / 2;
    if (M !== m) {
      const d = M - m;
      s = l > .5 ? d / (2 - M - m) : d / (M + m);
      h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hsl2rgb(h, s, l) {
    if (s === 0) { const v = l * 255; return [v, v, v]; }
    const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }

  // o: { size, ratio(세로/가로, 0=원본), colors, contrast, sat, sharpen, outline, rmbg, tol }
  function dotify(img, o) {
    const N = o.size, rt = o.ratio;
    let sw = img.width, sh = img.height, sx = 0, sy = 0, H;
    if (rt > 0) {
      const a = sh / sw;
      if (a > rt) { const nh = sw * rt; sy = (sh - nh) / 2; sh = nh; } else { const nw = sh / rt; sx = (sw - nw) / 2; sw = nw; }
      H = Math.round(N * rt);
    } else H = Math.round(N * sh / sw);
    const c = document.createElement('canvas'); c.width = N; c.height = H;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(img, sx, sy, sw, sh, 0, 0, N, H);
    const id = x.getImageData(0, 0, N, H), d = id.data, n = N * H;
    const alpha = new Uint8Array(n).fill(1);
    for (let i = 0; i < n; i++) if (d[i * 4 + 3] < 128) alpha[i] = 0;

    if (o.rmbg) {
      let br = 0, bg = 0, bb = 0;
      [[0, 0], [N - 1, 0], [0, H - 1], [N - 1, H - 1]].forEach(p => { const k = (p[1] * N + p[0]) * 4; br += d[k]; bg += d[k + 1]; bb += d[k + 2]; });
      br /= 4; bg /= 4; bb /= 4;
      const seen = new Uint8Array(n), q = [];
      const ok = i => Math.hypot(d[i * 4] - br, d[i * 4 + 1] - bg, d[i * 4 + 2] - bb) <= o.tol;
      for (let X = 0; X < N; X++) { q.push(X); q.push((H - 1) * N + X); }
      for (let Y = 0; Y < H; Y++) { q.push(Y * N); q.push(Y * N + N - 1); }
      while (q.length) {
        const i = q.pop(); if (seen[i]) continue; seen[i] = 1; if (!ok(i)) continue; alpha[i] = 0;
        const X = i % N, Y = (i / N) | 0;
        if (X > 0) q.push(i - 1); if (X < N - 1) q.push(i + 1); if (Y > 0) q.push(i - N); if (Y < H - 1) q.push(i + N);
      }
    }

    const L = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let [h, s, l] = rgb2hsl(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      l = Math.min(1, Math.max(0, (l - .5) * o.contrast + .5)); s = Math.min(1, s * o.sat);
      const [r, g, b] = hsl2rgb(h, s, l);
      d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; L[i] = .299 * r + .587 * g + .114 * b;
    }
    if (o.sharpen > 0) {
      const T = new Float32Array(n);
      for (let Y = 0; Y < H; Y++) for (let X = 0; X < N; X++) {
        let s = 0, k = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = X + dx, yy = Y + dy; if (xx >= 0 && xx < N && yy >= 0 && yy < H) { s += L[yy * N + xx]; k++; } }
        T[Y * N + X] = s / k;
      }
      for (let i = 0; i < n; i++) { const df = (L[i] - T[i]) * o.sharpen; for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.max(0, Math.min(255, d[i * 4 + k] + df)); }
    }

    // 팔레트 (k-means)
    const P = [];
    for (let i = 0; i < n; i++) if (alpha[i]) P.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    let pal = [];
    if (P.length) {
      pal = [P[P.length >> 1]];
      while (pal.length < o.colors) {
        let bi = 0, bd = -1;
        for (let i = 0; i < P.length; i += 3) { let m = 1e9; for (const c of pal) { const e = (P[i][0] - c[0]) ** 2 + (P[i][1] - c[1]) ** 2 + (P[i][2] - c[2]) ** 2; if (e < m) m = e; } if (m > bd) { bd = m; bi = i; } }
        pal.push(P[bi]);
      }
      for (let it = 0; it < 8; it++) {
        const S = pal.map(() => [0, 0, 0, 0]);
        for (const p of P) { let bi = 0, bd = 1e9; pal.forEach((c, j) => { const e = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (e < bd) { bd = e; bi = j; } }); S[bi][0] += p[0]; S[bi][1] += p[1]; S[bi][2] += p[2]; S[bi][3]++; }
        pal = pal.map((c, j) => S[j][3] ? [S[j][0] / S[j][3], S[j][1] / S[j][3], S[j][2] / S[j][3]] : c);
      }
      pal = pal.map(c => c.map(Math.round));
    }
    const res = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
      if (!alpha[i]) continue;
      let col, bd = 1e9;
      for (const c of pal) { const e = (d[i * 4] - c[0]) ** 2 + (d[i * 4 + 1] - c[1]) ** 2 + (d[i * 4 + 2] - c[2]) ** 2; if (e < bd) { bd = e; col = c; } }
      res[i * 4] = col[0]; res[i * 4 + 1] = col[1]; res[i * 4 + 2] = col[2]; res[i * 4 + 3] = 255;
    }
    if (o.outline) {
      const edge = [];
      for (let Y = 0; Y < H; Y++) for (let X = 0; X < N; X++) {
        const i = Y * N + X; if (!alpha[i]) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const xx = X + a, yy = Y + b; return xx < 0 || yy < 0 || xx >= N || yy >= H || !alpha[yy * N + xx]; })) edge.push(i);
      }
      edge.forEach(i => { res[i * 4] = INK[0]; res[i * 4 + 1] = INK[1]; res[i * 4 + 2] = INK[2]; });
    }
    const out = document.createElement('canvas'); out.width = N; out.height = H;
    out.getContext('2d').putImageData(new ImageData(res, N, H), 0, 0);
    return out;
  }

  window.dotify = dotify;
})();
