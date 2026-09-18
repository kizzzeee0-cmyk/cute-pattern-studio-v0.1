# Cute Pattern Studio v0.3

Cute Pattern Studio는 **2000×2000 PNG 패턴 배경 생성용 정적 웹앱**입니다.
GitHub에 업로드하고 Cloudflare Pages로 바로 배포할 수 있습니다.

## v0.3 반영 내용

- **체크/플래드 패턴 다양화**
  - 소프트 플래드
  - 에어리 플래드
  - 파우더 깅엄
  - 패브릭 체크
  - 소프트 깅엄
  - 핸드메이드 플래드
  - 텍스처 체크
- **기존 체크/도트 패턴의 크기·간격 조절 체감 개선**
  - 체크 계열 렌더러가 `size / gap` 값을 실제 배치 간격에 더 직접 반영하도록 수정
- **업로드 에셋 반복 패턴화 개선**
  - 투명 PNG / SVG / JPG 업로드
  - 업로드 즉시 현재 레이어에 자동 연결
  - 업로드 에셋도 `크기 / 간격 / 불규칙함 / 회전 / 투명도` 조절 가능
- **3개 레이어 조합**
- **즐겨찾기 / 내 프리셋 저장**
- **심리스 타일 PNG 저장**
- **참고 이미지 팔레트 자동 추출**

## 사용 흐름

### 1) 내장 패턴 사용
1. 왼쪽에서 편집할 레이어를 선택
2. 패턴 카드 클릭
3. 오른쪽 `레이어 편집`에서 색상 / 크기 / 간격 / 불규칙함 조절

### 2) 투명 PNG를 패턴으로 만들기
1. 왼쪽 `업로드 에셋` 박스에 PNG/SVG/JPG 드래그 또는 클릭 업로드
2. 업로드하면 자동으로 현재 레이어에 연결
3. 오른쪽 `레이어 편집`에서 `업로드 에셋` 모드 확인
4. `모티프 반복` 또는 `반복 타일` 선택
5. `크기 / 간격 / 회전 / 불규칙함` 조절

## 파일 구성

- `index.html` — 메인 UI
- `styles.css` — 스타일
- `patterns.js` — 기본 패턴 렌더러
- `app.js` — 앱 로직
- `V0_3_PLAN.md` — v0.3 반영 요약 + 다음 단계 계획서

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
