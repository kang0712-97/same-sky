# Same Sky — 인수인계 (2026-10-27 기준)

새 채팅은 이 문서와 [CLAUDE.md](../CLAUDE.md), [README.md](../README.md), [planning.md](planning.md)만 읽으면 이어서 작업할 수 있다.

## 1. 현재 상태 한눈에
- **배포 완료·정상 동작**: https://same-sky-hazel.vercel.app (Vercel), https://kang0712-97.github.io/same-sky/ (Pages)
- **서버**: Supabase 프로젝트 `ipffpbrdlvyabvhjzfdm` (취소된 분실동물 프로젝트와 공용, `ss_` 접두사 테이블만 사용). 스키마 5단계 모두 적용 확인됨.
- **완료된 기능**: 각자 등록(이름·아바타 꾸미기·나라+도시) → 커플 코드 연결 → 두 하늘 나란히(실시간 시계·시차·Open-Meteo 날씨·달 위상·지구본) → 오늘의 사진(하루 3장, 촬영/선택, 도트 변환 옵션) → 사진함·쪽지함 → 사진 하트 → 새 소식 배너/토스트 → 체험 모드(서버 없이, 상대 예시 사진·쪽지 포함).
- **독립 감수 4관점(개발/UX/디자인/사용자) 완료**, 1·2단계 수정 완료. 3단계 미착수.

## 2. 구조 (자세한 것은 README)
| 파일 | 역할 |
|---|---|
| `index.html` | 모든 화면(view)이 한 파일. 등록→연결→홈→동네/사진함/쪽지함, 모달, 데모 컨트롤 |
| `src/app.js` | 상태·화면·흐름 전부. `localApi`(체험)/`SSApi`(서버)를 `api()`로 갈아끼움 |
| `src/api.js` | Supabase RPC fetch 래퍼 (SDK 없음). 오류 코드 `no_config/no_schema/limit/too_big/rpc` |
| `src/avatar.js` + `assets/characters/manifest.json` | 스프라이트 색 바꾸기·머리모양·소품·무늬를 **코드로** 그림 |
| `src/geo.js` | 나라/주요 도시 내장 데이터 + 부분일치 검색(+영문은 Open-Meteo Geocoding) |
| `src/globe.js` | 두 도시에 맞춰 지구본을 실시간 렌더 (정사영 + 간략 해안선 폴리곤) |
| `src/dotify.js` | 이미지→도트 변환 |
| `src/assets.js` | **생성물(40KB)**: 날씨 6종 배경·구름·눈비·달·하트·쪽지 아이콘 등 data URL. 읽지 말 것 |
| `supabase/schema.sql` | 테이블 4개(RLS로 anon 차단) + RPC 함수. 항상 "전체를 다시 Run" 가능(멱등) |
| `scripts/check-supabase.mjs` | 서버에 스키마가 어디까지 적용됐는지 점검 (읽기 전용) |

**주의**: `assets.js`를 만든 도트 생성 스크립트(파이썬)는 임시 폴더에 있었고 **유실됨**. 배경/아이콘을 바꾸려면 새 생성기를 짜거나 이미지 생성 도구를 써야 한다. 캐릭터 원본은 `assets/characters/*-green-original.png`(초록 배경) → 변환 결과 `girl.png/boy.png`(110×120 투명, 발이 y=108).

## 3. 핵심 설계 결정 (왜 이렇게 했나)
- **컨셉**: 도트(픽셀) 전부. 크림색(#f7f1de)+먹색(#1f2420) 레트로 창 프레임. 창 바깥 바탕은 두 도시의 하늘색 반반. 하늘은 날씨·시간 6종(밤·맑음·흐림·비·노을·눈). 폰트 Galmuri.
- **컬러 도트 캐릭터**(흑백 1비트 아님): 이미지 생성 → 초록 배경 제거 → 도트 변환. 변형(머리모양/소품)은 새 그림 없이 코드 가공.
- **연결 방식**: 로그인 없음. 6자리 hex "커플 코드" + slot(a/b). 테이블은 anon 접근 차단, `security definer` RPC로만 접근. (알려진 한계: 코드를 알면 사칭 가능 → 3단계 후보)
- **사진 저장**: 압축한 data URL을 DB text에 저장(≤700KB, 하루 3장은 서버가 `local_date`로 강제). Storage 미사용.
- **"오늘"** = 보낸 사람 도시 시간대 기준 날짜(`local_date`).
- **체험 모드**(`mode:'local'`): 서버 미사용, localStorage `samesky.v2`(상태) / `samesky.v2.local`(사진·쪽지). 상대 "무노·뉴욕"은 가상. 시연 안정성용.
- **지구본/지역 선택**: 나라 선택 → 도시는 선택(비우면 수도). 한글 도시는 내장 목록(약 100곳)만, 영문은 Open-Meteo Geocoding도 사용 (이 API는 한글 검색 미지원).
- **날씨 API**: Open-Meteo forecast(`current` + `daily sunrise/sunset`). `kindFrom()`이 6종으로 매핑, 밤이면 `veil`(어두운 덮개)로 흐림/비/눈도 밤처럼.
- 사용자 선호: **퀄리티 우선이되 시간 부족** — 최소 기능 먼저, 디자인(도트 감성)은 중요. 보고는 간결하게, 확인 못 한 것은 솔직히.

## 4. 알려진 함정 (이미 겪은 것)
1. **Edit/Write "수정됨" 거부**: 다른 도구로 파일이 바뀐 뒤엔 `Read` 후 재시도.
2. **innerHTML 금지**: 서버 값(`local_date`, 사진 data)로 저장형 XSS 재현됨 → `okImg/okDate/okProfile` 검증 + DOM 생성 사용 중.
3. **체험 모드 API는 데이터의 복사본을 반환**해야 변경 감지(`refresh`의 sig 비교)가 동작.
4. **IME**: 한글 Enter 중복 → `enterKey()`.
5. **에이전트는 클립보드 못 씀**. SQL은 사용자가 VS Code에서 `Cmd+A/C` → Supabase SQL Editor `Cmd+V` → Run. 사용자가 구버전을 복사하는 일이 잦아 **줄 수(현재 139줄)와 `ss_heart_photo` 검색**으로 최신 여부를 알려줄 것. 실행 후엔 반드시 `check-supabase.mjs`로 확인.
6. **Vercel MCP 사용 불가**(팀 권한 403) → CLI 사용.
7. **헤드리스 Chrome 최소 창 폭 500px** → 모바일(390px)은 iframe 폭으로 재현.
8. 이미지 생성/Higgsfield 크레딧 없음(0.5). 새 캐릭터는 사용자가 ChatGPT/Gemini로 만들어 주면 변환(프롬프트: `docs/character-prompts.md`).
9. 참고 이미지 5장(도트 캐릭터 시트 등)은 이전 세션 임시 폴더에 있었고 **유실**. 컨셉은 위 "설계 결정"에 요약됨.
10. 디자인 훅(impeccable)이 크림 팔레트·marquee·cramped 등을 지적함 → 크림/애니메이션은 의도된 것이라 `.impeccable/config.json`에 예외 등록(깃에는 안 올라감). 실제 버그(대비, 여백)는 고쳤음.

## 5. 테스트 방법 (토큰 절약 레시피)
**헤드리스 Chrome + iframe 하네스** (브라우저 확장 연결 없이 동작). 하네스 HTML(임시, 끝나면 삭제)이 `index.html`을 iframe으로 열고 스크립트로 조작, 결과를 `document.title`에 기록 → `--dump-dom`으로 한 줄 읽기.
```
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
python3 -m http.server 8123 &            # 프로젝트 폴더에서
"$CH" --headless=new --disable-gpu --hide-scrollbars --window-size=1000,1500 \
  --user-data-dir=<임시폴더> --virtual-time-budget=40000 \
  --screenshot=<png> --dump-dom "http://localhost:8123/_t.html#<시나리오>" | grep -o "<title>[^<]*</title>"
pkill -f "http.server 8123"
```
- **iframe은 반드시 `onload` 핸들러를 먼저 단 뒤 `src`를 설정** (순서 틀리면 결과가 비어 나옴).
- 체험 홈 바로 가기: localStorage `samesky.v2`에 `{"code":"DEMO","slot":"a","mode":"local","me":{"name":"유노","avatar":{"char":"girl"},"city":{"name":"서울","country":"","cc":"KR","lat":37.57,"lon":126.98,"tz":"Asia/Seoul","isCapital":true}}}`.
- **두 사용자 시뮬레이션**: `--user-data-dir`을 사용자마다 다르게(각자 localStorage 분리). A가 코드 생성 → 제목에서 코드 읽기 → B가 코드로 입장 → A 프로필로 다시 열어 확인.
- 사진 전송은 canvas→Blob→`DataTransfer`로 `#pFile`에 주입.
- 서버 규칙은 `node scripts/check-supabase.mjs BE01AB`. 쓰기 테스트는 테스트 커플 `BE01AB`에만.
- 스크린샷은 토큰이 비싸다: **제목 로그로 먼저 검증하고, 눈으로 볼 것만** `Read`.
- DB에 남은 테스트 커플: `ABCBF2`, `BE01AB`, `36A8FB`, `120EBD` 등 (시연 전 Table Editor에서 `ss_couples` 행 삭제하면 연쇄 삭제).

## 5.5 캐릭터 꾸미기 탭화 (2026-10-27)
등록 화면 아바타가 탭형(캐릭터/머리/얼굴/옷/소품) + 썸네일 격자. 새 옵션(전부 코드로 그림, `src/avatar.js` render): 입 5종, 볼터치/주근깨/점, 안경 3종, 목 소품(초커·나비넥타이·목걸이), 머리 소품(왕관·토끼귀·꽃핀·천사링). 얼굴 위치는 manifest의 `anchors.face`. avatar JSON에 `mouth/cheek/glasses(문자열)/neck` 키 추가(DB는 jsonb라 스키마 변경 없음).
**직접 만들기 캐릭터**(`src/builder.js`): 기존 2종(색만 변경) 외에 부품 조립형. 얼굴형3·머리9·눈4·눈썹4·수염4·피부색6·상의4·하의3을 픽셀 지도(왼쪽 11칸만 적고 거울 복사)로 그림 → `avatar.js render()`가 기존 색 바꾸기·소품·얼굴 오버레이를 그대로 적용(builder는 bbox 고정 원점 44,42). manifest의 `builder:true` 캐릭터, 앵커는 girl 것을 복사. 부품 추가는 builder.js의 HAIR/TOPS/EYES 등에 지도만 추가 + `Av.OPT` 목록에 이름 추가.
**AI 사진 변환**: `api/pixelize.js`(Vercel 함수) → OpenAI images/edits. 키는 Vercel 환경변수 `OPENAI_API_KEY`(없으면 503 no_key → 앱이 기본 변환으로 대체). 선택 환경변수 `OPENAI_IMAGE_MODEL`(기본 gpt-image-1), `OPENAI_IMAGE_QUALITY`(기본 medium). IP당 시간당 6회(인스턴스 메모리라 느슨함 → OpenAI 콘솔에 월 한도 필수). 등록 화면 '내 이미지로…' 안의 'AI로 도트 변환' 체크박스. Pages에서는 Vercel 주소로 호출.
**내 방 구현됨(2026-10-27)**: `src/room.js`(160×100 칸, 가구 16종 코드로 그림·윤곽선 자동·끌어서 배치·벽/바닥색), 홈의 '⌂ 내 방' 버튼 → `v-room`(내 방/상대 방 구경 탭). 서버는 `ss_rooms` 테이블+`ss_save_room/ss_get_rooms` RPC+`ss_state`에 rooms 추가 → **schema.sql 전체 재실행 필요(167줄, `ss_save_room` 검색)**. 미적용이면 방은 이 기기에만 저장되고 토스트로 안내. 체험 모드는 상대 방 예시(`demoRoom`).
**사칭 방지 구현·배포됨**: 슬롯별 기기 열쇠(S.token, 128비트). 서버는 해시(`ss_members.token_hash`)만 저장, 쓰기 RPC 5개는 `p_token` 필수(`ss_auth`), 토큰 없는 옛 함수는 drop. 코드 8자리. 예전 등록자는 앱 시작 때 자동 등록(claimSlot). 기기 변경은 '내 정보 > 기기 변경 열쇠 복사' → 새 기기 입장 화면 열쇠 칸. schema.sql 적용·배포 완료(2026-10-27) — 먼저 배포하면 옛 서버 함수와 안 맞아 쓰기가 전부 실패.
(이전 메모) '내 방' — 자유 배치(드래그), 상대 방 구경 가능(서버 저장 → schema.sql 변경, 사용자가 SQL Run 필요), 도트 스타일 유지.

## 6. 남은 일 (3단계 후보, 우선순위 순 제안)
감수에서 나온 것 중 미착수. **사용자에게 어느 것부터 할지 먼저 묻는다.**
1. ✅(완료) **초대 링크**(`?code=`): 링크로 열면 코드 자동 입력. 코드 복사/전달 번거로움 해소. (UX·사용자 감수 공통)
2. **사칭 방지**: 슬롯별 기기 비밀 토큰을 서버가 검증(쓰기 RPC). 코드 길이 확대, 날짜를 서버에서 tz로 계산. (개발자 감수 [높음])
3. **사진 Storage 이전**: DB 용량·egress. 목록 RPC에서 이미지 분리.
4. ✅(완료) **홈 사진 띠를 "오늘" 기준으로**, 사진함 날짜 묶음을 "같은 하루"로 (두 도시 날짜 어긋남).
5. **도시별 스카이라인**(현재 내=서울/상대=뉴욕 고정), 노을 해 위치(캐릭터와 겹침), 지구본 도트 크기를 장면과 맞추기.
6. ✅(완료, 2026-10-27) **접근성**: 쪽지·썸네일을 `button`으로, 포커스 링, aria-label, 모달 포커스 이동.
7. 체험/연결 화면 위계 정리(혼자 체험하기를 같은 무게 카드로), 첫 화면 한 줄 소개(사용자가 "같은 하늘 아래" 문구를 **제거해 달라고 했으므로** 문구는 사용자에게 먼저 확인).
8. 사용자가 제외했던 것(요청 시에만): 캐릭터 마주 보기, 상대 상태 문구("지금 무노는 자는 시간").
9. 기획서의 확장 기능: 일출·일몰·월출 시간 표시, 날씨 편지, 같은 달 보기, D-day/공휴일(Nager.Date), 활동 시간 겹침 추천.

## 7. 시연 준비 체크 (사용자가 요청할 때)
- 시연용 커플을 새로 만들고, 코드를 화면에 띄우지 않기(코드 = 열쇠). 또는 체험 모드로 시연(데모 컨트롤 + "무노가 사진·쪽지 보내기" 버튼).
- 두 기기(휴대폰 2대)로 코드 연결→사진→하트 리허설. 실제 사진·모바일 키보드·한글 입력 확인.
- 테스트 커플 정리.
