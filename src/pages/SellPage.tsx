import React, { useState, useEffect } from 'react';
import styles from './SellPage.module.css';
import { useToast } from '../components/Toast';
import ProductPreviewModal from '../components/ProductPreviewModal';
import LeaveConfirmModal from '../components/LeaveConfirmModal';
import { CATEGORIES as HOME_CATEGORIES } from '../data/mockData';

interface Props {
  onBack: () => void;
  onSubmit?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type Condition = 'S급' | 'A급' | 'B급' | 'C급';
type TradeMethod = '직거래' | '택배' | '둘다';
type Step = 1 | 2 | 3;

const PRODUCT_CATEGORIES = HOME_CATEGORIES
  .map(category => category.label)
  .filter(label => label !== '전체');
const CONDITIONS: { value: Condition; label: string; desc: string }[] = [
  { value: 'S급', label: 'S급', desc: '미사용/새상품' },
  { value: 'A급', label: 'A급', desc: '거의 새것' },
  { value: 'B급', label: 'B급', desc: '사용감 있음' },
  { value: 'C급', label: 'C급', desc: '하자 있음' },
];
const SellPage: React.FC<Props> = ({ onBack, onSubmit, onDirtyChange }) => {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [showPreview, setShowPreview] = useState(false);

  // 폼 데이터
  const [images, setImages] = useState<string[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState<Condition | ''>('');
  const [price] = useState('');
  const [_isAuction, _setIsAuction] = useState(false);
  const [auctionStartPrice, setAuctionStartPrice] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [minBidUnit, setMinBidUnit] = useState('');
  const [tradeMethod] = useState<TradeMethod | ''>('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeTimer, setCodeTimer] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // 변경 여부 감지
  const isDirty = images.length > 0 || title !== '' || category !== '' || condition !== '' ||
    price !== '' || auctionStartPrice !== '' || buyNowPrice !== '' || minBidUnit !== '' ||
    description !== '' || location !== '' || phone !== '';

  React.useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty]);

  // 브라우저 탭 닫기 / 새로고침 감지
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleBack = () => {
    if (step > 1) { setStep(prev => (prev - 1) as Step); return; }
    if (isDirty) { setShowLeaveConfirm(true); } else { onBack(); }
  };

  // 이미지 추가 (실제 파일 선택)
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddImage = () => {
    if (images.length >= 10) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 10 - images.length;
    const toProcess = files.slice(0, remaining);
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => prev.length < 10 ? [...prev, ev.target?.result as string] : prev);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      // 대표사진 인덱스 조정
      if (mainImageIndex >= next.length) {
        setMainImageIndex(Math.max(0, next.length - 1));
      } else if (idx < mainImageIndex) {
        setMainImageIndex(mainImageIndex - 1);
      }
      return next;
    });
  };

  const setAsMainImage = (idx: number) => {
    setMainImageIndex(idx);
  };

  // 인증번호 발송
  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      setErrors(p => ({ ...p, phone: '올바른 휴대폰 번호를 입력해주세요' }));
      return;
    }
    setErrors(p => ({ ...p, phone: '' }));
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setVerifyCode(code);
    setCodeSent(true);
    setCodeTimer(180);

    // 타이머
    const interval = setInterval(() => {
      setCodeTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);

    showToast(`[테스트] 인증번호: ${code}`, 'info');
  };

  // 인증번호 확인
  const handleVerifyCode = () => {
    if (inputCode === verifyCode) {
      setPhoneVerified(true);
      setErrors(p => ({ ...p, code: '' }));
    } else {
      setErrors(p => ({ ...p, code: '인증번호가 올바르지 않아요' }));
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // 스텝 유효성 검사
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (images.length === 0) e.images = '사진을 1장 이상 등록해주세요';
    if (!title.trim()) e.title = '상품명을 입력해주세요';
    if (!category) e.category = '카테고리를 선택해주세요';
    if (!condition) e.condition = '상품 상태를 선택해주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!auctionStartPrice.trim()) e.auctionStartPrice = '경매 시작가를 입력해주세요';
    if (buyNowPrice.trim() && auctionStartPrice.trim()) {
      const start = Number(auctionStartPrice.replace(/,/g, ''));
      const buyNow = Number(buyNowPrice.replace(/,/g, ''));
      if (buyNow <= start) e.buyNowPrice = '즉시낙찰가는 경매 시작가보다 높게 입력해주세요';
    }
    if (!minBidUnit.trim()) e.minBidUnit = '최소 호가 단위를 입력해주세요';
    if (!description.trim()) e.description = '상품 설명을 입력해주세요';
    if (!location.trim()) e.location = '거래 희망 지역을 입력해주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!phone.trim()) e.phone = '휴대폰 번호를 입력해주세요';
    if (!phoneVerified) e.phone = '휴대폰 인증을 완료해주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    onSubmit?.();
    showToast('상품이 등록됐어요! 🎉', 'success');
    onBack();
  };

  const formatPrice = (val: string) => {
    const num = val.replace(/[^0-9]/g, '');
    return num ? Number(num).toLocaleString() : '';
  };

  return (
    <>
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <button className={styles.back} onClick={handleBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className={styles.title}>상품 등록</span>
        <button className={styles.previewBtn} onClick={() => setShowPreview(true)}>미리보기</button>
      </div>

      {/* 스텝 인디케이터 */}
      <div className={styles.stepWrap}>
        {([1, 2, 3] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <button
              className={`${styles.stepDot} ${step >= s ? styles.stepActive : ''} ${s < step ? styles.stepDone : ''}`}
              onClick={() => {
                if (s < step) {
                  // 완료한 단계 — 바로 이동
                  setStep(s);
                } else if (s > step) {
                  // 앞 단계 — 유효성 검사 통과 시만 이동
                  if (step === 1 && validateStep1()) setStep(s === 3 ? (validateStep2() ? 3 : 2) : 2);
                  else if (step === 2 && validateStep2()) setStep(3);
                }
              }}
            >
              {step > s ? '✓' : s}
            </button>
            {i < 2 && <div className={`${styles.stepLine} ${step > s ? styles.stepLineActive : ''}`}/>}
          </React.Fragment>
        ))}
      </div>
      <p className={styles.stepLabel}>
        {step === 1 ? '기본 정보' : step === 2 ? '거래 정보' : '연락처 인증'} ({step}/3)
      </p>

      <div className={styles.scroll}>

        {/* ── STEP 1: 기본 정보 ── */}
        {step === 1 && (
          <div className={styles.form}>
            {/* 사진 등록 */}
            <div className={styles.section}>
              <label className={styles.sectionTitle}>사진 등록 <span className={styles.required}>*</span></label>
              <p className={styles.sectionDesc}>최대 10장까지 등록 가능해요 · 카메라 아이콘을 눌러 대표사진을 설정할 수 있어요</p>
              <div className={styles.imageRow}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button className={styles.addImageBtn} onClick={handleAddImage} disabled={images.length >= 10}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  <span>{images.length}/10</span>
                </button>
                {images.map((img, i) => (
                  <div key={i} className={`${styles.imageThumb} ${i === mainImageIndex ? styles.imageThumbMain : ''}`}>
                    <img src={img} alt="" className={styles.thumbImg}/>
                    <button className={styles.removeImg} onClick={() => removeImage(i)}>✕</button>
                    <button
                      className={`${styles.setMainBtn} ${i === mainImageIndex ? styles.setMainBtnActive : ''}`}
                      onClick={() => setAsMainImage(i)}
                      title="대표사진으로 설정"
                    >
                      <svg width="10" height="10" fill={i === mainImageIndex ? '#fff' : 'currentColor'} viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                    </button>
                    {i === mainImageIndex && <span className={styles.mainImgLabel}>대표</span>}
                  </div>
                ))}
              </div>
              {errors.images && <p className={styles.fieldError}>{errors.images}</p>}
            </div>

            {/* 상품명 */}
            <div className={styles.section}>
              <label className={styles.sectionTitle}>상품명 <span className={styles.required}>*</span></label>
              <input
                className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
                placeholder="상품명을 입력해주세요"
                value={title}
                onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }}
                maxLength={40}
              />
              <p className={styles.hint}>{title.length}/40</p>
              {errors.title && <p className={styles.fieldError}>{errors.title}</p>}
            </div>

            {/* 카테고리 */}
            <div className={styles.section}>
              <label className={styles.sectionTitle}>카테고리 <span className={styles.required}>*</span></label>
              <div className={styles.chipGrid}>
                {PRODUCT_CATEGORIES.map(c => (
                  <button
                    key={c}
                    className={`${styles.chip} ${category === c ? styles.chipActive : ''}`}
                    onClick={() => { setCategory(c); setErrors(p => ({ ...p, category: '' })); }}
                  >{c}</button>
                ))}
              </div>
              {errors.category && <p className={styles.fieldError}>{errors.category}</p>}
            </div>

            {/* 상품 상태 */}
            <div className={styles.section}>
              <label className={styles.sectionTitle}>상품 상태 <span className={styles.required}>*</span></label>
              <div className={styles.conditionGrid}>
                {CONDITIONS.map(c => (
                  <button
                    key={c.value}
                    className={`${styles.conditionBtn} ${condition === c.value ? styles.conditionActive : ''}`}
                    onClick={() => { setCondition(c.value); setErrors(p => ({ ...p, condition: '' })); }}
                  >
                    <span className={styles.conditionLabel}>{c.label}</span>
                    <span className={styles.conditionDesc}>{c.desc}</span>
                  </button>
                ))}
              </div>
              {errors.condition && <p className={styles.fieldError}>{errors.condition}</p>}
            </div>
          </div>
        )}

        {/* ── STEP 2: 거래 정보 ── */}
        {step === 2 && (
          <div className={styles.form}>
            {/* 경매 시작가 */}
            <div className={styles.section}>
              <label className={styles.sectionTitle}>경매 시작가 <span className={styles.required}>*</span></label>
              <div className={styles.priceWrap}>
                <span className={styles.pricePrefix}></span>
                <input
                  className={`${styles.input} ${styles.priceInput} ${errors.auctionStartPrice ? styles.inputError : ''}`}
                  placeholder="시작가를 입력해주세요"
                  value={auctionStartPrice}
                  onChange={e => { setAuctionStartPrice(formatPrice(e.target.value)); setErrors(p => ({ ...p, auctionStartPrice: '' })); }}
                  inputMode="numeric"
                />
              </div>
              {errors.auctionStartPrice && <p className={styles.fieldError}>{errors.auctionStartPrice}</p>}
            </div>

            {/* 즉시낙찰가 */}
            <div className={styles.section}>
              <label className={styles.sectionTitle}>즉시낙찰가</label>
              <p className={styles.sectionDesc}>구매자가 바로 낙찰할 수 있는 가격이에요</p>
              <div className={styles.priceWrap}>
                <span className={styles.pricePrefix}></span>
                <input
                  className={`${styles.input} ${styles.priceInput} ${errors.buyNowPrice ? styles.inputError : ''}`}
                  placeholder="즉시낙찰가를 입력해주세요"
                  value={buyNowPrice}
                  onChange={e => { setBuyNowPrice(formatPrice(e.target.value)); setErrors(p => ({ ...p, buyNowPrice: '' })); }}
                  inputMode="numeric"
                />
              </div>
              {errors.buyNowPrice && <p className={styles.fieldError}>{errors.buyNowPrice}</p>}
            </div>

            {/* 최소 호가 단위 */}
            <div className={styles.section}>
              <label className={styles.sectionTitle}>최소 호가 단위 <span className={styles.required}>*</span></label>
              <div className={styles.priceWrap}>
                <span className={styles.pricePrefix}></span>
                <input
                  className={`${styles.input} ${styles.priceInput} ${errors.minBidUnit ? styles.inputError : ''}`}
                  placeholder="예) 1,000"
                  value={minBidUnit}
                  onChange={e => { setMinBidUnit(formatPrice(e.target.value)); setErrors(p => ({ ...p, minBidUnit: '' })); }}
                  inputMode="numeric"
                />
              </div>
              {errors.minBidUnit && <p className={styles.fieldError}>{errors.minBidUnit}</p>}
            </div>

            {/* 거래 희망 지역 */}
            <div className={styles.section}>
              <label className={styles.sectionTitle}>거래 희망 지역 <span className={styles.required}>*</span></label>
              <input
                className={`${styles.input} ${errors.location ? styles.inputError : ''}`}
                placeholder="예) 강남구 역삼동"
                value={location}
                onChange={e => { setLocation(e.target.value); setErrors(p => ({ ...p, location: '' })); }}
              />
              {errors.location && <p className={styles.fieldError}>{errors.location}</p>}
            </div>

            {/* 상품 설명 */}
            <div className={styles.section}>
              <label className={styles.sectionTitle}>상품 설명 <span className={styles.required}>*</span></label>
              <textarea
                className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                placeholder="상품 상태, 구매 시기, 사용 횟수 등을 자세히 적어주세요"
                value={description}
                onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })); }}
                onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100)}
                maxLength={500}
                rows={6}
              />
              <p className={styles.hint}>{description.length}/500</p>
              {errors.description && <p className={styles.fieldError}>{errors.description}</p>}
            </div>
          </div>
        )}

        {/* ── STEP 3: 연락처 인증 ── */}
        {step === 3 && (
          <div className={styles.form}>
            <div className={styles.section}>
              <label className={styles.sectionTitle}>휴대폰 번호 <span className={styles.required}>*</span></label>
              <p className={styles.sectionDesc}>판매자 인증을 위해 휴대폰 번호가 필요해요</p>
              <div className={styles.phoneRow}>
                <input
                  className={`${styles.input} ${styles.phoneInput} ${errors.phone ? styles.inputError : ''}`}
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '', code: '' })); setPhoneVerified(false); setCodeSent(false); }}
                  inputMode="tel"
                  disabled={phoneVerified}
                />
                <button
                  className={`${styles.sendBtn} ${phoneVerified ? styles.verifiedBtn : ''}`}
                  onClick={handleSendCode}
                  disabled={phoneVerified || loading}
                >
                  {phoneVerified ? '인증완료' : loading ? '발송중' : codeSent ? '재발송' : '인증번호 발송'}
                </button>
              </div>
              {errors.phone && <p className={styles.fieldError}>{errors.phone}</p>}
            </div>

            {/* 인증번호 입력 */}
            {codeSent && !phoneVerified && (
              <div className={styles.section}>
                <label className={styles.sectionTitle}>인증번호</label>
                <div className={styles.phoneRow}>
                  <div className={styles.codeInputWrap}>
                    <input
                      className={`${styles.input} ${styles.phoneInput} ${errors.code ? styles.inputError : ''}`}
                      placeholder="인증번호 6자리"
                      value={inputCode}
                      onChange={e => { setInputCode(e.target.value); setErrors(p => ({ ...p, code: '' })); }}
                      maxLength={6}
                      inputMode="numeric"
                    />
                    {codeTimer > 0 && (
                      <span className={styles.timer}>{formatTimer(codeTimer)}</span>
                    )}
                  </div>
                  <button className={styles.sendBtn} onClick={handleVerifyCode}>확인</button>
                </div>
                {errors.code && <p className={styles.fieldError}>{errors.code}</p>}
                {codeTimer === 0 && codeSent && (
                  <p className={styles.fieldError}>인증번호가 만료됐어요. 재발송해주세요</p>
                )}
              </div>
            )}

            {phoneVerified && (
              <div className={styles.verifiedBanner}>
                ✅ 휴대폰 인증이 완료됐어요
              </div>
            )}

            {/* 등록 요약 */}
            <div className={styles.summaryCard}>
              <p className={styles.summaryTitle}>등록 정보 확인</p>
              <div className={styles.summaryGrid}>
                <span className={styles.summaryLabel}>상품명</span>
                <span className={styles.summaryValue}>{title}</span>
                <span className={styles.summaryLabel}>카테고리</span>
                <span className={styles.summaryValue}>{category}</span>
                <span className={styles.summaryLabel}>상태</span>
                <span className={styles.summaryValue}>{condition}</span>
                <span className={styles.summaryLabel}>지역</span>
                <span className={styles.summaryValue}>{location}</span>
                <span className={styles.summaryLabel}>경매시작가</span>
                <span className={styles.summaryValue}> {auctionStartPrice}</span>
                <span className={styles.summaryLabel}>즉시낙찰가</span>
                <span className={styles.summaryValue}>{buyNowPrice ? ` ${buyNowPrice}` : '-'}</span>
                <span className={styles.summaryLabel}>최소호가단위</span>
                <span className={styles.summaryValue}> {minBidUnit}</span>
              </div>
            </div>
          </div>
        )}

        {/* 하단 버튼 — 스크롤 영역 안에 포함 */}
        <div className={styles.bottomAction} ref={bottomRef}>
          <button className={styles.prevBtn} onClick={handleBack}>
            {step === 1 ? '취소' : '이전'}
          </button>
          {step < 3 ? (
            <button className={styles.nextBtn} onClick={handleNext}>다음</button>
          ) : (
            <button
              className={`${styles.nextBtn} ${loading ? styles.loading : ''}`}
              onClick={handleSubmit}
              disabled={loading || !phoneVerified}
            >
              {loading ? '등록 중...' : '등록하기'}
            </button>
          )}
        </div>
      </div>
    </div>

    {showPreview && (
      <ProductPreviewModal
        data={{ images, mainImageIndex, title, category, condition, auctionStartPrice, buyNowPrice, minBidUnit, tradeMethod, description, location }}
        onClose={() => setShowPreview(false)}
      />
    )}
    {showLeaveConfirm && (
      <LeaveConfirmModal
        onConfirm={() => { setShowLeaveConfirm(false); onBack(); }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    )}
    </>
  );
};

export default SellPage;
