import React, { useState, useEffect, useRef } from 'react';
import { getProduct, toAuctionDetail } from '../api/products';
import { toggleLike } from '../api/likes';
import { buyNowProduct, payForAuction, placeProductBid, type BidType } from '../api/bids';
import { createProductInquiry, getProductInquiries, type InquiryView } from '../api/inquiries';
import { getWallet } from '../api/wallet';
import type { AuctionDetail } from '../types';
import styles from './AuctionDetailPage.module.css';
import { useToast } from '../components/ToastContext';
import View360Modal from '../components/View360Modal';
import ProductLiveChat from '../components/ProductLiveChat';

interface Props {
  itemId: number;
  onBack: () => void;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
  onSellerClick?: (seller: { id: number; name: string; temp: number; sales: number; location: string }) => void;
}

const AuctionDetailPage: React.FC<Props> = ({ itemId, onBack, isLoggedIn = false, onRequireLogin, onSellerClick }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [item, setItem] = useState<AuctionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { showToast } = useToast();

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [bidCount, setBidCount] = useState(0);
  const [bidInput, setBidInput] = useState('');
  const [showBidHistory, setShowBidHistory] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showInstantModal, setShowInstantModal] = useState(false);
  const [isBidding, setIsBidding] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // 초 단위
  const [activeImg, setActiveImg] = useState(0);
  const [show360, setShow360] = useState(false);
  const [activeTab, setActiveTab] = useState<'desc' | 'inquiry'>('desc');
  const [showAskModal, setShowAskModal] = useState(false);
  const [newInquiry, setNewInquiry] = useState('');
  const [inquiries, setInquiries] = useState<InquiryView[]>([]);

  useEffect(() => {
    // 다른 상세에서 채팅/입력 영역을 사용했더라도,
    // 새 경매 상세로 들어오면 항상 화면을 맨 위에서 시작한다.
    window.scrollTo({ top: 0, left: 0 });
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [itemId]);

  const handleSubmitInquiry = async () => {
    if (!item) return;
    if (!isLoggedIn) { onRequireLogin?.(); return; }
    const text = newInquiry.trim();
    if (!text) return;
    try {
      // 경매도 상품을 기반으로 하므로 상품 문의 API를 함께 사용한다.
      const created = await createProductInquiry(item.id, text);
      setInquiries(prev => [created, ...prev]);
      setNewInquiry('');
      setShowAskModal(false);
      setActiveTab('inquiry');
      showToast('문의가 등록되었습니다.', 'success');
    } catch (error) {
      console.error('Failed to create auction inquiry', error);
      showToast('문의 등록에 실패했습니다.', 'error');
    }
  };

  // ── 보유 잔액 (지갑 API 연동) ──────────────────────────────────
  // 입찰 모달에서 "잔액 부족" 검증과 표시에 쓰는 값.
  // 과거에는 USER_BALANCE 상수로 하드코딩돼 있었으나, 실제 회원 지갑 잔액을
  // GET /api/wallet 에서 받아오도록 변경.
  // - 마운트(로그인 상태일 때) 1회 조회
  // - 입찰/즉시낙찰 모달을 열 때마다 재조회 (다른 탭에서 충전·출금한 경우 반영)
  // - 입찰 성공 직후 재조회 (낙찰 차감 반영)
  //
  // 비로그인 상태의 표시값(0) 은 useEffect 내 setState 가 아닌 derived 값으로 처리한다.
  // (react-hooks/set-state-in-effect 규칙: effect 안에서 동기 setState 금지)
  const [fetchedBalance, setFetchedBalance] = useState(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const userBalance = isLoggedIn ? fetchedBalance : 0;

  // 지갑 잔액을 다시 가져와 state 에 반영한다. 비로그인 상태에서는 호출하지 않는다.
  // 실패해도 사용자에게 별도 토스트는 띄우지 않고(잔액 부족 검증으로만 노출되므로) 콘솔에만 남긴다.
  // 호출자가 직후 잔액 비교를 해야 하는 경우(즉시낙찰 onClick 등)를 위해
  // 가져온 최신 잔액을 반환한다. state 는 비동기 반영되어 같은 tick 에서는 stale 일 수 있으므로
  // 호출자는 setState 값이 아닌 반환값으로 분기 판단을 한다.
  const refreshBalance = async (): Promise<number | null> => {
    if (!isLoggedIn) return null;
    setIsBalanceLoading(true);
    try {
      const wallet = await getWallet();
      setFetchedBalance(wallet.balance);
      return wallet.balance;
    } catch (error) {
      console.error('Failed to load wallet balance', error);
      return null;
    } finally {
      setIsBalanceLoading(false);
    }
  };

  useEffect(() => {
    // 비로그인이면 fetch 하지 않고 종료. 표시값은 derived(userBalance) 로 0 처리.
    if (!isLoggedIn) return;
    // refreshBalance() 는 내부에서 setIsBalanceLoading 을 동기 호출하므로 effect 에서
    // 그대로 부르면 react-hooks/set-state-in-effect 규칙을 위반한다.
    // 초기 진입 시점은 모달이 열려있지 않아 로딩 인디케이터가 불필요하므로,
    // 여기서는 fetch + setState 만 인라인으로 처리하고 모달 오픈/입찰 후에만 refreshBalance 를 쓴다.
    let active = true;
    getWallet()
      .then((wallet) => { if (active) setFetchedBalance(wallet.balance); })
      .catch((error) => { if (active) console.error('Failed to load wallet balance', error); });
    return () => { active = false; };
    // 로그인 여부가 바뀌거나 다른 경매 상세로 전환되면 다시 조회한다.
  }, [isLoggedIn, itemId]);

  // 경매 상세도 목업 대신 DB 상품 상세 API를 사용한다.
  // API 응답을 기존 AuctionDetail UI 타입으로 변환해 입찰/타이머 UI는 그대로 재사용한다.
  useEffect(() => {
    let ignore = false;

    const loadAuction = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await getProduct(itemId);
        if (ignore) return;

        const auction = toAuctionDetail(data);
        setItem(auction);
        setLiked(auction.liked);
        setLikeCount(auction.likeCount);
        setCurrentPrice(auction.currentPrice);
        setBidCount(auction.bidCount);
        setTimeLeft(auction.timeLeft);
        setActiveImg(0);

        try {
          // 문의 조회가 실패해도 경매 상세 자체는 보여줄 수 있도록 별도로 불러온다.
          const inquiryList = await getProductInquiries(itemId);
          if (!ignore) setInquiries(inquiryList);
        } catch (inquiryError) {
          console.error('Failed to load auction inquiries', inquiryError);
          if (!ignore) setInquiries([]);
        }
      } catch (error) {
        if (ignore) return;
        console.error('Failed to load auction detail', error);
        setItem(null);
        setLoadError('경매 정보를 불러오지 못했어요.');
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadAuction();

    return () => {
      ignore = true;
    };
  }, [itemId]);

  // DB에서 받은 남은 시간(timeLeft)을 기준으로 상세 화면 타이머를 매초 갱신한다.
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const days = Math.floor(timeLeft / 86400);
  const h = Math.floor((timeLeft % 86400) / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;
  // 경매 카드와 동일하게 24시간 미만은 실시간 카운트다운,
  // 그 이상은 일/시간 단위로 표시한다.
  const timeDisplay = days >= 1
    ? (h > 0 ? `${days}일 ${h}시간` : `${days}일`)
    : h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const isUrgent = timeLeft > 0 && timeLeft < 300;
  const isEnded  = timeLeft <= 0;

  const getApiErrorMessage = (error: unknown, fallback: string) => {
    const response = (error as { response?: { data?: { message?: string } } })?.response;
    return response?.data?.message || fallback;
  };

  const submitBid = async (amount: number, bidType: BidType) => {
    if (!item) return;
    setIsBidding(true);
    try {
      const result = bidType === 'IMMEDIATE'
        ? await buyNowProduct(item.id)
        : await placeProductBid(item.id, amount);
      setCurrentPrice(result.currentPrice);
      setBidCount(result.bidCount);
      setItem(prev => prev && ({
        ...prev,
        currentPrice: result.currentPrice,
        bidCount: result.bidCount,
        isLive: result.isLive,
        bidHistory: result.bidHistory,
      }));
      if (!result.isLive) setTimeLeft(0);
      setBidInput('');
      setShowBidModal(false);
      setShowInstantModal(false);
      // 입찰이 성공하면 잔액에서 차감되므로 즉시 다시 가져온다.
      void refreshBalance();
      showToast(`${amount.toLocaleString()} 입찰 완료!`, 'success');
    } catch (error: unknown) {
      showToast(getApiErrorMessage(error, '입찰 등록에 실패했습니다.'), 'error');
    } finally {
      setIsBidding(false);
    }
  };

  // ── 결제 대기 흐름 ────────────────────────────────────────────
  // 낙찰 후 잔액 부족으로 AWAITING_PAYMENT 상태인 경매에 대해 본인(낙찰자)이 결제 버튼을 눌렀을 때.
  // 잔액 검증/차감/Settlement 생성은 백엔드(AuctionCompletionService)가 처리.
  const [isPaying, setIsPaying] = useState(false);
  const handlePayForWin = async () => {
    if (!item || isPaying) return;
    setIsPaying(true);
    try {
      await payForAuction(item.id);
      showToast('결제가 완료되었습니다!', 'success');
      // 결제 후 상태가 SUCCESS 로 바뀌므로 화면 갱신을 위해 다시 로드.
      const refreshed = await getProduct(item.id);
      setItem(toAuctionDetail(refreshed));
      void refreshBalance();
    } catch (error: unknown) {
      showToast(getApiErrorMessage(error, '결제에 실패했습니다.'), 'error');
    } finally {
      setIsPaying(false);
    }
  };

  const handleBid = () => {
    if (!item) return;
    const amount = parseInt(bidInput.replace(/,/g, ''), 10);
    const minBid = currentPrice + (item.minBidUnit ?? 1000);
    if (isNaN(amount) || amount <= currentPrice) {
      showToast(`현재가(${currentPrice.toLocaleString()})보다 높게 입찰하세요`, 'error');
      return;
    }
    if (amount < minBid) {
      showToast(`최소 입찰가는 ${minBid.toLocaleString()}원입니다.`, 'error');
      return;
    }
    if (amount > userBalance) {
      showToast(`잔액 부족\n보유: ${userBalance.toLocaleString()} / 입찰: ${amount.toLocaleString()}`, 'error');
      return;
    }
    void submitBid(amount, 'NORMAL');
  };


  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.back} onClick={onBack}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span className={styles.headerTitle}>경매 상세</span>
          <div style={{ width: 20 }} />
        </div>
        <div className={styles.scroll} ref={scrollRef}>
          <p className={styles.qnaEmpty}>경매 정보를 불러오는 중...</p>
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
          <span className={styles.headerTitle}>경매 상세</span>
          <div style={{ width: 20 }} />
        </div>
        <div className={styles.scroll} ref={scrollRef}>
          <p className={styles.qnaEmpty}>{loadError || '경매를 찾을 수 없어요.'}</p>
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
        <span className={styles.headerTitle}>경매 상세</span>
        <button
          className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ''}`}
          onClick={async () => {
            if (!isLoggedIn) { onRequireLogin?.(); return; }
            if (!item) return;
            // 낙관적 업데이트: 토글 즉시 UI 반영 후, 실패 시 원복
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
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span className={styles.likeBtnCount}>{likeCount}</span>
        </button>
      </div>

      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.twoCol}>

          {/* ── 왼쪽: 이미지 ── */}
          <div className={styles.imgArea}>
            <div className={styles.mainImg}>
              <img src={item.images[activeImg]} alt={item.name} className={styles.mainImgEl} />
              {item.isLive && (
                <div className={styles.liveBadge}><span className={styles.liveDot} />LIVE</div>
              )}
              {isEnded
                ? <div className={styles.timerBadge}>⏱ 경매 종료</div>
                : <div className={`${styles.timerBadge} ${isUrgent ? styles.urgent : ''}`}>⏱ {timeDisplay}</div>
              }
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
              <span>경매</span>
              <span>›</span>
              <strong>{item.category}</strong>
            </div>

            {/* 배지 */}
            <div className={styles.categoryRow}>
              <span className={styles.categoryTag}>{item.category}</span>
              <span className={styles.conditionTag}>{item.condition}</span>
            </div>

            {/* 상품명 */}
            <h1 className={styles.name}>{item.name}</h1>
            <p className={styles.location}><span className={styles.timeGlow}>{item.endDate} 마감</span></p>

            {/* 가격 + 입찰 박스 */}
            <div className={styles.priceBox}>
              <div className={styles.priceRow}>
                <div>
                  <p className={styles.priceLabel}>현재 최고 입찰가</p>
                  <p className={styles.price}> {currentPrice.toLocaleString()}</p>
                  <p className={styles.startPrice}>시작가 {item.startPrice.toLocaleString()}</p>
                </div>
                <div className={styles.bidStat}>
                  <p className={styles.bidCount}>{bidCount}회</p>
                  <p className={styles.bidLabel}>입찰 횟수</p>
                </div>
              </div>
              {item.immediatePrice && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0 4px', borderTop: '1px dashed #E8E8EF', marginTop: 8 }}>
                  <span style={{ fontSize: 13, color: '#8B8FA8' }}>즉시입찰가</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#E24B4A' }}> {item.immediatePrice.toLocaleString()}</span>
                </div>
              )}

              {/* 결제 대기 안내: 본인 낙찰 + AWAITING_PAYMENT 일 때만 노출 */}
              {item.auctionStatus === 'AWAITING_PAYMENT' && item.isWinner && (
                <div
                  style={{
                    marginTop: 8, padding: 12, borderRadius: 8,
                    background: '#FFF7E6', border: '1px solid #FFD591',
                    fontSize: 13, color: '#7A4A00',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    낙찰되었습니다 — 결제 대기 중
                  </div>
                  <div>결제 기한: <b>{item.paymentDeadline}</b></div>
                  <div style={{ marginTop: 2 }}>
                    낙찰가 <b>{currentPrice.toLocaleString()}원</b> · 보유 잔액 {userBalance.toLocaleString()}원
                  </div>
                  <button
                    className={styles.inlineInstantBtn}
                    style={{ marginTop: 8, width: '100%' }}
                    onClick={handlePayForWin}
                    disabled={isPaying || userBalance < currentPrice}
                  >
                    {isPaying
                      ? '결제 중…'
                      : userBalance < currentPrice
                        ? `잔액 부족 — ${(currentPrice - userBalance).toLocaleString()}원 충전 필요`
                        : '결제하기'}
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  className={styles.inlineBidBtn}
                  onClick={() => {
                    if (!isLoggedIn) { onRequireLogin?.(); return; }
                    void refreshBalance();
                    setShowBidModal(true);
                  }}
                  disabled={isEnded}
                >
                  {isEnded ? '경매 종료' : '입찰하기'}
                </button>
                <button
                  className={styles.inlineInstantBtn}
                  onClick={async () => {
                    if (!isLoggedIn) { onRequireLogin?.(); return; }
                    if (!item.immediatePrice) return;
                    // 최신 잔액으로 비교 (다른 탭에서 충전/출금했을 수도 있으므로 stale state 가 아닌
                    // refreshBalance 의 반환값을 기준으로 한다).
                    const latest = await refreshBalance();
                    const balance = latest ?? userBalance;
                    if (balance < item.immediatePrice) {
                      showToast(
                        `잔액이 부족해요. ${(item.immediatePrice - balance).toLocaleString()}원 더 필요해요`,
                        'error',
                      );
                      return;
                    }
                    setShowInstantModal(true);
                  }}
                  disabled={isEnded || !item.immediatePrice}
                >
                  즉시낙찰
                </button>
              </div>
            </div>

            {/* 입찰 이력 */}
            <button className={styles.historyToggle} onClick={() => setShowBidHistory(p => !p)}>
              입찰 이력 {showBidHistory ? '▲ 접기' : '▼ 보기'}
            </button>
            {showBidHistory && (
              <div className={styles.historyList}>
                {item.bidHistory.map((b, i) => (
                  <div key={b.id} className={styles.historyItem}>
                    <span className={styles.historyRank}>{i + 1}위</span>
                    <span className={styles.historyUser}>{b.memberNo}</span>
                    <span className={styles.historyAmount}>{b.amount.toLocaleString()}</span>
                    <span className={styles.historyTime}>{b.time}</span>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.divider} />

            {/* 판매자 */}
            <div className={styles.section}>
              <p className={styles.sectionTitle}>판매자 정보</p>
              <div className={styles.sellerRow}>
                <div className={styles.sellerAvatar}>😊</div>
                <div className={styles.sellerInfo}>
                  <p className={styles.sellerName}>{item.seller}</p>
                  <div className={styles.sellerMeta}>
                    <span className={styles.sellerTemp}>🌡 {item.sellerTemp}°C</span>
                    <span className={styles.sellerSales}>거래 {item.sellerSales}회</span>
                  </div>
                </div>
                <button
                  className={styles.sellerChat}
                  onClick={() => onSellerClick?.({ id: item.sellerId ?? item.id, name: item.seller, temp: item.sellerTemp, sales: item.sellerSales, location: '' })}
                >프로필</button>
              </div>
              <ProductLiveChat
                productId={item.id}
                isLoggedIn={isLoggedIn}
                onRequireLogin={onRequireLogin}
                title="경매 실시간 채팅"
              />
            </div>

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
                {/* Sellers can read existing inquiries, but cannot ask questions on their own auction. */}
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
                <div className={styles.infoItem}><span className={styles.infoLabel}>상품번호</span><span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.productNo ?? item.auctionNo}</span></div>
                <div className={styles.infoItem}><span className={styles.infoLabel}>경매번호</span><span className={styles.infoValue}>{item.auctionNo}</span></div>
                <div className={styles.infoItem}><span className={styles.infoLabel}>카테고리</span><span className={styles.infoValue}>{item.category}</span></div>
                <div className={styles.infoItem}><span className={styles.infoLabel}>마감일</span><span className={styles.infoValue}>{item.endDate}</span></div>
                <div className={styles.infoItem}><span className={styles.infoLabel}>조회수</span><span className={styles.infoValue}>{(item.viewCount ?? 0).toLocaleString()}회</span></div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 입찰 모달 */}
      {showBidModal && (() => {
        const bidAmount = parseInt(bidInput.replace(/,/g, ''), 10);
        const isInsufficient = !isNaN(bidAmount) && bidAmount > userBalance;
        const minBid = currentPrice + (item.minBidUnit ?? 1000);
        return (
          <div className={styles.modalOverlay} onClick={() => setShowBidModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <p className={styles.modalTitle}>입찰가 입력</p>
              <p className={styles.modalSub}>최소 입찰가: {minBid.toLocaleString()}</p>
              <div className={styles.balanceRow}>
                <span className={styles.balanceLabel}>보유 잔액</span>
                <span className={`${styles.balanceValue} ${isInsufficient ? styles.balanceInsufficient : ''}`}>
                  {isBalanceLoading ? '조회 중…' : userBalance.toLocaleString()}
                </span>
              </div>
              <input
                className={`${styles.modalInput} ${isInsufficient ? styles.modalInputError : ''}`}
                type="number"
                placeholder={` ${minBid.toLocaleString()} 이상`}
                value={bidInput}
                onChange={e => setBidInput(e.target.value)}
                autoFocus
              />
              {isInsufficient && (
                <p className={styles.insufficientMsg}>
                  잔액이 부족해요. {(bidAmount - userBalance).toLocaleString()} 더 필요해요
                </p>
              )}
              <div className={styles.modalBtns}>
                <button className={styles.modalCancel} onClick={() => setShowBidModal(false)}>취소</button>
                <button
                  className={styles.modalConfirm}
                  onClick={handleBid}
                  disabled={isInsufficient || isBidding}
                  style={(isInsufficient || isBidding) ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                >입찰 확정</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 즉시낙찰 모달 */}
      {showInstantModal && item.immediatePrice && (() => {
        const isInsufficient = userBalance < item.immediatePrice;
        return (
          <div className={styles.modalOverlay} onClick={() => setShowInstantModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <p className={styles.modalTitle}>즉시낙찰</p>
              <p className={styles.modalSub}>아래 금액으로 즉시 낙찰됩니다.</p>
              <div className={styles.balanceRow}>
                <span className={styles.balanceLabel}>보유 잔액</span>
                <span className={`${styles.balanceValue} ${isInsufficient ? styles.balanceInsufficient : ''}`}>
                  {isBalanceLoading ? '조회 중…' : userBalance.toLocaleString()}
                </span>
              </div>
              <input
                className={`${styles.modalInput} ${isInsufficient ? styles.modalInputError : ''}`}
                type="text"
                value={` ${item.immediatePrice.toLocaleString()}`}
                readOnly
              />
              {isInsufficient && (
                <p className={styles.insufficientMsg}>
                  잔액이 부족해요. {(item.immediatePrice - userBalance).toLocaleString()} 더 필요해요
                </p>
              )}
              <div className={styles.modalBtns}>
                <button className={styles.modalCancel} onClick={() => setShowInstantModal(false)}>취소</button>
                <button
                  className={styles.modalConfirm}
                  onClick={() => {
                    void submitBid(item.immediatePrice!, 'IMMEDIATE');
                  }}
                  disabled={isInsufficient || isBidding}
                  style={(isInsufficient || isBidding) ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                >낙찰 확정</button>
              </div>
            </div>
          </div>
        );
      })()}
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

export default AuctionDetailPage;
