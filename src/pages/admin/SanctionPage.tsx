import React, { useCallback, useEffect, useState } from 'react';
import styles from './admin.module.css';
import {
  getAdminSanctions,
  createAdminSanction,
  sanctionEnumToLabel,
  type AdminSanctionDto,
  type SanctionTypeLabel,
} from '../../api/adminSanctions';

// 화면에서 쓰는 행 — API DTO 의 type(enum)을 화면용 라벨로 미리 변환해 둔다.
interface SanctionRow {
  id: number;
  memberNo: string;
  memberName: string;
  type: SanctionTypeLabel;
  reason: string;
  adminNote: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const toRow = (dto: AdminSanctionDto): SanctionRow => ({
  id: dto.id,
  memberNo: dto.memberNo,
  memberName: dto.memberName,
  type: sanctionEnumToLabel(dto.type),
  reason: dto.reason,
  adminNote: dto.adminNote,
  expiresAt: dto.expiresAt,
  createdAt: dto.createdAt,
});

const typeLabel = (t: SanctionTypeLabel) => ({
  warning: '경고', suspend_7: '7일 정지', suspend_30: '30일 정지', permanent: '영구 정지',
}[t]);

const typeClass = (t: SanctionTypeLabel) => ({
  warning: styles.badgeWarning,
  suspend_7: styles.badgeSuspend,
  suspend_30: styles.badgeSuspend,
  permanent: styles.badgePermanent,
}[t]);

const SANCTION_TYPES: { value: SanctionTypeLabel; label: string }[] = [
  { value: 'warning', label: '경고' },
  { value: 'suspend_7', label: '7일 정지' },
  { value: 'suspend_30', label: '30일 정지' },
  { value: 'permanent', label: '영구 정지' },
];

type SanctionForm = {
  memberNo: string;
  type: SanctionTypeLabel;
  reason: string;
  adminNote: string;
};

const PAGE_SIZE = 5;

const SanctionPage: React.FC = () => {
  const [list, setList] = useState<SanctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<SanctionForm>({ memberNo: '', type: 'warning', reason: '', adminNote: '' });
  const [page, setPage] = useState(1);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const dtos = await getAdminSanctions();
      setList(dtos.map(toRow));
    } catch {
      setLoadError('제재 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 페치, 정상 데이터 로딩 패턴
  useEffect(() => { reload(); }, [reload]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const paged = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const closeAdd = () => {
    if (submitting) return;
    setShowAdd(false);
    setForm({ memberNo: '', type: 'warning', reason: '', adminNote: '' });
  };

  const handleAdd = async () => {
    if (!form.memberNo.trim() || !form.reason.trim()) {
      setAlertMsg('회원번호와 사유를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createAdminSanction({
        memberNo: form.memberNo.trim(),
        type: form.type,
        reason: form.reason.trim(),
        adminNote: form.adminNote.trim() || undefined,
      });
      // 응답으로 받은 row 를 최상단에 추가 (정렬과 일치)
      setList(prev => [toRow(created), ...prev]);
      setShowAdd(false);
      setForm({ memberNo: '', type: 'warning', reason: '', adminNote: '' });
      setPage(1);
    } catch (e: unknown) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? '제재 등록에 실패했습니다.';
      setAlertMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className={styles.title}>제재 내역</h1>
          <p className={styles.subtitle}>회원 제재 이력을 관리합니다</p>
        </div>
        <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => setShowAdd(true)}>
          + 제재 추가
        </button>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.statNum}>{list.length}</div>
          <div className={styles.statLabel}>전체 제재</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statNum} ${styles.statNumAmber}`}>{list.filter(s => s.type === 'warning').length}</div>
          <div className={styles.statLabel}>경고</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statNum} ${styles.statNumRed}`}>{list.filter(s => s.type.startsWith('suspend')).length}</div>
          <div className={styles.statLabel}>정지</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statNum} style={{ color: '#1A1A1A' }}>{list.filter(s => s.type === 'permanent').length}</div>
          <div className={styles.statLabel}>영구 정지</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, background: '#fff', border: '1px solid #EDEEF2', borderRadius: 12, textAlign: 'center', color: '#8B8FA8', fontSize: 13 }}>
          제재 내역을 불러오는 중입니다…
        </div>
      ) : loadError ? (
        <div style={{ padding: 40, background: '#fff', border: '1px solid #EDEEF2', borderRadius: 12, textAlign: 'center', color: '#8B8FA8', fontSize: 13 }}>
          {loadError}
          <div style={{ marginTop: 12 }}>
            <button onClick={reload} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #E0E0E0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>다시 시도</button>
          </div>
        </div>
      ) : list.length === 0 ? (
        <div style={{ padding: 40, background: '#fff', border: '1px solid #EDEEF2', borderRadius: 12, textAlign: 'center', color: '#8B8FA8', fontSize: 13 }}>
          등록된 제재 내역이 없습니다.
        </div>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>회원번호</th>
                <th>이름</th>
                <th>제재 종류</th>
                <th>사유</th>
                <th>관리자 메모</th>
                <th>처리 일시</th>
                <th>만료일</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(s => (
                <tr key={s.id}>
                  <td style={{ fontSize: 12 }}>{s.memberNo}</td>
                  <td style={{ fontWeight: 500 }}>{s.memberName}</td>
                  <td><span className={`${styles.badge} ${typeClass(s.type)}`}>{typeLabel(s.type)}</span></td>
                  <td style={{ fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.reason}</td>
                  <td style={{ fontSize: 12, color: '#8B8FA8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.adminNote ?? ''}</td>
                  <td style={{ fontSize: 12, color: '#8B8FA8', whiteSpace: 'nowrap' }}>{s.createdAt}</td>
                  <td style={{ fontSize: 12, color: s.expiresAt ? '#E24B4A' : '#8B8FA8' }}>{s.expiresAt ?? '—'}</td>
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
        </>
      )}

      {/* 제재 추가 모달 */}
      {showAdd && (
        <div className={styles.overlay} onClick={closeAdd}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>제재 추가</h2>
              <button className={styles.modalClose} onClick={closeAdd} disabled={submitting}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8FA8', display: 'block', marginBottom: 4 }}>회원번호</label>
              <input
                style={{ width: '100%', border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'Noto Sans KR, sans-serif', boxSizing: 'border-box' }}
                placeholder="예: 2024031500001"
                value={form.memberNo}
                disabled={submitting}
                onChange={e => setForm(p => ({ ...p, memberNo: e.target.value }))}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8FA8', display: 'block', marginBottom: 4 }}>사유</label>
              <input
                style={{ width: '100%', border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'Noto Sans KR, sans-serif', boxSizing: 'border-box' }}
                placeholder="제재 사유"
                value={form.reason}
                disabled={submitting}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8FA8', display: 'block', marginBottom: 4 }}>관리자 메모</label>
              <input
                style={{ width: '100%', border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'Noto Sans KR, sans-serif', boxSizing: 'border-box' }}
                placeholder="내부 메모 (선택)"
                value={form.adminNote}
                disabled={submitting}
                onChange={e => setForm(p => ({ ...p, adminNote: e.target.value }))}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#8B8FA8', display: 'block', marginBottom: 4 }}>제재 종류</label>
              <select
                value={form.type}
                disabled={submitting}
                onChange={e => setForm(p => ({ ...p, type: e.target.value as SanctionTypeLabel }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, color: '#4A4A6A', background: '#fff', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif', outline: 'none', boxSizing: 'border-box' }}
              >
                {SANCTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.actionBtn} onClick={closeAdd} disabled={submitting}>취소</button>
              <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={handleAdd} disabled={submitting} style={submitting ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                {submitting ? '등록 중…' : '제재 적용'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 안내 모달 */}
      {alertMsg && (
        <div className={styles.overlay} onClick={() => setAlertMsg(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, color: '#1A1A2E', whiteSpace: 'pre-line', margin: '20px 0' }}>
              {alertMsg}
            </div>
            <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => setAlertMsg(null)}>확인</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SanctionPage;
