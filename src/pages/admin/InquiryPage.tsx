import React, { useEffect, useState } from 'react';
import {
  createAdminFaq,
  deleteAdminFaq,
  getAdminFaqs,
  updateAdminFaq,
  type FaqDto,
  type FaqRequestDto,
} from '../../api/faqs';
import s from './admin.module.css';

type Faq = FaqDto;

const FAQ_CATEGORIES = ['거래/배송', '경매', '결제', '계정', '신고/제재'];
const FAQ_PAGE_SIZE = 5;

const getFaqCategoryClass = (category: string) => {
  if (category === '거래/배송') return s.faqCategoryShipping;
  if (category === '결제') return s.faqCategoryPayment;
  if (category === '경매') return s.faqCategoryAuction;
  if (category === '계정') return s.faqCategoryAccount;
  return s.faqCategoryDefault;
};

const InquiryPage: React.FC = () => {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [faqCat, setFaqCat] = useState('전체');
  const [editFaq, setEditFaq] = useState<Faq | null>(null);
  const [faqForm, setFaqForm] = useState<Partial<Faq>>({});
  const [isNewFaq, setIsNewFaq] = useState(false);
  const [faqPage, setFaqPage] = useState(1);
  const [faqLoading, setFaqLoading] = useState(true);
  const [faqSaving, setFaqSaving] = useState(false);
  const [faqError, setFaqError] = useState('');

  const loadFaqs = async () => {
    try {
      setFaqLoading(true);
      setFaqError('');
      const data = await getAdminFaqs();
      setFaqs(data);
    } catch {
      setFaqError('FAQ 목록을 불러오지 못했습니다.');
    } finally {
      setFaqLoading(false);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadFaqs();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const filteredFaqs = faqs
    .filter(f => faqCat === '전체' || f.category === faqCat)
    .sort((a, b) => a.order - b.order);

  const faqTotalPages = Math.ceil(filteredFaqs.length / FAQ_PAGE_SIZE);
  const pagedFaqs = filteredFaqs.slice((faqPage - 1) * FAQ_PAGE_SIZE, faqPage * FAQ_PAGE_SIZE);

  const openFaqEdit = (f: Faq) => {
    setFaqForm({ ...f });
    setEditFaq(f);
    setIsNewFaq(true);
  };

  const openFaqNew = () => {
    setFaqForm({
      category: FAQ_CATEGORIES[0],
      question: '',
      answer: '',
      order: faqs.length + 1,
      visible: true,
    });
    setEditFaq(null);
    setIsNewFaq(true);
  };

  const saveFaq = async () => {
    if (!faqForm.question?.trim() || !faqForm.answer?.trim()) return;

    const request: FaqRequestDto = {
      category: faqForm.category ?? FAQ_CATEGORIES[0],
      question: faqForm.question,
      answer: faqForm.answer,
      order: faqForm.order ?? faqs.length + 1,
      visible: faqForm.visible ?? true,
    };

    try {
      setFaqSaving(true);
      setFaqError('');
      if (editFaq) {
        const updated = await updateAdminFaq(editFaq.id, request);
        setFaqs(prev => prev.map(f => f.id === updated.id ? updated : f));
      } else {
        const created = await createAdminFaq(request);
        setFaqs(prev => [...prev, created]);
      }
      setIsNewFaq(false);
    } catch {
      setFaqError('FAQ 저장에 실패했습니다.');
    } finally {
      setFaqSaving(false);
    }
  };

  const toggleFaqVisible = async (faq: Faq) => {
    const nextVisible = !faq.visible;
    setFaqs(prev => prev.map(f => f.id === faq.id ? { ...f, visible: nextVisible } : f));

    try {
      setFaqError('');
      const updated = await updateAdminFaq(faq.id, {
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        order: faq.order,
        visible: nextVisible,
      });
      setFaqs(prev => prev.map(f => f.id === updated.id ? updated : f));
    } catch {
      setFaqs(prev => prev.map(f => f.id === faq.id ? faq : f));
      setFaqError('FAQ 노출 상태 변경에 실패했습니다.');
    }
  };

  const removeFaq = async (faq: Faq) => {
    if (!window.confirm('FAQ를 삭제하시겠습니까?')) return;

    try {
      setFaqError('');
      await deleteAdminFaq(faq.id);
      setFaqs(prev => prev.filter(f => f.id !== faq.id));
    } catch {
      setFaqError('FAQ 삭제에 실패했습니다.');
    }
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.title}>FAQ 관리</div>
        <div className={s.subtitle}>자주 묻는 질문을 등록, 수정, 삭제합니다.</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <select
          value={faqCat}
          onChange={e => { setFaqCat(e.target.value); setFaqPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, color: '#4A4A6A', background: '#fff', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif', outline: 'none', minWidth: 130 }}
        >
          {['전체', ...FAQ_CATEGORIES].map(v => <option key={v}>{v}</option>)}
        </select>
        <button className={s.actionBtnPrimary} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif' }} onClick={openFaqNew}>+ FAQ 추가</button>
      </div>

      <table className={s.table}>
        <thead>
          <tr><th>구분</th><th className={s.faqQuestionHead}>질문</th><th>노출</th><th>관리</th></tr>
        </thead>
        <tbody>
          {faqLoading && (
            <tr><td colSpan={4} className={s.emptyText}>FAQ 목록을 불러오는 중입니다.</td></tr>
          )}
          {!faqLoading && faqError && (
            <tr><td colSpan={4} className={s.emptyText}>{faqError}</td></tr>
          )}
          {!faqLoading && !faqError && pagedFaqs.length === 0 && (
            <tr><td colSpan={4} className={s.emptyText}>등록된 FAQ가 없습니다.</td></tr>
          )}
          {!faqLoading && !faqError && pagedFaqs.map(f => (
            <tr key={f.id}>
              <td><span className={`${s.faqCategoryBadge} ${getFaqCategoryClass(f.category)}`}>{f.category}</span></td>
              <td className={s.faqQuestionCell}>
                <span className={s.faqQuestionNo}>Q{f.order}</span>
                <span>{f.question}</span>
              </td>
              <td>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={f.visible} onChange={() => void toggleFaqVisible(f)} />
                  <span style={{ fontSize: 12, color: f.visible ? '#2E7D32' : '#8B8FA8' }}>{f.visible ? '노출' : '숨김'}</span>
                </label>
              </td>
              <td>
                <button className={`${s.actionBtn} ${s.faqEditBtn}`} onClick={() => openFaqEdit(f)}>수정</button>
                <button className={`${s.actionBtn} ${s.faqDeleteBtn}`} onClick={() => void removeFaq(f)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {faqTotalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <button className={`${s.pageMoveBtn} ${s.pagePrevBtn} ${faqPage === 1 ? s.pageMoveBtnDisabled : ''}`} onClick={() => setFaqPage(p => Math.max(1, p - 1))} disabled={faqPage === 1}>이전</button>
          {Array.from({ length: faqTotalPages }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setFaqPage(n)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E0E0E0', background: faqPage === n ? '#E24B4A' : '#fff', color: faqPage === n ? '#fff' : '#4A4A6A', fontWeight: faqPage === n ? 700 : 400, cursor: 'pointer', fontSize: 13 }}>{n}</button>
          ))}
          <button className={`${s.pageMoveBtn} ${s.pageNextBtn} ${faqPage === faqTotalPages ? s.pageMoveBtnDisabled : ''}`} onClick={() => setFaqPage(p => Math.min(faqTotalPages, p + 1))} disabled={faqPage === faqTotalPages}>다음</button>
        </div>
      )}

      {isNewFaq && (
        <div className={s.overlay} onClick={() => setIsNewFaq(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div className={s.modalTitle}>{editFaq ? 'FAQ 수정' : 'FAQ 추가'}</div>
              <button className={s.modalClose} onClick={() => setIsNewFaq(false)}>x</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8FA8', display: 'block', marginBottom: 4 }}>구분</label>
                <select style={{ width: '100%', padding: '9px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, fontFamily: 'Noto Sans KR, sans-serif' }}
                  value={faqForm.category} onChange={e => setFaqForm(p => ({ ...p, category: e.target.value }))}>
                  {FAQ_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8FA8', display: 'block', marginBottom: 4 }}>질문</label>
                <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, fontFamily: 'Noto Sans KR, sans-serif', boxSizing: 'border-box' }}
                  value={faqForm.question ?? ''} onChange={e => setFaqForm(p => ({ ...p, question: e.target.value }))} placeholder="질문을 입력하세요" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8FA8', display: 'block', marginBottom: 4 }}>답변</label>
                <textarea className={s.textArea} rows={5} value={faqForm.answer ?? ''} onChange={e => setFaqForm(p => ({ ...p, answer: e.target.value }))} placeholder="답변을 입력하세요" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="faqVisible" checked={faqForm.visible ?? true} onChange={e => setFaqForm(p => ({ ...p, visible: e.target.checked }))} />
                <label htmlFor="faqVisible" style={{ fontSize: 13, cursor: 'pointer' }}>노출</label>
              </div>
            </div>
            <div className={s.modalActions}>
              <button className={s.actionBtn} onClick={() => setIsNewFaq(false)}>취소</button>
              <button className={s.actionBtnPrimary} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: faqSaving ? 'default' : 'pointer', fontFamily: 'Noto Sans KR, sans-serif', opacity: faqSaving ? 0.7 : 1 }} onClick={() => void saveFaq()} disabled={faqSaving}>{faqSaving ? '저장 중' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiryPage;
