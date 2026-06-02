import React, { useEffect, useState } from 'react';
import { deactivateMyAccount, getAccountDeactivationInfo, type AccountDeactivationInfoDto, getMyProfile, type MemberProfileResponse } from '../api/member';
import styles from './MyPage.module.css';

type MenuKey = '입찰 내역' | '관심 목록' | '내 계좌' | '받은 후기' | '내 주소 관리' | '알림 설정' | '자주 묻는 질문' | '고객센터' | '이용약관' | '배송 조회' | '이용 가이드' | '내 등록 상품' | '내 문의' | '회원탈퇴';
type AccountDeactivationStep = 'notice' | 'verify' | 'processing' | 'complete';

const ACCOUNT_DEACTIVATION_CONFIRMATION_TEXT = '회원탈퇴';

const ACCOUNT_DEACTIVATION_REASONS = [
  { value: 'NO_LONGER_USED', label: '서비스를 더 이상 이용하지 않아요' },
  { value: 'LOW_TRUST', label: '거래 신뢰도가 낮다고 느꼈어요' },
  { value: 'MISSING_FEATURE', label: '필요한 기능이 부족해요' },
  { value: 'PRIVACY_CONCERN', label: '개인정보가 걱정돼요' },
  { value: 'OTHER', label: '기타' },
] as const;

const PASSWORD_ACCOUNT_DEACTIVATION_INFO: AccountDeactivationInfoDto = {
  authenticationMethod: 'PASSWORD',
  socialLogin: null,
  confirmationText: null,
};

const MENU_ICONS: Record<MenuKey, React.ReactNode> = {
  '내 등록 상품': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  '입찰 내역': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14.5 2.5l7 7-10 10-3.5-3.5" /><path d="M5 17l-3 3" /><path d="M17.5 6.5l-11 11" /></svg>,
  '관심 목록': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>,
  '내 문의': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  '배송 조회': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
  '내 계좌': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
  '받은 후기': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" /><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" /></svg>,
  '내 주소 관리': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  '알림 설정': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>,
  '이용 가이드': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  '자주 묻는 질문': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  '고객센터': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.9 10.81 19.79 19.79 0 01.86 2.18 2 2 0 012.83 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l.98-.98a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15.18v1.74z" /></svg>,
  '이용약관': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
  '회원탈퇴': <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
};

const MENU_GROUPS: { title: string; items: { label: MenuKey }[] }[] = [
  {
    title: '나의 거래',
    items: [
      { label: '내 등록 상품' },
      { label: '입찰 내역' },
      { label: '관심 목록' },
      { label: '내 문의' },
      { label: '배송 조회' },
    ],
  },
  {
    title: '나의 계정',
    items: [
      { label: '내 계좌' },
      { label: '받은 후기' },
      { label: '내 주소 관리' },
      { label: '알림 설정' },
    ],
  },
  {
    title: '고객지원',
    items: [
      { label: '이용 가이드' },
      { label: '자주 묻는 질문' },
      { label: '고객센터' },
      { label: '이용약관' },
    ],
  },
];

interface Props {
  onLogout?: () => void;
  onMenuClick?: (menu: MenuKey) => void;
  onEditProfile?: () => void;
}

const MyPage: React.FC<Props> = ({ onLogout, onMenuClick, onEditProfile }) => {
  const [isAccountDeactivationModalOpen, setIsAccountDeactivationModalOpen] = useState(false);
  const [accountDeactivationStep, setAccountDeactivationStep] = useState<AccountDeactivationStep>('notice');
  const [isAccountDeactivationSubmitting, setIsAccountDeactivationSubmitting] = useState(false);
  const [accountDeactivationError, setAccountDeactivationError] = useState('');
  const [isAccountDeactivationInfoLoading, setIsAccountDeactivationInfoLoading] = useState(false);
  const [accountDeactivationInfo, setAccountDeactivationInfo] = useState<AccountDeactivationInfoDto | null>(null);
  const [hasAcceptedAccountDeactivationNotice, setHasAcceptedAccountDeactivationNotice] = useState(false);
  const [accountDeactivationPassword, setAccountDeactivationPassword] = useState('');
  const [accountDeactivationConfirmationText, setAccountDeactivationConfirmationText] = useState('');
  const [accountDeactivationReasonCode, setAccountDeactivationReasonCode] = useState('');
  const [accountDeactivationReason, setAccountDeactivationReason] = useState('');
  const [profile, setProfile] = useState<MemberProfileResponse | null>(null);

  useEffect(() => {
    getMyProfile().then(setProfile).catch(console.error);
  }, []);

  const isPasswordAccountDeactivation = accountDeactivationInfo?.authenticationMethod === 'PASSWORD';
  const isSocialAccountDeactivation = accountDeactivationInfo?.authenticationMethod === 'SOCIAL_CONFIRMATION';
  const accountDeactivationConfirmationLabel = accountDeactivationInfo?.confirmationText || ACCOUNT_DEACTIVATION_CONFIRMATION_TEXT;
  const hasRequiredAccountDeactivationAuth = isPasswordAccountDeactivation
    ? accountDeactivationPassword.trim().length > 0
    : isSocialAccountDeactivation && accountDeactivationConfirmationText.trim().length > 0;
  const canSubmitAccountDeactivation = Boolean(accountDeactivationReasonCode && hasRequiredAccountDeactivationAuth);

  const openAccountDeactivationModal = () => {
    setAccountDeactivationStep('notice');
    setAccountDeactivationError('');
    setHasAcceptedAccountDeactivationNotice(false);
    setAccountDeactivationPassword('');
    setAccountDeactivationConfirmationText('');
    setAccountDeactivationReasonCode('');
    setAccountDeactivationReason('');
    setIsAccountDeactivationModalOpen(true);
    setIsAccountDeactivationInfoLoading(false);
    setAccountDeactivationInfo(null);
  };

  const closeAccountDeactivationModal = () => {
    if (isAccountDeactivationSubmitting || accountDeactivationStep === 'processing') return;
    setIsAccountDeactivationModalOpen(false);
  };

  const goToAccountDeactivationVerification = async () => {
    if (!hasAcceptedAccountDeactivationNotice) {
      setAccountDeactivationError('탈퇴 유의사항을 확인하고 동의해주세요.');
      return;
    }
    setIsAccountDeactivationInfoLoading(true);
    setAccountDeactivationError('');

    try {
      const info = await getAccountDeactivationInfo();
      setAccountDeactivationInfo(info);
      setAccountDeactivationPassword('');
      setAccountDeactivationConfirmationText('');
      setAccountDeactivationStep('verify');
    } catch (error) {
      console.error('Failed to load account deactivation info', error);
      const status = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
      if (status === 401 || status === 403) {
        setAccountDeactivationError('로그인 상태를 확인할 수 없습니다. 다시 로그인해주세요.');
        return;
      }
      setAccountDeactivationInfo(PASSWORD_ACCOUNT_DEACTIVATION_INFO);
      setAccountDeactivationPassword('');
      setAccountDeactivationConfirmationText('');
      setAccountDeactivationStep('verify');
    } finally {
      setIsAccountDeactivationInfoLoading(false);
    }
  };

  const finishAccountDeactivation = () => {
    onLogout?.();
  };

  const submitAccountDeactivation = async () => {
    if (!accountDeactivationInfo) {
      setAccountDeactivationError('계정 인증 방식을 먼저 확인해주세요.');
      return;
    }
    if (!hasRequiredAccountDeactivationAuth) {
      setAccountDeactivationError(isPasswordAccountDeactivation ? '현재 비밀번호를 입력해주세요.' : '확인 문구를 입력해주세요.');
      return;
    }
    if (!accountDeactivationReasonCode) {
      setAccountDeactivationError('탈퇴 사유를 선택해주세요.');
      return;
    }

    setIsAccountDeactivationSubmitting(true);
    setAccountDeactivationError('');
    setAccountDeactivationStep('processing');

    try {
      await deactivateMyAccount({
        password: isPasswordAccountDeactivation ? accountDeactivationPassword.trim() : undefined,
        confirmationText: isSocialAccountDeactivation ? accountDeactivationConfirmationText.trim() : undefined,
        reasonCode: accountDeactivationReasonCode,
        reasonDetail: accountDeactivationReason.trim() || undefined,
      });
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('moida_logged_in');
      localStorage.removeItem('moida_user_name');
      localStorage.removeItem('moida_user_role');
      setAccountDeactivationStep('complete');
    } catch (error) {
      console.error('Failed to deactivate account', error);
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : '';
      setAccountDeactivationError(message || '회원탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요.');
      setAccountDeactivationStep('verify');
    } finally {
      setIsAccountDeactivationSubmitting(false);
    }
  };

  const renderAccountDeactivationModal = () => {
    if (!isAccountDeactivationModalOpen) return null;

    return (
      <div className={styles.modalOverlay}>
        <div className={`${styles.modal} ${styles.accountDeactivationModal}`}>
          <div className={styles.accountDeactivationProgress}>
            {['안내', '인증', '처리', '완료'].map((label, index) => {
              const steps: AccountDeactivationStep[] = ['notice', 'verify', 'processing', 'complete'];
              const currentIndex = steps.indexOf(accountDeactivationStep);
              return (
                <span key={label} className={`${styles.accountDeactivationStepDot} ${index <= currentIndex ? styles.accountDeactivationStepActive : ''}`}>
                  {label}
                </span>
              );
            })}
          </div>

          {accountDeactivationStep === 'notice' && (
            <>
              <div className={styles.modalIcon}>
                <svg width="32" height="32" fill="none" stroke="#E24B4A" strokeWidth="1.8" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className={styles.modalTitle}>회원탈퇴 전 확인해주세요</div>
              <div className={styles.noticeList}>
                <p>탈퇴 즉시 계정 이용이 중지됩니다.</p>
                <p>거래 및 관리 이력은 정책과 관계 법령에 따라 보존됩니다.</p>
                <p>예치금 잔액 또는 처리 대기 중인 지갑 요청이 있으면 탈퇴할 수 없습니다.</p>
              </div>
              <label className={styles.noticeCheckRow}>
                <input
                  type="checkbox"
                  checked={hasAcceptedAccountDeactivationNotice}
                  onChange={(event) => {
                    setHasAcceptedAccountDeactivationNotice(event.target.checked);
                    if (event.target.checked) setAccountDeactivationError('');
                  }}
                />
                <span>위 유의사항을 확인했습니다.</span>
              </label>
              {accountDeactivationError && <div className={styles.accountDeactivationError}>{accountDeactivationError}</div>}
              <div className={styles.modalBtns}>
                <button className={styles.modalCancelBtn} onClick={closeAccountDeactivationModal}>취소</button>
                <button className={styles.modalAccountDeactivationBtn} onClick={() => void goToAccountDeactivationVerification()} disabled={!hasAcceptedAccountDeactivationNotice || isAccountDeactivationInfoLoading}>
                  {isAccountDeactivationInfoLoading ? '확인 중...' : '다음'}
                </button>
              </div>
            </>
          )}

          {accountDeactivationStep === 'verify' && (
            <>
              <div className={styles.modalTitle}>본인 인증 및 탈퇴 사유</div>
              <p className={styles.accountDeactivationHelp}>
                {isPasswordAccountDeactivation
                  ? '현재 비밀번호로 본인 확인을 진행합니다.'
                  : `${accountDeactivationInfo?.socialLogin ?? '소셜'} 계정입니다. 확인 문구를 정확히 입력해주세요.`}
              </p>
              {isPasswordAccountDeactivation && (
                <div className={styles.accountDeactivationField}>
                  <label>현재 비밀번호</label>
                  <input
                    type="password"
                    value={accountDeactivationPassword}
                    onChange={(event) => {
                      setAccountDeactivationPassword(event.target.value);
                      if (event.target.value.trim()) setAccountDeactivationError('');
                    }}
                    placeholder="현재 비밀번호 입력"
                    autoComplete="current-password"
                    disabled={isAccountDeactivationSubmitting}
                  />
                </div>
              )}
              {isSocialAccountDeactivation && (
                <div className={styles.accountDeactivationField}>
                  <label>소셜 계정 확인 문구</label>
                  <input
                    value={accountDeactivationConfirmationText}
                    onChange={(event) => {
                      setAccountDeactivationConfirmationText(event.target.value);
                      if (event.target.value.trim()) setAccountDeactivationError('');
                    }}
                    placeholder={`${accountDeactivationConfirmationLabel} 입력`}
                    disabled={isAccountDeactivationSubmitting}
                  />
                </div>
              )}
              <div className={styles.accountDeactivationField}>
                <label>탈퇴 사유</label>
                <select
                  value={accountDeactivationReasonCode}
                  onChange={(event) => {
                    setAccountDeactivationReasonCode(event.target.value);
                    if (event.target.value) setAccountDeactivationError('');
                  }}
                  disabled={isAccountDeactivationSubmitting}
                >
                  <option value="">사유를 선택해주세요</option>
                  {ACCOUNT_DEACTIVATION_REASONS.map(reason => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.accountDeactivationField}>
                <label>상세 의견</label>
                <textarea
                  value={accountDeactivationReason}
                  onChange={(event) => setAccountDeactivationReason(event.target.value)}
                  placeholder="남기고 싶은 의견이 있다면 입력해주세요. (선택)"
                  disabled={isAccountDeactivationSubmitting}
                />
              </div>
              {accountDeactivationError && <div className={styles.accountDeactivationError}>{accountDeactivationError}</div>}
              <div className={styles.modalBtns}>
                <button className={styles.modalCancelBtn} onClick={() => { setAccountDeactivationError(''); setAccountDeactivationStep('notice'); }} disabled={isAccountDeactivationSubmitting}>이전</button>
                <button className={styles.modalAccountDeactivationBtn} onClick={() => void submitAccountDeactivation()} disabled={isAccountDeactivationSubmitting || !canSubmitAccountDeactivation}>
                  탈퇴 처리
                </button>
              </div>
            </>
          )}

          {accountDeactivationStep === 'processing' && (
            <>
              <div className={styles.accountDeactivationSpinner} />
              <div className={styles.modalTitle}>탈퇴 처리 중입니다</div>
              <p className={styles.modalDesc}>계정 상태를 변경하고 세션을 정리하고 있습니다.</p>
              <button className={styles.modalAccountDeactivationBtn} disabled>
                처리 중...
              </button>
            </>
          )}

          {accountDeactivationStep === 'complete' && (
            <>
              <div className={styles.accountDeactivationCompleteIcon}>✓</div>
              <div className={styles.modalTitle}>회원탈퇴가 완료되었습니다</div>
              <p className={styles.modalDesc}>
                현재 세션은 만료되었습니다.<br />다시 이용하려면 새 계정으로 로그인해주세요.
              </p>
              <button className={styles.modalAccountDeactivationBtn} onClick={finishAccountDeactivation}>
                로그인 화면으로
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>마이페이지</h1>
      </div>

      <div className={styles.profileCard}>
        <div className={styles.avatar}>{profile?.avatar ?? '😊'}</div>
        <div className={styles.profileInfo}>
          <p className={styles.username}>{profile?.nickname ?? '-'}</p>
          <p className={styles.email}>{profile?.email ?? '-'}</p>
          <div className={styles.mannerRow}>
            <span className={styles.mannerLabel}>매너온도</span>
            <span className={styles.mannerTemp}>{profile?.mannerTemp ?? 36.5}°C</span>
            <div className={styles.mannerBar}>
              <div className={styles.mannerFill} style={{ width: `${(((profile?.mannerTemp ?? 36.5) - 30) / 70) * 100}%` }} />
            </div>
          </div>
        </div>
        <button className={styles.editBtn} onClick={onEditProfile}>수정</button>
      </div>

      <div className={styles.stats}>
        {[[String(profile?.winCount ?? 0), '낙찰'], [String(profile?.bidCount ?? 0), '입찰'], [String(profile?.wishCount ?? 0), '관심']].map(([num, label], i, arr) => (
          <React.Fragment key={label}>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{num}</span>
              <span className={styles.statLabel}>{label}</span>
            </div>
            {i < arr.length - 1 && <div className={styles.divider} />}
          </React.Fragment>
        ))}
      </div>

      {MENU_GROUPS.map((group) => (
        <div key={group.title} className={styles.menuGroup}>
          <p className={styles.groupTitle}>{group.title}</p>
          {group.items.map((item) => (
            <button key={item.label} className={styles.menuItem} onClick={() => onMenuClick?.(item.label)}>
              <span className={styles.menuIcon}>{MENU_ICONS[item.label]}</span>
              <span className={styles.menuLabel}>{item.label}</span>
              <svg width="16" height="16" fill="none" stroke="#B4B2A9" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      ))}

      <div className={styles.menuGroup}>
        <button className={`${styles.menuItem} ${styles.accountDeactivationItem}`} onClick={openAccountDeactivationModal}>
          <span className={`${styles.menuIcon} ${styles.accountDeactivationIcon}`}>{MENU_ICONS['회원탈퇴']}</span>
          <span className={`${styles.menuLabel} ${styles.accountDeactivationLabel}`}>회원탈퇴</span>
        </button>
      </div>

      {renderAccountDeactivationModal()}

    </main>
  );
};

export default MyPage;
