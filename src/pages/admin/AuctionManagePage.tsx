import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './AuctionManagePage.module.css';
import {
  getAdminAuctions,
  getAdminAuctionBids,
  updateAdminAuctionStatus,
  STATUS_LABEL,
  type AdminAuctionDto,
  type AdminAuctionBidDto,
  type AdminAuctionStatusLabel,
} from '../../api/adminAuctions';

// 화면 행 타입. API DTO 를 살짝 가공해 한글 status 와 함께 들고 다닌다.
interface AuctionRow {
  id: number;
  auctionNo: string;
  name: string;
  category: string;
  currentPrice: number;
  bidCount: number;
  status: AdminAuctionStatusLabel;
  timeLeft: number;
}

const formatTime = (sec: number) => {
  if (sec <= 0) return '종료';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
};

const formatPrice = (p: number) => p.toLocaleString('ko-KR') + '원';

const STATUS_OPTIONS: AdminAuctionStatusLabel[] = ['경매중', '낙찰', '유찰', '취소'];

const toRow = (dto: AdminAuctionDto): AuctionRow => ({
  id: dto.id,
  auctionNo: dto.auctionNo,
  name: dto.productName,
  category: dto.category,
  currentPrice: dto.currentPrice,
  bidCount: dto.bidCount,
  status: STATUS_LABEL[dto.status],
  timeLeft: dto.timeLeft,
});

const AuctionManagePage: React.FC = () => {
  const [rows, setRows] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [bidsByAuction, setBidsByAuction] = useState<Record<number, AdminAuctionBidDto[]>>({});
  const [bidsLoading, setBidsLoading] = useState<number | null>(null);
  const [bidsError, setBidsError] = useState<Record<number, string | null>>({});
  const [page, setPage] = useState(1);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const PAGE_SIZE = 10;

  // 경매 목록 로드
  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await getAdminAuctions();
      setRows(list.map(toRow));
    } catch {
      setLoadError('경매 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 페치, 정상 데이터 로딩 패턴
  useEffect(() => { reload(); }, [reload]);

  // timeLeft 가 실시간으로 줄어들도록 1초마다 클라이언트에서 감소시킨다.
  // 정확한 값은 다음 reload 시 서버 기준으로 다시 맞춰진다.
  useEffect(() => {
    const id = window.setInterval(() => {
      setRows(prev => prev.map(r => r.timeLeft > 0 ? { ...r, timeLeft: r.timeLeft - 1 } : r));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return r.auctionNo.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
  }), [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    setExpandedId(null);
  };

  // 상태 변경. 낙관적 업데이트 후 실패 시 롤백.
  const changeStatus = async (id: number, status: AdminAuctionStatusLabel) => {
    const snapshot = rows;
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    try {
      const updated = await updateAdminAuctionStatus(id, status);
      // 서버가 winner 지정 등 부수 변경을 반영했을 수 있으므로 응답으로 다시 동기화한다.
      setRows(prev => prev.map(r => r.id === id ? toRow(updated) : r));
    } catch (e: unknown) {
      setRows(snapshot);
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? '상태 변경에 실패했습니다.';
      setAlertMsg(message);
    }
  };

  // 입찰 내역 토글. 펼칠 때만 API 호출하고 캐시한다.
  const toggleBids = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (bidsByAuction[id]) return; // 캐시 있음
    setBidsLoading(id);
    setBidsError(prev => ({ ...prev, [id]: null }));
    try {
      const list = await getAdminAuctionBids(id);
      setBidsByAuction(prev => ({ ...prev, [id]: list }));
    } catch {
      setBidsError(prev => ({ ...prev, [id]: '입찰 내역을 불러오지 못했습니다.' }));
    } finally {
      setBidsLoading(curr => curr === id ? null : curr);
    }
  };

  const statusColor: Record<AdminAuctionStatusLabel, string> = {
    '대기': '#8B8FA8',
    '경매중': '#1E88E5',
    '낙찰': '#43A047',
    '유찰': '#FB8C00',
    '취소': '#E53935',
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <h2 className={styles.title}>경매 관리</h2>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="경매번호 또는 상품명 검색"
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>경매번호</th>
              <th>상품명</th>
              <th>카테고리</th>
              <th>현재가</th>
              <th>입찰수</th>
              <th>남은시간</th>
              <th>상태</th>
              <th>입찰내역</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={styles.empty}>경매를 불러오는 중입니다…</td></tr>
            ) : loadError ? (
              <tr><td colSpan={8} className={styles.empty}>
                {loadError}
                <button
                  onClick={reload}
                  style={{ marginLeft: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #E0E0E0', background: '#fff', cursor: 'pointer', fontSize: 13 }}
                >다시 시도</button>
              </td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={8} className={styles.empty}>검색 결과가 없습니다.</td></tr>
            ) : paginated.map(row => {
              const bids = bidsByAuction[row.id] ?? [];
              const isExpanded = expandedId === row.id;
              return (
                <React.Fragment key={row.id}>
                  <tr>
                    <td className={styles.auctionNo}>{row.auctionNo}</td>
                    <td className={styles.name}>{row.name}</td>
                    <td>{row.category}</td>
                    <td>{formatPrice(row.currentPrice)}</td>
                    <td>{row.bidCount}회</td>
                    <td>{formatTime(row.timeLeft)}</td>
                    <td>
                      <select
                        className={styles.statusSelect}
                        value={row.status === '대기' ? '경매중' : row.status}
                        style={{ color: statusColor[row.status] }}
                        onChange={e => changeStatus(row.id, e.target.value as AdminAuctionStatusLabel)}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button className={styles.bidBtn} onClick={() => toggleBids(row.id)}>
                        {isExpanded ? '닫기' : '보기'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className={styles.bidHistoryCell}>
                        <div className={styles.bidHistory}>
                          <p className={styles.bidHistoryTitle}>입찰 내역 — {row.name}</p>
                          {bidsLoading === row.id ? (
                            <p className={styles.noBid}>불러오는 중입니다…</p>
                          ) : bidsError[row.id] ? (
                            <p className={styles.noBid}>{bidsError[row.id]}</p>
                          ) : bids.length === 0 ? (
                            <p className={styles.noBid}>입찰 내역이 없습니다.</p>
                          ) : (
                            <table className={styles.bidTable}>
                              <thead>
                                <tr>
                                  <th>입찰자</th>
                                  <th>회원번호</th>
                                  <th>입찰금액</th>
                                  <th>시간</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.status === '낙찰' && bids[0] && (
                                  <tr className={styles.winnerRow}>
                                    <td>
                                      <span className={styles.winnerLabel}>🏆 낙찰자</span>
                                      <span className={styles.winnerName}>{bids[0].user}</span>
                                    </td>
                                    <td className={styles.memberNo}>{bids[0].memberNo}</td>
                                    <td className={styles.winnerAmount}>{formatPrice(bids[0].amount)}</td>
                                    <td>{bids[0].time}</td>
                                  </tr>
                                )}
                                {bids.map((b, i) => (
                                  <tr key={b.id} style={{ background: i === 0 ? '#f0f9f0' : undefined }}>
                                    <td>{b.user}{i === 0 && <span className={styles.winBadge}>최고가</span>}</td>
                                    <td className={styles.memberNo}>{b.memberNo}</td>
                                    <td className={styles.bidAmount}>{formatPrice(b.amount)}</td>
                                    <td>{b.time}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 페이징 */}
      {!loading && !loadError && filtered.length > 0 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>총 {filtered.length}건</span>
          <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(1)}>{'<<'}</button>
          <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>{'<'}</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
              onClick={() => setPage(p)}
            >{p}</button>
          ))}
          <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>{'>'}</button>
          <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage(totalPages)}>{'>>'}</button>
        </div>
      )}

      {/* 안내 모달 (상태 변경 실패 등) */}
      {alertMsg && (
        <div
          onClick={() => setAlertMsg(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', padding: 24, borderRadius: 12, minWidth: 320, textAlign: 'center', fontFamily: 'Noto Sans KR, sans-serif' }}
          >
            <div style={{ fontSize: 14, color: '#1A1A2E', lineHeight: 1.6, margin: '8px 0 20px', whiteSpace: 'pre-line' }}>
              {alertMsg}
            </div>
            <button
              onClick={() => setAlertMsg(null)}
              style={{ padding: '8px 24px', border: 'none', borderRadius: 8, background: '#E24B4A', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
            >확인</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionManagePage;
