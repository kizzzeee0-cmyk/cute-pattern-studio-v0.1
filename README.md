# Cute Pattern Studio v1.2.2

Cute Pattern Studio는 귀여운 패턴 배경을 만들고 PNG / 심리스 타일 PNG로 저장하는 정적 웹앱이야.
Cloudflare Pages + Functions 구조를 사용하고, v1.2.2에서는 **AI 추천용 negative prompt(제외 요소)** 기능이 추가되었어.

## v1.2.2 핵심 변경점
- **빼고 싶은 요소 / Negative Prompt 입력칸 추가**
  - 예: `checker, gingham, plaid`
- **빠른 제외 버튼 추가**
  - `체크/깅엄 제외`
- **AI fallback 로직 개선**
  - `mint kawaii doodle background` → 체크 위주가 아니라 doodle 계열 우선
  - `pastel halftone background` → halftone/dot 계열 우선
  - `cute cloud doodle` → cloud / doodle 계열 우선
- **체크 없는 추천안 생성 강화**
  - prompt에 checker가 없으면 무조건 checker로 몰리지 않도록 개선
- **기존 오류 표시 유지**
  - API KEY 없음 / 401 / 429 / 모델 오류 / 기타 API 오류 구분 표시

## AI 사용 팁
### 체크 없는 버전 원할 때
- Prompt: `mint kawaii doodle background`
- Negative Prompt: `checker, gingham, plaid`

### 하트/별도 빼고 싶을 때
- Negative Prompt: `checker, hearts, stars`

### 구름 낙서만 원할 때
- Prompt: `cute cloud doodle`
- Negative Prompt: `checker, dots`

## 주요 파일
- `index.html` — AI negative prompt UI 추가
- `app.js` — 제외 요소 입력 / 전달 / 상태표시 처리
- `functions/api/ai-pattern.js` — OpenAI + fallback 추천 로직 개선
- `V1_2_2_DEV_SPEC.md` — 실제 개발 명세서
- `CLOUDFLARE_WORKER_SETUP.md` — Cloudflare 설정 가이드

## 환경변수
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (예: `gpt-4.1-mini`)
- `OPENAI_BASE_URL` (선택)

환경변수가 없으면 fallback 추천안이 동작해.
