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
**방 개선(2026-10-27)**: 방에 내 캐릭터 세우기(room.items의 t:'me', 그림은 주인 아바타 `Av.layerUrl`, 서버 스키마 변경 없음), 상대가 방을 바꾸면 '○○님이 방을 꾸몄어요' 토스트(방 화면 밖일 때).
(이전 메모) '내 방' — 자유 배치(드래그), 상대 방 구경 가능(서버 저장 → schema.sql 변경, 사용자가 SQL Run 필요), 도트 스타일 유지.

## 5.6 사용자 피드백 11건 → 4단계 계획 (2026-10-28 확정)
**1단계 완료·배포**: 한국 시 단위 84곳(`geo.js`, '전주시'처럼 시/군을 붙여도 검색, 한국은 가까운 도시도 안 지움), 사진 앨범/카메라 두 버튼(`#pFile`/`#pCam`), 새 소식을 장면 위 팝업(`.twin .news`, 들어오자마자 표시), 상대 동네 화면(v-town) 삭제 → '상대 방 가기'(`openRoom('pt')`), **쪽지는 방에 붙음**(받은 쪽지=내 방, 보낸 쪽지=상대 방, `drawRoomNotes`, ss_notes의 x,y %를 그대로 사용 → 스키마 변경 없음), 방 가구 실제 비율(1칸≈6cm, `K` 배율표)·크기 7단계(`s`)·회전 15도(`r`, ROT 종류만)·뒤집기, 모바일 레이아웃(두 장면 나란히, 하단 탭바 5칸+안 본 소식 점, 바텀시트 모달, safe-area).
**남은 단계 (사용자 결정 완료)**:
- 2단계(SQL 필요): 실시간 반영(Supabase Realtime Broadcast로 '신호'만 보내고 받으면 RPC로 새로고침 + 화면이 켜진 동안 5초 확인), 목소리 쪽지(최대 15초 MediaRecorder, DB 저장 → 나중에 Storage 이전; ss_notes에 audio 칸 또는 새 테이블; iOS는 mp4/aac 형식 주의).
- 3단계(사용자가 ChatGPT로 캐릭터 시트 생성 필요): 사진→아바타 변환을 '단색 초록 배경 + 기존 girl/boy를 그림체 참고 이미지로 함께 전달 + 도트 격자·색 수 맞춤'으로 교체(`api/pixelize.js`, `dotify.js`). 꾸미기 기본 아바타는 코드 조립(builder.js) 대신 GPT로 만든 완성 캐릭터 여러 장 추가(프롬프트 `docs/character-prompts.md`), 색·소품·얼굴 오버레이는 유지.
- 4단계: PWA(홈 화면에 추가)+웹 푸시(잠금화면에 상대 얼굴+쪽지/사진 알림). 푸시 구조: 구독 정보는 ss_push 테이블+토큰 검증 RPC, 보내기는 Vercel 함수(web-push, VAPID 키는 환경변수)가 구독을 받아 전달. 웹앱은 잠금화면 위젯 불가(네이티브 앱 영역), iPhone은 홈 화면에 추가해야 푸시 수신(iOS 16.4+).

## 5.7 감성 개편 방향 (2026-10-28 사용자 확정 — 싸이월드 미니룸 감성)
- **분위기**: 따뜻하고 귀여운 쪽(서정적·쓸쓸한 쪽 아님). 효과음·문구 어투도 귀엽고 다정하게. 대상은 **연인 전용**.
- **별조각(화폐)**: 도입. 평범한 가구·아바타 꾸미기는 **기본 무료**, 특별하거나 퀄리티 높은 것만 별조각으로 구매. 혼자 하면 조금, **둘 다 하면 보너스**(연결감). 지급은 서버(토큰 검증 RPC)에서 — 조작 방지.
- **BGM**: **카세트** 아이콘(방에서 곡 고르기). 직접 만든 8비트 곡(코드 생성), 기본 꺼짐, 쪽지 도착·하트·구입 효과음도 기본 꺼짐.
- **사진첩**: 폴라로이드 느낌. **날짜 도장은 넣지 않음**. 사진함+쪽지함+목소리 쪽지를 '추억' 한 타임라인으로 통합 예정.
- **캐릭터·파츠 화풍(2026-10-28 정정)**: 앱 분위기는 따뜻하게 가되 **캐릭터는 포근·귀여운 일러스트풍이 아니라 평범한 한국 일상 스타일**, 기존 ref-girl/ref-boy처럼 거친 도트·작고 차분한 눈·사실적 비율(치비 금지). 처음 GPT가 만든 귀여운 세트는 `characters/_old-cute/`로 보관(사용 안 함). 지침은 `docs/gpt-asset-kit.md` 3절.
- **제외(구현 안 함)**: 아바타 인터랙션(누르면 반응·표정), 캐릭터 마주 보기, 상대 자는 시간 문구. 첫 화면 '같은 하늘 아래' 문구도 건드리지 말 것.
- **진행 순서**: ① 3단계(아바타 그림체 통일 — 사용자가 ChatGPT로 캐릭터 시트 생성) → ② 2단계(실시간·목소리 쪽지) → ③ 감성 패키지 A(방 창문 밖에 그 도시의 실시간 하늘·밤엔 스탠드, 함께한 날 D+N, 오늘의 한 줄, 폴라로이드 사진함, 효과음) → ④ 패키지 B(별조각·상점·선물하기(상대 방에 선물상자)·방문 발자국·하루 할 일) → ⑤ 구조 개편(하단 탭 4개: 하늘/방/추억/상점, 방 안에서 내 방↔상대 방 토글, 첫 사용 흐름: 부팅→아바타→연결→웰컴 가구 3개→첫 사진) → ⑥ 4단계(PWA·웹 푸시).

## 5.8 아바타 v2 (2026-10-28)
GPT가 만든 한국 일상 스타일 캐릭터 24종(g01~g12, b01~b12; 원본 887×1774 투명 PNG는 `assets/incoming/characters/`, git 제외)을 `scripts/convert-characters.py`로 220×240 스프라이트(키 134px, 발 y=216, 색 28개 이내, 모두 같은 배율)로 변환 → `assets/characters/v2/`. manifest는 24종뿐(`v2:true`, `group` f/m, 9~12번은 `premium:true`=별조각 상점 대상 예정). `avatar.js`: v2는 완성 그림 그대로 반환(`render`), 예전 저장값 girl/boy/make는 g01/b01로 연결(`LEGACY`). 꾸미기 화면은 '캐릭터 고르기'만(탭 숨김). **예전 코드 꾸미기(머리띠·안경·목도리·직접 만들기 builder)는 해상도가 달라 v2에선 안 쓰임** — GPT 파츠 시트(`assets/incoming/PARTS_LIST.md`)로 레이어 방식 새로 만들 예정(마네킹 색 기준 분리·정렬). 머리색 바꾸기도 v2에선 아직 없음(파츠 단계에서).

## 5.9 파츠 조합 캐릭터 최소 버전 (2026-10-28)
- `scripts/build-parts.py`: assets/incoming/parts 시트 → assets/parts/f/*.png (220x240 레이어, 자체 외곽선) + assets/parts/manifest.json. 여자 몸 기준. 상의18·하의12·신발9·원피스9·머리24·눈16. 눈은 EYE_DROP으로 앞머리 아래에 내림.
- `src/mix.js`(SSMix): 몸→신발→하의→상의→원피스→머리→눈 순서로 겹침. 피부(av.skin)·머리(av.hc) 색은 밝기 유지 색조 변환. avatar JSON은 `{char:'g01', mix:{hair,eyes,top,bottom,shoes,one}, skin, hc}`.
- 꾸미기 화면: 캐릭터 탭의 '직접 꾸미기'로 진입, 탭 추천/얼굴/머리/옷. 24종 완성 캐릭터는 '추천'으로 유지.
- 한계/남은 일: 남자 몸·남자 머리 없음, 눈썹·입·소품·별조각 파츠 미적용, 외곽선·앞머리가 눈을 가리는 문제, 파츠 이름 없이 번호만 표시. 새 시트가 오면 build-parts.py의 SHEETS에 추가.
- 주의: assets/incoming 은 git에 올리지 않는다(add 할 때 경로를 지정).

## 5.10 꾸미기 개편 (2026-10-28 늦게)
- 파츠 조합(눈·머리·옷 따로)은 비율·화풍이 추천 캐릭터와 달라 **UI에서 내림**(src/mix.js, scripts/build-parts.py, assets/parts는 보관). 대신 추천 24종을 목(CUT=113px)에서 잘라 **머리·얼굴 24 × 옷 24 조합**: avatar JSON `{char, set:{head,outfit}}`, `avatar.js renderSet`.
- 꾸미기는 전체 화면 페이지(v-dress): 큰 아바타(스티키) + 탭 세트/머리·얼굴/옷.
- 얼굴·머리를 따로 고르려면 GPT에서 '대머리 얼굴 시트'와 '머리 시트'를 추천 캐릭터 비율로 새로 받아야 함(미정).
- 디자인 개편 방향은 사용자 선택 대기(artifact 샘플 A~D 마음에 드는 것 없음 → 새 방향 E 제안).

## 5.11 2단계: 실시간 반영 + 목소리 쪽지 (2026-10-29)
- 디자인 개편은 하지 않기로 함(사용자: 원래대로, 기존 수정 항목만). A~E 샘플은 보류.
- 실시간: `src/live.js`(SSLive) — Supabase Realtime Broadcast 채널 `ss-<코드>`에 '바뀜' 신호만 주고받고, 받으면 `poll()`. SSApi 쓰기 함수(saveMember/addPhoto/heartPhoto/addNote/saveRoom/addVoice)가 끝나면 자동 신호. 연결이 안 돼도 `poll`이 6초마다(탭이 보일 때) 확인. **SQL 필요 없음**(공개 채널이 기본 허용인 것을 Node로 확인).
- 목소리 쪽지: `src/voice.js`(SSVoice, MediaRecorder 최대 15초, iPhone은 audio/mp4, 그 외 webm), 서버는 `ss_voices` 표 + `ss_add_voice/ss_list_voices/ss_get_voice`(**6차 SQL, 사용자가 Run 해야 함**; `ss_state`에 voices 포함). 하루 40개·최근 60개 제한, 목록은 소리 없이 정보만 받고 재생할 때 한 개씩 받음. UI: 쪽지함 상단 '● 목소리 쪽지 남기기', 상대 방 쪽지 입력줄의 '● 목소리'. 쪽지함에 쪽지와 섞여 ▶재생, 새 소식 팝업에 '목소리 N'.
- 위험: webm(안드로이드 녹음)을 아이폰이 못 틀 수 있음 → 재생 실패 시 안내 문구. 실제 두 기기 확인 전.

## 5.12 읽음 처리·방 안 목소리 (2026-10-29, 7차 SQL)
- `read_at`(ss_notes·ss_voices) + `ss_mark_read`: 받은 사람이 방에서 쪽지/목소리를 누르거나 쪽지함을 열면 표시 → 방에서 사라지고(보낸 사람 화면에서도) 쪽지함에만 남음. `ss_state`에 read_at 포함.
- 목소리 쪽지는 방에 붙음(x,y 저장): 쪽지=노란 종이, 목소리=빨간 둥근 스피커 버튼. 재생이 잘 끝나야 사라지고, 실패하면 그대로 둠. 쪽지함에는 녹음 버튼 없음(보관·재생만), 보내기는 상대 방 입력줄의 '● 목소리'.
- 홈 아바타 영역 위 알림: 새로 온 것을 `flashNews`로 8초간 강조. `explain()`은 알 수 없는 오류에 서버 메시지를 괄호로 덧붙임(아이폰 '서버와 통신' 오류 원인 확인용). 목소리 크기 제한 120만 자로 완화.

## 5.13 말풍선 닫기·보낸 쪽지 삭제 (2026-10-29, 8차 SQL)
- 방의 쪽지/목소리 말풍선은 다른 곳을 누르면 닫히고 듣던 소리도 멈춤(`closeBubble`). 목소리 쪽지는 쪽지 그림을 하늘색으로 물들이고, 열면 도트 스피커(assets/ui/speaker.png)+'▶ 재생하기'.
- 보낸 쪽지·목소리는 보낸 사람만 삭제(방 말풍선, 쪽지함 '보낸 쪽지'). 두 번 눌러 확인('정말 삭제?'). 서버 `ss_delete_item`(8차 SQL). **배포 전에 SQL이 적용돼야 함**(적용 안 된 채 배포하면 삭제만 실패).

## 5.14 PWA + 알림(웹 푸시) (2026-10-29, 9차 SQL + 설정 스크립트 필요)
- PWA: `manifest.webmanifest`, 아이콘 `assets/ui/icon-*.png`, `sw.js`(알림 전용, 파일 캐시 안 함 → 업데이트 안 막힘). iPhone은 홈 화면에 추가한 앱에서만 알림 가능(iOS 16.4+).
- 구독: `src/push.js`(SSPush) → 내 정보 화면 '알림' 칸에서 켜기/끄기 → `ss_save_push/ss_clear_push`(9차 SQL, 구독은 `ss_push` 표).
- 보내기: SSApi 쓰기(사진·쪽지·목소리·하트) 성공 뒤 `/api/push`(api/push.js, web-push) 호출 → 서버 함수가 `ss_partner_push`(토큰 검증)로 상대 구독과 내 이름을 받아 알림. 문구는 서버에서 고정(`TEXT`), 앱이 보이는 중이면 sw가 알림을 생략(화면 안 배너로 충분).
- **키**: VAPID 키는 `node scripts/setup-push.mjs`가 만들어 Vercel 환경변수(VAPID_PRIVATE/PUBLIC)에 넣고 공개 키를 `src/config.js`의 `vapid`에 적는다(자동 승인 규칙이 Vercel 비밀 저장을 막아 사용자가 직접 실행). 공개 키가 비어 있으면 알림 칸은 '준비되지 않았어요'. 키를 바꾸면 기존 구독이 모두 끊기니 다시 만들지 말 것.
- `package.json`(web-push) 추가: Vercel이 api/ 함수 의존성을 설치. `api/_anon.js`는 공개 anon 키(브라우저와 같은 값).

## 5.15 앱 껍데기 재설계 (2026-10-29, 10차 SQL = D-day)
- 사용자 실기기(삼성 인터넷) 피드백 반영: 화면 속 화면(둥근 창)·상단 제목줄·LIVE·코드 칩 제거 → **전체 화면 앱 껍데기**(`src/shell.css`, style.css 뒤에 불러와 덮어씀. 데스크톱은 560px 가운데 열). 하단 탭은 모든 화면 크기에서 고정.
- 홈: 두 장면이 화면 가장자리까지, 우상단 '설정'(#editMe), D-day 칩(`#dd`: 함께한 지 N일 / 만날 때까지 D-N, 서버 `ss_couples.start_date/meet_date`, `ss_set_dday`, 10차 SQL), 큰 '오늘의 사진 보내기' 버튼. 하단 탭과 겹치던 내 방/사진함/쪽지함 버튼과 '상대 방 가기'는 숨김(요소는 JS 참조 때문에 남김).
- 설정(내 정보 수정): '우리 정보'(연결 코드·초대 링크 공유·D-day), 알림, '앱으로 설치'(beforeinstallprompt 버튼 또는 기기별 안내). 홈에는 설치 안내 줄(닫으면 localStorage `ss.instx`).
- 인트로: `#intro`(세션당 1회, 탭하거나 2.8초 뒤 닫힘). '도트 사진으로 보내기' 옵션 제거(체크박스는 숨김 요소로 남김).
- 글자 잘림 대응: 전역 box-sizing, 버튼 줄바꿈 허용, 설정 버튼 세로 정렬. `explain()`의 no_schema 문구를 짧게.

## 6. 남은 일 (3단계 후보, 우선순위 순 제안)
감수에서 나온 것 중 미착수. **사용자에게 어느 것부터 할지 먼저 묻는다.**
1. ✅(완료) **초대 링크**(`?code=`): 링크로 열면 코드 자동 입력. 코드 복사/전달 번거로움 해소. (UX·사용자 감수 공통)
2. **사칭 방지**: 슬롯별 기기 비밀 토큰을 서버가 검증(쓰기 RPC). 코드 길이 확대, 날짜를 서버에서 tz로 계산. (개발자 감수 [높음])
3. **사진 Storage 이전**: DB 용량·egress. 목록 RPC에서 이미지 분리.
4. ✅(완료) **홈 사진 띠를 "오늘" 기준으로**, 사진함 날짜 묶음을 "같은 하루"로 (두 도시 날짜 어긋남).
5. **도시별 스카이라인**(현재 내=서울/상대=뉴욕 고정), 노을 해 위치(캐릭터와 겹침), 지구본 도트 크기를 장면과 맞추기.
6. ✅(완료, 2026-10-27) **접근성**: 쪽지·썸네일을 `button`으로, 포커스 링, aria-label, 모달 포커스 이동.
7. ✅(연결 화면 완료) 체험/연결 화면 위계 정리(혼자 체험하기를 같은 무게 카드로), 첫 화면 한 줄 소개(사용자가 "같은 하늘 아래" 문구를 **제거해 달라고 했으므로** 문구는 사용자에게 먼저 확인).
8. 사용자가 제외했던 것(요청 시에만): 캐릭터 마주 보기, 상대 상태 문구("지금 무노는 자는 시간").
9. 기획서의 확장 기능: 일출·일몰·월출 시간 표시, 날씨 편지, 같은 달 보기, D-day/공휴일(Nager.Date), 활동 시간 겹침 추천.

## 7. 시연 준비 체크 (사용자가 요청할 때)
- 시연용 커플을 새로 만들고, 코드를 화면에 띄우지 않기(코드 = 열쇠). 또는 체험 모드로 시연(데모 컨트롤 + "무노가 사진·쪽지 보내기" 버튼).
- 두 기기(휴대폰 2대)로 코드 연결→사진→하트 리허설. 실제 사진·모바일 키보드·한글 입력 확인.
- 테스트 커플 정리.
