# Cute Pattern Studio v0.2

Cute Pattern Studio는 **2000×2000 PNG 패턴 배경 생성용 정적 웹앱**입니다.
GitHub에 업로드하고 Cloudflare Pages로 바로 배포할 수 있습니다.

## v0.2 추가 기능

- **패턴 레이어 1·2·3**
  - 각 레이어별로 개별 제어 가능
  - 켜기/끄기
  - 패턴 종류 / 업로드 에셋 선택
  - 색상 4개
  - 크기 / 간격 / 불규칙함 / 회전 / 선 두께 / 투명도 / 디테일
- **사용자 SVG/PNG 업로드**
  - SVG: 원본 색 유지 또는 단색 변환
  - PNG/JPG/WEBP: 반복 타일 / 모티프 반복으로 사용 가능
- **참고 이미지에서 팔레트 자동 추출**
- **즐겨찾기**
- **내 프리셋 저장**
- **심리스 타일 PNG 저장**
  - 가장자리 반복 안정성을 위해 저장 시 각 레이어의 `불규칙함`을 임시로 0으로 맞춰서 내보냅니다.
- **사용자 업로드 PNG 파일을 패턴으로 사용**

## 파일 구성

- `index.html` — 메인 UI
- `styles.css` — 스타일
- `patterns.js` — 기본 패턴 렌더러
- `app.js` — 앱 로직

## GitHub + Cloudflare Pages 배포

1. 이 폴더 전체를 GitHub 저장소에 업로드
2. Cloudflare → Workers & Pages → Create Application
3. Pages → Import an existing Git repository
4. Framework preset: `None`
5. Build command: 비워두거나 `exit 0`
6. Build output directory: `.`
7. Deploy

## 참고

- 업로드한 에셋/즐겨찾기/내 프리셋은 브라우저 `localStorage`에 저장됩니다.
- 아주 큰 SVG/PNG를 많이 저장하면 브라우저 저장 공간 제한에 걸릴 수 있습니다.
- EyeDropper(화면 스포이드)는 지원 브라우저에서만 동작합니다.
