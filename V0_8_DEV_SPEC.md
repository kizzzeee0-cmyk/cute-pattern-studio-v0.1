# Cute Pattern Studio v0.8 실제 개발 명세서

## 1. 버전 목표

v0.8의 핵심 목표는 다음 4가지다.
1. 활용도가 낮은 몽글·추상 패턴을 정리
2. 체크 무늬 패턴을 더 다양하게 확장
3. 오프셋을 더 편하게 제어할 수 있도록 초기화 버튼과 숫자 입력칸 제공
4. 업로드 에셋 반복 방식에 `brick` / `halfdrop` 추가

## 2. 기능 요구사항

### A. 패턴 라이브러리 정리
- `몽글·추상` 카테고리 패턴을 라이브러리에서 제거
- 라이브러리는 체크/도트/귀여운 오브젝트 중심으로 재구성

### B. 신규 체크 패턴 추가
- marshmallow-check
- picnic-check
- windowpane-check
- layered-check
- micro-gingham

### C. 오프셋 제어 UX 개선
레이어 편집 UI에서 `위치 X`, `위치 Y` 각각에
- range 슬라이더
- number 직접 입력칸
을 함께 제공한다.

추가 버튼:
- `오프셋 초기화`
- 클릭 시 `offsetX = 0`, `offsetY = 0`

### D. 업로드 에셋 반복 방식 추가
`renderMode` 확장:
- motif
- tile
- brick
- halfdrop

동작 규칙:
- `brick`: 홀수 행을 기준으로 가로 반 칸 이동
- `halfdrop`: 홀수 열을 기준으로 세로 반 칸 이동

## 3. 앱 로직 수정 명세
- `STORAGE` 키를 v0.8용으로 변경
- `updateSelected()`에서 `brick`, `halfdrop` 라벨 반영
- 업로드 에셋 `배치 방식` select 확장
- `sliderRow()`를 수정해 숫자 직접 입력칸 제공
- `renderLayerEditor()`에 `오프셋 초기화` 버튼 추가
- `renderUploadedLayer()`에 brick / halfdrop 좌표 보정 추가

## 4. 렌더링 엔진 수정 명세
- 몽글·추상 프리셋 제거
- 체크 계열 신규 프리셋 추가
- 신규 프리셋별 defaults 추가
- 업로드 에셋 렌더링에 brick / halfdrop 적용

## 5. 테스트 체크리스트
- [ ] 몽글·추상 패턴이 더 이상 노출되지 않는가
- [ ] 신규 체크 패턴이 정상 표시되는가
- [ ] 위치 X/Y 숫자 입력이 정상 동작하는가
- [ ] 오프셋 초기화 버튼이 0,0으로 되돌리는가
- [ ] 브릭 반복이 정상 작동하는가
- [ ] 하프드롭 반복이 정상 작동하는가
- [ ] PNG 저장 결과가 미리보기와 동일한가
