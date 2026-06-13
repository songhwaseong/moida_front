import React, { useEffect, useMemo, useState } from 'react';
import { getMyProducts, requestProductReturn, type ProductSummaryDto } from '../../api/products';
import type { MyProduct } from '../../data/myProductStore';
import { useToast } from '../../components/ToastContext';
import styles from './MySubPage.module.css';
import editStyles from './MyProductsPage.module.css';

const TABS = [
  '전체',
  '승인요청중',
  '보완요청',
  '경매예정',
  '경매중',
  '낙찰자 결제대기',
  '결제완료',
  '발송알림',
  '배송중',
  '수령확인 대기',
  '정산완료',
  '유찰',
  '환수요청',
  '반송중',
  '환수완료',
  '숨김',
] as const;

type Tab = typeof TABS[number];
type ProductStatusLabel = Exclude<Tab, '전체'>;
type EditableStatus = MyProduct['status'];

interface Props {
  onBack: () => void;
  onEdit: (product: MyProduct) => void;
}

const PRODUCT_STATUS_LABELS: Record<NonNullable<ProductSummaryDto['status']>, EditableStatus | '삭제'> = {
  SCHEDULED: '경매예정',
  PENDING: '승인요청중',
  NEEDS_REVISION: '보완요청',
  LIVE: '경매중',
  SOLD: '낙찰',
  FAILED: '유찰',
  RETURN_REQUESTED: '환수요청',
  RETURN_SHIPPING: '반송중',
  RETURN_COMPLETED: '환수완료',
  HIDDEN: '숨김',
  DELETED: '삭제',
};

const formatPrice = (value?: number | null) => value == null ? '-' : `${value.toLocaleString()}원`;

const toBaseStatusLabel = (item: ProductSummaryDto): EditableStatus => {
  if (item.status && PRODUCT_STATUS_LABELS[item.status] !== '삭제') {
    return PRODUCT_STATUS_LABELS[item.status] as EditableStatus;
  }
  if (item.isLive) return '경매중';
  return '경매예정';
};

const toStatusLabel = (item: ProductSummaryDto): ProductStatusLabel => {
  if (item.auctionStatus === 'AWAITING_PAYMENT') return '낙찰자 결제대기';
  if (item.auctionStatus === 'SUCCESS') {
    if (item.deliveryStatus === 'RECEIVED') return '정산완료';
    if (item.deliveryStatus === 'DELIVERED') return '수령확인 대기';
    if (item.deliveryStatus === 'SHIPPING') return '배송중';
    if (item.deliveryStatus === 'SHIPMENT_NOTICE') return '발송알림';
    return '결제완료';
  }
  const base = toBaseStatusLabel(item);
  return base === '낙찰' ? '결제완료' : base;
};

const statusDescription = (item: ProductSummaryDto, status: ProductStatusLabel) => {
  if (status === '낙찰자 결제대기') {
    return `낙찰자가 결제기한 내 결제하면 배송 단계가 시작됩니다.${item.paymentDeadline ? ` 기한: ${item.paymentDeadline}` : ''}`;
  }
  if (status === '보완요청') {
    return item.reviewRevisionReason
      ? `검수 보완 사유: ${item.reviewRevisionReason}`
      : '검수 보완이 필요합니다. 상품 정보를 수정한 뒤 다시 승인요청해주세요.';
  }
  if (status === '결제완료') return '구매자 결제가 완료되어 배송 안내를 준비 중입니다.';
  if (status === '발송알림') return '구매자에게 발송 알림이 전달되었습니다.';
  if (status === '배송중') return '상품이 배송중으로 안내되었습니다.';
  if (status === '수령확인 대기') return '구매자의 수령확인을 기다리는 중입니다.';
  if (status === '정산완료') return '구매자 수령확인 후 정산이 완료되었습니다.';
  return null;
};

const toEditableProduct = (item: ProductSummaryDto): MyProduct => ({
  id: item.id,
  images: [item.image].filter(Boolean),
  mainImageIndex: 0,
  title: item.name,
  category: item.category,
  condition: item.condition,
  auctionStartPrice: String(item.price ?? item.currentPrice ?? ''),
  minBidUnit: '',
  tradeMethod: '',
  description: '',
  location: item.location,
  auctionDate: item.auctionDate ?? '',
  status: toBaseStatusLabel(item),
  price: item.price ?? item.currentPrice ?? 0,
  timeAgo: item.timeAgo,
});

const MyProductsPage: React.FC<Props> = ({ onBack, onEdit }) => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('전체');
  const [items, setItems] = useState<ProductSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 상품 돌려받기 모달 상태
  const [returnTarget, setReturnTarget] = useState<ProductSummaryDto | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnReasonError, setReturnReasonError] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getMyProducts();
        if (mounted) setItems(data);
      } catch (err) {
        console.error('Failed to load my products', err);
        if (mounted) setError('내 등록 상품을 불러오지 못했어요.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  const filteredItems = useMemo(() => (
    tab === '전체' ? items : items.filter(item => toStatusLabel(item) === tab)
  ), [items, tab]);

  // 상태별 상품 개수. 드롭다운 옵션 옆에 표시한다. ('전체'는 전체 개수)
  const countByTab = useMemo(() => {
    const counts = {} as Record<Tab, number>;
    counts['전체'] = items.length;
    for (const item of items) {
      const label = toStatusLabel(item) as Tab;
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const statusColor = (status: ProductStatusLabel) => {
    if (status === '경매예정') return styles.statusOn;
    if (status === '승인요청중') return styles.statusApproving;
    if (status === '보완요청') return styles.statusBid;
    if (status === '경매중') return styles.statusAuctioning;
    if (status === '낙찰자 결제대기') return styles.statusBid;
    if (['결제완료', '발송알림', '배송중', '수령확인 대기'].includes(status)) return styles.statusOn;
    if (status === '정산완료') return styles.statusDone;
    if (status === '유찰') return styles.statusFailed;
    if (status === '환수요청') return styles.statusApproving;
    if (status === '반송중') return styles.statusBid;
    if (status === '환수완료') return styles.statusDone;
    return styles.statusHidden;
  };

  const canRequestReturn = (status: ProductStatusLabel) => (
    status === '승인요청중' || status === '경매예정' || status === '유찰'
  );

  const canEdit = (status: ProductStatusLabel) => (
    status === '승인요청중' || status === '보완요청' || status === '유찰' || status === '숨김'
  );

  // 돌려받기 버튼 클릭 → 사유 입력 모달 오픈
  const handleReturnRequest = (item: ProductSummaryDto) => {
    setReturnTarget(item);
    setReturnReason('단순 변심');
    setReturnReasonError('');
  };

  // 모달에서 '돌려받기 요청' 확정 시 실제 처리
  const submitReturnRequest = async () => {
    const item = returnTarget;
    if (!item) return;
    if (!returnReason.trim()) {
      setReturnReasonError('사유를 입력해주세요.');
      return;
    }
    setReturnSubmitting(true);
    try {
      await requestProductReturn(item.id, returnReason.trim());
      setItems(prev => prev.map(product => (
        product.id === item.id ? { ...product, status: 'RETURN_REQUESTED' } : product
      )));
      setReturnTarget(null);
      showToast('상품 돌려받기를 요청했어요.', 'success');
    } catch (requestError) {
      console.error('Failed to request product return', requestError);
      showToast('환수요청에 실패했어요. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setReturnSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack} aria-label="뒤로가기">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className={styles.title}>내 등록 상품</span>
        <div style={{ width: 32 }}/>
      </div>

      <div className={editStyles.filterBar}>
        <label className={editStyles.filterLabel}>상태</label>
        <select
          className={editStyles.filterSelect}
          value={tab}
          onChange={e => setTab(e.target.value as Tab)}
        >
          {TABS.map(t => (
            <option key={t} value={t}>{t} ({countByTab[t] ?? 0})</option>
          ))}
        </select>
      </div>

      <div className={styles.list}>
        {loading && <div className={styles.empty}><p className={styles.emptyText}>불러오는 중...</p></div>}

        {!loading && error && (
          <div className={styles.empty}>
            <p style={{ fontSize: 40 }}>!</p>
            <p className={styles.emptyText}>{error}</p>
          </div>
        )}

        {!loading && !error && filteredItems.length > 0 && filteredItems.map(item => {
          const status = toStatusLabel(item);
          const description = statusDescription(item, status);
          return (
            <div key={item.id} className={styles.tradeItem}>
              <img src={item.image} alt={item.name} className={styles.tradeImg}/>
              <div className={styles.tradeBody}>
                <p className={styles.tradeName}>{item.name}</p>
                <p className={styles.tradeMeta}>{item.location} · {item.condition} · {item.category}</p>
                <p className={styles.tradePrice}>경매시작가 {formatPrice(item.price)}</p>
                {description && <p className={styles.tradeMeta}>{description}</p>}
              </div>
              <div className={styles.tradeActions}>
                <span className={`${styles.statusBadge} ${statusColor(status)}`}>{status}</span>
                {canEdit(status) && (
                  <div className={editStyles.btnRow}>
                    <button className={editStyles.editBtn} onClick={() => onEdit(toEditableProduct(item))}>수정</button>
                  </div>
                )}
                {canRequestReturn(status) && (
                  <div className={editStyles.btnRow}>
                    <button className={editStyles.hideBtn} onClick={() => handleReturnRequest(item)}>상품 돌려받기</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!loading && !error && filteredItems.length === 0 && (
          <div className={styles.empty}>
            <p style={{ fontSize: 40 }}>상품</p>
            <p className={styles.emptyText}>{tab === '전체' ? '등록한 상품이 없어요.' : `${tab} 상품이 없어요.`}</p>
          </div>
        )}
      </div>

      {returnTarget && (
        <div className={editStyles.modalOverlay} onClick={() => !returnSubmitting && setReturnTarget(null)}>
          <div className={editStyles.modal} onClick={e => e.stopPropagation()}>
            <p className={editStyles.modalTitle}>상품 돌려받기</p>
            <p className={editStyles.modalDesc}>
              출품을 중단하고 관리자 확인 후 반송 절차가 진행됩니다.<br />돌려받는 사유를 입력해주세요.
            </p>
            <textarea
              className={editStyles.modalTextarea}
              value={returnReason}
              onChange={e => { setReturnReason(e.target.value); setReturnReasonError(''); }}
              placeholder="예) 단순 변심"
              rows={3}
              disabled={returnSubmitting}
            />
            {returnReasonError && <p className={editStyles.modalError}>{returnReasonError}</p>}
            <div className={editStyles.modalActions}>
              <button
                className={editStyles.modalCancelBtn}
                onClick={() => setReturnTarget(null)}
                disabled={returnSubmitting}
              >취소</button>
              <button
                className={editStyles.modalConfirmBtn}
                onClick={submitReturnRequest}
                disabled={returnSubmitting}
              >{returnSubmitting ? '요청 중...' : '돌려받기 요청'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProductsPage;
