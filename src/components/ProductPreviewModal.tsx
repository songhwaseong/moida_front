import React, { useState, useRef, useEffect } from 'react';
import styles from './ProductPreviewModal.module.css';

interface PreviewData {
  images: string[];
  mainImageIndex: number;
  title: string;
  category: string;
  condition: string;
  type?: 'AUCTION' | 'TRADE';  // ← 추가
  auctionStartPrice: string;   // 경매: 시작가 / 중고거래: previewPrice
  buyNowPrice?: string;
  minBidUnit?: string;
  tradeMethod: string;
  isPriceNegotiable?: boolean; // ← 추가
  description: string;
  location: string;
  auctionDate?: string;
}

interface Props {
  data: PreviewData;
  onClose: () => void;
}

const ProductPreviewModal: React.FC<Props> = ({ data, onClose }) => {
  const [activeImg, setActiveImg] = useState(data.mainImageIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isScrolling = useRef<boolean | null>(null);
  const activeImgRef = useRef(activeImg);
  const dragOffsetRef = useRef(0);

  const displayImages = data.images.length > 0 ? data.images : [];
  const total = displayImages.length;

  // 경매/중고거래 여부 (type이 없으면 기존 경매 방식으로 동작)
  const isAuction = !data.type || data.type === 'AUCTION';

  // 가격 표시 텍스트
  const priceLabel = isAuction ? '경매 시작가' : '판매가';
  const priceDisplay = isAuction
    ? (data.auctionStartPrice
      ? `₩ ${Number(data.auctionStartPrice.replace(/,/g, '')).toLocaleString()}`
      : '₩ 0')
    : (data.isPriceNegotiable
      ? '가격 협의'
      : (data.auctionStartPrice
        ? `₩ ${Number(data.auctionStartPrice.replace(/,/g, '')).toLocaleString()}`
        : '-'));

  useEffect(() => { activeImgRef.current = activeImg; }, [activeImg]);

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= total) return;
    setActiveImg(idx);
  };

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isScrolling.current = null;
      dragOffsetRef.current = 0;
      setIsDragging(true);
      setDragOffset(0);
    };

    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - touchStartX.current;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (isScrolling.current === null) {
        isScrolling.current = Math.abs(dy) > Math.abs(dx);
      }
      if (isScrolling.current) return;
      e.preventDefault();
      dragOffsetRef.current = dx;
      setDragOffset(dx);
    };

    const onTouchEnd = () => {
      setIsDragging(false);
      const offset = dragOffsetRef.current;
      const current = activeImgRef.current;
      if (!isScrolling.current) {
        if (offset < -50 && current < total - 1) setActiveImg(current + 1);
        else if (offset > 50 && current > 0) setActiveImg(current - 1);
      }
      dragOffsetRef.current = 0;
      setDragOffset(0);
      isScrolling.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [total]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div className={styles.handle} />
        <div className={styles.header}>
          <span className={styles.headerTitle}>미리보기</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className={styles.headerDesc}>실제 등록 시 이렇게 보여요</p>

        <div className={styles.scroll}>

          {/* 이미지 슬라이더 */}
          <div className={styles.imgArea}>
            {displayImages.length > 0 ? (
              <>
                <div className={styles.sliderWrap} ref={sliderRef}>
                  <div
                    className={styles.sliderTrack}
                    style={{
                      transform: `translateX(calc(${-activeImg * 100}% + ${dragOffset}px))`,
                      transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    }}
                  >
                    {displayImages.map((img, i) => (
                      <div key={i} className={styles.sliderSlide}>
                        <img src={img} alt="" className={styles.mainImgEl} />
                      </div>
                    ))}
                  </div>

                  {data.condition && (
                    <span className={styles.conditionBadge}>{data.condition}</span>
                  )}

                  {total > 1 && activeImg > 0 && (
                    <button className={`${styles.arrowBtn} ${styles.arrowLeft}`} onClick={() => goTo(activeImg - 1)}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                  )}
                  {total > 1 && activeImg < total - 1 && (
                    <button className={`${styles.arrowBtn} ${styles.arrowRight}`} onClick={() => goTo(activeImg + 1)}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  )}

                  {total > 1 && (
                    <div className={styles.dots}>
                      {displayImages.map((_, i) => (
                        <button
                          key={i}
                          className={`${styles.dot} ${activeImg === i ? styles.dotActive : ''}`}
                          onClick={() => goTo(i)}
                        />
                      ))}
                    </div>
                  )}

                  <span className={styles.imgCount}>{activeImg + 1} / {total}</span>
                </div>
              </>
            ) : (
              <div className={styles.noImage}>
                <svg width="40" height="40" fill="none" stroke="#ccc" strokeWidth="1.5" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span>사진 없음</span>
              </div>
            )}
          </div>

          {/* 판매자 정보 (더미) */}
          <div className={styles.section}>
            <div className={styles.sellerRow}>
              <div className={styles.sellerAvatar}>😊</div>
              <div className={styles.sellerInfo}>
                <p className={styles.sellerName}>나의 상점</p>
                <div className={styles.sellerMeta}>
                  <span className={styles.sellerTemp}>🌡 36.5°C</span>
                  <span className={styles.sellerLoc}>📍 {data.location || '지역 미입력'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.divider} />

          {/* 상품 정보 */}
          <div className={styles.section}>
            {data.category && (
              <div className={styles.tagRow}>
                <span className={styles.categoryTag}>{data.category}</span>
                {/* ── 거래 방식 뱃지 추가 ── */}
                <span className={styles.categoryTag}>
                  {isAuction ? '🔨 경매' : '🤝 중고거래'}
                </span>
              </div>
            )}
            <h2 className={styles.name}>{data.title || '(상품명 미입력)'}</h2>
            <p className={styles.meta}>{data.location || '지역 미입력'} · 방금 전</p>

            {/* ── 가격 표시 — 타입에 따라 라벨 분기 ── */}
            <p className={styles.price}>
              {priceDisplay}
              <span className={styles.priceLabel}> {priceLabel}</span>
            </p>
          </div>

          <div className={styles.divider} />

          {/* 상품 설명 */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>상품 설명</p>
            <p className={styles.description}>{data.description || '(상품 설명 미입력)'}</p>
          </div>

          <div className={styles.divider} />

          {/* 거래 정보 — 타입에 따라 분기 */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>거래 정보</p>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>상태</span>
                <span className={styles.infoValue}>{data.condition || '-'}</span>
              </div>

              {/* ── 경매 전용 정보 ── */}
              {isAuction && (
                <>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>경매 시작가</span>
                    <span className={styles.infoValue}>₩ {data.auctionStartPrice || '-'}</span>
                  </div>
                  {data.buyNowPrice && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>즉시낙찰가</span>
                      <span className={styles.infoValue}>₩ {data.buyNowPrice}</span>
                    </div>
                  )}
                  {data.minBidUnit && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>최소 호가</span>
                      <span className={styles.infoValue}>₩ {data.minBidUnit}</span>
                    </div>
                  )}
                  {data.auctionDate && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>경매 예정일</span>
                      <span className={styles.infoValue}>{data.auctionDate}</span>
                    </div>
                  )}
                </>
              )}

              {/* ── 중고거래 전용 정보 ── */}
              {!isAuction && (
                <>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>판매가</span>
                    <span className={styles.infoValue}>
                      {data.isPriceNegotiable ? '협의' : `₩ ${data.auctionStartPrice || '-'}`}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>거래 방법</span>
                    <span className={styles.infoValue}>{data.tradeMethod || '-'}</span>
                  </div>
                </>
              )}

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>지역</span>
                <span className={styles.infoValue}>{data.location || '-'}</span>
              </div>
            </div>
          </div>

          <div style={{ height: 48 }} />
        </div>
      </div>
    </div>
  );
};

export default ProductPreviewModal;