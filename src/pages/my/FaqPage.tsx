import React, { useEffect, useState } from 'react';
import { getFaqs, type FaqDto } from '../../api/faqs';
import styles from './MySubPage.module.css';

interface Props { onBack: () => void; }

const FaqPage: React.FC<Props> = ({ onBack }) => {
  const [faqs, setFaqs] = useState<FaqDto[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    const loadFaqs = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getFaqs();
        if (alive) {
          setFaqs(data);
        }
      } catch {
        if (alive) {
          setError('FAQ를 불러오지 못했습니다.');
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void loadFaqs();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span className={styles.title}>자주 묻는 질문</span>
        <div style={{ width: 32 }} />
      </div>

      {loading && <p className={styles.faqA}>FAQ를 불러오는 중입니다.</p>}
      {!loading && error && <p className={styles.faqA}>{error}</p>}
      {!loading && !error && faqs.length === 0 && <p className={styles.faqA}>등록된 FAQ가 없습니다.</p>}

      {!loading && !error && faqs.map((faq, i) => (
        <div key={faq.id} className={styles.faqItem}>
          <button className={styles.faqQ} onClick={() => setOpen(open === i ? null : i)}>
            <span className={styles.faqQText}>Q.{faq.order} {faq.question}</span>
            <span className={`${styles.faqArrow} ${open === i ? styles.faqArrowOpen : ''}`}>▼</span>
          </button>
          {open === i && <p className={styles.faqA}>A. {faq.answer}</p>}
        </div>
      ))}
    </div>
  );
};

export default FaqPage;
