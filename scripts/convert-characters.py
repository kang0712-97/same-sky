# GPT가 만든 큰 캐릭터(투명 배경) → 앱용 스프라이트 (220x240, 키 134px, 발 y=216, 색 28가지 이내)
# 사용: python3 scripts/convert-characters.py   (입력 assets/incoming/characters/[gb]NN.png, 출력 assets/characters/v2/)
import glob, os, statistics
from PIL import Image
SRC, OUT = 'assets/incoming/characters', 'assets/characters/v2'
W, H, FIG, FEET, COLORS = 220, 240, 134, 216, 28
os.makedirs(OUT, exist_ok=True)
items = []
for f in sorted(glob.glob(SRC + '/[gb][0-9][0-9].png')):
    im = Image.open(f).convert('RGBA'); bb = im.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()
    items.append((os.path.basename(f), im.crop(bb)))
k = FIG / statistics.median(i.height for _, i in items)   # 모두 같은 배율(키 차이는 그대로 보존)
for name, fig in items:
    w, h = max(1, round(fig.width * k)), max(1, round(fig.height * k))
    r = fig.resize((w, h), Image.BOX)
    a = r.split()[3].point(lambda v: 255 if v >= 128 else 0)
    q = r.convert('RGB').quantize(colors=COLORS, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGBA'); q.putalpha(a)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.alpha_composite(q, ((W - w) // 2, FEET - h))
    c.save(os.path.join(OUT, name), optimize=True); print(name, (w, h), os.path.getsize(os.path.join(OUT, name)))
