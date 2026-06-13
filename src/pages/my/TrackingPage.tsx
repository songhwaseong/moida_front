import React, { useState } from 'react';
import { AxiosError } from 'axios';
import styles from '../my/MySubPage.module.css';
import tStyles from './TrackingPage.module.css';
import { getTracking, type TrackingDto } from '../../api/tracking';
import { CARRIERS } from '../../data/carriers';

interface Props {
  onBack: () => void;
  initialCarrier?: string;
  initialTrackingNo?: string;
  initialStatus?: string;
  initialProduct?: string;
}

type StepStatus = 'done' | 'active' | 'pending';

interface TrackingStep {
  time: string;
  location: string;
  status: string;
  stepStatus: StepStatus;
}

interface TrackingResult {
  carrier: string;
  trackingNo: string;
  product: string;
  currentStatus: string;
  estimatedDate: string;
  steps: TrackingStep[];
}

// 백엔드 응답(최신순 steps)을 화면용 단계 상태로 변환한다.
// 배송 완료면 모두 done, 그 외에는 최신 단계(index 0)를 진행 중(active)으로 표시.
const toResult = (dto: TrackingDto): TrackingResult => ({
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

const DEMO_STEPS = [
  { status: '배송완료', location: '서울 강남 배송완료센터' },
  { status: '배송중', location: '서울 강남 배송지점' },
  { status: '간선하차', location: '곤지암 허브' },
  { status: '상품 발송', location: 'MOIDA 물류센터' },
  { status: '결제 확인', location: 'MOIDA 안전거래' },
];

const DEMO_LEVEL_BY_STATUS: Record<string, number> = {
  PAYMENT_COMPLETED: 1,
  SHIPMENT_NOTICE: 2,
  SHIPPING: 4,
  DELIVERED: 5,
  RECEIVED: 5,
};

const buildDemoResult = (
  carrierCode: string,
  invoice: string,
  status = 'SHIPPING',
  product = '낙찰 상품',
): TrackingResult => {
  const carrierName = CARRIERS.find((item) => item.code === carrierCode)?.name ?? 'CJ대한통운';
  const level = DEMO_LEVEL_BY_STATUS[status] ?? DEMO_LEVEL_BY_STATUS.SHIPPING;
  const visibleSteps = DEMO_STEPS.slice(DEMO_STEPS.length - level).reverse();
  const complete = status === 'DELIVERED' || status === 'RECEIVED';
  const currentStatus = complete
    ? '배송 완료'
    : status === 'SHIPMENT_NOTICE'
      ? '발송알림'
      : status === 'PAYMENT_COMPLETED'
        ? '결제완료'
        : '배송 중';

  return {
    carrier: carrierName,
    trackingNo: invoice,
    product,
    currentStatus,
    estimatedDate: complete ? '배송이 완료되었습니다' : '배송 단계가 업데이트되었습니다',
    steps: visibleSteps.map((step, index) => ({
      time: `2026.06.${String(13 - index).padStart(2, '0')} ${String(15 - index).padStart(2, '0')}:00`,
      location: step.location,
      status: step.status,
      stepStatus: complete ? 'done' : index === 0 ? 'active' : 'done',
    })),
  };
};

const TrackingPage: React.FC<Props> = ({ onBack, initialCarrier, initialTrackingNo, initialStatus, initialProduct }) => {
  const [carrier, setCarrier] = useState(initialCarrier ?? '');
  const [trackingNo, setTrackingNo] = useState(initialTrackingNo ?? '');
  const [result, setResult] = useState<TrackingResult | null>(
    initialCarrier && initialTrackingNo && initialStatus
      ? buildDemoResult(initialCarrier, initialTrackingNo, initialStatus, initialProduct)
      : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!carrier) { setError('택배사를 선택해주세요'); return; }
    if (!trackingNo.trim()) { setError('송장번호를 입력해주세요'); return; }
    if (!/^\d{10,14}$/.test(trackingNo.replace(/-/g, ''))) {
      setError('올바른 송장번호를 입력해주세요 (10~14자리 숫자)');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const dto = await getTracking(carrier, trackingNo.replace(/-/g, ''));
      setResult(toResult(dto));
    } catch (err) {
      const msg = (err as AxiosError<{ message?: string }>).response?.data?.message;
      setError(msg ?? '배송 정보를 조회할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const statusIcon: Record<StepStatus, string> = {
    done: '✓',
    active: '●',
    pending: '○',
  };

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className={styles.title}>배송 조회</span>
        <div style={{ width: 32 }}/>
      </div>

      <div className={tStyles.content}>
        {/* 입력 카드 */}
        <div className={tStyles.card}>
          <p className={tStyles.cardTitle}>택배사 선택</p>
          <div className={tStyles.carrierGrid}>
            {CARRIERS.map(c => (
              <button
                key={c.code}
                className={`${tStyles.carrierBtn} ${carrier === c.code ? tStyles.carrierActive : ''}`}
                onClick={() => { setCarrier(c.code); setError(''); }}
              >
                {c.name}
              </button>
            ))}
          </div>

          <p className={tStyles.cardTitle} style={{ marginTop: 20 }}>송장번호</p>
          <div className={tStyles.inputRow}>
            <input
              className={tStyles.input}
              type="text"
              inputMode="numeric"
              placeholder="송장번호를 입력하세요"
              value={trackingNo}
              onChange={e => { setTrackingNo(e.target.value.replace(/[^0-9-]/g,'')); setError(''); }}
              maxLength={16}
            />
            <button
              className={tStyles.searchBtn}
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? <span className={tStyles.spinner}/> : '조회'}
            </button>
          </div>
          {error && <p className={tStyles.errorMsg}>{error}</p>}
        </div>

        {/* 결과 */}
        {loading && (
          <div className={tStyles.loadingBox}>
            <span className={tStyles.spinnerLg}/>
            <p className={tStyles.loadingText}>배송 정보를 불러오는 중...</p>
          </div>
        )}

        {result && !loading && (
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
                <span className={tStyles.infoLabel}>상품</span>
                <span className={tStyles.infoValue}>{result.product}</span>
              </div>
              <div className={tStyles.infoDivider}/>
              <div className={tStyles.infoRow}>
                <span className={tStyles.infoLabel}>택배사</span>
                <span className={tStyles.infoValue}>{result.carrier}</span>
              </div>
              <div className={tStyles.infoDivider}/>
              <div className={tStyles.infoRow}>
                <span className={tStyles.infoLabel}>송장번호</span>
                <span className={tStyles.infoValue}>{result.trackingNo}</span>
              </div>
            </div>

            {/* 배송 단계 타임라인 */}
            <div className={tStyles.timelineCard}>
              <p className={tStyles.timelineTitle}>배송 상세 내역</p>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackingPage;
