// 알림(웹 푸시)용 서명 키를 만들어 Vercel 환경변수에 넣고, 공개 키는 src/config.js 에 적습니다. (처음 한 번만 실행)
// 실행: node scripts/setup-push.mjs   (같은 폴더에서, Vercel CLI 로그인 상태)
// 비밀 키는 화면이나 파일에 남기지 않고 Vercel 에만 저장됩니다. 이미 키가 있으면 지우고 새로 만들지 않도록 멈춥니다.
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
const require = createRequire(import.meta.url);
const webpush = require('web-push');
const cfgPath = new URL('../src/config.js', import.meta.url);
let cfg = fs.readFileSync(cfgPath, 'utf8');
if (/vapid:\s*"[^"]{20,}"/.test(cfg)) { console.log('이미 공개 키가 설정돼 있어요. 키를 바꾸면 기존 알림 구독이 모두 끊기므로 멈춥니다.'); process.exit(0); }
const { publicKey, privateKey } = webpush.generateVAPIDKeys();
const add = (name, value) => {
  const r = spawnSync('npx', ['--yes', 'vercel@latest', 'env', 'add', name, 'production'], { input: value, encoding: 'utf8' });
  if (r.status !== 0) { console.error(name + ' 저장 실패:\n' + (r.stderr || r.stdout)); process.exit(1); }
  console.log('Vercel 환경변수 저장: ' + name);
};
add('VAPID_PRIVATE', privateKey);
add('VAPID_PUBLIC', publicKey);
cfg = /vapid:\s*"[^"]*"/.test(cfg) ? cfg.replace(/vapid:\s*"[^"]*"/, `vapid: "${publicKey}"`) : cfg.replace(/\s*};?\s*$/, `, vapid: "${publicKey}" };\n`);
fs.writeFileSync(cfgPath, cfg);
console.log('src/config.js 에 공개 키를 적었어요. 이제 커밋하고 배포하면 알림을 켤 수 있어요.');
