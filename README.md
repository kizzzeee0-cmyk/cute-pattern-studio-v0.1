# Cute Pattern Studio v0.5

Cute Pattern Studio는 **2000×2000 PNG 패턴 배경 생성용 정적 웹앱**입니다.  
GitHub에 업로드하고 Cloudflare Pages로 바로 배포할 수 있습니다.

## 이번 v0.5에서 반영한 핵심

### 1) 반복 요소 정렬 옵션 추가
하트, 별, 땡땡이, 리본처럼 **반복 요소가 여러 개 배치되는 패턴**에서
이전에는 개별 요소의 크기나 각도가 랜덤하게 섞이는 경우가 많았습니다.

이번 v0.5에서는 레이어 편집에 다음 옵션을 추가했습니다.
- **요소 크기 랜덤**
- **요소 각도 랜덤**

둘 다 끄면:
- 모든 요소가 **같은 크기**로
- 모든 요소가 **같은 방향**으로
정렬된 패턴을 만들 수 있습니다.

### 2) v0.4 구조 유지
- 기본 레이어 1개로 시작
- 필요할 때 레이어 추가
- 배경색 포함 PNG 저장
- 투명 배경 저장 지원
- 업로드 SVG/PNG/JPG 반복 패턴화
- SVG 단색 변환
- 즐겨찾기 / 내 프리셋 저장
- 참고 이미지 팔레트 자동 추출
- 심리스 타일 PNG 저장

## 사용 흐름

### 기본 패턴 배경 만들기
1. 패턴 선택
2. 배경 섹션에서 배경색 선택
3. 레이어 편집에서 색상 / 크기 / 간격 조절
4. 필요한 경우 `요소 크기 랜덤`, `요소 각도 랜덤` ON/OFF 조절
5. 필요하면 `레이어 추가`
6. `PNG 저장`

### 업로드한 투명 PNG를 패턴으로 만들기
1. 왼쪽 업로드 박스에 PNG/SVG/JPG 업로드
2. 현재 레이어에 자동 연결
3. `업로드 에셋` 모드에서 반복 방식 선택
4. 크기 / 간격 / 회전 / 불규칙함 조절
5. 배경색까지 맞춘 뒤 저장

## 문서
- `V0_5_DEV_SPEC.md` — v0.5 실제 개발 명세서
- `V0_4_PLAN.md` — 이전 단계 계획 문서

## 파일 구성
- `index.html` — 메인 UI
- `styles.css` — 스타일
- `patterns.js` — 패턴 렌더러
- `app.js` — 앱 로직

## GitHub + Cloudflare Pages 배포
1. 이 폴더 전체를 GitHub 저장소에 업로드
2. Cloudflare → Workers & Pages → Create Application
3. Pages → Import an existing Git repository
4. Framework preset: `None`
5. Build command: 비워두거나 `exit 0`
6. Build output directory: `.`
7. Deploy
