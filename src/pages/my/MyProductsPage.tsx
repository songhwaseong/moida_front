import React, { useEffect, useMemo, useState } from 'react';
import { getMyProducts, type ProductSummaryDto } from '../../api/products';
import type { MyProduct } from '../../data/myProductStore';
import styles from './MySubPage.module.css';
import editStyles from './MyProductsPage.module.css';

const TABS = ['전체', '경매예정', '승인요청중', '경매중', '낙찰', '유찰', '숨김'] as const;

type Tab = typeof TABS[number];
type ProductStatusLabel = Exclude<Tab, '전체'>;

interface Props {
  onBack: () => void;
  onEdit: (product: MyProduct) => void;
}

const STATUS_LABELS: Record<NonNullable<ProductSummaryDto['status']>, ProductStatusLabel | '삭제'> = {
  SCHEDULED: '경매예정',
  PENDING: '승인요청중',
  LIVE: '경매중',
  SOLD: '낙찰',
  FAILED: '유찰',
  HIDDEN: '숨김',
  DELETED: '삭제',
};

const formatPrice = (value?: number | null) => value == null ? '—' : `${value.toLocaleString()}원`;

const toStatusLabel = (item: ProductSummaryDto): ProductStatusLabel => {
  if (item.status && STATUS_LABELS[item.status] !== '삭제') {
    return STATUS_LABELS[item.status] as ProductStatusLabel;
  }
  if (item.isLive) return '경매중';
  return '경매예정';
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
  status: toStatusLabel(item),
  price: item.price ?? item.currentPrice ?? 0,
  timeAgo: item.timeAgo,
});

const MyProductsPage: React.FC<Props> = ({ onBack, onEdit }) => {
  const [tab, setTab] = useState<Tab>('전체');
  const [items, setItems] = useState<ProductSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const statusColor = (status: ProductStatusLabel) => {
    if (status === '경매예정') return styles.statusOn;
    if (status === '승인요청중') return styles.statusApproving;
    if (status === '경매중') return styles.statusAuctioning;
    if (status === '낙찰') return styles.statusDone;
    if (status === '유찰') return styles.statusFailed;
    return styles.statusHidden;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className={styles.title}>내 등록 상품</span>
        <div style={{ width: 32 }}/>
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
            <p style={{ fontSize: 40 }}>!</p>
            <p className={styles.emptyText}>{error}</p>
          </div>
        )}

        {!loading && !error && filteredItems.length > 0 && filteredItems.map(item => {
          const status = toStatusLabel(item);
          return (
            <div key={item.id} className={styles.tradeItem}>
              <img src={item.image} alt={item.name} className={styles.tradeImg}/>
              <div className={styles.tradeBody}>
                <p className={styles.tradeName}>{item.name}</p>
                <p className={styles.tradeMeta}>{item.location} · {item.condition} · {item.category}</p>
                <p className={styles.tradePrice}>경매시작가 {formatPrice(item.price)}</p>
              </div>
              <div className={styles.tradeActions}>
                <span className={`${styles.statusBadge} ${statusColor(status)}`}>{status}</span>
                {(status === '경매예정' || status === '유찰' || status === '숨김') && (
                  <div className={editStyles.btnRow}>
                    <button className={editStyles.editBtn} onClick={() => onEdit(toEditableProduct(item))}>수정</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!loading && !error && filteredItems.length === 0 && (
          <div className={styles.empty}>
            <p style={{ fontSize: 40 }}>📦</p>
            <p className={styles.emptyText}>{tab === '전체' ? '등록된 상품이 없어요' : `${tab} 상품이 없어요`}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProductsPage;
