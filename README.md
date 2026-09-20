# Cute Pattern Studio v1.3

Cute Pattern Studio는 귀여운 패턴 배경을 만들고 PNG / 심리스 타일 PNG로 저장하는 정적 웹앱이야.
Cloudflare Pages + Functions 구조를 사용하고, v1.3에서는 **체크 패턴 강화 + 대표색 1개 기반 3톤 자동 배색** 기능이 추가되었어.

## v1.3 핵심 변경점
- **노갭 체크 계열 추가**
  - `flat-checker`, `flat-tri-check` 렌더링 수정
  - `no-gap-checker`, `soft-no-gap-check`, `no-gap-tri-check` 추가
- **찢어진 체크 패턴 추가**
  - `torn-checker`
- **대표색 1개 → 3톤 자동 배색**
  - 체크 패턴 레이어에서 대표색 하나를 고르면
  - 비슷한 톤 3가지 + 선 색을 자동 생성
  - `대표색 변경 시 자동으로 3톤 다시 생성` 옵션 제공
- **기존 AI 기능 유지**
  - negative prompt
  - API KEY 없음 / 401 / 429 / 모델 오류 구분 표시

## 추천 사용법
### 1) 하얀 틈 없는 체크 만들기
- 패턴: `노갭 체크` 또는 `노갭 3색 체크`
- 간격: 0
- 선 두께: 0

### 2) 대표색 하나로 블루 체크 만들기
- 체크 패턴 선택
- `체크 전용 1색 → 3톤 자동 배색` 박스에서 대표색 지정
- `3톤 생성 적용` 클릭

### 3) 찢어진 체크 느낌 만들기
- 패턴: `찢어진 체크`
- 배경색을 흰색/크림색으로 두면 종이 느낌이 더 자연스러움

## 주요 파일
- `patterns.js` — 체크 렌더링 개선 + 새 프리셋 추가
- `app.js` — 체크 전용 1색→3톤 자동 배색 UI/상태 처리
- `functions/api/ai-pattern.js` — 새 체크 프리셋 허용
- `V1_3_DEV_SPEC.md` — 이번 버전 개발 명세서

## 환경변수
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (예: `gpt-4.1-mini`)
- `OPENAI_BASE_URL` (선택)

환경변수가 없으면 fallback 추천안이 동작해.
