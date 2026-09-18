# Cute Pattern Studio v0.7

Cute Pattern Studio는 **2000×2000 PNG 패턴 배경 생성용 정적 웹앱**입니다.  
GitHub에 업로드하고 Cloudflare Pages로 바로 배포할 수 있습니다.

## 이번 v0.7에서 반영한 핵심

### 1) 패턴 위치 조절 추가
패턴에 따라 반복 시작점이 애매해서
가장자리에서 오브젝트나 체크 칸이 애매하게 잘려 보이는 경우가 있었습니다.

이번 v0.7에서는 각 레이어마다 다음 조절을 추가했습니다.
- **위치 X**
- **위치 Y**

이제 패턴을 좌우/상하로 조금씩 이동해서,
체크 칸이나 도트, 하트, 별, 업로드 오브젝트의 시작 위치를 더 예쁘게 맞출 수 있습니다.

### 2) 적용 범위
위치 조절은 아래 모두에 적용됩니다.
- 내장 패턴 전체
- 하트 / 별 / 도트 / 리본 / 낙서 / 물방울 등 오브젝트 패턴
- 업로드한 PNG / SVG 반복 패턴

### 3) 유지되는 주요 기능
- 요소 크기 / 각도 / 위치 랜덤 토글
- `깔끔 정렬 적용` 버튼
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
- `V0_7_DEV_SPEC.md` — v0.7 실제 개발 명세서
- `V0_6_DEV_SPEC.md` — 이전 버전 명세서
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
