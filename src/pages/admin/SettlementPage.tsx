import React, { useCallback, useEffect, useMemo, useState } from 'react';
import s from './admin.module.css';
import {
  getAdminSettlements,
  getAdminSettlementSummary,
  updateAdminSettlementStatus,
  STATUS_LABEL,
  type AdminSettlementDto,
  type AdminSettlementSummaryDto,
  type SettlementStatusLabel,
} from '../../api/adminSettlements';
import {
  getAdminFeeRules,
  updateAdminFeeRule,
  type FeeRuleDto,
} from '../../api/adminFeeRules';

// 화면에서 쓰는 평탄한 형태. status 는 한글 라벨로 들고 다닌다.
interface SettlementRow {
  id: number;
  sellerNo: string;
  buyerNo: string;
  productName: string;
  type: string;
  saleAmount: number;
  feeRate: number;
  feeAmount: number;
  netAmount: number;
  status: SettlementStatusLabel;
  transactionDate: string;
  settlementDate?: string;
}

const toRow = (dto: AdminSettlementDto): SettlementRow => ({
  id: dto.id,
  sellerNo: dto.sellerNo,
  buyerNo: dto.buyerNo,
  productName: dto.productName,
  type: dto.type,
  saleAmount: dto.saleAmount,
  feeRate: dto.feeRate,
  feeAmount: dto.feeAmount,
  netAmount: dto.netAmount,
  status: STATUS_LABEL[dto.status],
  transactionDate: dto.transactionDate,
  settlementDate: dto.settlementDate ?? undefined,
});

const PAGE_SIZE = 5;

const SettlementPage: React.FC = () => {
  const [tab, setTab] = useState<'settlement' | 'fee'>('settlement');
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [summary, setSummary] = useState<AdminSettlementSummaryDto>({ totalSale: 0, totalFee: 0, totalNet: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // 수수료 정책 (DB 연동)
  const [feeRules, setFeeRules] = useState<FeeRuleDto[]>([]);
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeSaving, setFeeSaving] = useState<number | null>(null);

  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterType] = useState('전체');
  const [filterRole, setFilterRole] = useState('판매자');
  const [searchNo, setSearchNo] = useState('');
  const [editFee, setEditFee] = useState<FeeRuleDto | null>(null);
  const [page, setPage] = useState(1);

  // 수수료 정책 로드
  const reloadFeeRules = useCallback(async () => {
    setFeeLoading(true);
    setFeeError(null);
    try {
      setFeeRules(await getAdminFeeRules());
    } catch {
      setFeeError('수수료 정책을 불러오지 못했습니다.');
    } finally {
      setFeeLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 페치, 정상 데이터 로딩 패턴
  useEffect(() => { reloadFeeRules(); }, [reloadFeeRules]);

  // 목록 + 요약을 동시에 로드한다. 요약은 서버에서 직접 계산해 CANCELED 제외 등 규칙이 일관되게 적용된다.
  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [list, sum] = await Promise.all([
        getAdminSettlements(),
        getAdminSettlementSummary(),
      ]);
      setRows(list.map(toRow));
      setSummary(sum);
    } catch {
      setLoadError('정산 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 페치, 정상 데이터 로딩 패턴
  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => rows.filter(t => {
    if (filterStatus !== '전체' && t.status !== filterStatus) return false;
    if (filterType !== '전체' && t.type !== filterType) return false;
    if (searchNo.trim()) {
      const q = searchNo.trim();
      if (filterRole === '판매자' && !t.sellerNo.includes(q)) return false;
      if (filterRole === '구매자' && !t.buyerNo.includes(q)) return false;
    }
    return true;
  }), [rows, filterStatus, filterType, filterRole, searchNo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 상태 변경 (낙관적 업데이트 + 실패 시 롤백, 성공 시 요약도 재조회)
  const changeStatus = async (id: number, label: SettlementStatusLabel) => {
    const snapshot = rows;
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: label } : r));
    try {
      const updated = await updateAdminSettlementStatus(id, label);
      setRows(prev => prev.map(r => r.id === id ? toRow(updated) : r));
      // 요약 카드 합계도 영향을 받으므로 가볍게 다시 조회한다.
      try { setSummary(await getAdminSettlementSummary()); } catch { /* ignore */ }
    } catch (e: unknown) {
      setRows(snapshot);
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? '상태 변경에 실패했습니다.';
      setAlertMsg(message);
    }
  };

  const processSettlement = (id: number) => changeStatus(id, '정산완료');
  const holdSettlement = (id: number) => changeStatus(id, '보류');

  const statusColor: Record<SettlementStatusLabel, string> = {
    '정산완료': '#2E7D32', '정산대기': '#E65C00', '보류': '#C62828',
  };
  const statusBg: Record<SettlementStatusLabel, string> = {
    '정산완료': '#EAF7EC', '정산대기': '#FFF3E0', '보류': '#FDEEED',
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.title}>정산 / 수수료 관리</div>
        <div className={s.subtitle}>거래 정산 현황과 수수료 정책을 관리합니다.</div>
      </div>

      {/* 요약 카드 — 서버에서 계산된 값 */}
      <div className={s.statRow}>
        <div className={s.statCard}>
          <div className={s.statNum}>{summary.totalSale.toLocaleString()}</div>
          <div className={s.statLabel}>총 거래금액</div>
        </div>
        <div className={s.statCard}>
          <div className={`${s.statNum} ${s.statNumAmber}`}>{summary.totalFee.toLocaleString()}</div>
          <div className={s.statLabel}>총 수수료 수익</div>
        </div>
        <div className={s.statCard}>
          <div className={`${s.statNum} ${s.statNumGreen}`}>{summary.totalNet.toLocaleString()}</div>
          <div className={s.statLabel}>총 정산 금액</div>
        </div>
        <div className={s.statCard}>
          <div className={`${s.statNum} ${s.statNumRed}`}>{summary.pending.toLocaleString()}<span style={{ fontSize: 14 }}>건</span></div>
          <div className={s.statLabel}>정산 대기</div>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #E8E8EF' }}>
        {(['settlement', 'fee'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 20px', fontWeight: tab === t ? 700 : 500, fontSize: 14, color: tab === t ? '#E24B4A' : '#8B8FA8', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #E24B4A' : '2px solid transparent', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif', marginBottom: -2 }}>
            {t === 'settlement' ? '정산 내역' : '수수료 정책'}
          </button>
        ))}
      </div>

      {/* 정산 내역 탭 */}
      {tab === 'settlement' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <select
              value={filterRole}
              onChange={e => { setFilterRole(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, color: '#4A4A6A', background: '#fff', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif', outline: 'none', minWidth: 110 }}
            >
              {['판매자', '구매자'].map(v => <option key={v}>{v}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, color: '#4A4A6A', background: '#fff', cursor: 'pointer', fontFamily: 'Noto Sans KR, sans-serif', outline: 'none', minWidth: 110 }}
            >
              {['전체', '정산완료', '정산대기', '보류'].map(v => <option key={v}>{v}</option>)}
            </select>
            <input
              value={searchNo}
              onChange={e => { setSearchNo(e.target.value); setPage(1); }}
              placeholder="회원번호 검색"
              style={{ padding: '8px 12px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13, color: '#4A4A6A', fontFamily: 'Noto Sans KR, sans-serif', outline: 'none', width: 180 }}
            />
            <span style={{ fontSize: 13, color: '#8B8FA8', marginLeft: 'auto' }}>총 {filtered.length}건</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, background: '#fff', border: '1px solid #EDEEF2', borderRadius: 12, textAlign: 'center', color: '#8B8FA8', fontSize: 13 }}>
              정산 내역을 불러오는 중입니다…
            </div>
          ) : loadError ? (
            <div style={{ padding: 40, background: '#fff', border: '1px solid #EDEEF2', borderRadius: 12, textAlign: 'center', color: '#8B8FA8', fontSize: 13 }}>
              {loadError}
              <div style={{ marginTop: 12 }}>
                <button onClick={reload} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #E0E0E0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>다시 시도</button>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, background: '#fff', border: '1px solid #EDEEF2', borderRadius: 12, textAlign: 'center', color: '#8B8FA8', fontSize: 13 }}>
              조건에 맞는 정산 내역이 없습니다.
            </div>
          ) : (
            <table className={s.table}>
              <thead>
                <tr>
                  {filterRole !== '구매자' && <th>판매자 회원번호</th>}
                  {filterRole !== '판매자' && <th>구매자 회원번호</th>}
                  <th>상품</th><th>낙찰가</th><th>수수료</th><th>정산금액</th><th>상태</th><th>거래일</th><th>관리</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(t => (
                  <tr key={t.id}>
                    {filterRole !== '구매자' && <td style={{ fontSize: 12, color: '#8B8FA8', fontFamily: 'monospace' }}>{t.sellerNo}</td>}
                    {filterRole !== '판매자' && <td style={{ fontSize: 12, color: '#8B8FA8', fontFamily: 'monospace' }}>{t.buyerNo}</td>}
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.productName}</td>
                    <td>{t.saleAmount.toLocaleString()}</td>
                    <td style={{ color: '#E65C00', fontWeight: 600 }}>{t.feeAmount.toLocaleString()}</td>
                    <td style={{ fontWeight: 700 }}>{t.netAmount.toLocaleString()}</td>
                    <td><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: statusBg[t.status], color: statusColor[t.status] }}>{t.status}</span></td>
                    <td style={{ fontSize: 12, color: '#8B8FA8' }}>{t.transactionDate}</td>
                    <td>
                      {t.status === '정산대기' && <button className={s.actionBtn} style={{ color: '#2E7D32', borderColor: '#2E7D32' }} onClick={() => processSettlement(t.id)}>정산처리</button>}
                      {t.status === '정산대기' && <button className={`${s.actionBtn} ${s.actionBtnDanger}`} onClick={() => holdSettlement(t.id)}>보류</button>}
                      {t.status === '보류' && <button className={s.actionBtn} onClick={() => processSettlement(t.id)}>정산처리</button>}
                      {t.status === '정산완료' && <span style={{ fontSize: 12, color: '#8B8FA8' }}>{t.settlementDate}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && !loadError && totalPages > 1 && (
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

      {/* 수수료 정책 탭 — DB 연동 */}
      {tab === 'fee' && (
        <>
          {feeLoading ? (
            <div style={{ padding: 40, background: '#fff', border: '1px solid #EDEEF2', borderRadius: 12, textAlign: 'center', color: '#8B8FA8', fontSize: 13 }}>
              수수료 정책을 불러오는 중입니다…
            </div>
          ) : feeError ? (
            <div style={{ padding: 40, background: '#fff', border: '1px solid #EDEEF2', borderRadius: 12, textAlign: 'center', color: '#8B8FA8', fontSize: 13 }}>
              {feeError}
              <div style={{ marginTop: 12 }}>
                <button onClick={reloadFeeRules} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #E0E0E0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>다시 시도</button>
              </div>
            </div>
          ) : (
            <table className={s.table}>
              <thead>
                <tr><th>금액 기준</th><th>수수료율</th><th>최소 수수료 (기준금액 × 수수료율)</th><th>관리</th></tr>
              </thead>
              <tbody>
                {feeRules.map(r => {
                  const editing = editFee?.id === r.id;
                  const editCalcMinFee = editFee ? Math.round(editFee.minAmount * editFee.feeRate / 100) : 0;
                  const saving = feeSaving === r.id;
                  const saveEdit = async () => {
                    if (!editFee) return;
                    setFeeSaving(r.id);
                    try {
                      const updated = await updateAdminFeeRule(r.id, {
                        minAmount: editFee.minAmount,
                        feeRate: editFee.feeRate,
                      });
                      setFeeRules(prev => prev.map(f => f.id === r.id ? updated : f));
                      setEditFee(null);
                    } catch (e: unknown) {
                      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
                        ?? '수수료 정책 저장에 실패했습니다.';
                      setAlertMsg(message);
                    } finally {
                      setFeeSaving(curr => curr === r.id ? null : curr);
                    }
                  };
                  return (
                    <tr key={r.id}>
                      <td>
                        {editing
                          ? <input type="number" step="10000" disabled={saving} style={{ width: 130, padding: '4px 8px', border: '1px solid #E0E0E0', borderRadius: 6, fontSize: 13 }} value={editFee!.minAmount} onChange={e => setEditFee(p => p ? { ...p, minAmount: parseInt(e.target.value) || 0 } : null)} />
                          : <span style={{ fontWeight: 600 }}>{r.minAmount.toLocaleString()} 이상</span>
                        }
                      </td>
                      <td>
                        {editing
                          ? <input type="number" step="0.1" min="0" max="100" disabled={saving} style={{ width: 80, padding: '4px 8px', border: '1px solid #E0E0E0', borderRadius: 6, fontSize: 13 }} value={editFee!.feeRate} onChange={e => setEditFee(p => p ? { ...p, feeRate: parseFloat(e.target.value) || 0 } : null)} />
                          : <span style={{ fontWeight: 700, color: '#E65C00' }}>{r.feeRate}%</span>
                        }
                      </td>
                      <td style={{ color: '#2E7D32', fontWeight: 600 }}>
                        {editing
                          ? <span style={{ color: '#2E7D32', fontWeight: 600 }}>{editCalcMinFee.toLocaleString()} <span style={{ fontSize: 11, color: '#8B8FA8', fontWeight: 400 }}>(자동계산)</span></span>
                          : r.minFee.toLocaleString()
                        }
                      </td>
                      <td>
                        {editing
                          ? <>
                              <button className={s.actionBtnPrimary} disabled={saving} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'Noto Sans KR, sans-serif', marginRight: 4 }} onClick={saveEdit}>{saving ? '저장 중…' : '저장'}</button>
                              <button className={s.actionBtn} disabled={saving} onClick={() => setEditFee(null)}>취소</button>
                            </>
                          : <button className={s.actionBtn} onClick={() => setEditFee({ ...r })}>수정</button>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 12, padding: 14, background: '#FFF8E1', borderRadius: 10, fontSize: 13, color: '#856404', lineHeight: 1.6 }}>
            ⚠️ 수수료 변경사항은 변경 이후 체결되는 거래부터 적용됩니다. 진행 중인 경매 및 기존 거래에는 영향을 미치지 않습니다.
          </div>
        </>
      )}

      {/* 안내 모달 */}
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

export default SettlementPage;
