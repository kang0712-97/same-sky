#!/usr/bin/env python3
"""GPT 파츠 시트(assets/incoming/parts) → 게임용 레이어 PNG(assets/parts/f).
모든 레이어는 220x240 캔버스(figure 134px, 발 y=216, 가운데 x=110)라 겹치기만 하면 된다.
사용: python3 scripts/build-parts.py   (여자 몸 기준 최소 버전)
"""
import json, os
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
IN = os.path.join(ROOT, 'assets', 'incoming', 'parts')
OUT = os.path.join(ROOT, 'assets', 'parts', 'f')
W, H, FIG, FEET, CX = 220, 240, 134, 216, 110
SKIN = (252, 206, 175)
os.makedirs(OUT, exist_ok=True)


def isgreen(p): r, g, b = p[:3]; return g > 150 and g > r + 60 and g > b + 60
def ismag(p): r, g, b = p[:3]; return r > 170 and b > 150 and g < 120
def isgray(p): r, g, b = p[:3]; return abs(r - g) < 14 and abs(g - b) < 16 and 110 < g < 205
def isskin(p): r, g, b = p[:3]; return r > 200 and 150 < g < 220 and 120 < b < 200 and r > g > b
def nongreen(p): return not isgreen(p) and not ismag(p)


def rgba(img, drop):
    img = img.convert('RGB'); w, h = img.size; px = img.load()
    o = Image.new('RGBA', (w, h)); op = o.load()
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if not drop(p): op[x, y] = p + (255,)
    return o


def grid(img):
    """자주색 구분선으로 칸 수를 센다."""
    w, h = img.size; px = img.convert('RGB').load()
    cols = [x for x in range(w) if sum(ismag(px[x, y]) for y in range(0, h, 8)) > h / 8 * 0.5]
    rows = [y for y in range(h) if sum(ismag(px[x, y]) for x in range(0, w, 8)) > w / 8 * 0.5]
    def n(lines, size):
        groups = []
        for v in lines:
            if not groups or v - groups[-1][-1] > 3: groups.append([v])
            else: groups[-1].append(v)
        return 1 + len([g for g in groups if 20 < g[0] < size - 20])
    return n(cols, w), n(rows, h)


def cells(path):
    im = Image.open(path).convert('RGB'); w, h = im.size; cols, rows = grid(im)
    cw, ch = w // cols, h // rows
    for i in range(cols * rows):
        c, r = i % cols, i // cols
        yield i, im.crop((c * cw + 10, r * ch + 10, (c + 1) * cw - 10, (r + 1) * ch - 10))


def bbox_of(img, fn):
    px = img.load(); w, h = img.size; xs = []; ys = []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if fn(px[x, y]): xs.append(x); ys.append(y)
    return (min(xs), min(ys), max(xs), max(ys)) if xs else None


def widths(img, fn):
    w, h = img.size; px = img.load(); out = []
    for y in range(0, h, 2):
        xs = [x for x in range(0, w, 2) if fn(px[x, y])]
        out.append((y, (max(xs) - min(xs)) if xs else 0, (max(xs) + min(xs)) / 2 if xs else 0))
    return out


def neck(img, fn, lo, hi):
    ws = widths(img, fn); n = len(ws)
    cand = [t for i, t in enumerate(ws) if n * lo < i < n * hi and t[1] > 0]
    return min(cand, key=lambda t: t[1])


# ── 기준 몸(여자) ──
base = Image.open(os.path.join(IN, 'guides', 'base-girl.png')).convert('RGB')
base_rgba = rgba(base, isgreen)
BX0, BY0, BX1, BY1 = base_rgba.getbbox()
BCX = (BX0 + BX1) / 2
G = FIG / (BY1 - BY0)
TOP_Y = FEET - FIG
base_headcx = sum(x for y in range(BY0, BY0 + 50) for x in range(base.size[0]) if nongreen(base.getpixel((x, y)))) / \
    sum(1 for y in range(BY0, BY0 + 50) for x in range(base.size[0]) if nongreen(base.getpixel((x, y))))
bn = neck(base, isskin, 0.22, 0.33)  # (y, w, cx) 목
bhead_w = max(w for y, w, cx in widths(base, isskin) if y < bn[0] and w > 0)
bh = Image.open(os.path.join(IN, 'guides', 'blankhead-girl.png')).convert('RGB')
gn = neck(bh, isskin, 0.35, 0.75)
ghead_w = max(w for y, w, cx in widths(bh, isskin) if y < gn[0] and w > 0)
c0 = next(c for i, c in cells(os.path.join(IN, 'tops', 'T1.png')) if i == 0)
gb = bbox_of(c0, isgray)
S_FULL = (BY1 - BY0) / (gb[3] - gb[1])
EYE_DROP = 45  # 눈을 앞머리 아래로 내리는 양(기준 몸 픽셀)
S_HEAD = 1.2090724  # 머리 시트(눈 E1 구판 기준) → 기준 몸 배율


def put(lay, s, cell_pt, base_pt):
    """lay(RGBA) 의 cell_pt 가 기준 몸의 base_pt 에 오도록 220x240 캔버스로 변환."""
    f = s * G
    u0 = CX + (base_pt[0] - BCX) * G
    v0 = TOP_Y + (base_pt[1] - BY0) * G
    X0 = cell_pt[0] - u0 / f; Y0 = cell_pt[1] - v0 / f
    M = int(max(0, -X0, -Y0, X0 + W / f - lay.size[0], Y0 + H / f - lay.size[1])) + 4
    pad = Image.new('RGBA', (lay.size[0] + 2 * M, lay.size[1] + 2 * M)); pad.paste(lay, (M, M))
    x0 = X0 + M; y0 = Y0 + M
    box = (x0, y0, x0 + W / f, y0 + H / f)
    out = pad.convert('RGBa').resize((W, H), Image.BOX, box=box).convert('RGBA')
    return out


def clean(img, colors, thr=128):
    a = img.split()[3].point(lambda v: 255 if v >= thr else 0)
    if not a.getbbox(): return None
    q = img.convert('RGB').quantize(colors, method=Image.MEDIANCUT).convert('RGB')
    r = q.convert('RGBA'); r.putalpha(a)
    return r


def outline(img, dark=0.42):
    px = img.load(); o = img.copy(); op = o.load()
    for y in range(H):
        for x in range(W):
            if px[x, y][3]: continue
            ns = [px[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                  if 0 <= x + dx < W and 0 <= y + dy < H and px[x + dx, y + dy][3]]
            if ns:
                r = sum(n[0] for n in ns) / len(ns); g = sum(n[1] for n in ns) / len(ns); b = sum(n[2] for n in ns) / len(ns)
                op[x, y] = (int(r * dark), int(g * dark), int(b * dark), 255)
    return o


def full_layer(c):
    gm = bbox_of(c, isgray)
    if not gm: return None
    top = gm[1]
    px = c.load(); xs = [x for y in range(top, top + 40) for x in range(c.size[0]) if isgray(px[x, y])]
    cx = sum(xs) / len(xs)
    lay = rgba(c, lambda p: isgreen(p) or ismag(p) or isgray(p))
    return put(lay, S_FULL, (cx, top), (base_head_cx_full, BY0))


base_head_cx_full = base_headcx


def eyes_layer(c):
    w, h = c.size; px = c.load()
    m = Image.new('L', (w, h)); mp = m.load()
    for y in range(h):
        for x in range(w):
            if nongreen(px[x, y]): mp[x, y] = 255
    ws = widths(c, nongreen)
    top = [y for y, wd, cx in ws if wd > 0][0]
    n = neck(c, nongreen, 0.2, 0.75)
    hw = max(wd for y, wd, cx in ws if y < n[0] and wd > 0)
    inner = m.filter(ImageFilter.MinFilter(21)); ip = inner.load()
    lay = Image.new('RGBA', (w, h)); lp = lay.load()
    for y in range(h):
        for x in range(w):
            if ip[x, y] and not isskin(px[x, y]): lp[x, y] = px[x, y] + (255,)
    cxh = [cx for y, wd, cx in ws if y == top + 40][0]
    s = bhead_w / hw
    return put(lay, s, (cxh, top), (base_headcx, BY0 + EYE_DROP))


def hair_layer(c):
    # 머리 시트의 마네킹 위치는 칸마다 같으므로 고정 기준점(HF1 두 번째 칸의 목)을 쓴다
    lay = rgba(c, lambda p: isgreen(p) or ismag(p) or isgray(p))
    return put(lay, S_HEAD, (181, 316), (bn[2], bn[0]))


def body_layer():
    # 속옷을 걷어 낸 단색 몸: 기준 몸의 윤곽을 피부색으로 채움
    sil = Image.new('RGBA', base.size)
    bp = base.load(); sp = sil.load()
    for y in range(base.size[1]):
        for x in range(base.size[0]):
            if nongreen(bp[x, y]): sp[x, y] = SKIN + (255,)
    # 불투명 영역을 안쪽 1칸 침식 방지용으로 약간 닫아 구멍(윤곽선 틈) 메움
    a = sil.split()[3].filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)); sil.putalpha(a)
    return put(sil, 1.0, (0, 0), (0, 0))


manifest = {'w': W, 'h': H, 'skin': '#%02x%02x%02x' % SKIN, 'order': ['body', 'shoes', 'bottom', 'top', 'one', 'hair', 'eyes'], 'kinds': {}}


def add(kind, pid, img, recolor=None):
    fn = '%s-%s.png' % (kind, pid)
    img.save(os.path.join(OUT, fn))
    e = {'id': '%s-%s' % (kind, pid), 'file': 'f/' + fn}
    if recolor: e['recolor'] = recolor
    manifest['kinds'].setdefault(kind, []).append(e)


# 몸
b = clean(body_layer(), 8)
b = outline(b)
b.save(os.path.join(OUT, 'body.png'))
manifest['body'] = 'f/body.png'

SHEETS = [
    ('top', 'tops', ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'], full_layer, 18),
    ('bottom', 'bottoms', ['B1', 'B2', 'B3', 'B4'], full_layer, 18),
    ('shoes', 'shoes', ['SH1', 'SH2', 'SH3'], full_layer, 18),
    ('one', 'onepiece', ['O1', 'O2', 'O3'], full_layer, 20),
    ('hair', 'hair-f', ['HF1', 'HF2', 'HF3'], hair_layer, 14),
    ('eyes', 'eyes', ['E1', 'E2'], eyes_layer, 6),
]
for kind, folder, names, fn, ncol in SHEETS:
    for name in names:
        path = os.path.join(IN, folder, name + '.png')
        if not os.path.exists(path): continue
        for i, c in cells(path):
            lay = fn(c)
            if lay is None: continue
            lay = clean(lay, ncol, 40 if kind == 'eyes' else 128)
            if lay is None: continue
            if kind == 'eyes':   # 게임 크기에서 사라지지 않게 눈 색을 진하게 고정
                lp = lay.load()
                for yy in range(H):
                    for xx in range(W):
                        r, g, b, a = lp[xx, yy]
                        if a and 0.299 * r + 0.587 * g + 0.114 * b < 150: lp[xx, yy] = (36, 26, 22, 255)
            if kind != 'eyes': lay = outline(lay)
            add(kind, '%s_%d' % (name, i), lay, 'hair' if kind == 'hair' else None)
        print(kind, name, 'ok')

json.dump(manifest, open(os.path.join(ROOT, 'assets', 'parts', 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
print({k: len(v) for k, v in manifest['kinds'].items()})
