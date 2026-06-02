import React, { useEffect, useMemo, useState } from 'react';
import { getGuides, type GuideDto, type GuideType } from '../../api/guides';
import styles from './GuidePage.module.css';

interface Props { onBack: () => void; }

const FALLBACK_GUIDES: GuideDto[] = [
  {
    type: 'BUY',
    tabLabel: '구매',
    bannerLabel: '구매 가이드',
    bannerTitle: '안전하고 스마트한 구매',
    bannerDescription: '좋은 물건을 합리적인 가격에 구매하세요.',
    steps: [
      { icon: '검색', title: '상품 검색', description: '검색 또는 카테고리에서 원하는 상품을 찾아보세요. 상품 상태, 가격, 위치를 꼼꼼히 확인하세요.' },
      { icon: '문의', title: '판매자 채팅', description: '궁금한 점은 채팅으로 문의해보세요. 직거래 장소, 추가 사진 요청 등을 상의할 수 있어요.' },
      { icon: '결제', title: '안전결제', description: '안전결제를 이용하면 대금을 안전하게 보호받을 수 있어요. 직거래 시에는 현장에서 확인 후 결제하세요.' },
      { icon: '수령', title: '상품 수령', description: '상품을 수령하면 이상이 없는지 꼭 확인하세요. 문제가 있다면 즉시 판매자 또는 고객센터에 연락하세요.' },
      { icon: '후기', title: '후기 작성', description: '거래 완료 후 후기를 남겨주세요. 좋은 후기는 판매자에게 큰 힘이 됩니다.' },
    ],
    tips: [
      { icon: '확인', text: '직거래는 공공장소에서 진행하세요.', warning: false },
      { icon: '사진', text: '상품 상태를 사진으로 꼭 확인하세요.', warning: false },
      { icon: '채팅', text: '가격 조정은 채팅으로 정중하게 이야기해보세요.', warning: false },
      { icon: '주의', text: '계좌 직접 송금 요청은 주의하세요.', warning: true },
      { icon: '주의', text: '비정상적으로 저렴한 상품은 한 번 더 확인하세요.', warning: true },
    ],
  },
  {
    type: 'SELL',
    tabLabel: '판매',
    bannerLabel: '판매 가이드',
    bannerTitle: '믿고 빠르게 내 물건 판매',
    bannerDescription: '내 물건을 좋은 구매자에게 안전하게 판매해보세요.',
    steps: [
      { icon: '촬영', title: '사진 촬영', description: '상품의 정면, 측면, 하자 부분을 밝은 곳에서 촬영하세요. 선명한 사진은 빠른 판매에 도움이 됩니다.' },
      { icon: '등록', title: '상품 등록', description: '카테고리, 상태, 가격을 정확히 입력하세요. 경매 상품은 시작가와 최소 입찰 단위도 설정할 수 있어요.' },
      { icon: '응답', title: '구매자 응대', description: '문의 채팅에 빠르게 답할수록 판매 성공률이 높아집니다. 친절한 응대가 좋은 후기로 이어져요.' },
      { icon: '거래', title: '거래 확정', description: '거래 장소와 시간을 확정하세요. 직거래는 현장 확인 후 거래를 완료해주세요.' },
      { icon: '정산', title: '수익 출금', description: '판매 수익은 내 지갑에 적립되며, 등록한 계좌로 출금 신청할 수 있어요.' },
    ],
    tips: [
      { icon: '설명', text: '상품 설명은 최대한 자세하게 작성하세요.', warning: false },
      { icon: '가격', text: '시세보다 10~15% 낮게 설정하면 빠르게 판매될 수 있어요.', warning: false },
      { icon: '사진', text: '여러 장의 선명한 사진이 판매에 유리합니다.', warning: false },
      { icon: '주의', text: '허위 상품 설명은 제재 대상입니다.', warning: true },
      { icon: '주의', text: '거래 완료 후 개인정보 요구는 거절하세요.', warning: true },
    ],
  },
  {
    type: 'AUCTION',
    tabLabel: '경매',
    bannerLabel: '경매 가이드',
    bannerTitle: '짜릿한 경매 낙찰 도전',
    bannerDescription: '시작가부터 경쟁하며 원하는 가격에 낙찰받아보세요.',
    steps: [
      { icon: '탐색', title: '경매 탐색', description: '실시간 경매 목록에서 관심 있는 상품을 찾아보세요. 마감 시간과 현재 입찰가를 확인하세요.' },
      { icon: '충전', title: '금액 충전', description: '입찰 전 지갑에 충분한 금액이 있는지 확인하세요. 보유 금액이 입찰가보다 많아야 참여할 수 있어요.' },
      { icon: '입찰', title: '입찰 참여', description: '현재 최고 입찰가보다 높은 금액을 입력하고 입찰을 확정하세요. 최소 입찰 단위 이상으로 올려야 합니다.' },
      { icon: '낙찰', title: '낙찰 확인', description: '경매 종료 후 최고 입찰자가 낙찰됩니다. 낙찰 알림을 받으면 판매자와 거래를 이어가세요.' },
      { icon: '결제', title: '대금 지급 및 수령', description: '낙찰 금액은 지갑에서 차감됩니다. 판매자와 협의하여 직거래 또는 배송으로 상품을 수령하세요.' },
    ],
    tips: [
      { icon: '시간', text: '마감 직전 입찰은 가격이 빠르게 오를 수 있어요.', warning: false },
      { icon: '알림', text: '관심 경매를 등록해 알림을 받아보세요.', warning: false },
      { icon: '예산', text: '최대 예산을 미리 정하고 입찰에 참여하세요.', warning: false },
      { icon: '주의', text: '입찰 확정 후에는 취소가 어렵습니다.', warning: true },
      { icon: '주의', text: '금액 부족 시 입찰할 수 없으니 미리 충전하세요.', warning: true },
    ],
  },
];

const GUIDE_ORDER: GuideType[] = ['BUY', 'SELL', 'AUCTION'];

const BANNER_CLASS: Record<GuideType, string> = {
  BUY: styles.bannerBuy,
  SELL: styles.bannerSell,
  AUCTION: styles.bannerAuction,
};

const GuidePage: React.FC<Props> = ({ onBack }) => {
  const [activeType, setActiveType] = useState<GuideType>('BUY');
  const [guides, setGuides] = useState<GuideDto[]>(FALLBACK_GUIDES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    const loadGuides = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getGuides();
        if (alive && data.length > 0) {
          setGuides(data);
          setActiveType((current) => data.some((guide) => guide.type === current) ? current : data[0].type);
        }
      } catch {
        if (alive) {
          setError('이용가이드를 불러오지 못해 기본 안내를 표시합니다.');
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void loadGuides();

    return () => {
      alive = false;
    };
  }, []);

  const orderedGuides = useMemo(
    () => [...guides].sort((a, b) => GUIDE_ORDER.indexOf(a.type) - GUIDE_ORDER.indexOf(b.type)),
    [guides]
  );

  const guide = orderedGuides.find((item) => item.type === activeType) ?? orderedGuides[0];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack} aria-label="뒤로가기">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span className={styles.title}>이용 가이드</span>
        <div style={{ width: 32 }} />
      </div>

      <div className={styles.tabs}>
        {orderedGuides.map((item) => (
          <button
            key={item.type}
            className={`${styles.tab} ${activeType === item.type ? styles.tabActive : ''}`}
            onClick={() => setActiveType(item.type)}
          >
            {item.tabLabel}
          </button>
        ))}
      </div>

      <div className={styles.scroll}>
        {loading && <div className={styles.status}>이용가이드를 불러오는 중입니다.</div>}
        {!loading && error && <div className={styles.status}>{error}</div>}

        <div className={`${styles.banner} ${BANNER_CLASS[guide.type]}`}>
          <p className={styles.bannerLabel}>{guide.bannerLabel}</p>
          <p className={styles.bannerTitle}>{guide.bannerTitle}</p>
          <p className={styles.bannerSub}>{guide.bannerDescription}</p>
        </div>

        <div className={styles.sectionLabel}>진행 단계</div>
        <div className={styles.stepList}>
          {guide.steps.map((step, i) => (
            <div key={`${step.title}-${i}`} className={styles.stepItem}>
              <div className={styles.stepLeft}>
                <div className={styles.stepNumWrap}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  {i < guide.steps.length - 1 && <div className={styles.stepLine} />}
                </div>
              </div>
              <div className={styles.stepBody}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepIcon}>{step.icon}</span>
                  <span className={styles.stepTitle}>{step.title}</span>
                </div>
                <p className={styles.stepDesc}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.sectionLabel}>꿀팁 & 주의사항</div>
        <div className={styles.tipList}>
          {guide.tips.map((tip, i) => (
            <div key={`${tip.text}-${i}`} className={`${styles.tipItem} ${tip.warning ? styles.tipWarn : styles.tipOk}`}>
              <span className={styles.tipEmoji}>{tip.icon}</span>
              <span className={styles.tipText}>{tip.text}</span>
            </div>
          ))}
        </div>

        <div className={styles.csBox}>
          <p className={styles.csText}>궁금한 점이 있으신가요?</p>
          <p className={styles.csSub}>고객센터 또는 자주 묻는 질문을 확인해보세요.</p>
        </div>

        <div style={{ height: 80 }} />
      </div>
    </div>
  );
};

export default GuidePage;
