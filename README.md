# Same Sky (같은 하늘)

장거리 연애 커플을 위한 도트 스타일 일상 공유 화면.
서울과 뉴욕처럼 서로 다른 도시의 **실제 시간·날씨·달**을 한 화면에서 보고, 쪽지와 사진으로 하루를 나눈다.

AI 활용 교육 실습 프로젝트 — 목적: git으로 관리하며 **API를 1개 이상 활용**한 프로그램 만들기.

## 현재 기능
- **각자 자기 정보만 등록**: 이름, 아바타(캐릭터 선택 + 머리/상의/하의 색), 나라 + 도시(선택, 비우면 수도)
- **커플 코드로 연결**: 한 명이 코드를 만들고 상대가 코드로 입장 → 서로의 사진·쪽지 공유 (Supabase)
- 두 도시의 현지 시간 실시간 표시, 시차 자동 계산
- **Open-Meteo API**로 실제 날씨·기온·일출/일몰 → 각자의 배경 자동 선택 (맑음/흐림/비/눈/노을/밤)
- 도시 검색: 나라 선택 후 글자가 **포함**된 도시 목록 (내장 주요 도시 + Open-Meteo Geocoding)
- **오늘의 사진**: 하루 3장까지 내 사진을 찍거나 선택해서 전송(도트 변환 옵션), 상대가 확인
- **사진함 / 쪽지함**: 지난 사진과 받은·보낸 쪽지를 날짜별로 보관
- 쪽지는 처음엔 비어 있고, 직접 쓸 때만 생김 (상대 동네에 붙음)
- 오늘의 달 위상, 별·구름·비·눈 애니메이션, 지구본 위 두 도시 연결선
- 캐릭터/장면을 누르면 하트
- 서버 없이 둘러보는 "혼자 체험하기" 모드 — 두 사람의 나라·도시를 각각 골라 시간·시차·거리·날씨·배경이 어떻게 달라지는지 바로 확인
- 지구본은 선택한 두 도시에 맞춰 실시간으로 그려짐 (src/globe.js)

## 사용 API
- [Open-Meteo Forecast](https://open-meteo.com/) — 현재 날씨, 일출/일몰 (키 불필요)
- [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) — 도시 검색 (키 불필요)
- [Supabase](https://supabase.com/) — 커플 연결, 사진·쪽지 저장 (RPC 방식)

## 서버(Supabase) 준비 — 처음 한 번
1. Supabase 대시보드 → SQL Editor 에 [supabase/schema.sql](supabase/schema.sql) 전체를 붙여넣고 Run
2. `src/config.js` 의 `url` / `anonKey` 가 해당 프로젝트인지 확인 (anon/publishable 키는 공개용)
- 테이블은 외부 접근이 모두 막혀 있고, "커플 코드"를 아는 사람만 RPC 함수로 읽고 쓸 수 있습니다.

## 실행
정적 사이트입니다. `index.html`을 브라우저로 열거나, 간단히:

    python3 -m http.server 8000

## 구조
    index.html      화면
    src/style.css   스타일
    src/app.js      동작 (시계, 날씨 API, 인터랙션)
    src/assets.js   도트 에셋(배경·구름·달·지구본 등, 코드로 생성)
    src/geo.js      나라/도시 데이터 + 검색
    src/avatar.js   캐릭터 목록·색 바꾸기
    src/api.js      Supabase RPC 호출
    src/dotify.js   이미지 → 도트 변환
    supabase/schema.sql   DB 스키마
    assets/characters/    캐릭터 이미지 + manifest.json
    docs/           기획서, 캐릭터 생성 프롬프트

## 캐릭터 추가하는 법
1. 이미지 생성 도구로 초록 배경 캐릭터를 만들고(docs/character-prompts.md) 도트 변환
2. 110×120 투명 PNG를 `assets/characters/` 에 넣기
3. `assets/characters/manifest.json` 의 `characters` 에 항목 추가 — `parts` 의 `colors`(색 바꿀 팔레트)와 `rows`(몸의 세로 구간 0~1)를 지정하면 머리/상의/하의 색 바꾸기가 자동으로 지원됩니다.

## 다음 할 일
- 머리 모양·옷 종류 등 모양이 다른 캐릭터 추가
- 사진을 서버 스토리지로 이전 (지금은 압축해서 DB에 저장)
- 로그인(계정) 도입
