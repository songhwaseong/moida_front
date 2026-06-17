import React, { useRef, useState, useEffect } from 'react';
import CategoryRow from '../components/CategoryRow';
import Banner from '../components/Banner';
import AuctionCard from '../components/AuctionCard';
import ProductCard from '../components/ProductCard';
import SectionHeader from '../components/SectionHeader';
import { CATEGORIES as FALLBACK_CATEGORIES } from '../data/mockData';
import { getProducts, toAuctionItem, toProduct, type ProductSortKey } from '../api/products';
import { fetchCategories } from '../api/categories';
import type { AuctionItem, Category, Product } from '../types';
import styles from './HomePage.module.css';

interface Props {
  onAuctionClick?: (item: AuctionItem) => void;
  onProductClick?: (product: Product) => void;
  onMoreAuction?: () => void;
  onMoreTrade?: () => void;
  selectedCategory?: string | null;
  onCategorySelect?: (cat: Category) => void;
}

const CARD_WIDTH = 190 + 14;
const CARDS_PER_SLIDE = 3;
const PAGE_SIZE = 9;
const AUTO_INTERVAL = 3000;
const uncategorizedOrder = Number.MAX_SAFE_INTEGER;

// ── 가격 정렬 토글 (SortBar) ─────────────────────────────────────
// 실시간 경매 / 경매 예정 매물 섹션 헤더의 rightSlot 자리에 들어가는 공통 칩 UI.
// '기본'은 섹션마다 다른 기본 정렬(마감 임박 / id 역순)을 사용하고,
// '가격 높은순' / '가격 낮은순'은 백엔드 API 의 sort 파라미터로 위임해
// auction.currentPrice 기준으로 정렬된 결과를 받아온다.
type SortMode = 'default' | 'price_desc' | 'price_asc';
const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'default', label: '기본' },
  { key: 'price_desc', label: '가격 높은순' },
  { key: 'price_asc', label: '가격 낮은순' },
];
const SortBar: React.FC<{ value: SortMode; onChange: (mode: SortMode) => void }> = ({ value, onChange }) => (
  <div className={styles.sortBar}>
    {SORT_OPTIONS.map((opt) => {
      const active = value === opt.key;
      return (
        <button
          key={opt.key}
          type="button"
          className={`${styles.sortChip} ${active ? styles.sortChipActive : ''}`}
          onClick={() => onChange(opt.key)}
          aria-pressed={active}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const HomePage: React.FC<Props> = ({
  onAuctionClick, onProductClick,
  onMoreAuction, onMoreTrade,
  selectedCategory, onCategorySelect,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadTimerRef = useRef<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [visibleProductCount, setVisibleProductCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  // 최초 로드는 placeholder ("불러오는 중...")를 띄우지만, 정렬/카테고리 변경에 의한
  // 재조회 시에는 화면 흔들림(레이아웃 시프트로 인한 스크롤 점프)을 막기 위해
  // 기존 데이터를 그대로 보여주고 응답이 오면 조용히 교체한다.
  const hasLoadedOnceRef = useRef(false);
  // 실시간 경매 / 경매 예정 매물 각각 독립적인 정렬 모드.
  // 'default' 는 기존 동작(실시간=카테고리+마감임박, 예정=카테고리+id 역순),
  // 'price_desc' / 'price_asc' 는 백엔드에서 currentPrice 기준으로 재정렬해 받는다.
  // 경매 예정(SCHEDULED)의 currentPrice 는 시작가(startPrice)와 동일하게 세팅돼 있어 가격 정렬이 의미를 가진다.
  const [auctionSort, setAuctionSort] = useState<SortMode>('default');
  const [productSort, setProductSort] = useState<SortMode>('default');

  // 카테고리는 DB displayOrder 순으로 받아서 표시. 실패 시 mock으로 폴백.
  useEffect(() => {
    let ignore = false;
    fetchCategories()
      .then((data) => { if (!ignore) setCategories(data); })
      .catch((error) => { console.error('Failed to load categories', error); });
    return () => { ignore = true; };
  }, []);

  // Use the visible category row order as the primary sort order for home sections.
  const categoryOrder = new Map(
    categories
      .filter((category) => category.label !== '전체' && category.label !== '?꾩껜')
      .map((category, index) => [category.label, index])
  );

  const getCategoryOrder = (category: string) => categoryOrder.get(category) ?? uncategorizedOrder;

  // 경매 예정 매물: 기본은 카테고리 순 + id 역순.
  // 가격 정렬이 켜져 있으면 서버에서 currentPrice(=시작가) 기준 정렬돼 오므로 서버 순서를 그대로 쓴다.
  const filteredProductsBase = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;
  const filteredProducts = productSort === 'default'
    ? filteredProductsBase.toSorted((a, b) => {
        const categoryDiff = getCategoryOrder(a.category) - getCategoryOrder(b.category);
        if (categoryDiff !== 0) return categoryDiff;
        return b.id - a.id;
      })
    : filteredProductsBase;

  // Live auctions: 기본은 카테고리 순 + 마감 임박 우선.
  // 가격 정렬을 선택한 경우엔 서버에서 이미 currentPrice 기준으로 정렬돼 오므로 그 순서를 그대로 사용한다.
  const filteredAuctionsBase = selectedCategory
    ? auctions.filter((a) => a.category === selectedCategory)
    : auctions;
  const filteredAuctions = auctionSort === 'default'
    ? filteredAuctionsBase.toSorted((a, b) => {
        const categoryDiff = getCategoryOrder(a.category) - getCategoryOrder(b.category);
        if (categoryDiff !== 0) return categoryDiff;
        return a.timeLeft - b.timeLeft;
      })
    : filteredAuctionsBase;

  const totalSlides = Math.ceil(filteredAuctions.length / CARDS_PER_SLIDE);
  const visibleProducts = filteredProducts.slice(0, visibleProductCount);
  const hasMoreProducts = visibleProductCount < filteredProducts.length;

  const goToSlide = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const next = Math.max(0, Math.min(idx, totalSlides - 1));
    el.scrollTo({ left: next * CARD_WIDTH * CARDS_PER_SLIDE, behavior: 'smooth' });
    setActiveSlide(next);
  };

  // ── 홈 데이터 로딩 (LIVE 경매 + SCHEDULED 매물) ────────────────────
  // 매번 두 섹션을 한 번에 받아오며, 다음 변경 중 하나가 발생하면 재조회한다:
  //   - auctionSort  : 실시간 경매 가격 정렬 변경
  //   - productSort  : 경매 예정 매물 가격 정렬 변경
  //   - selectedCategory : 카테고리 칩 변경 (서버에서 '필터 → 정렬' 순으로 처리되도록 함께 전달)
  // 응답 DTO 는 toAuctionItem / toProduct 로 변환해 하위 카드 컴포넌트가 그대로 재사용된다.
  useEffect(() => {
    let ignore = false;

    const loadHomeProducts = async () => {
      // 첫 호출에만 placeholder 를 보여주고, 그 이후 재조회는 무음(silent)로 처리한다.
      const isFirstLoad = !hasLoadedOnceRef.current;
      if (isFirstLoad) setIsInitialLoading(true);
      try {
        // 실시간 경매(LIVE) / 경매 예정(SCHEDULED) 둘 다 같은 정렬 키 체계를 쓴다.
        // SortMode → API 쿼리 키 매핑. 'default' 는 sort 파라미터 미전송 → 백엔드 기본 정렬(createdAt DESC).
        const toSortKey = (mode: SortMode): ProductSortKey | undefined =>
          mode === 'price_desc' ? 'price_desc'
          : mode === 'price_asc' ? 'price_asc'
          : undefined;
        // category 도 함께 보내 서버에서 '필터 → 정렬' 순으로 처리되게 한다.
        // 그래야 가격순 + 카테고리 조합에서 상위 N건 밖의 항목이 누락되지 않는다.
        const [liveAuctionItems, scheduledItems] = await Promise.all([
          getProducts({ status: 'LIVE', size: 100, sort: toSortKey(auctionSort), category: selectedCategory }),
          getProducts({ status: 'SCHEDULED', size: 100, sort: toSortKey(productSort), category: selectedCategory }),
        ]);

        if (ignore) return;
        setAuctions(liveAuctionItems.map(toAuctionItem));
        setProducts(scheduledItems.map(toProduct));
      } catch (error) {
        if (ignore) return;
        console.error('Failed to load home products', error);
        // 첫 로드가 실패했을 때만 빈 상태로 노출한다.
        // 재조회 실패 시 기존 데이터를 비우면 화면이 흔들리므로 그대로 유지한다.
        if (isFirstLoad) {
          setProducts([]);
          setAuctions([]);
        }
      } finally {
        if (!ignore) {
          setIsInitialLoading(false);
          hasLoadedOnceRef.current = true;
        }
      }
    };

    loadHomeProducts();

    return () => {
      ignore = true;
    };
  }, [auctionSort, productSort, selectedCategory]);

  // 자동 슬라이드
  useEffect(() => {
    if (isHovered || filteredAuctions.length === 0) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => {
        const next = prev >= totalSlides - 1 ? 0 : prev + 1;
        const el = scrollRef.current;
        if (el) el.scrollTo({ left: next * CARD_WIDTH * CARDS_PER_SLIDE, behavior: 'smooth' });
        return next;
      });
    }, AUTO_INTERVAL);
    return () => clearInterval(timer);
  }, [isHovered, filteredAuctions.length, totalSlides]);

  // 카테고리 변경 시 초기화
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveSlide(0);
      setVisibleProductCount(PAGE_SIZE);
      setIsLoadingMore(false);
      if (loadTimerRef.current !== null) {
        window.clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
      }
      const el = scrollRef.current;
      if (el) el.scrollTo({ left: 0, behavior: 'instant' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedCategory]);

  useEffect(() => {
    if (!hasMoreProducts) return;

    const root = document.getElementById('main-scroll');
    if (!root) return;

    const scheduleLoadMore = () => {
      if (loadTimerRef.current !== null || visibleProductCount >= filteredProducts.length) return;

      setIsLoadingMore(true);
      loadTimerRef.current = window.setTimeout(() => {
        setVisibleProductCount((count) => Math.min(count + PAGE_SIZE, filteredProducts.length));
        setIsLoadingMore(false);
        loadTimerRef.current = null;
      }, 700);
    };

    const handleScroll = () => {
      const doc = document.documentElement;
      const distances: number[] = [];

      if (root.scrollHeight > root.clientHeight + 1) {
        distances.push(root.scrollHeight - root.scrollTop - root.clientHeight);
      }
      if (doc.scrollHeight > window.innerHeight + 1) {
        distances.push(doc.scrollHeight - window.scrollY - window.innerHeight);
      }

      if (distances.some((distance) => distance < 220)) scheduleLoadMore();
    };

    root.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      root.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [filteredProducts.length, hasMoreProducts, visibleProductCount]);

  useEffect(() => {
    return () => {
      if (loadTimerRef.current !== null) {
        window.clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
      }
    };
  }, []);

  return (
    <main className={styles.main}>
      <CategoryRow
        categories={categories}
        selectedLabel={selectedCategory}
        onSelect={onCategorySelect}
      />

      {selectedCategory && (
        <div className={styles.filterBanner}>
          <span><strong>{selectedCategory}</strong> 카테고리 필터 중</span>
          <button className={styles.filterClear} onClick={() => onCategorySelect?.({ id: 0, emoji: '', label: selectedCategory })}>
            전체보기 ✕
          </button>
        </div>
      )}

      {!selectedCategory && (
        <Banner
          title={"오늘의 핫딜 경매\n지금 바로 참여하세요"}
          subtitle="최대 90% 할인된 가격으로"
          cta="참여하기"
          onClick={onMoreAuction}
        />
      )}

      {/* 실시간 경매 */}
      <div className={styles.sectionHead}>
        <SectionHeader
          title="🔴 실시간 경매"
          onMoreClick={onMoreAuction}
          rightSlot={<SortBar value={auctionSort} onChange={setAuctionSort} />}
        />
      </div>

      {isInitialLoading ? (
        <div className={styles.empty}><p>경매 상품을 불러오는 중...</p></div>
      ) : filteredAuctions.length > 0 ? (
        <div
          className={styles.carouselWrap}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* 왼쪽 화살표 */}
          <button
            className={`${styles.arrow} ${styles.arrowLeft} ${activeSlide === 0 ? styles.arrowHidden : ''}`}
            onClick={() => goToSlide(activeSlide - 1)}
            aria-label="이전"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          {/* 카드 스크롤 영역 */}
          <div ref={scrollRef} className={styles.carouselScroll}>
            {filteredAuctions.map((item) => (
              <div key={item.id} className={styles.carouselItem}>
                <AuctionCard item={item} onClick={onAuctionClick} />
              </div>
            ))}
          </div>

          {/* 오른쪽 화살표 */}
          <button
            className={`${styles.arrow} ${styles.arrowRight} ${activeSlide >= totalSlides - 1 ? styles.arrowHidden : ''}`}
            onClick={() => goToSlide(activeSlide + 1)}
            aria-label="다음"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          {/* 인디케이터 도트 */}
          {totalSlides > 1 && (
            <div className={styles.dots}>
              {Array.from({ length: totalSlides }, (_, i) => (
                <button
                  key={i}
                  className={`${styles.dot} ${activeSlide === i ? styles.dotActive : ''}`}
                  onClick={() => goToSlide(i)}
                  aria-label={`${i + 1}번 슬라이드`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.empty}><p>해당 카테고리의 경매가 없어요</p></div>
      )}

      {/* 경매 예정 매물 */}
      <section className={styles.section} style={{ paddingTop: 18 }}>
        <SectionHeader
          title="경매 예정 매물"
          onMoreClick={onMoreTrade}
          rightSlot={<SortBar value={productSort} onChange={setProductSort} />}
        />
        {isInitialLoading ? (
          <div className={styles.empty}><p>상품을 불러오는 중...</p></div>
        ) : filteredProducts.length > 0 ? (
          <>
            <div className={styles.productGrid}>
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} onClick={onProductClick} />
              ))}
            </div>
            <div ref={loadMoreRef} className={styles.loadMoreSentinel} aria-hidden={!hasMoreProducts && !isLoadingMore}>
              {isLoadingMore && (
                <div className={styles.loadingMore}>
                  <span className={styles.spinner} />
                  <span>불러오는 중</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.empty}><p>해당 카테고리의 매물이 없어요</p></div>
        )}
      </section>
    </main>
  );
};

export default HomePage;
