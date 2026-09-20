# Cloudflare Worker / Pages Functions 설정 가이드

## 1. 개요
Cute Pattern Studio v1.2는 정적 프론트엔드 + `functions/api/ai-pattern.js` 조합으로 동작한다.

브라우저는 직접 OpenAI API를 호출하지 않고:

```text
Browser
  -> /api/ai-pattern
  -> Cloudflare Pages Function / Worker
  -> OpenAI API
  -> JSON 응답
  -> Browser
```

구조를 사용한다.

---

## 2. 필요한 환경변수
Cloudflare Pages 프로젝트 설정에서 아래 환경변수를 추가한다.

- `OPENAI_API_KEY`
- `OPENAI_MODEL` = `gpt-4.1-mini` (예시)
- `OPENAI_BASE_URL` = `https://api.openai.com/v1` (기본값 사용 시 생략 가능)

로컬 테스트용 `.dev.vars` 예시:

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

---

## 3. Cloudflare Pages 배포
1. GitHub 저장소에 업로드
2. Cloudflare Pages에서 저장소 연결
3. `functions/` 폴더가 있으면 Functions 자동 활성화
4. 환경변수 추가
5. 재배포

---

## 4. 로컬 실행
Wrangler 설치 후 프로젝트 루트에서:

```bash
wrangler pages dev .
```

그러면 정적 파일과 Functions를 함께 테스트할 수 있다.

---

## 5. API 요청 예시

### Request
```http
POST /api/ai-pattern
Content-Type: application/json
```

```json
{
  "prompt": "soft pastel pink gingham, tiny bows, hand drawn texture, cute profile background",
  "count": 4,
  "preferBackground": true,
  "colorContext": {
    "base": "#F5B9D4",
    "sub": "#B9D7FF",
    "accent": "#BFAAF2",
    "line": "#C9A4D5",
    "background": "#FFF9FC"
  }
}
```

### Response
```json
{
  "ok": true,
  "source": "ai",
  "schema_version": "1.0",
  "suggestions": [
    {
      "id": "var-1",
      "title": "Soft Pink Gingham + Tiny Bows",
      "summary": "...",
      "tags": ["checker", "bows", "pastel"],
      "bg": {
        "transparent": false,
        "mode": "solid",
        "colors": ["#FFF8FC", "#FDEDF5"],
        "gradientAngle": 135
      },
      "layers": [
        {
          "enabled": true,
          "sourceType": "builtin",
          "presetId": "soft-gingham",
          "colors": ["#FFF8FC", "#F4B6D2", "#F7D6E5", "#FFFFFF", "#CEA2C8"],
          "size": 72,
          "gap": 14,
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

## 6. Fallback 모드
환경변수가 없거나 OpenAI 호출에 실패하면 Worker는 자동으로 자체 fallback 로직으로 추천안을 만들어준다.

장점:
- 배포 직후에도 기능 시연 가능
- API 장애 시에도 빈 화면이 되지 않음
- 개발 단계에서 UI 테스트 가능


## v1.2.2 Negative Prompt
(이 가이드는 그대로 유효하며, v1.3.1에서는 체크 패턴 라이브러리 UI와 겹침 체크 프리셋이 추가되었어.)
브라우저는 이제 `negativePrompt` 와 `excludePatterns` 값을 함께 전송한다.
예: `checker, gingham, plaid` 를 넣으면 체크 계열을 제외한 추천을 요청한다.
