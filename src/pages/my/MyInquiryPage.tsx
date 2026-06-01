import React, { useEffect, useMemo, useState } from 'react';
import styles from './MySubPage.module.css';
import { getMyInquiries, type MyInquiryView } from '../../api/inquiries';

type StatusTab = '전체' | '답변대기' | '답변완료';

const KIND_LABEL: Record<MyInquiryView['kind'], string> = { product: '경매예정', auction: '경매' };

interface Props {
  onBack: () => void;
  onProductClick?: (id: number) => void;
  onAuctionClick?: (id: number) => void;
}

const MyInquiryPage: React.FC<Props> = ({ onBack, onProductClick, onAuctionClick }) => {
  const [tab, setTab] = useState<StatusTab>('전체');
  const [items, setItems] = useState<MyInquiryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getMyInquiries();
        if (mounted) setItems(data);
      } catch (err) {
        console.error('Failed to load my inquiries', err);
        if (mounted) setError('내 문의를 불러오지 못했어요.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, []);

  const pending = items.filter(i => !i.answer).length;
  const done = items.length - pending;

  const filtered = useMemo(() => {
    if (tab === '답변대기') return items.filter(i => !i.answer);
    if (tab === '답변완료') return items.filter(i => i.answer);
    return items;
  }, [items, tab]);

  const handleItemClick = (rec: MyInquiryView) => {
    if (rec.kind === 'auction') onAuctionClick?.(rec.itemId);
    else onProductClick?.(rec.itemId);
  };

  const TABS: { key: StatusTab; label: string; count?: number }[] = [
    { key: '전체', label: '전체', count: items.length },
    { key: '답변대기', label: '답변대기', count: pending },
    { key: '답변완료', label: '답변완료', count: done },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span className={styles.title}>내 문의</span>
        <div style={{ width: 32 }} />
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {typeof t.count === 'number' && t.count > 0 && (
              <span style={{ marginLeft: 4, fontSize: 12, opacity: 0.8 }}>({t.count})</span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.list} style={{ paddingBottom: 24 }}>
        {loading ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>불러오는 중...</p>
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <p style={{ fontSize: 40 }}>!</p>
            <p className={styles.emptyText}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <p style={{ fontSize: 40 }}>💬</p>
            <p className={styles.emptyText}>{tab === '전체' ? '등록한 문의가 없어요' : `${tab} 내역이 없어요`}</p>
            <p className={styles.emptySubText}>상품 상세 페이지에서 문의를 남겨보세요</p>
          </div>
        ) : (
          filtered.map(q => (
            <div
              key={q.id}
              style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 0,
                marginBottom: 10,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => handleItemClick(q)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px',
                  width: '100%',
                  background: '#FAFAFB',
                  borderBottom: '1px solid #F2F3F6',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'Noto Sans KR, sans-serif',
                }}
              >
                {q.itemImage && (
                  <img src={q.itemImage} alt="" style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 4,
                      background: q.kind === 'auction' ? '#FFF3E0' : '#EAF7EC',
                      color: q.kind === 'auction' ? '#A06200' : '#256B30',
                    }}>{KIND_LABEL[q.kind]}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.itemName}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>판매자 {q.seller}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  background: q.answer ? '#EAF7EC' : '#FDEEED',
                  color: q.answer ? '#256B30' : '#A32D2D',
                  flexShrink: 0,
                }}>
                  {q.answer ? '답변완료' : '답변대기'}
                </span>
              </button>

              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: '#1A1A2E', color: '#fff', fontSize: 11, fontWeight: 800 }}>Q</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{q.user}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>{q.date}</span>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-line', margin: 0 }}>{q.question}</p>
              </div>

              {q.answer && (
                <div style={{ padding: '14px 16px', background: '#FAFAFB', borderTop: '1px dashed var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 800 }}>A</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {q.answer.user}
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'rgba(226,75,74,0.10)', padding: '1px 6px', borderRadius: 4 }}>판매자</span>
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>{q.answer.date}</span>
                  </div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-line', margin: 0 }}>{q.answer.text}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyInquiryPage;
