import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getDeactivatedMembers,
  type AdminDeactivatedMemberDto,
} from '../../api/adminMembers';
import styles from './admin.module.css';

const PAGE_SIZE = 5;
const NOW_TIME = Date.now();

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const WithdrawnMemberPage: React.FC = () => {
  const [members, setMembers] = useState<AdminDeactivatedMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDeactivatedMembers();
      setMembers(data);
      setPage(1);
    } catch (loadError) {
      console.error('Failed to load withdrawn members', loadError);
      const status = loadError && typeof loadError === 'object' && 'response' in loadError
        ? (loadError as { response?: { status?: number } }).response?.status
        : undefined;
      setError(status === 401 || status === 403
        ? '관리자 인증이 필요합니다. 관리자 계정으로 다시 로그인해주세요.'
        : '탈퇴 회원 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMembers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMembers]);

  const summary = useMemo(() => {
    const recent = members.filter(member => {
      if (!member.withdrawnAt) return false;
      const withdrawnAt = new Date(member.withdrawnAt).getTime();
      if (Number.isNaN(withdrawnAt)) return false;
      return (NOW_TIME - withdrawnAt) / (1000 * 60 * 60 * 24) <= 30;
    }).length;

    return {
      total: members.length,
      reported: members.filter(member => member.reportCount > 0).length,
      recent,
    };
  }, [members]);

  const totalPages = Math.ceil(members.length / PAGE_SIZE);
  const paged = members.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>탈퇴 회원 관리</h1>
        <p className={styles.subtitle}>탈퇴 처리된 회원의 보존 이력을 조회합니다</p>
      </div>

      <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#854F0B' }}>
        탈퇴 회원은 서비스 이용이 중지되며, 거래 및 관리 이력은 정책과 관계 법령에 따라 보존됩니다.
      </div>

      <div className={styles.statRow} style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className={styles.statCard}>
          <div className={styles.statNum}>{summary.total}</div>
          <div className={styles.statLabel}>탈퇴 회원 수</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statNum} ${styles.statNumAmber}`}>{summary.reported}</div>
          <div className={styles.statLabel}>신고 이력 있음</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statNum} ${styles.statNumRed}`}>{summary.recent}</div>
          <div className={styles.statLabel}>최근 30일 탈퇴</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className={styles.actionBtn} onClick={() => void loadMembers()} disabled={loading}>
          {loading ? '조회 중' : '새로고침'}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#FDEEED', color: '#C62828', fontSize: 13 }}>
          {error}
        </div>
      )}

      <table className={styles.table} style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '140px' }} />
          <col style={{ width: '90px' }} />
          <col style={{ width: '180px' }} />
          <col style={{ width: '132px' }} />
          <col style={{ width: '132px' }} />
          <col style={{ width: '90px' }} />
          <col style={{ width: '100px' }} />
        </colgroup>
        <thead>
          <tr>
            <th>회원번호</th>
            <th>이름</th>
            <th>이메일</th>
            <th>가입일</th>
            <th>탈퇴일</th>
            <th>신고 이력</th>
            <th>개인정보</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={7} className={styles.emptyText}>탈퇴 회원을 불러오는 중입니다.</td></tr>
          )}
          {!loading && members.length === 0 && (
            <tr><td colSpan={7} className={styles.emptyText}>탈퇴 회원이 없습니다</td></tr>
          )}
          {!loading && paged.map(member => (
            <tr key={member.id}>
              <td style={{ fontSize: 11, color: '#8B8FA8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.memberNo}</td>
              <td style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</td>
              <td style={{ fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</td>
              <td style={{ fontSize: 12, color: '#8B8FA8', whiteSpace: 'nowrap' }}>{formatDate(member.joinedAt)}</td>
              <td style={{ fontSize: 12, color: '#8B8FA8', whiteSpace: 'nowrap' }}>{formatDate(member.withdrawnAt)}</td>
              <td>
                {member.reportCount > 0
                  ? <span className={`${styles.badge} ${styles.badgeHigh}`}>{member.reportCount}건</span>
                  : <span style={{ fontSize: 12, color: '#ccc' }}>없음</span>
                }
              </td>
              <td><span className={`${styles.badge} ${styles.badgePending}`}>보존 중</span></td>
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
    </div>
  );
};

export default WithdrawnMemberPage;
