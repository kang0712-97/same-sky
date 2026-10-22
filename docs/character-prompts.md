# 캐릭터 도트 생성 프롬프트 (ChatGPT / Gemini 등 이미지 생성용)

방향: **컬러 도트**. 배경(날씨별 하늘)과 같은 톤의 제한된 팔레트 + 먹색 외곽선.
참고 이미지(캐릭터 시트 1·2번)를 함께 첨부하고 아래 프롬프트를 붙여 넣는다.

## 공통 규칙 (모든 프롬프트 앞에 붙이기)

```
Pixel art, low resolution, crisp square pixels, no anti-aliasing, no gradients, no blur.
Limited palette of 8 colors max, dark ink outline (#1f2420), cream highlights (#f7f1de).
Flat solid single-color background (pure #00ff00 green) so it can be removed.
Full body, standing straight, facing front, centered, 1:2 aspect ratio.
Style reference: attached images (small chibi-ish proportions, calm half-lidded eyes,
clean 1-pixel outline, simple clothing folds).
```

## 1. 기본 캐릭터 (나 / 상대)

```
[공통 규칙]
Character: a 17-year-old girl, long straight black hair with blunt bangs,
sailor-style school uniform, red ribbon tie, dark pleated skirt, white sneakers.
```

```
[공통 규칙]
Character: an 18-year-old boy, short messy black hair, white cap,
oversized dark t-shirt, light trousers, dark sneakers.
```

## 2. 사진 기반 (내 사진 → 캐릭터)

사진을 첨부하고:

```
[공통 규칙]
Turn the person in the attached photo into this pixel character:
keep hairstyle, hair color, glasses/accessories, and outfit colors recognizable.
Do not copy photorealistic details; simplify to pixel art.
```

## 3. 변환 → 프로젝트에 넣기

1. 생성된 이미지를 도트 변환기(`dotify`)에 올린다.
2. "전신 캐릭터" · "배경 지우기" 켜기 · 크기 약 28~40칸 · 색 8개 · 외곽선 켜기.
3. 결과 PNG(도트 원본 크기)를 `assets/characters/`에 저장.

## 4. 동네 배경이 더 필요할 때 (선택)

날씨별 하늘·건물 배경은 코드로 이미 생성 가능. 그림체를 더 풍부하게 하고 싶으면:

```
Pixel art cityscape strip, 110x120 grid feel, [night clear | sunny | cloudy | rain | sunset | snow],
skyline silhouettes, dither shading on the sky, same palette rules as above. No characters.
```
