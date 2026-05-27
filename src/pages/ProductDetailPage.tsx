import React, { useEffect, useRef, useState } from 'react';
import { getProduct, toProductDetail } from '../api/products';
import { toggleLike } from '../api/likes';
import { createProductInquiry, getProductInquiries, type InquiryView } from '../api/inquiries';
import { useToast } from '../components/ToastContext';
import type { ProductDetail } from '../types';
import styles from './ProductDetailPage.module.css';
import View360Modal from '../components/View360Modal';
import ProductLiveChat from '../components/ProductLiveChat';

interface Props {
  productId: number;
  onBack: () => void;
  onSellerClick?: (seller: { name: string; temp: number; sales: number; location: string }) => void;
  onAuctionClick?: () => void;
  onChatClick?: () => void;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
}

const ProductDetailPage: React.FC<Props> = ({ productId, onBack, onSellerClick, isLoggedIn = false, onRequireLogin }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [item, setItem] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { showToast } = useToast();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [activeImg, setActiveImg] = useState(0);
  const [show360, setShow360] = useState(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'inquiry'>('desc');
  const [showAskModal, setShowAskModal] = useState(false);
  const [newInquiry, setNewInquiry] = useState('');
  const [inquiries, setInquiries] = useState<InquiryView[]>([]);

  const TAG_LABEL: Record<string, string> = {
    new: '거의새것', auction: '경매가능', free: '나눔', good: '상태양호',
  };

  useEffect(() => {
    // 이전 상세에서 채팅/입력 영역 근처에 포커스가 있었더라도,
    // 새 상품 상세로 들어오면 항상 화면을 맨 위에서 시작한다.
    window.scrollTo({ top: 0, left: 0 });
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [productId]);

  const handleSubmitInquiry = async () => {
    if (!item) return;
    if (!isLoggedIn) { onRequireLogin?.(); return; }
    const text = newInquiry.trim();
    if (!text) return;
    try {
      // 문의를 먼저 저장한 뒤, 저장된 행을 목록 앞에 붙여 탭 상태를 맞춘다.
      const created = await createProductInquiry(item.id, text);
      setInquiries(prev => [created, ...prev]);
      setNewInquiry('');
      setShowAskModal(false);
      setActiveTab('inquiry');
      showToast('문의가 등록되었습니다.', 'success');
    } catch (error) {
      console.error('Failed to create product inquiry', error);
      showToast('문의 등록에 실패했습니다.', 'error');
    }
  };

  // 상세 화면 진입 시 productId 기준으로 DB 상품을 조회한다.
  // 기존 문의/찜 UI 상태는 조회 성공 후 응답값으로 초기화한다.
  useEffect(() => {
    let ignore = false;

    const loadProduct = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await getProduct(productId);
        if (ignore) return;

        const product = toProductDetail(data);
        setItem(product);
        setLiked(product.liked);
        setLikeCount(product.likeCount);
        setActiveImg(0);

        try {
          // 문의 조회가 실패해도 상품 상세 자체는 보여줄 수 있도록 별도로 불러온다.
          const inquiryList = await getProductInquiries(productId);
          if (!ignore) setInquiries(inquiryList);
        } catch (inquiryError) {
          console.error('Failed to load product inquiries', inquiryError);
          if (!ignore) setInquiries([]);
        }
      } catch (error) {
        if (ignore) return;
        console.error('Failed to load product detail', error);
        setItem(null);
        setLoadError('상품 정보를 불러오지 못했어요.');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadProduct();

    return () => {
      ignore = true;
    };
  }, [productId]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.back} onClick={onBack}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span className={styles.headerTitle}>상품 상세</span>
          <div style={{ width: 20 }} />
        </div>
        <div className={styles.scroll} ref={scrollRef}>
          <p className={styles.qnaEmpty}>상품 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.back} onClick={onBack}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span className={styles.headerTitle}>상품 상세</span>
          <div style={{ width: 20 }} />
        </div>
        <div className={styles.scroll} ref={scrollRef}>
          <p className={styles.qnaEmpty}>{loadError || '상품을 찾을 수 없어요.'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span className={styles.headerTitle}>상품 상세</span>
        <div style={{ width: 20 }} />
      </div>

      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.twoCol}>

          {/* ── 왼쪽: 이미지 ── */}
          <div className={styles.imgArea}>
            <div className={styles.mainImg}>
              <img src={item.images[activeImg] ?? item.image} alt={item.name} className={styles.mainImgEl} />
              <span className={styles.conditionBadge}>{item.condition}</span>
              <button className={styles.btn360} onClick={() => setShow360(true)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
                </svg>
                360°
              </button>
            </div>
            <div className={styles.thumbRow}>
              {item.images.map((img, i) => (
                <button
                  key={i}
                  className={`${styles.thumb} ${activeImg === i ? styles.thumbActive : ''}`}
                  onClick={() => setActiveImg(i)}
                >
                  <img src={img} alt="" className={styles.thumbImg} />
                </button>
              ))}
            </div>
          </div>

          {/* ── 오른쪽: 정보 ── */}
          <div className={styles.rightCol}>

            {/* 브레드크럼 */}
            <div className={styles.breadcrumb}>
              <span>홈</span>
              <span>›</span>
              <span>경매예정</span>
              <span>›</span>
              <strong>{item.category ?? '전자기기'}</strong>
            </div>

            {/* 상품 상태 + 부가 태그 칩 — 상품명 위에 통일된 한 줄로 노출.
                'S급' 같은 condition 칩과 '거의새것'/'상태양호' 같은 tag 칩을 함께 배치한다.
                (free/auction 태그는 본문 흐름상 노출하지 않음.) */}
            <div className={styles.categoryRow}>
              <span className={styles.conditionTag}>{item.condition}</span>
              {item.tags.filter(tag => tag !== 'free' && tag !== 'auction').map((tag) => (
                <span key={tag} className={`${styles.tag} ${styles[tag]}`}>{TAG_LABEL[tag]}</span>
              ))}
            </div>

            {/* 상품명 + 좋아요 */}
            <div className={styles.nameRow}>
              <h1 className={styles.name}>{item.name}</h1>
              <button className={styles.likeBtn} onClick={async () => {
                if (!item) return;
                const prevLiked = liked;
                const prevCount = likeCount;
                setLiked(!prevLiked);
                setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
                try {
                  const result = await toggleLike(item.id);
                  setLiked(result.liked);
                  setLikeCount(result.likeCount);
                } catch {
                  setLiked(prevLiked);
                  setLikeCount(prevCount);
                  showToast('좋아요 처리에 실패했어요', 'error');
                }
              }}>
                <span className={styles.likeHeart}>{liked ? '❤️' : '🤍'}</span>
                <span className={styles.likeCnt}>{likeCount}</span>
              </button>
            </div>

            {/* 가격 */}
            <p className={styles.price}> {item.price.toLocaleString()}</p>
            {item.immediatePrice && (
              <div className={styles.immediatePriceRow}>
                <span className={styles.immediatePriceLabel}>즉시낙찰가</span>
                <span className={styles.immediatePriceValue}> {item.immediatePrice.toLocaleString()}</span>
              </div>
            )}
            <p className={styles.meta}>{item.location} · <span className={styles.timeGlow}>{item.timeAgo}</span></p>

            {/* 판매자 */}
            <div className={styles.sellerRow}>
              <div className={styles.sellerAvatar}>😊</div>
              <div className={styles.sellerInfo}>
                <p className={styles.sellerName}>{item.seller}</p>
                <div className={styles.sellerMeta}>
                  <span className={styles.sellerTemp}>🌡 {item.sellerTemp}°C</span>
                  <span className={styles.sellerSales}>거래 {item.sellerSales}회</span>
                  <span className={styles.sellerLoc}>📍 {item.location}</span>
                </div>
              </div>
              <button className={styles.profileBtn} onClick={() => onSellerClick?.({ name: item.seller, temp: item.sellerTemp, sales: item.sellerSales, location: item.location })}>프로필</button>
            </div>

            <ProductLiveChat
              productId={item.id}
              isLoggedIn={isLoggedIn}
              onRequireLogin={onRequireLogin}
              title="상품 실시간 채팅"
            />

            <div className={styles.divider} />

            {/* 상품 설명 / 상품 문의 탭 */}
            <div className={styles.section}>
              <div className={styles.tabsRow}>
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tab} ${activeTab === 'desc' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('desc')}
                  >
                    상품 설명
                  </button>
                  <button
                    className={`${styles.tab} ${activeTab === 'inquiry' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('inquiry')}
                  >
                    상품 문의
                    <span className={styles.tabCount}>{inquiries.length}</span>
                  </button>
                </div>
                {/* Sellers can read existing inquiries, but cannot ask questions on their own product. */}
                {activeTab === 'inquiry' && !item.ownedByMe && (
                  <button
                    className={styles.askBtn}
                    onClick={() => {
                      if (!isLoggedIn) { onRequireLogin?.(); return; }
                      setShowAskModal(true);
                    }}
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    문의하기
                  </button>
                )}
              </div>

              {activeTab === 'desc' && (
                <p className={styles.description}>{item.description}</p>
              )}

              {activeTab === 'inquiry' && (
                <div className={styles.qnaList}>
                  {inquiries.length === 0 ? (
                    <p className={styles.qnaEmpty}>아직 등록된 문의가 없습니다.</p>
                  ) : inquiries.map(q => (
                    <div key={q.id} className={styles.qnaItem}>
                      <div className={styles.qnaQuestion}>
                        <div className={styles.qnaHead}>
                          <span className={styles.qnaBadgeQ}>Q</span>
                          <span className={styles.qnaUser}>{q.user}</span>
                          <span className={styles.qnaDate}>{q.date}</span>
                        </div>
                        <p className={styles.qnaText}>{q.question}</p>
                      </div>
                      {q.answer && (
                        <div className={styles.qnaAnswer}>
                          <div className={styles.qnaHead}>
                            <span className={styles.qnaBadgeA}>A</span>
                            <span className={styles.qnaUser}>
                              {q.answer.user}
                              <span className={styles.qnaSellerTag}>판매자</span>
                            </span>
                            <span className={styles.qnaDate}>{q.answer.date}</span>
                          </div>
                          <p className={styles.qnaText}>{q.answer.text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.divider} />

            {/* 거래 정보 */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>거래 정보</p>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}><span className={styles.infoLabel}>상품번호</span><span className={styles.infoValue}>{item.productNo ?? '-'}</span></div>
                <div className={styles.infoItem}><span className={styles.infoLabel}>지역</span><span className={styles.infoValue}>{item.location}</span></div>
                <div className={styles.infoItem}><span className={styles.infoLabel}>경매 예정일</span><span className={styles.infoValue}>{item.auctionDate ?? '미정'}</span></div>
                <div className={styles.infoItem}><span className={styles.infoLabel}>조회수</span><span className={styles.infoValue}>{(item.viewCount ?? 0).toLocaleString()}회</span></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
    {show360 && (
      <View360Modal
        images={item.images}
        productName={item.name}
        onClose={() => setShow360(false)}
      />
    )}
    {showAskModal && (
      <div className={styles.askOverlay} onClick={() => setShowAskModal(false)}>
        <div className={styles.askModal} onClick={e => e.stopPropagation()}>
          <div className={styles.askModalHead}>
            <span className={styles.askModalTitle}>상품 문의하기</span>
            <button className={styles.askModalClose} onClick={() => setShowAskModal(false)}>✕</button>
          </div>
          <textarea
            className={styles.askTextarea}
            value={newInquiry}
            onChange={e => setNewInquiry(e.target.value)}
            placeholder="궁금한 점을 작성해주세요. 판매자가 확인 후 답변드립니다."
            autoFocus
          />
          <div className={styles.askActions}>
            <button className={styles.askCancel} onClick={() => setShowAskModal(false)}>취소</button>
            <button className={styles.askSubmit} onClick={handleSubmitInquiry} disabled={!newInquiry.trim()}>등록</button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

export default ProductDetailPage;
