import React, { useState } from 'react';
import moidaLogoMark from '../assets/moidaLogoMark.png';
import styles from './TopBar.module.css';

const BellIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

interface TopBarProps {
  notificationCount?: number;
  onBellClick?: () => void;
  onSearch?: (query: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({
  notificationCount = 3,
  onBellClick,
  onSearch,
}) => {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (query.trim()) onSearch?.(query.trim());
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.row}>
        <div className={styles.logo} aria-label="MOIDA">
          <span>M</span>
          <img className={styles.logoMark} src={moidaLogoMark} alt="" aria-hidden="true" />
          <span>IDA</span>
        </div>
        <div className={styles.icons}>
          <button className={styles.iconBtn} aria-label="알림" onClick={onBellClick}>
            <BellIcon />
            {notificationCount > 0 && <span className={styles.badge}>{notificationCount}</span>}
          </button>
        </div>
      </div>
      <div className={styles.searchBar}>
        <button className={styles.searchIconBtn} onClick={handleSearch} aria-label="검색">
          <SearchIcon />
        </button>
        <input
          type="text"
          placeholder="브랜드, 상품명으로 검색"
          aria-label="검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        {query && (
          <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>
        )}
      </div>
    </header>
  );
};

export default TopBar;
