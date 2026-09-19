# Cute Pattern Studio v1.2.1

Cute Pattern Studio는 **귀여운 패턴 배경을 만들고 PNG / 심리스 타일 PNG로 저장하는 정적 웹앱**이야.  
GitHub에 업로드한 뒤 **Cloudflare Pages**로 바로 배포할 수 있고, v1.2부터는 **Cloudflare Worker(Functions)** 를 이용한 **AI Pattern Designer** 기능이 추가되었어.

---


## v1.2.1 진단 개선

AI Pattern Designer가 fallback으로 전환되면 화면에서 아래 원인을 바로 구분해 보여줘.
- API KEY 없음
- 401 인증 실패
- 429 한도 문제
- 모델 오류
- 기타 OpenAI API 오류

추천안은 fallback으로 계속 생성되므로 앱 사용은 중단되지 않아.

## v1.2 핵심 업데이트

### 1) AI Pattern Designer
영어 키워드를 입력하면 AI가 PNG 이미지를 직접 그리는 대신, **현재 패턴 엔진에서 바로 편집 가능한 설정값(JSON)** 을 생성해줘.

예시 프롬프트:
- `soft pastel pink gingham, tiny bows, hand drawn texture, cute profile background`
- `lavender checker with white stars, clean kawaii profile background`
- `peach and cream mini polka dot, soft ribbon accents, dreamy cute background`

### 2) Cloudflare Worker / Pages Functions 연동
- 클라이언트는 `/api/ai-pattern` 으로 요청
- Worker가 OpenAI API를 호출해 구조화된 추천안 생성
- API 키가 없거나 실패하면 **로컬 fallback 추천안**을 자동 반환

### 3) AI 추천안 4개 생성 + 바로 적용
- 한 번 요청으로 추천안 4개 생성
- 각 추천안마다
  - 팔레트 미리보기
  - 레이어 요약
  - `적용`
  - `JSON 복사`
  제공

### 4) v1.1 기능 유지
- 선 색 자동 추천
- 예쁜 색 조합 프리셋
- 기준 색상 자동 팔레트 추천
- 체크/도트/리본/하트/별/도들/오브젝트 패턴
- 업로드 에셋 반복 패턴화
- 원형 프사 미리보기
- 심리스 타일 저장

---

## 폴더 구조

```text
cute-pattern-studio-v1.2/
├─ index.html
├─ styles.css
├─ app.js
├─ patterns.js
├─ functions/
│  └─ api/
│     └─ ai-pattern.js
├─ wrangler.toml
├─ .dev.vars.example
├─ AI_PATTERN_JSON_SCHEMA.json
├─ CLOUDFLARE_WORKER_SETUP.md
├─ V1_2_DEV_SPEC.md
└─ (이전 버전 문서들)
```

---

## Cloudflare Pages 배포 방법

### 방법 1) GitHub + Cloudflare Pages
1. 이 폴더를 GitHub 저장소에 업로드
2. Cloudflare Pages에서 해당 저장소 연결
3. **Build command 비움** 또는 필요 시 생략
4. **Build output directory**: `/` 또는 비워둠
5. Pages Functions가 `functions/` 폴더를 자동 감지

### 방법 2) Wrangler 로컬 실행
```bash
wrangler pages dev .
```

---

## 환경변수

Cloudflare Pages / Workers 환경변수에 아래를 넣으면 AI API가 활성화돼.

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (예: `gpt-4.1-mini`)
- `OPENAI_BASE_URL` (선택, 기본값 `https://api.openai.com/v1`)

환경변수가 없으면 앱은 **fallback 모드**로 작동해.

---

## 포함 문서

- `V1_2_1_DEV_SPEC.md` — v1.2.1 오류 진단 개선 명세서
- `V1_2_DEV_SPEC.md` — v1.2 실제 개발 명세서
- `CLOUDFLARE_WORKER_SETUP.md` — Worker / Pages 연동 가이드
- `AI_PATTERN_JSON_SCHEMA.json` — AI 응답 JSON 스키마
- `V1_1_DEV_SPEC.md`
- `V1_0_DEV_SPEC.md`
- `V0_9_DEV_SPEC.md`
- `V0_8_DEV_SPEC.md`
- `V0_7_DEV_SPEC.md`
- `V0_6_DEV_SPEC.md`
- `V0_5_DEV_SPEC.md`
- `V0_4_PLAN.md`
