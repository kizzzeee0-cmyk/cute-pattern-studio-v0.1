# Cute Pattern Studio v1.2 실제 개발 명세서

## 1. 프로젝트 목표
v1.2의 목표는 사용자가 영어 키워드만 입력해도, Cute Pattern Studio의 기존 패턴 엔진에서 즉시 편집 가능한 설정을 자동 생성하도록 만드는 것이다.

핵심 방향:
1. **AI가 PNG를 직접 생성하지 않음**
2. **AI가 패턴 엔진용 JSON 설정을 생성**
3. 생성 결과를 **현재 편집기에 바로 적용**
4. Cloudflare Pages 환경에서 안전하게 API 키를 보호

---

## 2. 사용자 요구사항 반영

### A. AI Prompt 입력 UI
- 영어 키워드 입력 textarea 추가
- 예시 프롬프트 칩 추가
- `AI 추천 4개 만들기` 버튼 추가
- `현재 레이어 색상 기준으로 시작` 버튼 추가
- `입력 비우기` 버튼 추가

### B. AI 추천 결과 UI
- 추천안 4개 표시
- 각 카드에 포함:
  - 제목
  - 요약 설명
  - 팔레트 스와치
  - 레이어 요약
  - 태그
  - `적용`
  - `JSON 복사`

### C. Worker 구조
- 경로: `functions/api/ai-pattern.js`
- POST `/api/ai-pattern`
- 요청 본문:
  - `prompt`
  - `count`
  - `preferBackground`
  - `colorContext`
- 응답:
  - `schema_version`
  - `source` (`ai` or `fallback`)
  - `suggestions`

### D. Fallback 로직
- API 키가 없을 때도 동작해야 함
- 키워드 기반으로 프롬프트를 해석해 추천안 생성
- 색상 / 패턴 계열 / 오버레이 장식 / 정렬감 등을 조합

---

## 3. 구현 파일

### 3-1. 프론트엔드
- `index.html`
  - AI Pattern Designer 섹션 추가
- `styles.css`
  - textarea, AI 카드, 태그, 상태표시 스타일 추가
- `app.js`
  - AI 요청 / 응답 처리 로직 추가
  - 추천안 렌더링
  - 추천안 적용 로직
  - JSON 복사

### 3-2. 백엔드 (Cloudflare Worker / Pages Functions)
- `functions/api/ai-pattern.js`
  - OpenAI 호출
  - JSON 파싱
  - fallback 추천안 생성

### 3-3. 문서
- `CLOUDFLARE_WORKER_SETUP.md`
- `AI_PATTERN_JSON_SCHEMA.json`
- `README.md`

---

## 4. 프론트엔드 세부 동작

### 4-1. AI 요청 흐름
1. 사용자가 프롬프트 입력
2. `AI 추천 4개 만들기` 클릭
3. 프론트엔드가 `/api/ai-pattern` POST 요청
4. Worker가 응답 JSON 반환
5. 프론트엔드가 추천안 카드를 렌더링
6. `적용` 버튼 클릭 시 현재 상태를 해당 추천안으로 교체

### 4-2. AI 추천안 적용 규칙
- 레이어 수는 최대 `MAX_LAYERS` 이하
- 모든 AI 레이어는 `sourceType='builtin'`
- presetId는 PatternEngine에 존재하는 값만 허용
- 색상은 5칸 배열로 정규화
- 숫자값은 안전 범위로 clamp
- 첫 레이어는 항상 enabled=true

### 4-3. UI 반응
- 생성 중: 상태 문구 표시, 버튼 disabled
- 성공: `source='ai'`면 성공 문구
- fallback: 경고가 아닌 안내 문구 표시
- 실패: 에러 문구 + toast

---

## 5. Worker 세부 동작

### 5-1. 환경변수
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`

### 5-2. OpenAI 호출 전략
- `chat/completions` 사용
- `response_format: { type: 'json_object' }`
- system prompt에서 **허용 presetId 목록**과 **정확한 JSON 구조**를 강제

### 5-3. 실패 시 fallback
아래 경우 fallback 사용:
- API 키 미설정
- OpenAI HTTP 오류
- JSON 파싱 실패
- suggestions 배열 누락

### 5-4. fallback 해석 로직
#### 색상 키워드
- pink, lavender, mint, peach, lemon, blue 등

#### 패턴 계열 감지
- checker / gingham / plaid
- dot / polka
- heart / star / bow / ribbon / sparkle
- confetti / sticker / doodle

#### 무드 감지
- clean / minimal / aligned
- hand-drawn / doodle / crayon / textured / fabric
- y2k / groovy / kitsch
- pastel / dreamy / cute / kawaii

---

## 6. JSON Schema 개요
AI 응답은 아래 구조를 따른다.

```json
{
  "schema_version": "1.0",
  "source": "ai",
  "suggestions": [
    {
      "id": "var-1",
      "title": "Soft Lavender Gingham",
      "summary": "...",
      "tags": ["checker", "pastel"],
      "bg": {
        "transparent": false,
        "mode": "solid",
        "colors": ["#FFF8FC", "#F0E8FF"],
        "gradientAngle": 135
      },
      "layers": [
        {
          "enabled": true,
          "sourceType": "builtin",
          "presetId": "soft-gingham",
          "colors": ["#FFF8FC", "#EAB7D0", "#F6DDF0", "#FFFFFF", "#CAA4D5"],
          "size": 72,
          "gap": 16,
          "jitter": 0,
          "rotation": 0,
          "stroke": 2,
          "opacity": 100,
          "detail": 45,
          "randomSize": false,
          "randomAngle": false,
          "randomPosition": false,
          "offsetX": 0,
          "offsetY": 0
        }
      ]
    }
  ]
}
```

---

## 7. 테스트 체크리스트
- [ ] 프롬프트 입력 UI가 보이는가
- [ ] 예시 프롬프트 칩이 작동하는가
- [ ] `AI 추천 4개 만들기` 버튼이 Worker를 호출하는가
- [ ] fallback 모드에서도 추천안이 생성되는가
- [ ] 추천안 카드가 4개 렌더링되는가
- [ ] `적용` 시 현재 편집기가 실제로 바뀌는가
- [ ] `JSON 복사`가 동작하는가
- [ ] Cloudflare Pages Functions 구조가 정상 배포되는가

---

## 8. 추후 v1.3 확장 아이디어
- 한국어 프롬프트 자동 영문화
- 이미지 참고 + 프롬프트 혼합 입력
- AI 추천안 즐겨찾기
- AI가 현재 사용자 업로드 PNG를 기반으로 motif layer 설계
- AI 색상 잠금 / 패턴 잠금 / 레이어 잠금 옵션
