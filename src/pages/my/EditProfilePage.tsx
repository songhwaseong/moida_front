import React, { useState, useEffect } from 'react';
import styles from './EditProfilePage.module.css';
import { getMyProfile, updateMyProfile } from '../../api/member';

interface Props {
  onBack: () => void;
  onSave?: (data: { nickname: string; phone: string }) => void;
  onChangePassword?: () => void;
}

const EditProfilePage: React.FC<Props> = ({ onBack, onSave, onChangePassword }) => {
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [memberNo, setMemberNo] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [avatar, setAvatar] = useState('😊');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [isSocialLogin, setIsSocialLogin] = useState(false);

  const AVATARS = ['😊', '😎', '🥳', '🤩', '😄', '🦊', '🐱', '🐶', '🐼', '🦁'];

  useEffect(() => {
    getMyProfile().then(data => {
      setNickname(data.nickname ?? '');
      setPhone(data.phone ?? '');
      setEmail(data.email ?? '');
      setMemberNo(data.memberNo ?? '');
      setAvatar(data.avatar ?? '😊');
      setIsSocialLogin(!!data.socialLogin);
      setProfileLoading(false);
    }).catch(console.error);
  }, []);

  const validateProfile = () => {
    const e: Record<string, string> = {};
    if (!nickname.trim()) e.nickname = '닉네임을 입력해주세요';
    else if (nickname.length < 2) e.nickname = '닉네임은 2자 이상이어야 해요';
    if (!phone.trim()) e.phone = '휴대폰 번호를 입력해주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validateProfile()) return;
    setSaveLoading(true);
    try {
      await updateMyProfile({ nickname, phone, avatar });
      onSave?.({ nickname, phone });
      onBack();
    } catch (e) {
      console.error(e);
    } finally {
      setSaveLoading(false);
    }
  };

  if (profileLoading) return <div style={{ padding: 40, textAlign: 'center' }}>불러오는 중...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <span className={styles.title}>프로필 수정</span>
        <button
          className={`${styles.saveTopBtn} ${saveLoading ? styles.loading : ''}`}
          onClick={handleSave}
          disabled={saveLoading}
        >
          {saveLoading ? '저장 중' : '저장'}
        </button>
      </div>

      {/* 아바타 선택 */}
      <div className={styles.avatarSection}>
        <div className={styles.avatarMain}>{avatar}</div>
        <p className={styles.avatarHint}>아바타 선택</p>
        <div className={styles.avatarGrid}>
          {AVATARS.map(a => (
            <button
              key={a}
              className={`${styles.avatarOpt} ${avatar === a ? styles.avatarOptActive : ''}`}
              onClick={() => setAvatar(a)}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.form}>
        {/* 닉네임 */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>닉네임</label>
          <input
            className={`${styles.input} ${errors.nickname ? styles.inputError : ''}`}
            type="text"
            value={nickname}
            onChange={e => { setNickname(e.target.value); setErrors(p => ({ ...p, nickname: '' })); }}
            maxLength={12}
          />
          <p className={styles.hint}>{nickname.length}/12</p>
          {errors.nickname && <p className={styles.fieldError}>{errors.nickname}</p>}
        </div>

        {/* 이메일 (읽기 전용) */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>이메일</label>
          <input className={`${styles.input} ${styles.inputReadonly}`} type="email" value={email} readOnly />
          <p className={styles.hint}>이메일은 변경할 수 없어요</p>
        </div>

        {/* 회원번호 (읽기 전용) */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>회원번호</label>
          <input className={`${styles.input} ${styles.inputReadonly}`} type="text" value={memberNo} readOnly />
          <p className={styles.hint}>회원번호는 변경할 수 없어요</p>
        </div>

        {/* 휴대폰 번호 */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>휴대폰 번호</label>
          <input
            className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
            type="tel"
            value={phone}
            onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })); }}
            placeholder="010-0000-0000"
          />
          {errors.phone && <p className={styles.fieldError}>{errors.phone}</p>}
        </div>

        {/* 비밀번호 변경 */}
        {!isSocialLogin && (
          <button className={styles.pwChangeBtn} onClick={onChangePassword}>
            <span>🔒 비밀번호 변경</span>
            <svg width="16" height="16" fill="none" stroke="#B4B2A9" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        )}

        {/* 버튼 행 */}
        <div className={styles.btnRow}>
          <button className={styles.cancelBtn} onClick={onBack}>
            취소하기
          </button>
          <button
            className={`${styles.saveBtn} ${saveLoading ? styles.loading : ''}`}
            onClick={handleSave}
            disabled={saveLoading}
          >
            {saveLoading ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage;
