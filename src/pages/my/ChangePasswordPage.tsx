import React, { useState } from 'react';
import { changePassword } from '../../api/member';
import styles from './EditProfilePage.module.css';

interface Props {
    onBack: () => void;
}

const ChangePasswordPage: React.FC<Props> = ({ onBack }) => {
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw] = useState({ cur: false, new: false, con: false });
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [apiError, setApiError] = useState('');
    const [loading, setLoading] = useState(false);
    const [ok, setOk] = useState(false);

    const pwStrength = () => {
        if (!newPw) return null;
        if (newPw.length < 6) return { label: '약함', color: '#E24B4A', width: '30%' };
        if (newPw.length < 10) return { label: '보통', color: '#EF9F27', width: '60%' };
        return { label: '강함', color: '#3B6D11', width: '100%' };
    };
    const strength = pwStrength();

    const getError = (key: string): string => {
        if (key === 'currentPw') {
            if (apiError) return apiError;
            if (touched[key] && !currentPw) return '현재 비밀번호를 입력해주세요';
        }
        if (key === 'newPw' && touched[key]) {
            if (!newPw) return '새 비밀번호를 입력해주세요';
            if (newPw.length < 8) return '비밀번호는 8자 이상이어야 해요';
            if (newPw === currentPw) return '현재 비밀번호와 동일해요';
        }
        if (key === 'confirmPw' && touched[key]) {
            if (!confirmPw) return '비밀번호를 다시 입력해주세요';
            if (newPw !== confirmPw) return '비밀번호가 일치하지 않아요';
        }
        return '';
    };

    const touch = (key: string) => setTouched(p => ({ ...p, [key]: true }));

    const validate = (): boolean => {
        setTouched({ currentPw: true, newPw: true, confirmPw: true });
        if (!currentPw) return false;
        if (!newPw || newPw.length < 8) return false;
        if (newPw === currentPw) return false;
        if (!confirmPw || newPw !== confirmPw) return false;
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        setApiError('');
        try {
            await changePassword({ currentPassword: currentPw, newPassword: newPw });
            setOk(true);
            setTimeout(() => onBack(), 1500);
        } catch {
            setApiError('현재 비밀번호가 올바르지 않아요');
            setTouched(p => ({ ...p, currentPw: true }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <button className={styles.back} onClick={onBack}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                </button>
                <span className={styles.title}>비밀번호 변경</span>
                <div style={{ width: 32 }} />
            </div>

            <div className={styles.form}>
                {[
                    { key: 'currentPw', label: '현재 비밀번호', val: currentPw, set: setCurrentPw, show: showPw.cur, toggleKey: 'cur' as const },
                    { key: 'newPw', label: '새 비밀번호', val: newPw, set: setNewPw, show: showPw.new, toggleKey: 'new' as const },
                    { key: 'confirmPw', label: '새 비밀번호 확인', val: confirmPw, set: setConfirmPw, show: showPw.con, toggleKey: 'con' as const },
                ].map(field => (
                    <div key={field.key} className={styles.inputGroup}>
                        <label className={styles.label}>{field.label}</label>
                        <div className={styles.pwWrap}>
                            <input
                                className={`${styles.input} ${getError(field.key) ? styles.inputError : ''}`}
                                type={field.show ? 'text' : 'password'}
                                placeholder="입력해주세요"
                                value={field.val}
                                onChange={e => {
                                    field.set(e.target.value);
                                    if (field.key === 'currentPw') setApiError('');
                                }}
                                onBlur={() => touch(field.key)}
                            />
                            <button className={styles.pwToggle} onClick={() => setShowPw(p => ({ ...p, [field.toggleKey]: !p[field.toggleKey] }))}>
                                {field.show ? '숨기기' : '보기'}
                            </button>
                        </div>
                        {field.key === 'newPw' && strength && (
                            <div className={styles.strengthWrap}>
                                <div className={styles.strengthBar}><div className={styles.strengthFill} style={{ width: strength.width, background: strength.color }} /></div>
                                <span className={styles.strengthLabel} style={{ color: strength.color }}>{strength.label}</span>
                            </div>
                        )}
                        {field.key === 'confirmPw' && confirmPw && newPw === confirmPw && <p className={styles.matchOk}>✓ 비밀번호가 일치해요</p>}
                        {getError(field.key) && <p className={styles.fieldError}>{getError(field.key)}</p>}
                    </div>
                ))}

                {ok && <div className={styles.successMsg}>✅ 비밀번호가 변경됐어요!</div>}

                <div className={styles.btnRow}>
                    <button className={styles.cancelBtn} onClick={onBack}>
                        취소하기
                    </button>
                    <button
                        className={`${styles.saveBtn} ${loading ? styles.loading : ''}`}
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? '변경 중...' : '비밀번호 변경'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
