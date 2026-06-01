import React, { useEffect, useMemo, useState } from 'react';
import { getMyBids, type MyBidDto } from '../../api/bids';
import styles from './MySubPage.module.css';

const TABS = ['입찰중', '낙찰', '유찰'] as const;
type Tab = typeof TABS[number];

interface Props { onBack: () => void; }

const STATUS_LABELS: Record<MyBidDto['status'], Tab> = {
  BIDDING: '입찰중',
  WON: '낙찰',
  FAILED: '유찰',
};

const formatTimeLeft = (seconds: number) => {
  if (seconds <= 0) return '마감';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
};

const BidHistoryPage: React.FC<Props> = ({ onBack }) => {
  const [tab, setTab] = useState<Tab>('입찰중');
  const [items, setItems] = useState<MyBidDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getMyBids();
        if (mounted) setItems(data);
      } catch (err) {
        console.error('Failed to load my bid history', err);
        if (mounted) setError('입찰 내역을 불러오지 못했어요.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  const filteredItems = useMemo(() => (
    items.filter(item => STATUS_LABELS[item.status] === tab)
  ), [items, tab]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className={styles.title}>입찰 내역</span>
        <div style={{width:32}}/>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className={styles.list}>
        {loading && <div className={styles.empty}><p className={styles.emptyText}>불러오는 중...</p></div>}

        {!loading && error && (
          <div className={styles.empty}>
            <p style={{fontSize:40}}>!</p>
            <p className={styles.emptyText}>{error}</p>
          </div>
        )}

        {!loading && !error && filteredItems.length > 0 && filteredItems.map(item => (
          <div key={item.id} className={styles.tradeItem}>
            <img src={item.image} alt={item.name} className={styles.tradeImg}/>
            <div className={styles.tradeBody}>
              <p className={styles.tradeName}>{item.name}</p>
              <p className={styles.tradeMeta}>내 입찰가 {item.myBidAmount.toLocaleString()}원 · {item.bidTime}</p>
              <p className={styles.tradePrice}>현재가 {item.currentPrice.toLocaleString()}원 · 입찰 {item.bidCount}회 · {formatTimeLeft(item.timeLeft)}</p>
            </div>
            <div className={styles.tradeActions}>
              <span className={`${styles.statusBadge} ${tab === '입찰중' ? styles.statusBid : tab === '낙찰' ? styles.statusOn : styles.statusDone}`}>
                {tab}
              </span>
            </div>
          </div>
        ))}

        {!loading && !error && filteredItems.length === 0 && (
          <div className={styles.empty}>
            <p style={{fontSize:40}}>🔨</p>
            <p className={styles.emptyText}>{tab} 내역이 없어요</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BidHistoryPage;
