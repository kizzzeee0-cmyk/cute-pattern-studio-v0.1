# Cute Pattern Studio v1.2.2 개발 명세서

## 목표
v1.2.2의 목표는 AI 추천 기능에서 사용자가 **원하지 않는 패턴 요소를 명시적으로 제외**할 수 있도록 하고,
기존 fallback 추천 로직이 지나치게 checker 위주로 쏠리던 문제를 해결하는 것이다.

## 추가 기능
### 1) Negative Prompt 입력 UI
- 새 입력칸: `#aiNegativePrompt`
- 용도: 제외하고 싶은 요소를 쉼표로 입력
- 예시: `checker, gingham, plaid, hearts`

### 2) 빠른 제외 버튼
- 버튼: `#aiNoCheckerBtn`
- 동작: negative prompt에 `checker, gingham, plaid` 자동 삽입

### 3) 제외 예시 칩
- `exclude: checker, gingham, plaid`
- `exclude: hearts, stars`
- `exclude: bows, ribbons`
- `exclude: dots, halftone`
- `exclude: clouds`

## API 변경
### Request Body
```json
{
  "prompt": "mint kawaii doodle background",
  "negativePrompt": "checker, gingham, plaid",
  "excludePatterns": ["checker", "gingham", "plaid"],
  "count": 4,
  "preferBackground": true,
  "colorContext": {}
}
```

### Response Body
기존 구조 유지 + 아래 추가
```json
{
  "schema_version": "1.1",
  "source": "ai",
  "diagnostic": { "code": "ok" },
  "exclusions": ["checker", "gingham", "plaid"],
  "suggestions": []
}
```

## fallback 로직 개선
### 기존 문제
- prompt가 모호할 때 기본 family가 checker로 치우침
- doodle / cloud / halftone 요청에도 checker가 섞이는 경우가 많음

### 수정 내용
- `halftone / polka / dot` → `dots` family 우선
- `cloud` → `cloud` family 우선
- `doodle` → `doodle` family 우선
- `heart / star / bow / ribbon / sparkle` → `motif` family 우선
- `checker / gingham / plaid`가 명시될 때만 checker family 적극 사용
- 기본 fallback family도 `dots` 계열로 변경

## 제외 요소 처리 규칙
### exclusions map
- checker: checker / gingham / plaid
- dots: dots / polka / halftone
- hearts
- stars
- bows / ribbon
- clouds
- doodle

### preset exclusion
presetId에 따라 family 단위 필터링을 적용한다.
예: `checker-heart` 는 checker 또는 hearts 둘 중 하나만 제외돼도 제거됨.

## UI 동작
- AI 생성 성공 시 상태 문구에 `제외 요소: ...` 표시
- fallback일 때도 동일하게 표시
- `Ctrl/Cmd + Enter` 는 prompt, negative prompt 둘 다 지원

## 테스트 케이스
1. Prompt: `mint kawaii doodle background`
   Negative: `checker, gingham, plaid`
   기대: checker 계열 없이 doodle/sprinkles/confetti 중심

2. Prompt: `pastel halftone background`
   Negative: `checker`
   기대: polka / tiny-dot / ring-dot / bubble-dot 중심

3. Prompt: `cute cloud doodle`
   Negative: `checker, dots`
   기대: cloud / doodle 중심

4. Prompt: `soft pastel pink gingham`
   Negative: (empty)
   기대: checker/gingham 허용
