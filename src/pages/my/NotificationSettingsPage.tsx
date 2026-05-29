import React, { useEffect, useState } from 'react';
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettingDto,
} from '../../api/notifications';
import styles from './MySubPage.module.css';

const SETTINGS = [
  { key: 'bidEnabled', label: '입찰 알림', desc: '내 경매에 새 입찰이 생기면 알려드려요' },
  { key: 'priceEnabled', label: '가격 인하 알림', desc: '관심 상품 가격이 내려가면 알려드려요' },
  { key: 'chatEnabled', label: '채팅 알림', desc: '새 메시지가 오면 알려드려요' },
  { key: 'tradeEnabled', label: '거래 완료 알림', desc: '거래가 완료되면 알려드려요' },
  { key: 'marketingEnabled', label: '마케팅 알림', desc: '이벤트, 혜택 정보를 알려드려요' },
] satisfies Array<{ key: keyof NotificationSettingDto; label: string; desc: string }>;

const DEFAULT_SETTINGS: NotificationSettingDto = {
  bidEnabled: true,
  priceEnabled: true,
  chatEnabled: true,
  tradeEnabled: true,
  marketingEnabled: false,
};

interface Props {
  onBack: () => void;
}

const NotificationSettingsPage: React.FC<Props> = ({ onBack }) => {
  const [settings, setSettings] = useState<NotificationSettingDto>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof NotificationSettingDto | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    // 서버 설정을 기준으로 화면을 열고, 실패하면 기본값 UI를 유지합니다.
    const loadSettings = async () => {
      try {
        const data = await getNotificationSettings();
        if (!ignore) {
          setSettings(data);
          setError('');
        }
      } catch (loadError) {
        console.error('Failed to load notification settings', loadError);
        if (!ignore) setError('알림 설정을 불러오지 못했습니다.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void loadSettings();

    return () => { ignore = true; };
  }, []);

  const toggle = async (key: keyof NotificationSettingDto) => {
    // 빠른 반응을 위해 먼저 토글하고, 저장 실패 시 이전 상태로 되돌립니다.
    const previous = settings;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSavingKey(key);
    setError('');

    try {
      const saved = await updateNotificationSettings(next);
      setSettings(saved);
    } catch (saveError) {
      console.error('Failed to save notification settings', saveError);
      setSettings(previous);
      setError('변경사항을 저장하지 못했습니다.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack} type="button" aria-label="뒤로가기">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className={styles.title}>알림 설정</span>
        <div style={{ width: 32 }}/>
      </div>
      <div>
        {loading ? <p className={styles.settingStatus}>설정을 불러오는 중입니다.</p> : null}
        {error ? <p className={styles.settingError}>{error}</p> : null}
        {SETTINGS.map((setting) => (
          <div key={setting.key} className={styles.settingItem}>
            <div className={styles.settingLeft}>
              <div>
                <p className={styles.settingLabel}>{setting.label}</p>
                <p className={styles.settingDesc}>{setting.desc}</p>
              </div>
            </div>
            <button
              className={`${styles.toggle} ${settings[setting.key] ? styles.toggleOn : styles.toggleOff}`}
              onClick={() => toggle(setting.key)}
              disabled={loading || savingKey !== null}
              type="button"
              aria-label={`${setting.label} ${settings[setting.key] ? '끄기' : '켜기'}`}
              aria-pressed={settings[setting.key]}
            >
              <div className={`${styles.toggleDot} ${settings[setting.key] ? styles.toggleDotOn : styles.toggleDotOff}`}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
