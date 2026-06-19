# MOIDA Frontend

**MOIDA(모이다)** — 중고거래 + 실시간 경매 마켓플레이스의 웹 프론트엔드.
React 19 + TypeScript + Vite 기반 SPA이며, 일반 사용자 화면과 관리자(Admin) 콘솔을 한 앱에서 제공합니다.

> 백엔드 저장소: [`moida_back`](../moida_back) (Spring Boot REST API + WebSocket)

---

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| 코어 | **React 19** + **TypeScript** |
| 빌드 | **Vite (Rolldown)** + **React Compiler** (babel preset) |
| HTTP | **axios** (인터셉터 기반 토큰 갱신) |
| 실시간 | **@stomp/stompjs** (STOMP over WebSocket) |
| 스타일 | CSS Modules + 전역 CSS, **Pretendard** · Gugi 폰트 |
| 라우팅 | **커스텀 History 라우팅** (react-router 미사용 — 아래 참고) |

---

## 빠른 시작

```bash
npm install
npm run dev        # Vite 개발 서버 (기본 http://localhost:5173)
```

개발 서버는 `/api`, `/ws` 요청을 백엔드(**`localhost:9000`**)로 프록시합니다([`vite.config.ts`](vite.config.ts)). 백엔드([`moida_back`](../moida_back))를 먼저 띄워 주세요.

### 스크립트
| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 (HMR) |
| `npm run build` | 타입체크(`tsc -b`) 후 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint 검사 |

---

## 환경변수

소셜 로그인 OAuth 키는 `.env`(또는 빌드 시 `VITE_` 환경변수)로 주입합니다. API 주소는 `/api` 프록시를 쓰므로 별도 설정이 필요 없습니다([`src/config/config.tsx`](src/config/config.tsx)).

```bash
VITE_KAKAO_CLIENT_ID=...
VITE_KAKAO_REDIRECT_URI=...
VITE_NAVER_CLIENT_ID=...
VITE_NAVER_REDIRECT_URI=...
VITE_GOOGLE_CLIENT_ID=...
VITE_GOOGLE_REDIRECT_URI=...
```

---

## 프로젝트 구조

```
src/
├── main.tsx              진입점
├── App.tsx              루트 — 화면 상태머신 · History 라우팅 · 인증 상태 관리
├── api/                 백엔드 API 호출 모듈 (axios, 도메인별 ~37개)
│   └── axiosInstance.tsx  공통 인스턴스 · 토큰 자동 갱신 · 401 처리
├── pages/               일반 사용자 페이지 (홈/경매/상세/검색/판매 등)
│   ├── my/              마이페이지 (구매·판매·입찰 내역, 지갑, 주소, 알림설정 …)
│   └── admin/           관리자 콘솔 (대시보드, 회원·경매·정산·제재·배너·공지 관리, i18n)
├── components/          공통 컴포넌트 (레이아웃, 카드, 모달, 토스트, 실시간 채팅 등)
├── config/             API_BASE_URL · OAuth 설정
├── types/  utils/  data/  styles/  assets/
```

---

## 라우팅 방식 (중요)

이 앱은 **react-router를 쓰지 않고**, [`App.tsx`](src/App.tsx)에서 `Screen` 판별 유니온 타입으로 화면 상태를 직접 관리합니다. 브라우저 주소창/뒤로가기는 `window.history`의 `pushState`/`popState`로 동기화합니다.

- 화면 전환 = `setScreen({ type: 'productDetail', id })` 같은 상태 변경
- URL ↔ 상태 매핑은 `getInitialScreen()`(URL→상태)과 `getHistoryPath()`(상태→URL)가 담당
- 새 화면을 추가할 때는 위 두 함수와 `Screen` 타입을 함께 수정해야 합니다

---

## 주요 기능

**일반 사용자**
- 상품/경매 탐색 (홈 · 경매 · 인기 · 관심목록 · 카테고리 · 검색)
- 실시간 경매 입찰, 상품 1:1 실시간 채팅
- 상품 등록/수정, 구매·판매·입찰 내역, 배송 조회
- 지갑(포인트) 충전/사용, 후기, 문의, 알림
- 로그인: 일반 · **소셜(Kakao/Naver/Google)** · **Passwordless**

**관리자 콘솔** (`/admin`)
- 대시보드, 회원/탈퇴회원 관리, 경매·허위입찰·의심거래 관리
- 정산, 지갑 충전요청 승인, 제재/신고, 배너·공지·FAQ, 채팅 로그
- 로그인/액션 감사 로그, **유휴 시 자동 로그아웃**, 다국어(i18n)

---

## 실시간 (STOMP)

- 헤더 알림 배지, 상품 실시간 채팅, 경매 입찰이 STOMP over WebSocket으로 동작
- 연결 인증은 백엔드에서 발급한 단기 **WebSocket 티켓** 사용
- 알림 구독은 [`NotificationSocketBridge`](src/components/NotificationSocketBridge.tsx)가 전담 (DOM 출력 없이 토스트 + 미읽음 카운트 갱신)

---

## 빌드 · 배포

- [`Dockerfile`](Dockerfile): Node로 빌드(`VITE_*` build-arg 주입) → **Nginx**로 정적 서빙
- [`nginx.conf`](nginx.conf): SPA 새로고침 대응(history fallback) + `/api` 백엔드 프록시
