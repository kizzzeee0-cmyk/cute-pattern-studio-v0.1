# Cute Pattern Studio v1.4 개발 명세서

## 목표
v1.4의 목표는 배경 그라데이션 기능을 단순 2색 구조에서 확장해,
사용자가 **여러 개의 배경색을 추가하고 각 색상의 범위를 직접 조절**할 수 있게 만드는 것이다.

## 핵심 요구사항
1. 배경 그라데이션 색상 수를 늘릴 수 있어야 한다.
2. 각 색상마다 범위(위치)를 개별적으로 조절할 수 있어야 한다.
3. 기존 저장 데이터 및 2색 그라데이션과 호환되어야 한다.

## 구현 내용
### 1) 배경 상태 구조 확장
- `state.bg.gradientStops` 추가
- 구조: `{ color: '#RRGGBB', pos: 0~100 }[]`
- 최대 6개 stop 지원

### 2) 정규화 유틸리티
- `buildGradientStopsFromColors(colors)`
- `normalizeGradientStops(stops, fallbackColors)`
- `bgStopsToLegacyColors(stops)`
- `syncBgGradientState(bg)`

### 3) 렌더링 로직 변경
- `drawBackground()`가 `gradientStops`를 순회하여 `CanvasGradient.addColorStop()` 호출
- 기존 2색 데이터는 자동으로 2-stop 구조로 변환

### 4) UI 변경
- 배경 그라데이션 모드에서 각 색상별 카드 표시
- 각 카드에 포함되는 요소
  - 색상 피커
  - HEX 입력
  - 스포이드
  - 위치(range) 슬라이더
  - 위치(number) 직접 입력
  - 삭제 버튼(최소 2개 유지)
- 하단 액션
  - `그라데이션 색상 추가`
  - `범위 균등 정렬`

## 기대 효과
- 단색→다색 파스텔 그라데이션 제작 가능
- 3색 이상 배경이 필요한 프사/배너용 패턴 제작이 쉬워짐
- 사용자가 원하는 색 분포를 더 세밀하게 맞출 수 있음
