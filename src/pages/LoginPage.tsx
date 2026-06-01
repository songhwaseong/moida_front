import React, { useState } from 'react';
import styles from './LoginPage.module.css';
import moidaO from '../assets/moidaO.svg';
import googleG from '../assets/googleG.svg';
import kakaoTalk from '../assets/kakaoTalk.svg';
import axiosInstance from '../api/axiosInstance';
import { KKO_CLIENT_ID, KKO_REDIRECT_URI, NAV_CLIENT_ID, NAV_REDIRECT_URI, NAV_STATE, GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } from '../config/config';

interface Props {
  onLogin: (name?: string) => void;
  onAdmin: () => void;
  onGoSignup: () => void;
  onFindAccount: (tab?: 'id' | 'pw') => void;
  onGuest?: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { message?: string } } })?.response;
  return response?.data?.message || fallback;
};

const LoginPage: React.FC<Props> = ({ onLogin, onAdmin, onGoSignup, onFindAccount, onGuest }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) { setError('이메일을 입력해주세요'); return; }
    if (!password.trim()) { setError('비밀번호를 입력해주세요'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('이메일 형식이 올바르지 않아요'); return; }

    setLoading(true);

    // 2. 백엔드 API 로그인 시도
    try {
      const response = await axiosInstance.post('/auth/login', { email, password }); // ← /api 중복 제거
      const { accessToken, refreshToken, role, name } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      // refreshToken 은 access 만료 시 axios 인터셉터가 자동 갱신에 사용한다.
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('moida_user_name', name);
      localStorage.setItem('moida_user_role', role);

      if (role === 'ADMIN' || role === 'MANAGER') {
        onAdmin();
      } else {
        onLogin(name);
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, '이메일 또는 비밀번호를 확인해주세요'));
    } finally {
      setLoading(false);
    }
  };

  // 각 소셜 OAuth 인증 페이지 URL로 redirect
  const handleKakaoLogin = () => {
    const url = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${KKO_CLIENT_ID}&redirect_uri=${KKO_REDIRECT_URI}`;
    window.location.href = url;
  };

  const handleNaverLogin = () => {
    const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAV_CLIENT_ID}&redirect_uri=${NAV_REDIRECT_URI}&state=${NAV_STATE}`;
    window.location.href = url;
  };

  const handleGoogleLogin = () => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&scope=email profile`;
    window.location.href = url;
  };

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div className={styles.logo}>
          M<img src={moidaO} alt="O" className={styles.logoMark} /><span className={styles.logoDark}>IDA</span>
        </div>
        <p className={styles.tagline}>중고거래와 경매를 한번에</p>
      </div>

      <div className={styles.form}>
        {/* 이메일 */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>이메일</label>
          <input
            className={`${styles.input} ${error && !email ? styles.inputError : ''}`}
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoComplete="email"
          />
        </div>

        {/* 비밀번호 */}
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
                // 눈 감김 (숨기기)
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                // 눈 뜸 (보기)
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && <p className={styles.errorMsg}>⚠️ {error}</p>}

        {/* 로그인 버튼 */}
        <button
          className={`${styles.loginBtn} ${loading ? styles.loading : ''}`}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>

        {/* 비회원 둘러보기 */}
        {onGuest && (
          <button className={styles.guestBtn} onClick={onGuest}>
            비회원으로 둘러보기
          </button>
        )}

        {/* 아이디/비밀번호 찾기 · 회원가입 */}
        <div className={styles.findRow}>
          <button className={styles.forgotPw} onClick={() => onFindAccount('id')}>아이디 찾기</button>
          <span className={styles.findDivider}>|</span>
          <button className={styles.forgotPw} onClick={() => onFindAccount('pw')}>비밀번호 찾기</button>
          <span className={styles.findDivider}>|</span>
          <button className={styles.signupLink} onClick={onGoSignup}>회원가입</button>
        </div>
      </div>

      {/* 소셜 로그인 */}
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
    </div>
  );
};

export default LoginPage;
