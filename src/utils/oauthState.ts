import { API_BASE_URL } from '../config/config';

export type OAuthProvider = 'kakao' | 'naver' | 'google';

export interface OAuthPrepareResult {
  state: string;
  codeChallenge: string | null;
  pkce: boolean;
}

export const prepareOAuth = async (provider: OAuthProvider): Promise<OAuthPrepareResult> => {
  const response = await fetch(`${API_BASE_URL}/auth/oauth/${provider}/prepare`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  const payload = await response.json();
  if (!response.ok || !payload?.success || !payload?.data?.state) {
    throw new Error(payload?.message || 'OAuth security initialization failed.');
  }
  return payload.data as OAuthPrepareResult;
};
