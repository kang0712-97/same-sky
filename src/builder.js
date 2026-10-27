// "직접 만들기" 캐릭터: 얼굴형·머리·눈·눈썹·수염·상의·하의를 픽셀 지도로 조립 (좌우 대칭: 왼쪽 11칸만 적고 거울로 복사)
(function () {
  const OX = 44, OY = 42, INK = '#1f2420';
  const PAL = { S: '#e9b48f', s: '#d49a74', H: '#262425', h: '#312e2f', T: '#5a7fa8', t: '#46678b', B: '#4a4f63', b: '#3b3f50', F: '#f4f1ea', f: '#c9c2b3', W: '#f4efe6', K: INK };
  const row = L => { L = (L + '...........').slice(0, 11); return L + [...L].reverse().join(''); };

  const FACE = {
    round: { 6: [8, 13], 7: [7, 14], 8: [7, 14], 9: [7, 14], 10: [7, 14], 11: [7, 14], 12: [7, 14], 13: [7, 14], 14: [7, 14], 15: [8, 13], 16: [8, 13], 17: [9, 12] },
    oval: { 6: [8, 13], 7: [8, 13], 8: [7, 14], 9: [7, 14], 10: [7, 14], 11: [7, 14], 12: [7, 14], 13: [7, 14], 14: [8, 13], 15: [8, 13], 16: [9, 12], 17: [10, 11] },
    square: { 6: [7, 14], 7: [7, 14], 8: [7, 14], 9: [7, 14], 10: [7, 14], 11: [7, 14], 12: [7, 14], 13: [7, 14], 14: [7, 14], 15: [7, 14], 16: [8, 13], 17: [8, 13] }
  };
  const side = (from, to, L) => { const o = []; for (let y = from; y <= to; y++) o.push(L); return o; };
  const HAIR = {   // [시작 줄, 왼쪽 11칸 지도들], extra: 비대칭 점 [x, y]
    crop: [1, ['........###', '......#####', '.....######', '.....######', '.....##h###', '.....######', '.....######', '.....######', '......#....', '......#....', '......#....']],
    buzz: [2, ['.......####', '......#####', '......#####', '.....######', '.....#.....']],
    bob: [1, ['........###', '.....######', '....#######', '....#######', '....##h####', '....#######', '....#######', '....#######', ...side(9, 15, '....##.....'), '....###....']],
    long: [1, ['........###', '.....######', '....#######', '...########', '...##h#####', '...########', '...########', '...########', ...side(9, 20, '...####....'), ...side(21, 25, '...###.....'), '....##.....']],
    wave: [1, ['........###', '....#######', '...########', '..#########', '..#h#######', '..#########', '..#########', '...########', ...side(9, 14, '..####.....'), '..####.....', '..###......', '...##......']],
    curly: [0, ['........###', '.....######', '....#######', '...########', '..#########', '..#h#######', '..#########', '..#########', '..#########', ...side(9, 14, '..####.....'), '..###......']],
    spiky: [-1, ['.......#..#', '......#####', '.....######', '.....######', '.....######', '.....##h###', '.....######', '.....######', '.....#.#...', '......#....']],
    ponytail: [1, ['........###', '......#####', '.....######', '.....######', '.....##h###', '.....######', '.....######', '.....######', '......#....', '......#....', '......#....'],
      [[16, 7], [17, 7], [16, 8], [17, 8], [17, 9], [18, 9], [17, 10], [18, 10], [17, 11], [18, 11], [17, 12], [18, 12], [17, 13], [18, 13], [17, 14], [18, 14], [18, 15], [17, 15], [17, 16]]],
    bun: [1, ['........###', '......#####', '.....######', '.....######', '.....##h###', '.....######', '.....######', '.....######', '......#....', '......#....', '......#....'],
      [[9, -1], [10, -1], [11, -1], [12, -1], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0], [9, -2], [10, -2], [11, -2], [12, -2]]]
  };
  const TOPS = {   // 20줄부터. T 상의 t 그림자 S/s 피부 W 속옷 K 먹선
    tee: ['......TTTss', '....TTTTTTT', '...TTTTTTTT', '...TTTTTTTT', '...TTTTTTTT', '...TTtTTTTT', '...TTtTTTTT', '...SSKTTTTT', '...SSKTTTTT', '...SSKTTTTT', '...SSKTTTTT', '...SSKTTTTT', '...SSKTTTTT', '...SSKTTTTT', '...SSKTTTTT', '...SSKTTTTT', '...SSKTTTTT', '...SSKtTTTT', '......TTTTT'],
    hoodie: ['....TTTtsss', '....TTTTTWT', '...TTTTTTWT', '...TTTTTTTT', '...TTTTTTTT', '...TTTTTTTT', '...TTTTTTTT', '...TTKTTTTT', '...TTKTTTTT', '...TTKTTTTT', '...TTKTTTTT', '...TTKTTTTT', '...TTKTTTTT', '...TTKKKKKK', '...ttKTTTTT', '...SSKTTTTT', '...SSKTTTTT', '...SSKtTTTT', '......TTTTT'],
    jacket: ['......TTTss', '....TTTTTKW', '...TTTTTTKW', '...TTTTTTKW', '...TTTTTTKW', '...TTTTTTKW', '...TTTTTTKW', '...TTKTTTKW', '...TTKTTTKW', '...TTKTTTKW', '...TTKTTTKW', '...TTKTTTKW', '...TTKTTTKW', '...TTKTTTKW', '...ttKTTTKW', '...SSKTTTKW', '...SSKTTTKW', '...SSKtTTKW', '......TTTTT'],
    sweater: ['......TTTTT', '....TTTTTTT', '...TTTTTTTT', '...TTTTTTTT', '...TTTTTTTT', '...TTTTtTTT', '...TTTTTTTT', '...TTKTTtTT', '...TTKTTTTT', '...TTKTTTTT', '...TTKTTTtT', '...TTKTTTTT', '...TTKTTTTT', '...TTKTTTTT', '...ttKTTTTT', '...SSKTTTTT', '...SSKTTTTT', '...SSKtTTTT', '......TTTTT']
  };
  const TOP_NECK = { sweater: [['.........tt'], ['.........tt']] };   // 18·19줄 (터틀넥)
  const LEG = (c1, c2) => { const o = []; for (let y = 46; y <= 59; y++) o.push([y, '......' + c1 + c1 + c1 + c1 + '.']); return o; };
  function bottoms(kind) {   // [줄, 왼쪽 11칸]
    const hip = [[38, '......bbbbb'], [39, '......BBBBB'], [40, '......BBBBB'], [41, '......BBBBB'], [42, '......BBBBB'], [43, '......BBBBB'], [44, '......BBBBB'], [45, '......BBBBB']];
    if (kind === 'skirt') { const o = [[38, '......bbbbb'], [39, '......BBBBB'], [40, '......BBBBB']]; for (let y = 41; y <= 51; y++) o.push([y, '....BBBBBBB']); o.push([52, '....bbbbbbb']); for (let y = 53; y <= 59; y++) o.push([y, '......SSSS.']); return o; }
    if (kind === 'shorts') { const o = hip.slice(); for (let y = 46; y <= 52; y++) o.push([y, '......BBBB.']); o.push([53, '......bbbb.']); for (let y = 54; y <= 59; y++) o.push([y, '......SSSS.']); return o; }
    return hip.concat(LEG('B'), [[46, '......BBBB.']].slice(0, 0));
  }
  const EYES = { dot: [[8, 12]], tall: [[8, 11], [8, 12]], sleepy: [[7, 12], [8, 12]], happy: [[7, 12], [8, 11], [9, 12]] };
  const BROWS = { flat: [[7, 10], [8, 10]], thick: [[7, 10], [8, 10], [9, 10], [7, 9]], sad: [[7, 11], [8, 10], [9, 10]] };
  const BEARD = {
    mustache: [[9, 14], [10, 14], [11, 14], [12, 14]],
    goatee: [[9, 16], [10, 16], [11, 16], [12, 16], [10, 17], [11, 17], [9, 15], [12, 15]],
    full: [[7, 14], [8, 14], [13, 14], [14, 14], [9, 14], [10, 14], [11, 14], [12, 14], [8, 15], [9, 15], [10, 15], [11, 15], [12, 15], [13, 15], [8, 16], [9, 16], [10, 16], [11, 16], [12, 16], [13, 16], [9, 17], [10, 17], [11, 17], [12, 17]]
  };

  function build(av) {
    const c = document.createElement('canvas'); c.width = 110; c.height = 120; const x = c.getContext('2d');
    const px = (lx, ly, ch) => { if (ch === '.' || !PAL[ch]) return; x.fillStyle = PAL[ch]; x.fillRect(OX + lx, OY + ly, 1, 1); };
    const ink = (lx, ly) => px(lx, ly, 'K');
    const mirror = (lx, ly, ch) => { px(lx, ly, ch); px(21 - lx, ly, ch); };
    // 1) 목 · 얼굴
    for (let y = 18; y <= 19; y++) for (let lx = 9; lx <= 12; lx++) px(lx, y, 's');
    const shape = FACE[av.faceShape] || FACE.round;
    Object.keys(shape).forEach(y => { for (let lx = shape[y][0]; lx <= shape[y][1]; lx++) px(lx, +y, 'S'); });
    mirror(6, 12, 's'); mirror(6, 13, 's');   // 귀
    // 2) 몸
    const top = TOPS[av.topStyle] || TOPS.tee;
    top.forEach((L, i) => row(L).split('').forEach((ch, lx) => px(lx, 19 + 1 + i, ch)));
    if (av.topStyle === 'sweater') for (let y = 18; y <= 19; y++) for (let lx = 9; lx <= 12; lx++) px(lx, y, y === 18 ? 't' : 'T');
    bottoms(av.bottomStyle).forEach(([y, L]) => row(L).split('').forEach((ch, lx) => px(lx, y, ch)));
    for (let y = 60; y <= 64; y++) row(y === 64 ? '....ffffff.' : '....FFFFFF.').split('').forEach((ch, lx) => px(lx, y, ch));
    // 3) 얼굴 표정
    (EYES[av.eyes] || EYES.dot).forEach(([a, b]) => mirror(a, b, 'K'));
    if (av.brows !== 'none') (BROWS[av.brows] || BROWS.flat).forEach(([a, b]) => mirror(a, b, 'H'));
    (BEARD[av.beard] || []).forEach(([a, b]) => px(a, b, 'H'));
    // 4) 머리카락
    const hs = HAIR[av.hairStyle] || HAIR.crop;
    hs[1].forEach((L, i) => row(L).split('').forEach((ch, lx) => px(lx, hs[0] + i, ch === '#' ? 'H' : ch === 'h' ? 'h' : '.')));
    (hs[2] || []).forEach(([a, b]) => px(a, b, 'H'));
    // 5) 먹색 외곽선
    const id = x.getImageData(0, 0, 110, 120), d = id.data, add = [];
    const op = (a, b) => a >= 0 && b >= 0 && a < 110 && b < 120 && d[(b * 110 + a) * 4 + 3] > 0;
    for (let b = 0; b < 120; b++) for (let a = 0; a < 110; a++) if (!op(a, b) && (op(a + 1, b) || op(a - 1, b) || op(a, b + 1) || op(a, b - 1))) add.push([a, b]);
    add.forEach(([a, b]) => { const i = (b * 110 + a) * 4; d[i] = 31; d[i + 1] = 36; d[i + 2] = 32; d[i + 3] = 255; });
    x.putImageData(id, 0, 0);
    return c;
  }
  window.SSBuilder = { build, ORIGIN: [OX, OY], H: 66 };
})();
