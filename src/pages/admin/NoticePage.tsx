import React, { useEffect, useState } from 'react';
import {
  createAdminNotice,
  deleteAdminNotice,
  getAdminNotices,
  updateAdminNotice,
  type NoticeCategory,
  type NoticeDto,
  type NoticeRequestDto,
  type NoticeStatus,
} from '../../api/notices';
import s from './admin.module.css';

type Notice = NoticeDto;

const CATEGORIES = ['서비스', '이벤트', '점검', '정책'] as const;
type Category = typeof CATEGORIES[number];

const STATUSES = ['게시중', '예약', '숨김'] as const;

const categoryColor: Record<Category, string> = {
  '서비스': '#1565C0',
  '이벤트': '#E65C00',
  '점검': '#6A3DA8',
  '정책': '#2E7D32',
};

const categoryBg: Record<Category, string> = {
  '서비스': '#E3F0FF',
  '이벤트': '#FFF3E0',
  '점검': '#F3EEFF',
  '정책': '#EAF7EC',
};

const statusColor: Record<NoticeStatus, string> = {
  '게시중': '#2E7D32',
  '예약': '#1565C0',
  '숨김': '#8B8FA8',
};

const statusBg: Record<NoticeStatus, string> = {
  '게시중': '#EAF7EC',
  '예약': '#E3F0FF',
  '숨김': '#F0F1F4',
};

const PAGE_SIZE = 5;

const NoticePage: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('전체');
  const [selected, setSelected] = useState<Notice | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Notice>>({});
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadNotices = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAdminNotices();
      setNotices(data);
    } catch {
      setError('공지사항을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadNotices();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  const filtered = notices.filter(n => {
    if (filterCategory !== '전체' && n.category !== filterCategory) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNew = () => {
    setEditForm({ title: '', category: '서비스', status: '게시중', isPinned: false, content: '' });
    setSelected(null);
    setIsEditing(true);
  };

  const openEdit = (notice: Notice) => {
    setEditForm({ ...notice });
    setSelected(notice);
    setIsEditing(true);
  };

  // 작성/수정 모달을 닫을 때 selected 까지 비운다.
  // selected 가 남아 있으면 isEditing=false 가 되는 순간 상세 보기 모달이 다시 떠버린다.
  const closeEditor = () => {
    setIsEditing(false);
    setSelected(null);
  };

  const toRequest = (): NoticeRequestDto | null => {
    if (!editForm.title?.trim() || !editForm.content?.trim()) return null;

    return {
      title: editForm.title,
      category: (editForm.category ?? '서비스') as NoticeCategory,
      status: (editForm.status ?? '게시중') as NoticeStatus,
      isPinned: editForm.isPinned ?? false,
      content: editForm.content,
    };
  };

  const saveNotice = async () => {
    const request = toRequest();
    if (!request) return;

    try {
      setSaving(true);
      setError('');
      if (selected) {
        const updated = await updateAdminNotice(selected.id, request);
        setNotices(prev => prev.map(n => n.id === updated.id ? updated : n));
      } else {
        const created = await createAdminNotice(request);
        setNotices(prev => [created, ...prev]);
      }
      // 저장 후에는 상세 보기 모달을 띄우지 않고 그대로 목록으로 닫는다.
      setSelected(null);
      setIsEditing(false);
    } catch {
      setError('공지사항 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setError('');
      await deleteAdminNotice(deleteTarget.id);
      setNotices(prev => prev.filter(n => n.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (selected?.id === deleteTarget.id) {
        setSelected(null);
      }
    } catch {
      setError('공지사항 삭제에 실패했습니다.');
    }
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.title}>공지사항 관리</div>
        <div className={s.subtitle}>플랫폼 공지사항을 작성하고 관리합니다.</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <select
          value={filterCategory}
          onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, color: '#4A4A6A', background: '#fff', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif', outline: 'none', minWidth: 130 }}
        >
          {['전체', ...CATEGORIES].map(v => <option key={v}>{v}</option>)}
        </select>
        <button className={s.actionBtnPrimary} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif' }} onClick={openNew}>+ 공지 작성</button>
      </div>

      <table className={s.table}>
        <thead>
          <tr>
            <th>구분</th><th>제목</th><th>상태</th><th>작성자</th><th>등록일</th><th>관리</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={6} className={s.emptyText}>공지사항을 불러오는 중입니다.</td></tr>
          )}
          {!loading && error && (
            <tr><td colSpan={6} className={s.emptyText}>{error}</td></tr>
          )}
          {!loading && !error && filtered.length === 0 && (
            <tr><td colSpan={6} className={s.emptyText}>공지사항이 없습니다.</td></tr>
          )}
          {!loading && !error && paged.map(n => (
            <tr key={n.id}>
              <td>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: categoryBg[n.category], color: categoryColor[n.category] }}>{n.category}</span>
              </td>
              <td>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {n.isPinned && <span style={{ fontSize: 11, background: '#FDEEED', color: '#C62828', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>고정</span>}
                  <span style={{ fontWeight: 600, cursor: 'pointer', color: '#1A1A2E' }} onClick={() => { setSelected(n); setIsEditing(false); }}>{n.title}</span>
                </span>
              </td>
              <td>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: statusBg[n.status], color: statusColor[n.status] }}>{n.status}</span>
              </td>
              <td>{n.author}</td>
              <td>{n.createdAt}</td>
              <td>
                <button className={s.actionBtn} onClick={() => openEdit(n)}>수정</button>
                <button className={`${s.actionBtn} ${s.actionBtnDanger}`} onClick={() => setDeleteTarget(n)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E0E0E0', background: page === 1 ? '#F5F5F5' : '#fff', color: page === 1 ? '#ccc' : '#4A4A6A', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13 }}>이전</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPage(n)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E0E0E0', background: page === n ? '#E24B4A' : '#fff', color: page === n ? '#fff' : '#4A4A6A', fontWeight: page === n ? 700 : 400, cursor: 'pointer', fontSize: 13 }}>{n}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E0E0E0', background: page === totalPages ? '#F5F5F5' : '#fff', color: page === totalPages ? '#ccc' : '#4A4A6A', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13 }}>다음</button>
        </div>
      )}

      {selected && !isEditing && (
        <div className={s.overlay} onClick={() => setSelected(null)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div className={s.modalTitle}>{selected.title}</div>
              <button className={s.modalClose} onClick={() => setSelected(null)}>x</button>
            </div>
            <div className={s.infoRow}><div className={s.infoLabel}>구분</div><div className={s.infoValue}>{selected.category}</div></div>
            <div className={s.infoRow}><div className={s.infoLabel}>상태</div><div className={s.infoValue}>{selected.status}</div></div>
            <div className={s.infoRow}><div className={s.infoLabel}>작성자</div><div className={s.infoValue}>{selected.author}</div></div>
            <div className={s.infoRow}><div className={s.infoLabel}>등록일</div><div className={s.infoValue}>{selected.createdAt}</div></div>
            <div className={s.divider} />
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#2A2A3A' }}>{selected.content}</div>
            <div className={s.modalActions}>
              <button className={s.actionBtn} onClick={() => openEdit(selected)}>수정하기</button>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        // 작성/수정 중 실수로 바깥을 눌러도 내용이 날아가지 않도록 오버레이 클릭으로는 닫지 않는다.
        // 닫기는 취소 버튼 / 우상단 x 로만 가능.
        <div className={s.overlay}>
          <div className={s.modal}>
            <div className={s.modalHeader}>
              <div className={s.modalTitle}>{selected ? '공지 수정' : '공지 작성'}</div>
              <button className={s.modalClose} onClick={closeEditor}>x</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8FA8', display: 'block', marginBottom: 4 }}>제목</label>
                <input style={{ width: '100%', padding: '9px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, fontFamily: 'Noto Sans KR, sans-serif', boxSizing: 'border-box' }}
                  value={editForm.title ?? ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="공지 제목을 입력하세요" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8FA8', display: 'block', marginBottom: 4 }}>구분</label>
                  <select style={{ width: '100%', padding: '9px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, fontFamily: 'Noto Sans KR, sans-serif' }}
                    value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value as Category }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8FA8', display: 'block', marginBottom: 4 }}>상태</label>
                  <select style={{ width: '100%', padding: '9px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, fontFamily: 'Noto Sans KR, sans-serif' }}
                    value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value as NoticeStatus }))}>
                    {STATUSES.map(status => <option key={status}>{status}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="pinCheck" checked={editForm.isPinned ?? false} onChange={e => setEditForm(p => ({ ...p, isPinned: e.target.checked }))} />
                <label htmlFor="pinCheck" style={{ fontSize: 13, cursor: 'pointer' }}>상단 고정</label>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8FA8', display: 'block', marginBottom: 4 }}>내용</label>
                <textarea className={s.textArea} rows={5} value={editForm.content ?? ''} onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} placeholder="공지 내용을 입력하세요" />
              </div>
            </div>
            <div className={s.modalActions}>
              <button className={s.actionBtn} onClick={closeEditor}>취소</button>
              <button className={s.actionBtnPrimary} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'Noto Sans KR, sans-serif', opacity: saving ? 0.7 : 1 }} onClick={() => void saveNotice()} disabled={saving}>{saving ? '저장 중' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={s.overlay} onClick={() => setDeleteTarget(null)}>
          <div className={s.modal} style={{ maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className={s.modalTitle} style={{ marginBottom: 8 }}>공지를 삭제하시겠어요?</div>
            <div style={{ fontSize: 13, color: '#8B8FA8', marginBottom: 20 }}>'{deleteTarget.title}'<br />삭제된 공지는 복구할 수 없습니다.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className={s.actionBtn} style={{ flex: 1, padding: 12, borderRadius: 10, fontSize: 14 }} onClick={() => setDeleteTarget(null)}>취소</button>
              <button style={{ flex: 1, padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 700, background: '#E24B4A', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif' }} onClick={() => void confirmDelete()}>삭제하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticePage;
