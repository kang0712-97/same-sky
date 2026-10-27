// 서버(Supabase)에 schema.sql 이 어디까지 적용됐는지 점검합니다.  실행: node scripts/check-supabase.mjs
// 데이터는 만들지 않고, 존재하지 않는 코드·사진 ID로만 호출합니다. (읽기 전용 점검)
import fs from 'fs';
const src = fs.readFileSync(new URL('../src/config.js', import.meta.url), 'utf8');
const url = src.match(/url: "([^"]+)"/)[1], key = src.match(/anonKey: "([^"]+)"/)[1];
const H = { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + key };
const rpc = async (n, a = {}) => { const r = await fetch(`${url}/rest/v1/rpc/${n}`, { method: 'POST', headers: H, body: JSON.stringify(a) }); const t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = t } return { ok: r.ok, body: j, msg: typeof j === 'object' ? (j.message || '') : String(j) }; };
const missing = m => /Could not find the function|schema cache|PGRST202/.test(m);
const Z = 'ZZZZZZ', U = '00000000-0000-0000-0000-000000000000';
const checks = [
  ['기본 함수 (ss_get_couple)', async () => (await rpc('ss_get_couple', { p_code: Z })).ok],
  ['변경 감지 (ss_state)  ← 2차 SQL', async () => (await rpc('ss_state', { p_code: Z })).ok],
  ['입력 검증 (ss_add_photo 형식 검사)  ← 2차 SQL', async () => { const r = await rpc('ss_add_photo', { p_code: Z, p_slot: 'a', p_local_date: 'x', p_caption: '', p_weather: '', p_data: 'x' }); return !r.ok && /no_couple|bad_date|bad_image/.test(r.msg) && !missing(r.msg); }],
  ['하트 함수 (ss_heart_photo)  ← 3차 SQL', async () => { const r = await rpc('ss_heart_photo', { p_code: Z, p_photo_id: U, p_slot: 'a' }); return !missing(r.msg); }],
  ['내 방 함수 (ss_save_room / ss_get_rooms)  ← 4차 SQL', async () => { const a = await rpc('ss_get_rooms', { p_code: Z }); const b = await rpc('ss_save_room', { p_code: Z, p_slot: 'a', p_room: {} }); return a.ok && !missing(b.msg); }],
];
let allOk = true;
for (const [name, fn] of checks) { let ok = false; try { ok = await fn(); } catch (e) { } allOk &&= ok; console.log((ok ? '✅ 적용됨   ' : '❌ 아직 없음 ') + name); }
// hearts 칸: 아무 사진 목록에서 확인 (테스트 커플 코드가 있으면)
const code = process.argv[2];
if (code) { const r = await rpc('ss_list_photos', { p_code: code }); const has = r.ok && r.body.length && 'hearts' in r.body[0]; console.log((has ? '✅ 적용됨   ' : (r.ok && !r.body.length ? '➖ 확인불가 (사진 없음)  ' : '❌ 아직 없음 ')) + 'hearts 칸 (ss_list_photos에 포함)  ← 3차 SQL'); allOk &&= !!has; }
console.log('\n' + (allOk ? '모두 적용되었습니다.' : '일부가 빠져 있습니다. 최신 supabase/schema.sql 전체를 SQL Editor에서 다시 Run 하세요.'));
