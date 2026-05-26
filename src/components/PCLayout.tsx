import React from 'react';
import type { MainTab, NavTab } from '../types';
import moidaLogoMark from '../assets/moidaLogoMark.png';
import styles from './PCLayout.module.css';
import Footer from './Footer';

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
  </svg>
);
const BellIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);
const UserIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
interface Props {
  mainTab: MainTab;
  navTab: NavTab;
  onMainTabChange: (tab: MainTab) => void;
  onNavTabChange: (tab: NavTab) => void;
  onSellClick: () => void;
  onSearch: (q: string) => void;
  notificationCount?: number;
  isLoggedIn?: boolean;
  loggedInUserName?: string;
  onAuthClick?: () => void;
  isAdmin?: boolean;
  onSwitchToAdmin?: () => void;
  onTermsClick?: () => void;
  onPrivacyClick?: () => void;
  children: React.ReactNode;
}

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: '홈',      label: '홈' },
  { id: '경매',    label: '경매' },
  { id: '인기',    label: '인기' },
  { id: '관심목록', label: '관심목록' },
];

const PCLayout: React.FC<Props> = ({
  mainTab, navTab, onMainTabChange, onNavTabChange,
  onSellClick, onSearch, notificationCount = 0,
  isLoggedIn = false, loggedInUserName = '', onAuthClick,
  isAdmin = false, onSwitchToAdmin,
  onTermsClick, onPrivacyClick,
  children,
}) => {
  const [query, setQuery] = React.useState('');
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const handleSearch = () => { if (query.trim()) onSearch(query.trim()); };
  const NAV_TABS: NavTab[] = ['search', 'notification', 'chat', 'my'];
  const isNavActive = (id: NavTab) =>
    navTab === id && NAV_TABS.includes(navTab);
  const isMainActive = (id: MainTab) => mainTab === id && !NAV_TABS.includes(navTab);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button className={styles.logo} onClick={() => onMainTabChange('홈')}>
  <span className={`${styles.logoMo} ${styles.letter1}`}>M</span>
  <span className={`${styles.logoMo} ${styles.letter2}`}>
    <img className={styles.logoMark} src={moidaLogoMark} alt="" aria-hidden="true" />
  </span>
  <span className={`${styles.logoIda} ${styles.letter3}`}>I</span>
  <span className={`${styles.logoIda} ${styles.letter4}`}>D</span>
  <span className={`${styles.logoIda} ${styles.letter5}`}>A</span>
</button>
          <div className={styles.searchBar}>
            <SearchIcon />
            <input
              type="text"
              placeholder="상품명, 상품번호 또는 경매번호로 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {query && <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>}
          </div>
          <div className={styles.headerRight}>
            <div className={styles.headerNavGroup}>
              <button
                className={`${styles.iconBtn} ${isNavActive('notification') ? styles.iconBtnActive : ''}`}
                onClick={() => onNavTabChange('notification')}
              >
                <div className={styles.iconWrap}>
                  <BellIcon active={isNavActive('notification')} />
                  {notificationCount > 0 && <span className={styles.badge}>{notificationCount}</span>}
                </div>
                <span>알림</span>
              </button>
              <button
                className={`${styles.iconBtn} ${isNavActive('my') ? styles.iconBtnActive : ''}`}
                onClick={() => onNavTabChange('my')}
              >
                <UserIcon active={isNavActive('my')} />
                <span>마이</span>
              </button>
            </div>
            <div className={styles.headerActionGroup}>
              <button className={styles.sellBtn} onClick={onSellClick}>
                <svg width="13" height="13" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                등록
              </button>
              {isAdmin && (
                <button className={styles.adminBtn} onClick={onSwitchToAdmin} title="관리자 화면" aria-label="관리자 화면으로 이동">
                  <svg className={styles.adminIcon} viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="4" y="5" width="16" height="11" rx="2" />
                    <path d="M9 20h6" />
                    <path d="M12 16v4" />
                    <path d="M8 9h8" />
                    <path d="M8 12h5" />
                  </svg>
                </button>
              )}
            </div>
            {isLoggedIn ? (
              <div className={styles.userDropdownWrap} ref={dropdownRef}>
                <button
                  className={`${styles.authBtn} ${styles.authBtnUser}`}
                  onClick={() => setDropdownOpen(v => !v)}
                >
                  <span className={styles.userNameText}>{(loggedInUserName || '사용자').slice(0, 3)}</span>
                </button>
                {dropdownOpen && (
                  <div className={styles.dropdown}>
                    <button
                      className={styles.dropdownItem}
                      onClick={() => { setDropdownOpen(false); onAuthClick?.(); }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className={`${styles.authBtn} ${styles.authBtnLogin}`}
                onClick={onAuthClick}
              >
                로그인
              </button>
            )}
          </div>
        </div>
        <nav className={styles.tabNav}>
          <div className={styles.tabNavInner}>
            {MAIN_TABS.map(({ id, label }) => (
              <button
                key={id}
                className={`${styles.tabItem} ${isMainActive(id) ? styles.tabActive : ''}`}
                onClick={() => onMainTabChange(id)}
              >
                {label}
              </button>
            ))}
            <div className={styles.tabDivider} />
            <button
              className={`${styles.tabItem} ${isNavActive('search') ? styles.tabActive : ''}`}
              onClick={() => onNavTabChange('search')}
            >
              탐색
            </button>
          </div>
        </nav>
      </header>
      <main id="main-scroll" className={styles.main}>
        <div className={styles.content}>
          {children}
          <Footer onTermsClick={onTermsClick} onPrivacyClick={onPrivacyClick} />
        </div>
      </main>
    </div>
  );
};

export default PCLayout;
