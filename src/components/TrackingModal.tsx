import React, { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { getTracking, type TrackingDto } from '../api/tracking';
import { CARRIERS } from '../data/carriers';
import tStyles from '../pages/my/TrackingPage.module.css';

interface Props {
  // null 이면 "등록된 송장 정보 없음" 메시지로 렌더된다. (부모가 컴포넌트 자체를 조건부로 마운트하므로
  // open 플래그는 따로 두지 않는다 — 마운트되어 있다는 것 자체가 "열려 있다"는 의미.)
  carrierCode: string | null;
  trackingNo: string | null;
  onClose: () => void;
}

type StepStatus = 'done' | 'active' | 'pending';
interface ViewStep {
  time: string;
  location: string;
  status: string;
  stepStatus: StepStatus;
}
interface ViewResult {
  carrier: string;
  trackingNo: string;
  product: string;
  currentStatus: string;
  estimatedDate: string;
  steps: ViewStep[];
}

// 단일 outcome 으로 모든 종착 상태(성공/에러)를 표현해 effect 안의 setState 호출 지점을 1곳으로 줄인다.
// "로딩 중" / "송장 정보 없음" 은 outcome 과 props 로부터 파생 계산하므로 state 가 아니다.
type Outcome =
  | { kind: 'success'; result: ViewResult }
  | { kind: 'error'; message: string };

const toView = (dto: TrackingDto): ViewResult => ({
  carrier: dto.carrier,
  trackingNo: dto.trackingNo,
  product: dto.product ?? '배송 상품',
  currentStatus: dto.currentStatus ?? (dto.complete ? '배송 완료' : '배송 중'),
  estimatedDate: dto.estimatedDate ?? (dto.complete ? '배송이 완료되었습니다' : '배송 예정일 정보 없음'),
  steps: dto.steps.map((s, i) => ({
    time: s.time ?? '',
    location: s.location ?? '',
    status: s.status ?? '',
    stepStatus: dto.complete ? 'done' : i === 0 ? 'active' : 'done',
  })),
});

const statusIcon: Record<StepStatus, string> = { done: '✓', active: '●', pending: '○' };

/**
 * 송장번호 클릭 시 띄우는 배송조회 모달.
 * 부모가 컴포넌트를 conditional render(`{target && <TrackingModal .../>}`) 하므로
 * 매 오픈마다 새 인스턴스로 마운트되어 state 가 자연스럽게 초기화된다.
 *
 * effect 본문에서는 동기 setState 를 호출하지 않고, fetch 의 .then/.catch 에서만 setOutcome 한다.
 * 로딩/누락 상태는 derived value 로 계산해 cascading render 를 피한다.
 */
const TrackingModal: React.FC<Props> = ({ carrierCode, trackingNo, onClose }) => {
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    if (!carrierCode || !trackingNo) return;
    let cancelled = false;
    getTracking(carrierCode, trackingNo.replace(/-/g, ''))
      .then((dto) => {
        if (!cancelled) setOutcome({ kind: 'success', result: toView(dto) });
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = (err as AxiosError<{ message?: string }>).response?.data?.message;
        setOutcome({ kind: 'error', message: msg ?? '배송 정보를 조회할 수 없습니다.' });
      });
    return () => { cancelled = true; };
  }, [carrierCode, trackingNo]);

  const hasParams = Boolean(carrierCode && trackingNo);
  const loading = hasParams && outcome === null;
  const carrierName = CARRIERS.find(c => c.code === carrierCode)?.name ?? (carrierCode ?? '-');
  const errorMessage = !hasParams
    ? '등록된 송장 정보가 없어요.'
    : outcome?.kind === 'error' ? outcome.message : null;
  const result = outcome?.kind === 'success' ? outcome.result : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#F6F7FB', borderRadius: 16, width: '100%', maxWidth: 480,
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: '#fff', borderBottom: '1px solid #E8E8EF',
        }}>
          <strong style={{ fontSize: 15 }}>배송 조회</strong>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 22, lineHeight: 1, color: '#8B8FA8', padding: 4,
            }}
            aria-label="닫기"
          >×</button>
        </div>

        {/* 바디 */}
        <div style={{ padding: 16, overflowY: 'auto' }}>
          {loading && (
            <div className={tStyles.loadingBox}>
              <span className={tStyles.spinnerLg}/>
              <p className={tStyles.loadingText}>배송 정보를 불러오는 중...</p>
            </div>
          )}

          {!loading && errorMessage && (
            <div style={{
              background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center',
              border: '1px solid #E8E8EF',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              <p style={{ fontSize: 14, color: '#E24B4A', fontWeight: 600 }}>{errorMessage}</p>
              <p style={{ fontSize: 12, color: '#8B8FA8', marginTop: 6 }}>
                {carrierName} · {trackingNo ?? '-'}
              </p>
            </div>
          )}

          {!loading && result && (
            <div className={tStyles.resultWrap}>
              {/* 현재 상태 배너 */}
              <div className={tStyles.statusBanner}>
                <div className={tStyles.statusIconWrap}>🚚</div>
                <div>
                  <p className={tStyles.statusMain}>{result.currentStatus}</p>
                  <p className={tStyles.statusSub}>{result.estimatedDate}</p>
                </div>
              </div>

              {/* 정보 요약 */}
              <div className={tStyles.infoCard}>
                <div className={tStyles.infoRow}>
                  <span className={tStyles.infoLabel}>택배사</span>
                  <span className={tStyles.infoValue}>{result.carrier || carrierName}</span>
                </div>
                <div className={tStyles.infoDivider}/>
                <div className={tStyles.infoRow}>
                  <span className={tStyles.infoLabel}>송장번호</span>
                  <span className={tStyles.infoValue}>{result.trackingNo}</span>
                </div>
              </div>

              {/* 타임라인 */}
              <div className={tStyles.timelineCard}>
                <p className={tStyles.timelineTitle}>배송 상세 내역</p>
                {result.steps.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#8B8FA8', textAlign: 'center', padding: 16 }}>
                    아직 등록된 배송 단계가 없어요.
                  </p>
                ) : (
                  <div className={tStyles.timeline}>
                    {result.steps.map((step, i) => (
                      <div key={i} className={tStyles.timelineItem}>
                        <div className={tStyles.timelineLeft}>
                          <div className={`${tStyles.dot} ${tStyles[`dot_${step.stepStatus}`]}`}>
                            {statusIcon[step.stepStatus]}
                          </div>
                          {i < result.steps.length - 1 && (
                            <div className={`${tStyles.line} ${step.stepStatus === 'done' ? tStyles.lineDone : ''}`}/>
                          )}
                        </div>
                        <div className={tStyles.timelineBody}>
                          <div className={tStyles.stepRow}>
                            <span className={`${tStyles.stepStatus} ${tStyles[`step_${step.stepStatus}`]}`}>
                              {step.status}
                            </span>
                            {step.time && <span className={tStyles.stepTime}>{step.time}</span>}
                          </div>
                          {step.location && (
                            <p className={tStyles.stepLocation}>📍 {step.location}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackingModal;
