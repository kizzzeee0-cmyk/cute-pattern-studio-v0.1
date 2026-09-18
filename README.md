# Cute Pattern Studio v0.1

브라우저에서 귀여운 반복 패턴을 만들고 고해상도 PNG로 저장하는 정적 웹앱입니다.

## 핵심 기능
- 48개 패턴 프리셋: 체크/도트/격자/줄무늬/리본/하트/별/꽃/체리/딸기/구름/달·별/스마일/물방울/낙서/컨페티/블롭 등
- 모든 핵심 색상 변경: HTML 컬러피커 + HEX + 지원 브라우저의 EyeDropper API
- 패턴 크기, 간격, 불규칙함, 회전, 선 두께, 투명도, 디테일 조절
- 체크 칸 내부 하트/별/도트 포인트 패턴 포함
- 랜덤 배치(seed) 및 전체 랜덤 조합
- 단색/그라데이션/투명 배경
- 기본 2000×2000 PNG, 최대 6000×6000 커스텀 출력
- 외부 이미지/라이브러리 의존성 없음

## 로컬 실행
`index.html`을 더블클릭해도 대부분 기능이 동작합니다. 다만 화면 스포이드(EyeDropper)는 HTTPS 또는 localhost 같은 secure context가 필요한 브라우저가 있으므로 배포 후 사용하는 것을 권장합니다.

간단한 로컬 서버:

```bash
python -m http.server 8080
```

그 후 `http://localhost:8080` 접속.

## GitHub → Cloudflare Pages 배포
1. GitHub에 새 저장소를 생성합니다.
2. 이 폴더의 `index.html`, `styles.css`, `patterns.js`, `app.js`를 저장소 루트에 업로드합니다.
3. Cloudflare Dashboard → Workers & Pages → Create application → Pages → Import an existing Git repository.
4. GitHub 저장소를 선택합니다.
5. 프레임워크 프리셋은 None, Build command는 `exit 0`, Build output directory는 `.` 로 설정합니다.
6. 배포 후 발급되는 `*.pages.dev` 주소로 접속합니다.

## 파일 구조
- `index.html` UI
- `styles.css` 스타일
- `patterns.js` 패턴 렌더링 엔진 + 프리셋
- `app.js` 상태/컨트롤/스포이드/PNG 내보내기

## 다음 버전에 추천하는 기능
- 사용자 SVG/PNG 장식 불러오기 + 색상화 가능한 SVG 마스크 모드
- 패턴 100+종 확장
- 레이어 방식(배경 + 패턴 1 + 패턴 2 + 코너 장식)
- 즐겨찾기/최근 사용/프리셋 저장(localStorage)
- 색상 비율 슬라이더와 멀티스톱 그라데이션
- 심리스 타일 PNG 별도 출력
- SVG 출력
- 팔레트 이미지 업로드 후 자동 색상 추출
