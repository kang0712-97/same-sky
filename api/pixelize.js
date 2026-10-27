// 사진 → 도트 캐릭터 변환 (OpenAI 이미지 편집). 키는 Vercel 환경변수 OPENAI_API_KEY 에만 둔다.
const ORIGINS = ['https://same-sky-hazel.vercel.app', 'https://kang0712-97.github.io'];
const hits = new Map();   // 인스턴스 메모리 기준의 가벼운 호출 제한 (악용 완화용, 정확한 한도는 OpenAI 콘솔의 월 한도로)
const LIMIT = 6, WINDOW = 60 * 60 * 1000;

const STYLE = 'Pixel art, low resolution, crisp square pixels, no anti-aliasing, no gradients, no blur. Limited palette of 8 colors max, dark ink outline (#1f2420), 1-pixel outline, simple clothing folds. ';
const PROMPTS = {
  full: STYLE + 'Turn the person in the photo into a cute chibi pixel-art character: full body, standing straight, facing front, centered, small proportions, calm half-lidded eyes. Keep their hairstyle, hair color, skin tone, glasses and outfit colors recognizable. Flat solid single-color background of pure #00ff00 green so it can be removed. No text.',
  face: STYLE + 'Turn the person in the photo into a pixel-art face portrait: head and shoulders, facing front, centered. Keep their hairstyle, hair color, skin tone and glasses recognizable. Flat solid cream background (#f7f1de). No text.'
};

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  if (ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'no_key' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown', now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  if (list.length >= LIMIT) return res.status(429).json({ error: 'limit' });
  list.push(now); hits.set(ip, list);
  if (hits.size > 500) for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW)) hits.delete(k);

  try {
    const { image, mode } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const m = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+\/=]+)$/.exec(image || '');
    if (!m || m[2].length > 3_000_000 || !PROMPTS[mode]) return res.status(400).json({ error: 'bad_request' });
    const form = new FormData();
    form.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1');
    form.append('prompt', PROMPTS[mode]);
    form.append('size', mode === 'full' ? '1024x1536' : '1024x1024');
    form.append('quality', process.env.OPENAI_IMAGE_QUALITY || 'medium');
    form.append('n', '1');
    form.append('image', new Blob([Buffer.from(m[2], 'base64')], { type: 'image/' + m[1] }), 'photo.' + (m[1] === 'png' ? 'png' : 'jpg'));
    const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.OPENAI_API_KEY }, body: form });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { console.error('openai', r.status, j && j.error && j.error.message); return res.status(502).json({ error: r.status === 400 ? 'rejected' : 'upstream' }); }
    const b64 = j.data && j.data[0] && j.data[0].b64_json;
    if (!b64) return res.status(502).json({ error: 'upstream' });
    res.status(200).json({ image: 'data:image/png;base64,' + b64 });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server' }); }
};
