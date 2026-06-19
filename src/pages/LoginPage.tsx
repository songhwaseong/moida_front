import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './LoginPage.module.css';
import moidaO from '../assets/moidaO.svg';
import googleG from '../assets/googleG.svg';
import kakaoTalk from '../assets/kakaoTalk.svg';
import axiosInstance from '../api/axiosInstance';
import PasswordlessManagePanel from '../components/PasswordlessManagePanel';
import {
  cancelPasswordlessLogin,
  completePasswordlessLogin,
  startPasswordlessLogin,
  type PasswordlessLoginStartResponse,
} from '../api/passwordless';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_REDIRECT_URI,
  KKO_CLIENT_ID,
  KKO_REDIRECT_URI,
  NAV_CLIENT_ID,
  NAV_REDIRECT_URI,
} from '../config/config';
import type { LoginResponse } from '../types';
import { isAdminRole, saveAuthSession } from '../utils/authStorage';
import { prepareOAuth } from '../utils/oauthState';

interface Props {
  onLogin: (name?: string) => void;
  onAdmin: () => void;
  onGoSignup: () => void;
  onFindAccount: (tab?: 'id' | 'pw') => void;
  onGuest?: () => void;
  // 소셜 로그인 콜백 등 화면 진입 시점에 미리 보여줄 안내/에러 메시지.
  initialError?: string;
}

type LoginMode = 'password' | 'passwordless';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAVED_EMAIL_KEY = 'moida_login_email';
const SAVED_LOGIN_MODE_KEY = 'moida_login_mode';

const getErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { message?: string } } })?.response;
  return response?.data?.message || fallback;
};

const LoginPage: React.FC<Props> = ({ onLogin, onAdmin, onGoSignup, onFindAccount, onGuest, initialError }) => {
  const [email, setEmail] = useState(() => localStorage.getItem(SAVED_EMAIL_KEY) ?? '');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>(() => (
    localStorage.getItem(SAVED_LOGIN_MODE_KEY) === 'passwordless' ? 'passwordless' : 'password'
  ));
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(localStorage.getItem(SAVED_EMAIL_KEY)));
  const [error, setError] = useState(initialError ?? '');
  const [loading, setLoading] = useState(false);
  const [passwordlessLoading, setPasswordlessLoading] = useState(false);
  const [passwordlessSession, setPasswordlessSession] = useState<PasswordlessLoginStartResponse | null>(null);
  const [passwordlessExpiresAt, setPasswordlessExpiresAt] = useState<number | null>(null);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const passwordlessSocketRef = useRef<WebSocket | null>(null);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => () => {
    passwordlessSocketRef.current?.close();
  }, []);

  useEffect(() => {
    if (!passwordlessSession) return undefined;

    const timer = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [passwordlessSession]);



  const storeLogin = (login: LoginResponse) => {
    const adminLogin = isAdminRole(login.role);
    saveAuthSession({
      accessToken: login.accessToken,
      name: login.name,
      role: login.role,
    }, adminLogin ? 'session' : 'local');

    if (adminLogin) {
      onAdmin();
    } else {
      onLogin(login.name);
    }
  };

  const handlePasswordLogin = async () => {
    setError('');
    if (!email.trim()) { setError('이메일을 입력해주세요'); return; }
    if (!password.trim()) { setError('비밀번호를 입력해주세요'); return; }
    if (!EMAIL_PATTERN.test(email)) { setError('이메일 형식이 올바르지 않아요'); return; }

    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      storeLogin(response.data.data);
    } catch (err: unknown) {
      // Passwordless 등록 회원은 일반 로그인이 차단된다(M008) → Passwordless 모드로 전환해 안내.
      const errorCode = (err as { response?: { data?: { errorCode?: string } } })?.response?.data?.errorCode;
      if (errorCode === 'M008') {
        selectLoginMode('passwordless');
      }
      setError(getErrorMessage(err, '이메일 또는 비밀번호를 확인해주세요'));
    } finally {
      setLoading(false);
    }
  };

  const completePasswordless = async (sessionOverride?: PasswordlessLoginStartResponse) => {
    const session = sessionOverride ?? passwordlessSession;
    if (!session) return;

    setPasswordlessLoading(true);
    setError('');
    try {
      const result = await completePasswordlessLogin(session.requestToken);

      if (result.status === 'APPROVED' && result.login) {
        passwordlessSocketRef.current?.close();
        passwordlessSocketRef.current = null;
        setPasswordlessExpiresAt(null);
        storeLogin(result.login);
        return;
      }

      if (result.status === 'DENIED') {
        setError('Passwordless 인증이 거절되었습니다.');
        return;
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Passwordless 인증 확인에 실패했어요'));
    } finally {
      setPasswordlessLoading(false);
    }
  };

  const handlePasswordlessLogin = async () => {
    setError('');
    if (!email.trim()) {
      setError('이메일을 입력해주세요');
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError('이메일 형식이 올바르지 않아요');
      return;
    }

    setPasswordlessLoading(true);
    try {
      passwordlessSocketRef.current?.close();
      const session = await startPasswordlessLogin(email.trim());
      setPasswordlessSession(session);
      setPasswordlessExpiresAt(Date.now() + session.expiresInSeconds * 1000);
      setClockTick(Date.now());

      if (session.pushConnectorUrl && session.pushConnectorToken) {
        const socket = new WebSocket(session.pushConnectorUrl);
        passwordlessSocketRef.current = socket;
        socket.onopen = () => {
          socket.send(JSON.stringify({ type: 'hand', pushConnectorToken: session.pushConnectorToken }));
        };
        socket.onmessage = () => {
          void completePasswordless(session);
        };
      }
    } catch (err) {
      setPasswordlessSession(null);
      setError(getErrorMessage(err, 'Passwordless 로그인을 시작하지 못했어요'));
    } finally {
      setPasswordlessLoading(false);
    }
  };

  const cancelPasswordless = useCallback(async () => {
    if (!passwordlessSession) return;

    setPasswordlessLoading(true);
    try {
      await cancelPasswordlessLogin(passwordlessSession.requestToken);
    } catch {
      // 취소 실패는 UI 초기화를 막지 않는다.
    } finally {
      passwordlessSocketRef.current?.close();
      passwordlessSocketRef.current = null;
      setPasswordlessSession(null);
      setPasswordlessExpiresAt(null);
      setPasswordlessLoading(false);
    }
  }, [passwordlessSession]);

  const handleSubmit = () => {
    if (loginMode === 'passwordless') {
      void handlePasswordlessLogin();
      return;
    }

    void handlePasswordLogin();
  };

  const selectLoginMode = (mode: LoginMode) => {
    setError('');
    setLoginMode(mode);
    localStorage.setItem(SAVED_LOGIN_MODE_KEY, mode);
    setShowManage(false);
    if (mode === 'passwordless') {
      setShowPw(false);
    } else {
      passwordlessSocketRef.current?.close();
      passwordlessSocketRef.current = null;
      setPasswordlessSession(null);
      setPasswordlessExpiresAt(null);
    }
  };

  const openManagePanel = () => {
    setError('');
    setShowManage(true);
  };

  const closeManagePanel = () => {
    setShowManage(false);
    setError('');
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (rememberEmail) {
      localStorage.setItem(SAVED_EMAIL_KEY, value);
    }
  };

  const handleRememberEmailChange = (checked: boolean) => {
    setRememberEmail(checked);
    if (checked) {
      localStorage.setItem(SAVED_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
  };

  const handleKakaoLogin = async () => {
    const { state } = await prepareOAuth('kakao');
    const url = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${KKO_CLIENT_ID}&redirect_uri=${KKO_REDIRECT_URI}&state=${state}`;
    window.location.href = url;
  };

  const handleNaverLogin = async () => {
    const { state } = await prepareOAuth('naver');
    const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAV_CLIENT_ID}&redirect_uri=${NAV_REDIRECT_URI}&state=${state}`;
    window.location.href = url;
  };

  const handleGoogleLogin = async () => {
    const { state, codeChallenge } = await prepareOAuth('google');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&scope=email profile&state=${state}&code_challenge=${encodeURIComponent(codeChallenge ?? '')}&code_challenge_method=S256`;
    window.location.href = url;
  };

  const submitText = loginMode === 'passwordless'
    ? passwordlessSession
      ? '인증 대기 중'
      : passwordlessLoading
        ? '요청 중...'
        : '로그인'
    : loading
      ? '로그인 중...'
      : '로그인';
  const isSubmitDisabled = loading || passwordlessLoading || (loginMode === 'passwordless' && Boolean(passwordlessSession));
  const passwordlessRemainingSeconds = passwordlessExpiresAt
    ? Math.max(0, Math.ceil((passwordlessExpiresAt - clockTick) / 1000))
    : 0;
  const passwordlessProgress = passwordlessSession && passwordlessSession.expiresInSeconds > 0
    ? Math.max(0, Math.min(100, (passwordlessRemainingSeconds / passwordlessSession.expiresInSeconds) * 100))
    : 0;
  // 인증번호를 3글자 + 공백 + 3글자 형태로 표시 (예: "123 456")
  const passwordlessCodeText = passwordlessSession
    ? passwordlessSession.oneTimeToken.replace(/(.{3})(?=.)/g, '$1 ')
    : ' ';

  useEffect(() => {
    if (passwordlessSession && passwordlessRemainingSeconds <= 0) {
      const timer = setTimeout(() => {
        void cancelPasswordless();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [passwordlessRemainingSeconds, passwordlessSession, cancelPasswordless]);

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div className={styles.logo}>
          M<img src={moidaO} alt="O" className={styles.logoMark} /><span className={styles.logoDark}>IDA</span>
        </div>
        <p className={styles.tagline}>중고거래와 경매를 한번에</p>
      </div>

      <div className={styles.form}>
        {showManage ? (
          <PasswordlessManagePanel onBack={closeManagePanel} />
        ) : (
          <>
            <div className={styles.inputGroup}>
              <label className={styles.label}>이메일</label>
              <input
                className={`${styles.input} ${error && !email ? styles.inputError : ''}`}
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                autoComplete="email"
              />
            </div>

            {loginMode === 'password' ? (
              <>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>비밀번호</label>
                  <div className={styles.pwWrap}>
                    <input
                      className={`${styles.input} ${error && !password ? styles.inputError : ''}`}
                      type={showPw ? 'text' : 'password'}
                      placeholder="비밀번호를 입력해주세요"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                      autoComplete="current-password"
                    />
                    <button
                      className={styles.pwToggle}
                      onClick={() => setShowPw((p) => !p)}
                      type="button"
                      aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {showPw ? (
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <label className={styles.rememberRow}>
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => handleRememberEmailChange(e.target.checked)}
                  />
                  <span>이메일 저장</span>
                </label>
              </>
            ) : (
              <>
                <div className={styles.passwordlessPanel}>
                  <div className={styles.passwordlessTimer}>
                    <div className={styles.passwordlessTimerFill} style={{ width: `${passwordlessProgress}%` }} />
                    <div className={styles.passwordlessCode}>
                      {passwordlessSession ? passwordlessCodeText : '\u00A0'}
                    </div>
                  </div>
                  {passwordlessSession && (
                    <div className={styles.passwordlessTimeText}>남은 시간 {passwordlessRemainingSeconds}초</div>
                  )}
                </div>

                <label className={styles.rememberRow}>
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => handleRememberEmailChange(e.target.checked)}
                  />
                  <span>이메일 저장</span>
                </label>
              </>
            )}

            {error && <p className={styles.errorMsg}>⚠️ {error}</p>}

            <div className={styles.modeSwitch} aria-label="로그인 방식 선택">
              <button
                type="button"
                className={`${styles.modeOption} ${loginMode === 'password' ? styles.modeOptionActive : ''}`}
                onClick={() => selectLoginMode('password')}
              >
                비밀번호
              </button>
              <button
                type="button"
                className={`${styles.modeOption} ${loginMode === 'passwordless' ? styles.modeOptionActive : ''}`}
                onClick={() => selectLoginMode('passwordless')}
              >
                Passwordless
              </button>
            </div>

            <button
              className={`${styles.loginBtn} ${loading || passwordlessLoading ? styles.loading : ''}`}
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
            >
              {submitText}
            </button>

            {onGuest && (
              <button className={styles.guestBtn} onClick={onGuest}>
                비회원으로 둘러보기
              </button>
            )}

            {loginMode === 'password' && (
              <div className={styles.findRow}>
                <button className={styles.forgotPw} onClick={() => onFindAccount('id')}>아이디 찾기</button>
                <span className={styles.findDivider}>|</span>
                <button className={styles.forgotPw} onClick={() => onFindAccount('pw')}>비밀번호 찾기</button>
                <span className={styles.findDivider}>|</span>
                <button className={styles.signupLink} onClick={onGoSignup}>회원가입</button>
              </div>
            )}

            {loginMode === 'passwordless' && (
              <div className={styles.findRow}>
                <button className={styles.signupLink} onClick={onGoSignup}>회원가입</button>
                <span className={styles.findDivider}>|</span>
                <button className={styles.signupLink} onClick={openManagePanel}>
                  Passwordless 등록/해지
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!showManage && loginMode !== 'passwordless' && (
        <div className={styles.socialBtns}>
          <button className={`${styles.socialBtn} ${styles.kakao}`} onClick={handleKakaoLogin}>
            <img src={kakaoTalk} alt="" aria-hidden="true" className={styles.socialIconImg} />
            카카오로 로그인
          </button>
          <button className={`${styles.socialBtn} ${styles.naver}`} onClick={handleNaverLogin}>
            <span className={styles.socialIcon} style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>N</span>
            네이버로 로그인
          </button>
          <button className={`${styles.socialBtn} ${styles.google}`} onClick={handleGoogleLogin}>
            <img src={googleG} alt="" aria-hidden="true" className={`${styles.socialIconImg} ${styles.googleIcon}`} />
            구글로 로그인
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
