# MOIDA Frontend Agent Guide

이 문서는 `moida_frontend`에서 작업하는 AI 에이전트와 개발자를 위한 하네스 엔지니어링 가이드입니다.
목표는 화면 동작, API 계약, 빌드 검증을 한 번에 추적할 수 있게 만드는 것입니다.

## 1. 작업 범위

- 이 디렉터리는 MOIDA 서비스의 React 프론트엔드입니다.
- 실제 프론트엔드 루트는 `moida_frontend`입니다.
- `moida_frontend/moida_backend` 아래에 보이는 중복 백엔드 복사본은 명시 요청이 없으면 수정하지 않습니다.
- API 계약을 바꾸는 작업은 `../moida_backend/agents.md`의 백엔드 규칙도 함께 확인합니다.

## 2. 기술 스택

- React 19
- Vite 8
- TypeScript 6
- React Compiler
- Axios
- Vanilla CSS + CSS Modules
- 상태 기반 라우팅

## 3. 실행 및 검증 하네스

Windows PowerShell 기준 명령입니다.

```powershell
npm install
npm run dev
npm run lint
npm run build
```

- 기본 개발 서버 주소는 `http://localhost:5173`입니다.
- `/api/*` 요청은 Vite proxy를 통해 백엔드 `http://localhost:9000`으로 전달됩니다.
- 변경 후 최소 검증은 `npm run lint`와 `npm run build`입니다.
- UI 레이아웃을 바꾼 경우 브라우저에서 데스크톱/모바일 폭을 모두 확인합니다.

## 4. API 계약

- API 호출은 `src/api/*` 또는 `src/api/axiosInstance.tsx` 흐름을 우선 사용합니다.
- 기본 API base URL은 `src/config/config.tsx`의 설정을 따릅니다.
- 로그인 토큰은 `localStorage`의 `accessToken`을 기준으로 다룹니다.
- 인증 요청은 Axios interceptor가 `Authorization: Bearer <accessToken>` 헤더를 붙이는 구조를 유지합니다.
- `401 Unauthorized` 처리 흐름을 바꿀 때는 로그인 화면 이동과 토큰 제거 동작을 함께 검증합니다.
- 백엔드 DTO 필드가 바뀌면 `src/types/index.ts`와 API 변환 로직을 같이 갱신합니다.

## 5. 디렉터리 구조

```text
src
├─ api
├─ assets
├─ components
├─ config
├─ data
├─ pages
│  ├─ admin
│  └─ my
├─ styles
├─ types
├─ App.tsx
└─ main.tsx
```

## 6. 라우팅 및 화면 상태

- 현재 프로젝트는 React Router가 아니라 `App.tsx`의 상태 기반 화면 전환을 사용합니다.
- 새 화면을 추가할 때는 `Screen` 타입, 화면 렌더링 분기, 이동 함수, 브라우저 history 동기화를 함께 확인합니다.
- 작성 중인 폼을 떠나는 동작은 `guardedNav`와 `LeaveConfirmModal` 흐름을 우선 사용합니다.
- URL 공유나 뒤로가기 동작을 바꾸는 경우 `pushState`와 `popstate` 처리까지 검증합니다.

## 7. UI 코딩 규칙

- 컴포넌트별 스타일은 CSS Modules를 우선 사용합니다.
- 공통 토큰, 기본 색상, 전역 리셋은 `src/styles/global.css`를 사용합니다.
- 공통 UI는 `src/components`에 두고, 특정 화면에서만 쓰는 UI는 해당 `src/pages` 주변에 둡니다.
- 모바일 폭에서 텍스트 잘림, 버튼 겹침, 가로 스크롤이 생기지 않도록 확인합니다.
- 새 이미지는 실제 화면 목적에 맞는 파일을 `public` 또는 `src/assets` 중 기존 사용 방식에 맞춰 둡니다.
- 접근 가능한 버튼 이름, 입력 label, 모달 포커스 흐름을 가능한 한 유지합니다.

## 8. 데이터와 목업

- `src/data/*`의 목업 데이터는 실제 API 연동 전 화면 확인용입니다.
- API 연동 화면에서는 목업 fallback과 실제 응답 타입이 섞이지 않도록 경계를 분명히 둡니다.
- 서버 응답을 화면 모델로 바꾸는 로직은 API 파일이나 가까운 변환 함수에 모읍니다.

## 9. 테스트 및 검증 기준

- 타입/빌드 검증: `npm run build`
- 정적 검사: `npm run lint`
- API 연동 검증: 백엔드 `localhost:9000` 실행 후 주요 화면에서 요청/응답 확인
- UI 검증: `localhost:5173`에서 변경 화면, 뒤로가기, 모달, 폼 이탈 방지 확인

검증을 실행하지 못했다면 작업 결과에 명령과 이유를 남깁니다.

## 10. 변경 전 체크리스트

- 변경 화면의 진입 경로와 뒤로가기 동작을 확인했습니다.
- API 필드 변경이 백엔드 DTO와 일치합니다.
- `accessToken` 저장/삭제 흐름을 깨지 않았습니다.
- CSS Modules 이름 충돌이나 전역 스타일 누수를 만들지 않았습니다.
- `npm run lint`와 `npm run build`를 실행했거나, 실행하지 못한 이유를 기록했습니다.
