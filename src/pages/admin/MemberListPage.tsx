import React, { useState, useEffect } from 'react';
import { type Member } from '../../data/memberData';
import MemberDetailPage from './MemberDetailPage';
import styles from './admin.module.css';
import axiosInstance from '../../api/axiosInstance';
import { updateAdminMemberRole } from '../../api/adminMembers';
import { useAdminDialog } from './useAdminDialog';
import { getUserRole } from '../../utils/authStorage';

type StatusFilter = 'all' | 'active' | 'suspended' | 'permanent' | 'withdrawn';

const statusLabel = (s: Member['status']) => ({ active: '정상', suspended: '정지', permanent: '영구정지', withdrawn: '탈퇴' }[s]);
const statusColor = (s: Member['status']) => ({
  active: { background: '#D1E7DD', color: '#0F5132' },
  suspended: { background: '#F8D7DA', color: '#842029' },
  permanent: { background: '#1A1A1A', color: '#fff' },
  withdrawn: { background: '#E2E3E5', color: '#41464B' },
}[s]);

const tempColor = (t: number) => t >= 40 ? '#3B6D11' : t >= 35 ? '#EF9F27' : '#E24B4A';
const NOW_TIME = Date.now();

const MemberListPage: React.FC = () => {
  const adminDialog = useAdminDialog();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedMemberNo, setSelectedMemberNo] = useState<string | null>(null);
  const [list, setList] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  const currentRole = getUserRole();

  const handleRoleToggle = async (m: Member) => {
    if (!m.id) {
      await adminDialog.alert('API 연동 후 사용 가능합니다.');
      return;
    }
    const newRole = m.role === 'MANAGER' ? 'USER' : 'MANAGER';
    const label = newRole === 'MANAGER' ? '매니저로 지정' : '매니저 해제';
    const ok = await adminDialog.confirm({
      title: label,
      message: `${m.name}을 ${label}하시겠습니까?`,
      confirmLabel: '변경하기',
      variant: newRole === 'USER' ? 'danger' : 'default',
    });
    if (!ok) return;
    const reason = await adminDialog.prompt({
      title: `${label} 사유`,
      message: `${label} 사유를 입력하세요.`,
      confirmLabel: '변경하기',
      variant: newRole === 'USER' ? 'danger' : 'default',
    });
    if (!reason) return;

    try {
      await updateAdminMemberRole(m.id, newRole, reason);
      setList(prev => prev.map(item =>
        item.memberNo === m.memberNo ? { ...item, role: newRole } : item
      ));
      await adminDialog.alert(`${label} 완료`);
    } catch {
      await adminDialog.alert('역할 변경에 실패했습니다.');
    }
  };

  useEffect(() => {
    axiosInstance.get('/admin/members')
      .then(res => setList(res.data.data))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = list.filter(m => {
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.includes(q) || m.memberNo.includes(q) || m.email.includes(q);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const active = list.filter(m => m.status === 'active').length;
  const suspended = list.filter(m => m.status === 'suspended' || m.status === 'permanent').length;
  const newMembers = list.filter(m => {
    const joined = new Date(m.joinedAt.replace(/\./g, '-'));
    const diffDays = (NOW_TIME - joined.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }).length;

  if (selectedMemberNo) {
    const member = list.find(m => m.memberNo === selectedMemberNo)!;
    return (
      <MemberDetailPage
        member={member}
        onBack={() => setSelectedMemberNo(null)}
        onUpdateStatus={(memberNo, status, suspendUntil) => {
          setList(prev => prev.map(m => m.memberNo === memberNo ? { ...m, status, suspendUntil } : m));
          setSelectedMemberNo(null);
        }}
      />
    );
  }

  return (
    <div className={styles.page}>
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8B8FA8' }}>
          회원 목록을 불러오는 중...
        </div>
      )}
      <div className={styles.header}>
        <h1 className={styles.title}>회원 목록</h1>
        <p className={styles.subtitle}>전체 회원을 조회하고 관리합니다</p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.statNum}>{list.length}</div>
          <div className={styles.statLabel}>전체 회원</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statNum} ${styles.statNumGreen}`}>{active}</div>
          <div className={styles.statLabel}>정상</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statNum} ${styles.statNumRed}`}>{suspended}</div>
          <div className={styles.statLabel}>정지/영구정지</div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statNum}`} style={{ color: '#534AB7' }}>{newMembers}</div>
          <div className={styles.statLabel}>신규 (30일)</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          style={{ flex: 1, maxWidth: 280, border: '1px solid #E0E0E0', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'Noto Sans KR, sans-serif' }}
          placeholder="이름, 회원번호, 이메일 검색"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as StatusFilter); setCurrentPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, color: '#4A4A6A', background: '#fff', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif', outline: 'none', minWidth: 110 }}
        >
          {(['all', 'active', 'suspended', 'permanent', 'withdrawn'] as StatusFilter[]).map(f => (
            <option key={f} value={f}>
              {{ all: '전체', active: '정상', suspended: '정지', permanent: '영구정지', withdrawn: '탈퇴' }[f]}
            </option>
          ))}
        </select>
      </div>

      <table className={styles.table} style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '140px' }} />
          <col style={{ width: '80px' }} />
          <col style={{ width: '180px' }} />
          <col style={{ width: '90px' }} />
          <col style={{ width: '130px' }} />
          <col style={{ width: '80px' }} />
          <col style={{ width: '60px' }} />
          <col style={{ width: '90px' }} />
          <col style={{ width: '150px' }} />
        </colgroup>
        <thead>
          <tr>
            <th>회원번호</th>
            <th>이름</th>
            <th>이메일</th>
            <th>가입일</th>
            <th>최근 로그인</th>
            <th>매너온도</th>
            <th>입찰</th>
            <th>상태</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 && (
            <tr><td colSpan={9} className={styles.emptyText}>검색 결과가 없습니다</td></tr>
          )}
          {paginated.map(m => (
            <tr key={m.memberNo}>
              <td style={{ fontSize: 11, color: '#8B8FA8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.memberNo}</td>
              <td style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</td>
              <td style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</td>
              <td style={{ fontSize: 12, color: '#8B8FA8', whiteSpace: 'nowrap' }}>{m.joinedAt}</td>
              <td style={{ fontSize: 11, color: '#8B8FA8', whiteSpace: 'nowrap' }}>{m.lastLoginAt}</td>
              <td>
                <span style={{ fontWeight: 700, color: tempColor(m.mannerTemp) }}>{m.mannerTemp}°</span>
              </td>
              <td style={{ fontSize: 12 }}>
                <span style={{ color: '#534AB7' }}>{m.bidCount}</span>
              </td>
              <td>
                <span className={styles.badge} style={statusColor(m.status)}>{statusLabel(m.status)}</span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {/* ADMIN만 버튼 표시, 대상이 ADMIN이면 숨김 */}
                  {currentRole === 'ADMIN' && m.role !== 'ADMIN' && (
                    <button
                      className={styles.actionBtn}
                      style={{
                        fontSize: 11,
                        padding: '3px 7px',
                        background: m.role === 'MANAGER' ? '#8B8FA8' : '#534AB7',
                        color: '#fff',
                        border: 'none'
                      }}
                      onClick={() => handleRoleToggle(m)}
                    >
                      {m.role === 'MANAGER' ? '매니저해제' : '매니저지정'}
                    </button>
                  )}
                  <button className={styles.actionBtn} onClick={() => setSelectedMemberNo(m.memberNo)}>
                    상세
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 20 }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E0E0E0', background: currentPage === 1 ? '#F5F5F5' : '#fff', color: currentPage === 1 ? '#ccc' : '#333', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: 13 }}
          >이전</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E0E0E0', background: currentPage === page ? '#E24B4A' : '#fff', color: currentPage === page ? '#fff' : '#333', cursor: 'pointer', fontWeight: currentPage === page ? 700 : 400, fontSize: 13 }}
            >{page}</button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E0E0E0', background: currentPage === totalPages ? '#F5F5F5' : '#fff', color: currentPage === totalPages ? '#ccc' : '#333', cursor: currentPage === totalPages ? 'default' : 'pointer', fontSize: 13 }}
          >다음</button>
        </div>
      )}
      {adminDialog.element}
    </div>
  );
};

export default MemberListPage;
