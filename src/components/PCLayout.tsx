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
  // 이니셜 버튼 드롭다운에서 마이페이지 메뉴를 직접 선택할 수 있게 한다.
  onMyMenuClick?: (menu: string) => void;
  // 드롭다운 상단의 '마이페이지' 입구. 기존 '마이' 헤더버튼 대체.
  onMyHomeClick?: () => void;
  // 회사정보 Footer는 홈/목록 같은 둘러보기 화면에서만 노출한다.
  // 자체 헤더와 고정 버튼을 가진 서브페이지(상품수정 등)에서는 끈다.
  showFooter?: boolean;
  children: React.ReactNode;
}

// 마이페이지(MyPage)의 그룹 구조와 동일하게 유지한다.
// 메뉴 라벨이 바뀌면 App.tsx의 MyMenuKey 유니언과 함께 갱신해야 한다.
const MY_MENU_GROUPS: { title: string; items: string[] }[] = [
  { title: '나의 거래', items: ['내 등록 상품', '입찰 내역', '관심 목록', '내 문의', '배송 조회'] },
  { title: '나의 계정', items: ['내 계좌', '받은 후기', '내 주소 관리', '알림 설정'] },
  { title: '고객지원', items: ['이용 가이드', '자주 묻는 질문', '고객센터', '이용약관'] },
];

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
  onMyMenuClick, onMyHomeClick,
  showFooter = true,
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

  // 이니셜 버튼 드롭다운: 패널 바깥을 클릭하면 자동으로 닫는다.
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 메인 스크롤 영역에 실제로 스크롤바가 차지하는 가로 크기를 측정해
  // CSS 변수로 노출한다. 드롭다운이 콘텐츠 오른쪽 라인과 정확히 정렬되도록
  // `right: var(--scrollbar-width)`에서 사용한다.
  // macOS 오버레이 스크롤바처럼 폭이 0인 환경에서는 자연스럽게 0이 들어간다.
  React.useEffect(() => {
    const updateScrollbarWidth = () => {
      const main = document.getElementById('main-scroll');
      if (!main) return;
      const width = main.offsetWidth - main.clientWidth;
      document.documentElement.style.setProperty('--scrollbar-width', `${width}px`);
    };
    updateScrollbarWidth();
    window.addEventListener('resize', updateScrollbarWidth);
    const main = document.getElementById('main-scroll');
    const observer = main ? new ResizeObserver(updateScrollbarWidth) : null;
    if (main && observer) observer.observe(main);
    return () => {
      window.removeEventListener('resize', updateScrollbarWidth);
      observer?.disconnect();
    };
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
              // ── 로그인된 사용자 영역 ──────────────────────────────
              // 헤더 우측에 사용자 이름 대신 '이니셜 한 글자'만 표시하는 정사각형 버튼.
              // 클릭하면 마이페이지 메뉴 그룹 + 로그아웃이 들어 있는 드롭다운 패널이
              // 슬라이드 다운 애니메이션과 함께 열린다. (기존의 '마이' 헤더 버튼을 대체)
              <div className={styles.userDropdownWrap} ref={dropdownRef}>
                <button
                  className={`${styles.authBtn} ${styles.authBtnUser}`}
                  onClick={() => setDropdownOpen(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={dropdownOpen}
                >
                  <span className={styles.userNameText}>{(loggedInUserName || '사용자').slice(0, 1)}</span>
                </button>
                {dropdownOpen && (
                  <div className={styles.dropdownPanel} role="menu">
                    {/* 상단 인사 + 마이페이지 진입 — 기존 '마이' 헤더 버튼 대체 */}
                    <button
                      className={styles.dropdownProfile}
                      onClick={() => { setDropdownOpen(false); onMyHomeClick?.(); }}
                    >
                      <span className={styles.dropdownAvatar}>
                        {(loggedInUserName || '사용자').slice(0, 1).toUpperCase()}
                      </span>
                      <span className={styles.dropdownProfileInfo}>
                        <span className={styles.dropdownProfileName}>{loggedInUserName || '사용자'}</span>
                        <span className={styles.dropdownProfileSub}>마이페이지 바로가기 ›</span>
                      </span>
                    </button>

                    {/* 마이페이지 메뉴 그룹들을 슬라이드 다운 패널 형태로 노출 */}
                    {MY_MENU_GROUPS.map(group => (
                      <div key={group.title} className={styles.dropdownGroup}>
                        {group.items.map(item => (
                          <button
                            key={item}
                            className={styles.dropdownMenuItem}
                            onClick={() => { setDropdownOpen(false); onMyMenuClick?.(item); }}
                            role="menuitem"
                          >
                            <span>{item}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 18l6-6-6-6"/>
                            </svg>
                          </button>
                        ))}
                      </div>
                    ))}

                    <div className={styles.dropdownDivider} />
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
          {showFooter && <Footer onTermsClick={onTermsClick} onPrivacyClick={onPrivacyClick} />}
        </div>
      </main>
    </div>
  );
};

export default PCLayout;
