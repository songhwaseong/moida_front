import React from 'react';
import styles from './AdminSettingsPage.module.css';
import { IDLE_OPTIONS, type IdleMinutes } from './adminSettingsOptions';
import { useAdminI18n, type AdminLang } from './i18n';

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
    </div>
  );
};

export default AdminSettingsPage;
