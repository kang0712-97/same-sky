# Same Sky (같은 하늘) — 작업 지침

장거리 연애 커플이 서로 다른 도시의 **실제 시간·날씨·달**을 한 화면에서 보고, 하루 3장 사진·쪽지·하트로 "일상이 연결된 기분"을 느끼게 하는 도트 스타일 웹앱. AI 활용 교육 실습(API 1개 이상 + git) 시연용.

**새 작업을 시작하기 전에 [docs/HANDOFF.md](docs/HANDOFF.md)를 먼저 읽는다.** (현재 상태, 결정 사항, 함정, 테스트 방법, 다음 할 일이 전부 거기 있다. 이 파일은 요약.)

## 지켜야 할 것
- 사용자와는 **한국어**로 대화. 결과 보고는 짧게, 확인한 것과 못 한 것을 구분해서.
- 정적 사이트(빌드 없음): `index.html` + `src/*.js` + `assets/`. 프레임워크·번들러 도입 금지.
- **큰 파일을 통째로 읽지 말 것**: `src/assets.js`(40KB 데이터 URL), `assets/characters/*-green-original.png`. `grep`/`head -c`로만 본다. `src/app.js`는 한 줄이 긴 편이라 `sed -n 'a,bp' | cut -c1-200` 로 구간만.
- `Edit`이 "파일이 수정됨"으로 거부되면 해당 파일을 다시 `Read`한 뒤 시도.
- 화면에 **사용자 입력/서버 값을 넣을 땐 innerHTML 금지** (textContent / createElement). 이미 XSS 사고 있었음.
- 한글 입력 Enter는 `enterKey()` 헬퍼 사용 (IME 조합 중 중복 제출 버그).
- 사용자 승인 없이 **서버 데이터를 만들지 말 것**. 서버 확인은 `scripts/check-supabase.mjs`(읽기 전용) 또는 테스트 커플 `BE01AB`만.
- 사용자가 명시적으로 제외한 것: **캐릭터 마주 보기, "상대가 자는 시간" 상태 문구** (다시 제안하지 말 것, 사용자가 꺼내면 진행).
- 커밋 메시지는 한국어, 끝에 `Co-Authored-By: Claude ... <noreply@anthropic.com>`.

## 배포 (둘 다 main 푸시/명령으로)
- GitHub: `kang0712-97/same-sky` → Pages https://kang0712-97.github.io/same-sky/ (push하면 자동)
- Vercel: `npx --yes vercel@latest deploy --prod --yes` (CLI는 kang0712-97 로그인됨. Vercel MCP는 팀 권한이 없어 쓰지 말 것) → https://same-sky-hazel.vercel.app
- **DB 스키마(`supabase/schema.sql`)를 바꾸면 사용자가 Supabase SQL Editor에서 직접 Run 해야 한다.** (에이전트는 DB 권한·클립보드 없음) → 바꾼 뒤 `node scripts/check-supabase.mjs BE01AB` 로 적용 확인.
