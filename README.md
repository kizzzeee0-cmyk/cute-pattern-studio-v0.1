# Cute Pattern Studio v0.6

Cute Pattern Studio는 **2000×2000 PNG 패턴 배경 생성용 정적 웹앱**입니다.  
GitHub에 업로드하고 Cloudflare Pages로 바로 배포할 수 있습니다.

## 이번 v0.6에서 반영한 핵심

### 1) 깔끔 정렬 품질 보정
이전 버전은 `요소 크기 랜덤`, `요소 각도 랜덤`을 꺼도
일부 패턴이 여전히 약간 삐뚤빼뚤해 보일 수 있었습니다.

이번 v0.6에서는 이 부분을 더 강하게 보정했습니다.

반영 내용:
- **요소 위치 랜덤** 토글 제공
- **깔끔 정렬 적용** 버튼 제공
- 깔끔 정렬 적용 시:
  - `요소 크기 랜덤 = OFF`
  - `요소 각도 랜덤 = OFF`
  - `요소 위치 랜덤 = OFF`
  - `불규칙함 = 0`
  - `레이어 회전 = 0`
- 정렬 모드에서는 반복 요소를 **격자 중심 기준으로 배치**해서 더 반듯하게 보이도록 렌더러 보정

### 2) 적용 범위 확대
정렬 보정은 아래 패턴에 적용됩니다.
- 하트 / 별 / 반짝이 / 리본 / 꽃 / 물방울
- 도트 / 손그림 도트 / 낙서 계열
- 업로드한 PNG / SVG 오브젝트 반복 패턴

### 3) 스스로 분석해 함께 보완한 부분
- 업로드 에셋 레이어에도 정렬 UI가 보이도록 개선
- 업로드 에셋 반복 패턴도 위치 흔들림 없이 더 깔끔하게 정렬되도록 수정
- 균일 정렬일 때 일부 낙서/도트 계열의 내부 흔들림도 줄여 더 단정하게 보이도록 보정

### 4) 유지되는 주요 기능
- 기본 레이어 1개로 시작, 필요 시 추가 레이어 생성
- 레이어 순서 이동 / 삭제
- 배경색 포함 PNG 저장
- 투명 배경 저장 지원
- 업로드 SVG/PNG/JPG 반복 패턴화
- SVG 단색 변환
- 즐겨찾기 / 내 프리셋 저장
- 참고 이미지 팔레트 자동 추출
- 심리스 타일 PNG 저장

## 문서
- `V0_6_DEV_SPEC.md` — v0.6 실제 개발 명세서
- `V0_5_DEV_SPEC.md` — 이전 버전 명세서
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
