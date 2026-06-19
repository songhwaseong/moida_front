// 소셜 로그인 CSRF(로그인 위조) 방어용 state 토큰 유틸.
//
// OAuth 인가 요청을 시작할 때 예측 불가능한 state 를 만들어 sessionStorage 에 보관하고,
// 콜백으로 돌아온 state 와 일치하는지 확인한다. 공격자가 피해자 브라우저에 임의의
// 인가 콜백(code)을 주입해도, 그 시점에 우리가 발급한 state 와 일치하지 않으므로 차단된다.
// state 는 1회용이라 검증 직후 즉시 폐기한다.

export type OAuthProvider = 'kakao' | 'naver' | 'google';

const keyFor = (provider: OAuthProvider) => `moida_oauth_state_${provider}`;

const randomState = (): string => {
  // 표준 Web Crypto 기반 난수. randomUUID 미지원 환경은 getRandomValues 로 대체.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

/** 인가 요청 시작 시 호출. 새 state 를 만들어 저장하고 반환한다(authorize URL 에 실어 보낸다). */
export const createOAuthState = (provider: OAuthProvider): string => {
  const state = randomState();
  sessionStorage.setItem(keyFor(provider), state);
  return state;
};

/** 콜백에서 호출. 저장해 둔 state 와 돌아온 state 가 일치하는지 확인하고, 1회용이므로 즉시 삭제한다. */
export const consumeOAuthState = (provider: OAuthProvider, returnedState: string | null): boolean => {
  const saved = sessionStorage.getItem(keyFor(provider));
  sessionStorage.removeItem(keyFor(provider));
  return saved !== null && returnedState !== null && saved === returnedState;
};
