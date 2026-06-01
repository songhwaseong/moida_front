import React, { useCallback, useEffect, useRef, useState } from 'react';
import ProductCard from '../components/ProductCard';
import { getMyLikes } from '../api/likes';
import { toAuctionItem, toProduct } from '../api/products';
import type { AuctionItem, Product } from '../types';
import styles from './WishlistPage.module.css';
import subStyles from './my/MySubPage.module.css';

interface Props {
  onProductClick?: (product: Product) => void;
  onAuctionClick?: (item: AuctionItem) => void;
  onBack?: () => void;
}

const PAGE_SIZE = 9;
const LOAD_MORE_DELAY = 700;

const formatTime = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const WishlistPage: React.FC<Props> = ({ onProductClick, onAuctionClick, onBack }) => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'live'>('scheduled');
  const [scheduled, setScheduled] = useState<Product[]>([]);
  const [live, setLive] = useState<AuctionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // 경매예정 탭은 홈 화면과 동일하게 9개씩 점진적으로 노출한다.
  const [visibleScheduledState, setVisibleScheduledState] = useState({ tab: activeTab, length: 0, count: PAGE_SIZE });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadTimerRef = useRef<number | null>(null);

  // 내가 좋아요한 상품을 DB에서 받아오고, isLive 여부로 두 탭에 나눠 표시한다.
  useEffect(() => {
    let ignore = false;
    const loadLikedProducts = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const items = await getMyLikes();
        if (ignore) return;
        const liveItems: AuctionItem[] = [];
        const scheduledItems: Product[] = [];
        items.forEach((item) => {
          if (item.isLive) {
            liveItems.push(toAuctionItem(item));
          } else {
            scheduledItems.push(toProduct(item));
          }
        });
        setLive(liveItems);
        setScheduled(scheduledItems);
      } catch (err) {
        if (ignore) return;
        console.error('Failed to load my likes', err);
        setLoadError('관심 목록을 불러오지 못했어요');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    loadLikedProducts();
    return () => { ignore = true; };
  }, []);

  const visibleScheduledCount =
    visibleScheduledState.tab === activeTab && visibleScheduledState.length === scheduled.length
      ? visibleScheduledState.count
      : PAGE_SIZE;
  const visibleScheduled = scheduled.slice(0, visibleScheduledCount);
  const hasMoreScheduled = visibleScheduledCount < scheduled.length;

  // 다음 페이지를 약간의 딜레이 후 추가한다. 즉시 보여주면 무한스크롤 체감이 약해서
  // 홈과 동일하게 700ms 로딩 표시 후 N개 더 노출.
  const scheduleLoadMore = useCallback(() => {
    if (loadTimerRef.current !== null || visibleScheduledCount >= scheduled.length) return;
    setIsLoadingMore(true);
    loadTimerRef.current = window.setTimeout(() => {
      setVisibleScheduledState((prev) => ({
        tab: activeTab,
        length: scheduled.length,
        count: Math.min(
          (prev.tab === activeTab && prev.length === scheduled.length ? prev.count : PAGE_SIZE) + PAGE_SIZE,
          scheduled.length,
        ),
      }));
      setIsLoadingMore(false);
      loadTimerRef.current = null;
    }, LOAD_MORE_DELAY);
  }, [activeTab, scheduled.length, visibleScheduledCount]);

  // 경매예정 탭에서만 스크롤 감지. 메인 스크롤 영역과 window 둘 다 대비.
  useEffect(() => {
    if (activeTab !== 'scheduled' || !hasMoreScheduled) return;

    const root = document.getElementById('main-scroll');

    const handleScroll = () => {
      const doc = document.documentElement;
      const distances: number[] = [];
      if (root && root.scrollHeight > root.clientHeight + 1) {
        distances.push(root.scrollHeight - root.scrollTop - root.clientHeight);
      }
      if (doc.scrollHeight > window.innerHeight + 1) {
        distances.push(doc.scrollHeight - window.scrollY - window.innerHeight);
      }
      if (distances.some((distance) => distance < 220)) scheduleLoadMore();
    };

    root?.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      root?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab, hasMoreScheduled, scheduleLoadMore]);

  useEffect(() => () => {
    if (loadTimerRef.current !== null) {
      window.clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
  }, []);

  return (
    <main className={styles.main}>
      {onBack && (
        <div className={subStyles.header}>
          <button className={subStyles.back} onClick={onBack}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span className={subStyles.title}>관심 목록</span>
          <div style={{ width: 32 }} />
        </div>
      )}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'scheduled' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >경매예정 {scheduled.length}</button>
        <button
          className={`${styles.tab} ${activeTab === 'live' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('live')}
        >경매 {live.length}</button>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.empty}><p className={styles.emptyText}>불러오는 중...</p></div>
        ) : loadError ? (
          <div className={styles.empty}><p className={styles.emptyText}>{loadError}</p></div>
        ) : activeTab === 'scheduled' ? (
          scheduled.length > 0 ? (
            <>
              <div className={styles.productGrid}>
                {visibleScheduled.map((p) => (
                  <ProductCard key={p.id} product={p} onClick={onProductClick} />
                ))}
              </div>
              <div className={styles.loadMoreSentinel} aria-hidden={!hasMoreScheduled && !isLoadingMore}>
                {isLoadingMore && (
                  <div className={styles.loadingMore}>
                    <span className={styles.spinner} />
                    <span>불러오는 중</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              <p style={{ fontSize: 40 }}>🤍</p>
              <p className={styles.emptyText}>관심 상품이 없어요</p>
              <p className={styles.emptySubText}>마음에 드는 상품에 하트를 눌러보세요</p>
            </div>
          )
        ) : (
          live.length > 0 ? (
            <div className={styles.auctionGrid}>
              {live.map((item) => (
                <div
                  key={item.id}
                  className={styles.auctionItem}
                  onClick={() => onAuctionClick?.(item)}
                >
                  <div className={styles.auctionRow}>
                    <div className={styles.auctionImgWrap}>
                      <img src={item.image} alt={item.name} className={styles.auctionImg} />
                      {item.isLive && (
                        <div className={styles.liveBadge}>
                          <span className={styles.liveDot} />LIVE
                        </div>
                      )}
                    </div>
                    <div className={styles.auctionBody}>
                      <p className={styles.auctionName}>{item.name}</p>
                      <p className={styles.auctionCategory}>{item.category}</p>
                      <p className={styles.auctionPrice}> {item.currentPrice.toLocaleString()}</p>
                      <div className={styles.auctionMeta}>
                        <span className={styles.auctionBids}>입찰 {item.bidCount}회</span>
                        <span className={styles.auctionTimer}>⏱ {formatTime(item.timeLeft)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p style={{ fontSize: 40 }}>🔨</p>
              <p className={styles.emptyText}>관심 경매가 없어요</p>
              <p className={styles.emptySubText}>경매에 참여하거나 관심을 등록해보세요</p>
            </div>
          )
        )}
      </div>
    </main>
  );
};

export default WishlistPage;
