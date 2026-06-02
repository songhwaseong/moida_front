import React, { useEffect, useState } from 'react';
import { getReceivedReviews, type ReceivedReviewDto } from '../../api/reviews';
import moidaLogoMark from '../../assets/moidaLogoMark.png';
import styles from './MySubPage.module.css';

interface Props { onBack: () => void; }

const ThumbUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
    <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
  </svg>
);

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const formatMannerTempChange = (value: number | null | undefined) => {
  const change = value ?? 0;
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}°C`;
};

const mannerTempClass = (value: number | null | undefined) => {
  const change = value ?? 0;
  if (change > 0) return styles.mannerChangeUp;
  if (change < 0) return styles.mannerChangeDown;
  return styles.mannerChangeNeutral;
};

const ReceivedReviewsPage: React.FC<Props> = ({ onBack }) => {
  const [reviews, setReviews] = useState<ReceivedReviewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    setError('');
    try {
      setReviews(await getReceivedReviews());
    } catch (err) {
      console.error('Failed to load received reviews', err);
      setError('받은 후기를 불러오지 못했어요');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    const loadInitialReviews = async () => {
      try {
        const nextReviews = await getReceivedReviews();
        if (!ignore) setReviews(nextReviews);
      } catch (err) {
        console.error('Failed to load received reviews', err);
        if (!ignore) setError('받은 후기를 불러오지 못했어요');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void loadInitialReviews();
    return () => { ignore = true; };
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className={styles.title}>받은 후기</span>
        <div style={{width:32}}/>
      </div>
      <div className={styles.list}>
        {loading ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>받은 후기를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className={styles.empty}>
            <p style={{ fontSize: 40, color: '#E24B4A' }}>👍</p>
            <p className={styles.emptyText}>{error}</p>
            <button className={styles.retryBtn} onClick={() => void loadReviews()}>다시 시도</button>
          </div>
        ) : reviews.length === 0 ? (
          <div className={styles.empty}>
            <p style={{ fontSize: 40, color: '#E24B4A' }}>👍</p>
            <p className={styles.emptyText}>아직 받은 후기가 없어요</p>
          </div>
        ) : reviews.map(r => (
          <div key={r.id} className={styles.reviewItem}>
            <div className={styles.reviewHeader}>
              <div className={styles.reviewUserInfo}>
                <span className={styles.reviewAvatar}>{r.reviewerAvatar || '😊'}</span>
                <span className={styles.reviewUser}>{r.reviewerNickname}</span>
              </div>
              <div className={styles.reviewMetaBadges}>
                <span className={`${styles.mannerChange} ${mannerTempClass(r.mannerTempChange)}`}>
                  매너온도 {formatMannerTempChange(r.mannerTempChange)}
                </span>
                <span className={styles.reviewDate}>{formatDate(r.createdAt)}</span>
              </div>
            </div>
            <div className={styles.stars}>
              {Array.from({ length: r.rating }).map((_, i) => <ThumbUp key={i} />)}
            </div>
            <p className={styles.reviewText}>{r.content || '내용 없는 후기입니다.'}</p>
            <div className={styles.reviewProductBox}>
              <img
                src={r.productImage || moidaLogoMark}
                alt={r.productName}
                className={styles.reviewProductImg}
              />
              <p className={styles.reviewProduct}>{r.productName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReceivedReviewsPage;
