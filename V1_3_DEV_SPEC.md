# Cute Pattern Studio v1.3 개발 명세서

## 목표
v1.3의 목표는 체크 패턴이 가운데 흰 간격 때문에 끊겨 보이는 문제를 해결하고,
사용자가 **대표색 하나만으로 비슷한 톤 3가지를 자동 생성**하여 체크 패턴을 더 쉽게 만들 수 있도록 하는 것이다.

## 핵심 기능
### 1) 노갭 체크 렌더링
- checker 렌더러에 `contiguous` 옵션 추가
- 기존 `flat-checker`, `flat-tri-check` 는 더 이상 가운데 빈 칸이 생기지 않음
- 색면이 연속적으로 이어지는 체크로 렌더링

### 2) 새 체크 프리셋 추가
- `no-gap-checker`
- `soft-no-gap-check`
- `no-gap-tri-check`
- `torn-checker`

### 3) 찢어진 체크
- 새 렌더 타입 `torn-checker`
- 노갭 체크 위에 종이가 찢어진 듯한 코너 마스크를 얹음
- 흰색/배경색 종이 면 + 약한 그림자 + 하이라이트 라인 포함

### 4) 대표색 1개 → 3톤 자동 배색
레이어 상태에 아래 필드를 추가
- `checkerToneMode: boolean`
- `checkerToneBase: string`

체크 패턴을 선택한 경우 레이어 편집기에서 아래 UI를 노출
- 자동 재생성 토글
- 대표색 컬러피커 / HEX 입력
- `3톤 생성 적용` 버튼

자동 생성 규칙
- Pattern A: 대표색에 가장 가까운 메인 톤
- Pattern B: 조금 더 밝고 채도 낮은 톤
- Point: 더 밝은 톤
- Line: 자동 추천 선 색
- Background A: 매우 옅은 같은 계열 색

## 코드 변경 파일
- `patterns.js`
  - checker 함수 개선
  - tornChecker 함수 추가
  - 새 프리셋/기본값 추가
- `app.js`
  - 체크 패턴 판별 유틸 추가
  - checker tone palette 생성 함수 추가
  - 레이어 편집 UI 추가
- `functions/api/ai-pattern.js`
  - 새 체크 프리셋 허용

## 테스트 케이스
1. `flat-checker` 적용 시 가운데 흰 간격이 없어야 함
2. `no-gap-tri-check` 적용 시 3색이 연속적으로 이어져야 함
3. 대표색 `#78B7E8` 입력 후 3톤 생성 시 블루 계열 3색과 선 색이 자동 생성되어야 함
4. `torn-checker` 적용 시 찢어진 종이 형태의 코너 장식이 보여야 함
