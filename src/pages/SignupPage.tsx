import React, { useState } from 'react';
import styles from './SignupPage.module.css';

import axios from '../api/axiosInstance';

interface Props {
  onSignup: (name?: string) => void;
  onGoLogin: () => void;
  socialMode?: boolean;
  socialName?: string;
  onComplete?: () => void;
}

type Step = 1 | 2;

const getErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { message?: string } } })?.response;
  return response?.data?.message || fallback;
};

const SignupPage: React.FC<Props> = ({ onSignup, onGoLogin, socialMode = false, socialName = '', onComplete }) => {
  const [step, setStep] = useState<Step>(socialMode ? 2 : 1); // 소셜 로그인은 2단계부터 시작, 그이외는 1단계부터
  const [form, setForm] = useState({
    email: '', password: '', passwordConfirm: '',
    name: socialMode ? socialName : '', nickname: '', phone: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [nicknameCount, setNicknameCount] = useState<number | null>(null);
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [emailChecked, setEmailChecked] = useState<boolean | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [agreed, setAgreed] = useState({ all: false, terms: false, privacy: false, marketing: false });
  const [modalType, setModalType] = useState<'terms' | 'privacy' | 'marketing' | null>(null);

  const TERMS_CONTENT: Record<'terms' | 'privacy' | 'marketing', { title: string; body: string }> = {
    terms: {
      title: '이용약관',
      body: `제1조 (목적)\n본 약관은 BAZAR(이하 "회사")가 제공하는 중고거래 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.\n\n제2조 (정의)\n① "서비스"란 회사가 제공하는 중고 물품 거래 플랫폼을 의미합니다.\n② "이용자"란 본 약관에 동의하고 서비스를 이용하는 회원을 말합니다.\n\n제3조 (약관의 효력)\n① 본 약관은 서비스 화면에 게시하거나 이용자에게 공지함으로써 효력이 발생합니다.\n② 회사는 합리적인 사유가 발생할 경우 약관을 변경할 수 있으며, 변경된 약관은 공지 후 적용됩니다.\n\n제4조 (서비스 이용)\n① 이용자는 회사가 정한 방법으로 서비스를 이용해야 합니다.\n② 이용자는 타인의 정보를 도용하거나 허위 정보를 등록해서는 안 됩니다.\n③ 이용자는 불법적인 물품을 거래해서는 안 됩니다.\n\n제5조 (책임 제한)\n회사는 이용자 간의 거래에서 발생하는 분쟁에 대해 직접적인 책임을 지지 않습니다.`,
    },
    privacy: {
      title: '개인정보 처리방침',
      body: `1. 수집하는 개인정보 항목\n회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.\n- 필수: 이메일 주소, 비밀번호, 이름, 닉네임, 휴대폰 번호\n- 선택: 프로필 사진, 주소\n\n2. 개인정보의 수집 및 이용 목적\n- 회원 가입 및 서비스 제공\n- 거래 진행 및 배송\n- 고객 문의 응대\n- 서비스 개선 및 신규 기능 개발\n\n3. 개인정보의 보유 및 이용 기간\n회원 탈퇴 시까지 보유하며, 탈퇴 후 즉시 파기합니다. 단, 관계 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.\n\n4. 개인정보의 제3자 제공\n회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.\n\n5. 개인정보 보호 책임자\n이메일: privacy@bazar.co.kr`,
    },
    marketing: {
      title: '마케팅 정보 수신 동의',
      body: `마케팅 정보 수신 동의 (선택)\n\n회사는 이용자에게 다음과 같은 마케팅 정보를 발송할 수 있습니다.\n\n1. 발송 내용\n- 신규 서비스 및 기능 안내\n- 이벤트 및 프로모션 정보\n- 맞춤형 상품 추천\n- 할인 쿠폰 및 혜택 정보\n\n2. 발송 방법\n- 이메일, 앱 푸시 알림, SMS\n\n3. 수신 거부\n- 언제든지 마이페이지 > 알림 설정에서 수신을 거부할 수 있습니다.\n- 수신 거부 시 불이익은 없습니다.\n\n본 항목은 선택 사항으로, 동의하지 않아도 서비스 이용에 제한이 없습니다.`,
    },
  };

  const set = (key: string, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: '' }));
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = '이메일을 입력해주세요';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = '이메일 형식이 올바르지 않아요';
    else if (emailChecked === null) e.email = '이메일 중복 확인을 해주세요';
    else if (!emailChecked) e.email = '이미 사용 중인 이메일이에요';
    if (!form.password) e.password = '비밀번호를 입력해주세요';
    else if (form.password.length < 8) e.password = '비밀번호는 8자 이상이어야 해요';
    if (!form.passwordConfirm) e.passwordConfirm = '비밀번호를 다시 입력해주세요';
    else if (form.password !== form.passwordConfirm) e.passwordConfirm = '비밀번호가 일치하지 않아요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = '이름을 입력해주세요';
    else if (form.name.length < 2) e.name = '이름은 2자 이상이어야 해요';
    if (!form.nickname.trim()) e.nickname = '닉네임을 입력해주세요';
    else if (form.nickname.length < 2) e.nickname = '닉네임은 2자 이상이어야 해요';
    if (!form.phone.trim()) e.phone = '휴대폰 번호를 입력해주세요';
    if (!agreed.terms) e.terms = '필수 약관에 동의해주세요';
    if (!agreed.privacy) e.terms = '필수 약관에 동의해주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      await axios.post('/auth/signup', {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        nickname: form.nickname, // 3단계에서 백엔드에도 추가해야 함
      });
      const loginResponse = await axios.post('/auth/login', {
        email: form.email,
        password: form.password,
      });
      const { accessToken, refreshToken, name } = loginResponse.data.data;
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      onSignup(name); // 성공 시에만 호출
    } catch (error: unknown) {
      const msg = getErrorMessage(error, '회원가입에 실패했어요');
      setErrors(prev => ({ ...prev, general: msg }));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      await axios.put('/auth/complete-social-profile', {
        nickname: form.nickname,
        phone: form.phone,
      });
      onComplete?.();
    } catch (error: unknown) {
      const msg = getErrorMessage(error, '프로필 등록에 실패했어요');
      setErrors(prev => ({ ...prev, general: msg }));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckNickname = async () => {
    if (!form.nickname.trim()) return;
    setNicknameChecking(true);
    try {
      const res = await axios.get(`/auth/check-nickname?value=${encodeURIComponent(form.nickname.trim())}`);
      setNicknameCount(res.data.data);
    } catch {
      setErrors(prev => ({ ...prev, nickname: '중복 확인에 실패했어요' }));
    } finally {
      setNicknameChecking(false);
    }
  };

  const handleCheckEmail = async () => {
    if (!form.email.trim()) return;
    setEmailChecking(true);
    try {
      const res = await axios.get(`/auth/check-email?value=${encodeURIComponent(form.email.trim())}`);
      setEmailChecked(res.data.data);
    } catch {
      setErrors(prev => ({ ...prev, email: '중복 확인에 실패했어요' }));
    } finally {
      setEmailChecking(false);
    }
  };

  const toggleAll = (checked: boolean) => {
    setAgreed({ all: checked, terms: checked, privacy: checked, marketing: checked });
    if (checked) setErrors((p) => ({ ...p, terms: '' }));
  };

  const toggleOne = (key: 'terms' | 'privacy' | 'marketing', checked: boolean) => {
    const next = { ...agreed, [key]: checked };
    next.all = next.terms && next.privacy && next.marketing;
    setAgreed(next);
    if (key === 'terms' || key === 'privacy') setErrors((p) => ({ ...p, terms: '' }));
  };

  const pwStrength = () => {
    const pw = form.password;
    if (!pw) return null;
    if (pw.length < 6) return { label: '약함', color: '#E24B4A', width: '30%' };
    if (pw.length < 10) return { label: '보통', color: '#EF9F27', width: '60%' };
    return { label: '강함', color: '#3B6D11', width: '100%' };
  };

  const strength = pwStrength();

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <button className={styles.back} onClick={step === 1 ? onGoLogin : () => setStep(1)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span className={styles.headerTitle}>회원가입</span>
        <div style={{ width: 32 }} />
      </div>

      {/* 스텝 인디케이터 */}
      {!socialMode && (
        <>
          <div className={styles.stepRow}>
            <div className={`${styles.stepDot} ${step >= 1 ? styles.stepActive : ''}`} />
            <div className={`${styles.stepLine} ${step >= 2 ? styles.stepLineActive : ''}`} />
            <div className={`${styles.stepDot} ${step >= 2 ? styles.stepActive : ''}`} />
          </div>
          <p className={styles.stepLabel}>{step === 1 ? '계정 정보 입력' : '프로필 설정'} ({step}/2)</p>
        </>
      )}

      <div className={styles.form}>
        {step === 1 ? (
          <>
            {/* 이메일 */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>이메일 *</label>
              <div className={styles.pwWrap}>
                <input
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  type="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={(e) => { set('email', e.target.value); setEmailChecked(null); }}
                />
                <button
                  type="button"
                  className={styles.pwToggle}
                  onClick={handleCheckEmail}
                  disabled={!form.email.trim() || emailChecking}
                >
                  {emailChecking ? '확인 중' : '중복 확인'}
                </button>
              </div>
              {emailChecked !== null && (
                <p className={emailChecked ? styles.matchOk : styles.fieldError}>
                  {emailChecked ? '사용 가능한 이메일이에요 ✓' : '이미 사용 중인 이메일이에요'}
                </p>
              )}
              {errors.email && <p className={styles.fieldError}>{errors.email}</p>}
            </div>

            {/* 비밀번호 */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>비밀번호 *</label>
              <div className={styles.pwWrap}>
                <input
                  className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                  type={showPw ? 'text' : 'password'}
                  placeholder="8자 이상 입력해주세요"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                />
                <button className={styles.pwToggle} onClick={() => setShowPw((p) => !p)} type="button">
                  {showPw ? '숨기기' : '보기'}
                </button>
              </div>
              {strength && (
                <div className={styles.strengthWrap}>
                  <div className={styles.strengthBar}>
                    <div className={styles.strengthFill} style={{ width: strength.width, background: strength.color }} />
                  </div>
                  <span className={styles.strengthLabel} style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
              {errors.password && <p className={styles.fieldError}>{errors.password}</p>}
            </div>

            {/* 비밀번호 확인 */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>비밀번호 확인 *</label>
              <input
                className={`${styles.input} ${errors.passwordConfirm ? styles.inputError : ''}`}
                type="password"
                placeholder="비밀번호를 다시 입력해주세요"
                value={form.passwordConfirm}
                onChange={(e) => set('passwordConfirm', e.target.value)}
              />
              {form.passwordConfirm && form.password === form.passwordConfirm && (
                <p className={styles.matchOk}>✓ 비밀번호가 일치해요</p>
              )}
              {errors.passwordConfirm && <p className={styles.fieldError}>{errors.passwordConfirm}</p>}
            </div>

            <button className={styles.nextBtn} onClick={handleNext}>다음</button>
          </>
        ) : (
          <>
            {/* 이름 */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>이름 *</label>
              <input
                className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                type="text"
                placeholder="실명을 입력해주세요"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                maxLength={20}
                disabled={socialMode}
              />
              {errors.name && <p className={styles.fieldError}>{errors.name}</p>}
            </div>

            {/* 닉네임 */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>닉네임 *</label>
              <div className={styles.pwWrap}>
                <input
                  className={`${styles.input} ${errors.nickname ? styles.inputError : ''}`}
                  type="text"
                  placeholder="사용할 닉네임을 입력해주세요"
                  value={form.nickname}
                  onChange={(e) => { set('nickname', e.target.value); setNicknameCount(null); }}
                  maxLength={12}
                />
                <button
                  type="button"
                  className={styles.pwToggle}
                  onClick={handleCheckNickname}
                  disabled={!form.nickname.trim() || nicknameChecking}
                >
                  {nicknameChecking ? '확인 중' : '중복 확인'}
                </button>
              </div>
              <p className={styles.hint}>{form.nickname.length}/12</p>
              {nicknameCount !== null && (
                <p className={nicknameCount === 0 ? styles.matchOk : styles.hint}>
                  {nicknameCount === 0 ? '사용 가능한 닉네임이에요 ✓' : `${nicknameCount}명이 같은 닉네임을 사용합니다`}
                </p>
              )}
              {errors.nickname && <p className={styles.fieldError}>{errors.nickname}</p>}
            </div>

            {/* 휴대폰 */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>휴대폰 번호 *</label>
              <input
                className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                type="tel"
                placeholder="010-0000-0000"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
              {errors.phone && <p className={styles.fieldError}>{errors.phone}</p>}
            </div>

            {/* 약관 동의 */}
            <div className={styles.agreeBox}>
              <label className={styles.agreeAll}>
                <input
                  type="checkbox"
                  checked={agreed.all}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className={styles.checkbox}
                />
                <span className={styles.agreeAllText}>전체 동의</span>
              </label>
              <div className={styles.agreeDivider} />
              {[
                { key: 'terms' as const, label: '[필수] 이용약관 동의' },
                { key: 'privacy' as const, label: '[필수] 개인정보 처리방침 동의' },
                { key: 'marketing' as const, label: '[선택] 마케팅 정보 수신 동의' },
              ].map((item) => (
                <label key={item.key} className={styles.agreeItem}>
                  <input
                    type="checkbox"
                    checked={agreed[item.key]}
                    onChange={(e) => toggleOne(item.key, e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.agreeItemText}>{item.label}</span>
                  <button className={styles.viewBtn} onClick={(e) => { e.preventDefault(); setModalType(item.key); }}>보기</button>
                </label>
              ))}
              {errors.terms && <p className={styles.fieldError}>{errors.terms}</p>}
            </div>
            {errors.general && <p className={styles.fieldError}>{errors.general}</p>}
            <button
              className={`${styles.nextBtn} ${loading ? styles.loading : ''}`}
              onClick={socialMode ? handleSocialSubmit : handleSubmit}
              disabled={loading}
            >
              {loading ? '처리 중...' : '가입 완료'}
            </button>
          </>
        )}
      </div>

      {step === 1 && (
        <div className={styles.loginRow}>
          <span className={styles.loginText}>이미 계정이 있으신가요?</span>
          <button className={styles.loginLink} onClick={onGoLogin}>로그인</button>
        </div>
      )}

      {/* 약관 모달 */}
      {modalType && (
        <div className={styles.modalOverlay} onClick={() => setModalType(null)}>
          <div className={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>{TERMS_CONTENT[modalType].title}</span>
              <button className={styles.modalClose} onClick={() => setModalType(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <pre className={styles.modalText}>{TERMS_CONTENT[modalType].body}</pre>
            </div>
            <button className={styles.modalConfirm} onClick={() => setModalType(null)}>확인</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignupPage;
