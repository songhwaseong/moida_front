import React, { useEffect, useMemo, useState } from 'react';
import { getTermsDocuments, type TermsDocumentDto, type TermsType } from '../../api/terms';
import styles from './MySubPage.module.css';

const FALLBACK_TABS: Array<{ type: TermsType; title: string }> = [
  { type: 'TERMS', title: '이용약관' },
  { type: 'PRIVACY', title: '개인정보처리방침' },
];

interface Props {
  onBack: () => void;
  initialTab?: string;
}

const toTermsType = (tab?: string): TermsType => (tab === '개인정보처리방침' ? 'PRIVACY' : 'TERMS');

const TermsPage: React.FC<Props> = ({ onBack, initialTab = '이용약관' }) => {
  const [selectedType, setSelectedType] = useState<TermsType>(() => toTermsType(initialTab));
  const [documents, setDocuments] = useState<TermsDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTerms = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getTermsDocuments();
        setDocuments(data);
      } catch (err) {
        console.error('Failed to load terms documents', err);
        setError('약관 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    void loadTerms();
  }, []);

  const tabs = useMemo(
    () => (documents.length > 0 ? documents.map((document) => ({ type: document.type, title: document.title })) : FALLBACK_TABS),
    [documents]
  );

  const selectedDocument = documents.find((document) => document.type === selectedType);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack} aria-label="뒤로가기">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span className={styles.title}>{selectedDocument?.title ?? '이용약관'}</span>
        <div style={{ width: 32 }} />
      </div>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.type}
            className={`${styles.tab} ${selectedType === tab.type ? styles.tabActive : ''}`}
            onClick={() => setSelectedType(tab.type)}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {loading && <div className={styles.settingStatus}>약관 정보를 불러오는 중입니다.</div>}
      {!loading && error && <div className={styles.settingError}>{error}</div>}

      {!loading && !error && selectedDocument && (
        <div className={styles.termsSection}>
          <p className={styles.termsTitle}>{selectedDocument.title}</p>
          {selectedDocument.effectiveDate && (
            <p className={styles.termsMeta}>시행일 {selectedDocument.effectiveDate}</p>
          )}
          <p className={styles.termsText}>{selectedDocument.content}</p>
        </div>
      )}
    </div>
  );
};

export default TermsPage;
