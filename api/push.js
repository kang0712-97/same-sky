// 알림 보내기: 보낸 사람이 사진·쪽지·목소리·하트를 보낼 때 앱이 호출한다. 상대의 알림 구독은 DB 함수(토큰 검증)에서만 받아 온다.
// 비밀 키(VAPID_PRIVATE)는 Vercel 환경변수에만 둔다. 알림 문구는 여기서 고정해 만들므로 사용자 입력 글이 그대로 실리지 않는다(이름만 포함).
const webpush = require('web-push');
const SUPABASE_URL = 'https://ipffpbrdlvyabvhjzfdm.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY || require('./_anon.js');
const ORIGINS = ['https://same-sky-hazel.vercel.app', 'https://kang0712-97.github.io'];
const hits = new Map(); const LIMIT = 40, WINDOW = 60 * 1000;   // 커플 코드별 분당 호출 제한(악용 완화)
const TEXT = { photo: '사진을 보냈어요', note: '쪽지를 붙였어요', voice: '목소리 쪽지를 보냈어요', heart: '내 사진에 하트를 보냈어요' };

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  if (ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!process.env.VAPID_PRIVATE || !process.env.VAPID_PUBLIC) return res.status(503).json({ error: 'no_key' });
  try {
    const { code, slot, token, kind } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!/^[A-Za-z0-9]{6,8}$/.test(code || '') || !['a', 'b'].includes(slot) || typeof token !== 'string' || token.length < 16 || token.length > 200 || !TEXT[kind]) return res.status(400).json({ error: 'bad_request' });
    const now = Date.now(), key = code.toUpperCase(), list = (hits.get(key) || []).filter(t => now - t < WINDOW);
    if (list.length >= LIMIT) return res.status(429).json({ error: 'limit' });
    list.push(now); hits.set(key, list); if (hits.size > 500) for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW)) hits.delete(k);

    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/ss_partner_push', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + ANON }, body: JSON.stringify({ p_code: code, p_slot: slot, p_token: token }) });
    if (!r.ok) return res.status(r.status === 400 ? 403 : 502).json({ error: 'auth' });
    const row = await r.json();
    if (!row || !row.sub) return res.status(204).end();   // 상대가 알림을 켜지 않음
    webpush.setVapidDetails('https://same-sky-hazel.vercel.app', process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);
    const name = String(row.from || '상대').replace(/[\r\n]/g, ' ').slice(0, 20);
    await webpush.sendNotification(row.sub, JSON.stringify({ title: '같은 하늘', body: name + '님이 ' + TEXT[kind], tag: kind }), { TTL: 3600, urgency: 'normal' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    const code = e && e.statusCode;
    if (code === 404 || code === 410) return res.status(200).json({ ok: false, gone: true });   // 만료된 구독
    console.error('push', code || '', e && e.message);
    return res.status(500).json({ error: 'server' });
  }
};
