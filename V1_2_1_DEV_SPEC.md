# Cute Pattern Studio v1.2.1 실제 개발 명세서

## 1. 업데이트 목표
v1.2.1은 AI Pattern Designer가 fallback으로 전환될 때 원인을 한 문장으로 뭉뚱그리지 않고, 사용자가 Cloudflare 화면만 보고도 바로 문제를 파악할 수 있도록 진단 정보를 강화한 버전이다.

구분 대상:
- API KEY 없음
- 401 인증 실패
- 429 사용 한도 / 요청 제한
- 모델 오류
- 기타 OpenAI API 오류

---

## 2. Worker 응답 확장
`functions/api/ai-pattern.js`가 fallback 응답에 `diagnostic` 객체를 포함한다.

```json
{
  "source": "fallback",
  "diagnostic": {
    "code": "missing_api_key",
    "http_status": null,
    "message": "..."
  },
  "suggestions": []
}
```

지원 코드:
- `ok`
- `missing_api_key`
- `auth_failed`
- `rate_limit`
- `model_error`
- `api_error`

---

## 3. 오류 분류 규칙

### API KEY 없음
조건:
- `OPENAI_API_KEY` 환경변수가 비어 있음

표시:
- `API KEY 없음`

### 401 인증 실패
조건:
- OpenAI HTTP status `401`

표시:
- `401 인증 실패`

### 429 한도 문제
조건:
- OpenAI HTTP status `429`

표시:
- `429 한도 문제`

### 모델 오류
조건:
- HTTP 404
- 또는 400/403 응답 중 body에 `model`, `does not exist`, `not found`, `access` 등의 모델 관련 메시지가 포함됨

표시:
- `모델 오류`

### 기타
위 조건에 해당하지 않는 오류는 `api_error`로 처리한다.

---

## 4. 프론트엔드 표시
`app.js`에 `aiDiagnosticMessage()`를 추가한다.

화면 문구 예시:
- API KEY 없음 → Cloudflare Variables and Secrets에 `OPENAI_API_KEY` 추가 안내
- 401 → API 키 확인 안내
- 429 → 크레딧 / 결제 / 요청 한도 확인 안내
- 모델 오류 → `OPENAI_MODEL` 값 / 접근 권한 확인 안내

fallback 추천안 자체는 계속 생성되므로 UI가 멈추지 않는다.

---

## 5. 테스트 체크리스트
- [ ] API 키가 없을 때 `API KEY 없음`이 표시되는가
- [ ] 401 응답을 강제로 주면 `401 인증 실패`가 표시되는가
- [ ] 429 응답을 강제로 주면 `429 한도 문제`가 표시되는가
- [ ] 모델명 오류 404 응답에서 `모델 오류`가 표시되는가
- [ ] 기타 오류는 `OpenAI API 오류`로 표시되는가
- [ ] 모든 오류 상황에서 fallback 추천안은 계속 생성되는가
