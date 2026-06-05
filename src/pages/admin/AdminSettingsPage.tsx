import React, { useEffect, useState } from 'react';
import styles from './AdminSettingsPage.module.css';
import { IDLE_OPTIONS, type IdleMinutes } from './adminSettingsOptions';
import { useAdminI18n, type AdminLang } from './i18n';
import { getAdminAuctionPolicy, updateAdminAuctionPolicy } from '../../api/adminAuctionPolicy';

interface Props {
  idleMinutes: IdleMinutes;
  onChangeIdleMinutes: (v: IdleMinutes) => void;
}

const LANG_OPTIONS: { value: AdminLang; labelKey: string }[] = [
  { value: 'ko', labelKey: 'admin.settings.lang.ko' },
  { value: 'en', labelKey: 'admin.settings.lang.en' },
];

const AdminSettingsPage: React.FC<Props> = ({ idleMinutes, onChangeIdleMinutes }) => {
  const { t, lang, setLang } = useAdminI18n();

  // 경매 기본 기간 (일/시간/분)
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyMsg, setPolicyMsg] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const p = await getAdminAuctionPolicy();
        if (ignore) return;
        setDays(p.days);
        setHours(p.hours);
        setMinutes(p.minutes);
      } catch {
        if (!ignore) setPolicyMsg('경매 기본 기간을 불러오지 못했습니다.');
      } finally {
        if (!ignore) setPolicyLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  const totalMinutes = days * 24 * 60 + hours * 60 + minutes;

  const handleSavePolicy = async () => {
    if (totalMinutes < 1) {
      setPolicyMsg('경매 기간은 최소 1분 이상이어야 합니다.');
      return;
    }
    setPolicySaving(true);
    setPolicyMsg(null);
    try {
      const updated = await updateAdminAuctionPolicy({ days, hours, minutes });
      setDays(updated.days);
      setHours(updated.hours);
      setMinutes(updated.minutes);
      setPolicyMsg('저장되었습니다. 변경 이후 시작되는 경매부터 적용됩니다.');
    } catch (e: unknown) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? '저장에 실패했습니다.';
      setPolicyMsg(message);
    } finally {
      setPolicySaving(false);
    }
  };

  // 숫자 입력 핸들러 (음수/NaN 방지)
  const onNum = (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(0, parseInt(e.target.value, 10) || 0);
    setter(v);
    setPolicyMsg(null);
  };

  return (
    <div className={styles.wrap}>
      <h2 className={styles.pageTitle}>{t('admin.settings.title')}</h2>

      {/* 언어 설정 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>{t('admin.settings.lang.title')}</div>
            <div className={styles.sectionDesc}>{t('admin.settings.lang.desc')}</div>
          </div>
        </div>

        <div className={styles.optionGroup}>
          {LANG_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.optionBtn} ${lang === opt.value ? styles.optionBtnActive : ''}`}
              onClick={() => setLang(opt.value)}
            >
              {t(opt.labelKey)}
              {lang === opt.value && <span className={styles.optionCheck}>✓</span>}
            </button>
          ))}
        </div>
      </section>

      {/* 자동 로그아웃 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>{t('admin.settings.idle.title')}</div>
            <div className={styles.sectionDesc}>{t('admin.settings.idle.desc')}</div>
          </div>
        </div>

        <div className={styles.optionGroup}>
          {IDLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.optionBtn} ${idleMinutes === opt.value ? styles.optionBtnActive : ''}`}
              onClick={() => onChangeIdleMinutes(opt.value)}
            >
              {opt.label}
              {idleMinutes === opt.value && <span className={styles.optionCheck}>✓</span>}
            </button>
          ))}
        </div>

        <p className={styles.currentInfo}>
          {t('admin.settings.idle.current')}<strong>{idleMinutes}</strong>{t('admin.settings.idle.suffix')}
        </p>
      </section>

      {/* 경매 기본 기간 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>경매 기본 기간</div>
            <div className={styles.sectionDesc}>
              상품 승인 후 경매가 진행되는 기본 기간입니다. 변경 시 이후 시작되는 경매부터 적용되며, 진행 중인 경매에는 영향을 주지 않습니다.
            </div>
          </div>
        </div>

        <div className={styles.durationRow}>
          <div className={styles.durationField}>
            <span className={styles.durationLabel}>일</span>
            <input className={styles.durationInput} type="number" min={0} inputMode="numeric"
              value={days} onChange={onNum(setDays)} disabled={policyLoading || policySaving} />
          </div>
          <div className={styles.durationField}>
            <span className={styles.durationLabel}>시간</span>
            <input className={styles.durationInput} type="number" min={0} inputMode="numeric"
              value={hours} onChange={onNum(setHours)} disabled={policyLoading || policySaving} />
          </div>
          <div className={styles.durationField}>
            <span className={styles.durationLabel}>분</span>
            <input className={styles.durationInput} type="number" min={0} inputMode="numeric"
              value={minutes} onChange={onNum(setMinutes)} disabled={policyLoading || policySaving} />
          </div>
          <button className={styles.saveBtn} onClick={handleSavePolicy} disabled={policyLoading || policySaving}>
            {policySaving ? '저장 중...' : '저장'}
          </button>
        </div>

        <p className={styles.currentInfo}>
          현재 설정: <strong>{days}일 {hours}시간 {minutes}분</strong> (총 {totalMinutes.toLocaleString()}분)
          {policyMsg && <><br />{policyMsg}</>}
        </p>
      </section>
    </div>
  );
};

export default AdminSettingsPage;
