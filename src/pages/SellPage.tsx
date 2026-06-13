import React, { useState, useEffect } from 'react';
import { useToast } from '../components/ToastContext';
import { CATEGORIES as HOME_CATEGORIES } from '../data/mockData';
import ProductPreviewModal from '../components/ProductPreviewModal';
import LeaveConfirmModal from '../components/LeaveConfirmModal';
import { CARRIERS } from '../data/carriers';
import styles from './SellPage.module.css';
import customAxios from '../api/axiosInstance';
import { getMyProfile } from '../api/member';
import { uploadProductImages } from '../api/productImages';
import { sendPhoneCode, verifyPhoneCode } from '../api/phoneVerification';

interface Props {
  onBack: () => void;
  onSubmit?: (productId: number) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type Condition = 'S급' | 'A급' | 'B급' | 'C급';
type Step = 1 | 2 | 3;

const getApiError = (error: unknown) => {
  return (error as { response?: { status?: number; data?: { message?: string } } })?.response;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return getApiError(error)?.data?.message || fallback;
};

const PRODUCT_CATEGORIES = HOME_CATEGORIES
  .map(category => category.label)
  .filter(label => label !== '전체');
const HIDDEN_SELL_CATEGORIES = ['이월상품'];
const ADDON_CATEGORIES = ['한정판'];
const BASE_CATEGORIES = PRODUCT_CATEGORIES.filter(
  label => !ADDON_CATEGORIES.includes(label) && !HIDDEN_SELL_CATEGORIES.includes(label)
);
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

  // ── 폼 데이터 (공통) ──
  const [images, setImages] = useState<string[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [addonCategories, setAddonCategories] = useState<string[]>([]);
  const [condition, setCondition] = useState<Condition | ''>('');
  const [description, setDescription] = useState('');
  const [carrierCode, setCarrierCode] = useState('');
  const [trackingNo, setTrackingNo] = useState('');

  // ── 경매 전용 필드 ──
  const [auctionStartPrice, setAuctionStartPrice] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [minBidUnit, setMinBidUnit] = useState('');

  // ── 인증 관련 ──
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneFromProfile, setPhoneFromProfile] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeTimer, setCodeTimer] = useState(0);

  // ── UI 제어 ──
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const auctionStartPriceRef = React.useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── 변경 여부 감지 ──
  const selectedCategories = [category, ...addonCategories].filter(Boolean);
  const categorySummary = selectedCategories.join(', ');

  const isDirty = !isSubmitting && (
    images.length > 0 || title !== '' || category !== '' ||
    addonCategories.length > 0 || condition !== '' ||
    auctionStartPrice !== '' || buyNowPrice !== '' || minBidUnit !== '' ||
    description !== '' || carrierCode !== '' || trackingNo !== '' || phone !== ''
  );

  useEffect(() => {
    getMyProfile().then(data => {
      if (data.phone) {
        setPhone(data.phone);
        setPhoneFromProfile(true);
      }
    }).catch(() => { });
  }, []);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (!codeSent || phoneVerified || codeTimer <= 0) return;
    const timer = window.setTimeout(() => {
      setCodeTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [codeSent, phoneVerified, codeTimer]);

  useEffect(() => {
    if (step !== 2) return;
    window.requestAnimationFrame(() => {
      auctionStartPriceRef.current?.scrollIntoView({ block: 'center' });
      auctionStartPriceRef.current?.focus({ preventScroll: true });
    });
  }, [step]);

  // ── 이미지 처리 ──
  const handleAddImage = () => { if (images.length >= 10) return; fileInputRef.current?.click(); };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const remaining = 10 - images.length;
    const toUpload = files.slice(0, remaining);

    try {
      const uploadedImages = await uploadProductImages(toUpload);
      setImages(prev => [...prev, ...uploadedImages].slice(0, 10));
    } catch (error) {
      showToast(getErrorMessage(error, "이미지 업로드에 실패했어요."), "error");
    }
  };

  const removeImage = (idx: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (mainImageIndex >= next.length) setMainImageIndex(Math.max(0, next.length - 1));
      else if (idx < mainImageIndex) setMainImageIndex(mainImageIndex - 1);
      return next;
    });
  };

  const setAsMainImage = (idx: number) => setMainImageIndex(idx);

  // ── 가격 포맷 (쉼표 자동) ──
  const formatPrice = (val: string) => {
    const num = val.replace(/[^0-9]/g, '');
    return num ? Number(num).toLocaleString() : '';
  };
  const toPriceNumber = (val: string) => Number(val.replace(/,/g, '')) || 0;

  const toggleAddonCategory = (label: string) => {
    setAddonCategories(prev =>
      prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]
    );
    setErrors(p => ({ ...p, category: '' }));
  };

  // ── 인증번호 발송 ──
  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      setErrors(p => ({ ...p, phone: '올바른 휴대폰 번호를 입력해주세요' }));
      return;
    }
    setLoading(true);
    setErrors(p => ({ ...p, phone: '', code: '' }));
    try {
      await sendPhoneCode(phone.trim());
      setCodeSent(true);
      setPhoneVerified(false);
      setInputCode('');
      setCodeTimer(180);
      showToast('인증번호를 전송했어요. 3분 이내에 입력해주세요.', 'success');
    } catch (error: unknown) {
      showToast(getErrorMessage(error, '인증번호 발송에 실패했어요'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!inputCode.trim()) {
      setErrors(p => ({ ...p, code: '인증번호 6자리를 입력해주세요' }));
      return;
    }
    setLoading(true);
    setErrors(p => ({ ...p, code: '' }));
    try {
      await verifyPhoneCode(phone.trim(), inputCode.trim());
      setPhoneVerified(true);
      setCodeTimer(0);
      setErrors(p => ({ ...p, code: '' }));
      showToast('휴대폰 인증이 완료됐어요.', 'success');
    } catch (error: unknown) {
      setErrors(p => ({ ...p, code: getErrorMessage(error, '인증번호가 올바르지 않아요') }));
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // ── 유효성 검사 ──
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (images.length === 0) e.images = '사진을 1장 이상 등록해주세요';
    if (!title.trim()) e.title = '상품명을 입력해주세요';
    if (selectedCategories.length === 0) e.category = '카테고리를 선택해주세요';
    if (!condition) e.condition = '상품 상태를 선택해주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    // 경매 유효성
    if (!auctionStartPrice.trim()) e.auctionStartPrice = '경매 시작가를 입력해주세요';
    if (!minBidUnit.trim()) e.minBidUnit = '최소 호가 단위를 입력해주세요';
    const start = toPriceNumber(auctionStartPrice);
    const bidUnit = toPriceNumber(minBidUnit);
    if (auctionStartPrice.trim() && start <= 0) e.auctionStartPrice = '경매 시작가는 1원 이상이어야 합니다';
    if (minBidUnit.trim() && bidUnit <= 0) e.minBidUnit = '최소 호가 단위는 1원 이상이어야 합니다';
    if (buyNowPrice.trim() && auctionStartPrice.trim() && minBidUnit.trim()) {
      const buyNow = toPriceNumber(buyNowPrice);
      if (buyNow < start + bidUnit) {
        e.buyNowPrice = '즉시낙찰가는 경매 시작가와 최소 호가 단위를 더한 금액 이상이어야 합니다';
      }
    }

    if (!description.trim()) e.description = '상품 설명을 입력해주세요';
    if (!carrierCode || !trackingNo) {
      e.shipment = '택배사와 송장번호를 입력해주세요';
    } else if (!/^\d{10,14}$/.test(trackingNo)) {
      e.shipment = '송장번호는 10~14자리 숫자로 입력해주세요';
    }
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

  // ── 네비게이션 ──
  const handleBack = () => {
    if (isDirty) { setShowLeaveConfirm(true); } else { onBack(); }
  };

  const handlePrevStep = () => {
    if (step > 1) { setStep(prev => (prev - 1) as Step); return; }
    handleBack();
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  // ── 등록 제출 ──
  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setIsSubmitting(true);
    onDirtyChange?.(false);
    setLoading(true);

    try {
      // 공통 payload
      const payload = {
        name: title,
        description,
        category,
        condition,
        type: 'AUCTION',
        price: Number(auctionStartPrice.replace(/,/g, '')),
        carrierCode: carrierCode || null,
        trackingNo: trackingNo || null,
        image: images[mainImageIndex],
        images,
        mainImageIndex,

        // 경매 전용 
        buyNowPrice: buyNowPrice
          ? Number(buyNowPrice.replace(/,/g, ''))
          : null,
        minBidUnit: minBidUnit
          ? Number(minBidUnit.replace(/,/g, ''))
          : null,
      };

      // 백엔드로 전송 (customAxios가 JWT 토큰 자동 첨부)
      const response = await customAxios.post(`/products`, payload) // ← response로 받기
      const productId = response.data.data; // ← productId 추출
      onDirtyChange?.(false);
      onSubmit?.(productId);

      showToast('상품이 등록됐어요! 🎉', 'success');
    } catch (err: unknown) {
      const response = getApiError(err);
      if (response?.status !== 401) {
        setIsSubmitting(false);
      }
      // 401: 로그인 만료 → axiosInstance가 자동으로 로그인 페이지로 이동
      // 그 외 에러: 토스트 메시지
      const message = response?.data?.message || '상품 등록에 실패했어요. 다시 시도해주세요.';
      showToast(message, 'error');

    } finally {
      setLoading(false); // 성공/실패 무관하게 로딩 종료
    }
  };

  // ── 요약 데이터 (미리보기용) ──


  return (
    <>
      <div className={styles.page}>

        {/* 헤더 */}
        <div className={styles.header}>
          <button className={styles.back} onClick={handleBack}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7" />
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
                    setStep(s);
                  } else if (s > step) {
                    if (step === 1 && validateStep1()) setStep(s === 3 ? (validateStep2() ? 3 : 2) : 2);
                    else if (step === 2 && validateStep2()) setStep(3);
                  }
                }}
              >
                {step > s ? '✓' : s}
              </button>
              {i < 2 && <div className={`${styles.stepLine} ${step > s ? styles.stepLineActive : ''}`} />}
            </React.Fragment>
          ))}
        </div>
        <p className={styles.stepLabel}>
          {step === 1 ? '기본 정보' : step === 2 ? '거래 정보' : '연락처 인증'} ({step}/3)
        </p>

        <div className={styles.scroll}>

          {/* STEP 1: 기본 정보 */}
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
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span>{images.length}/10</span>
                  </button>
                  {images.map((img, i) => (
                    <div key={i} className={`${styles.imageThumb} ${i === mainImageIndex ? styles.imageThumbMain : ''}`}>
                      <img src={img} alt="" className={styles.thumbImg} />
                      <button className={styles.removeImg} onClick={() => removeImage(i)}>✕</button>
                      <button
                        className={`${styles.setMainBtn} ${i === mainImageIndex ? styles.setMainBtnActive : ''}`}
                        onClick={() => setAsMainImage(i)}
                        title="대표사진으로 설정"
                      >
                        <svg width="10" height="10" fill={i === mainImageIndex ? '#fff' : 'none'} stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 13c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z" />
                        </svg>
                      </button>
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
                  maxLength={50}
                />
                {errors.title && <p className={styles.fieldError}>{errors.title}</p>}
              </div>

              {/* 카테고리 */}
              <div className={styles.section}>
                <label className={styles.sectionTitle}>카테고리 <span className={styles.required}>*</span></label>
                <div className={styles.chipWrap}>
                  {BASE_CATEGORIES.map(c => (
                    <button
                      key={c}
                      className={`${styles.chip} ${category === c ? styles.chipActive : ''}`}
                      onClick={() => { setCategory(c); setErrors(p => ({ ...p, category: '' })); }}
                    >{c}</button>
                  ))}
                  {ADDON_CATEGORIES.map(c => (
                    <button
                      key={c}
                      className={`${styles.chip} ${styles.chipAddon} ${addonCategories.includes(c) ? styles.chipActive : ''}`}
                      onClick={() => toggleAddonCategory(c)}
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

          {/* STEP 2: 경매 정보 */}
          {step === 2 && (
            <div className={styles.form}>
              {/* 경매 시작가 */}
              <div className={styles.section}>
                <label className={styles.sectionTitle}>경매 시작가 <span className={styles.required}>*</span></label>
                <div className={styles.priceWrap}>
                  <span className={styles.pricePrefix}>₩</span>
                  <input
                    ref={auctionStartPriceRef}
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
                  <span className={styles.pricePrefix}>₩</span>
                  <input
                    className={`${styles.input} ${styles.priceInput} ${errors.buyNowPrice ? styles.inputError : ''}`}
                    placeholder="즉시낙찰가 (선택)"
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
                  <span className={styles.pricePrefix}>₩</span>
                  <input
                    className={`${styles.input} ${styles.priceInput} ${errors.minBidUnit ? styles.inputError : ''}`}
                    placeholder="입찰 최소 단위를 입력해주세요"
                    value={minBidUnit}
                    onChange={e => { setMinBidUnit(formatPrice(e.target.value)); setErrors(p => ({ ...p, minBidUnit: '' })); }}
                    inputMode="numeric"
                  />
                </div>
                {errors.minBidUnit && <p className={styles.fieldError}>{errors.minBidUnit}</p>}
              </div>

              {/* 상품 설명 */}
              <div className={styles.section}>
                <label className={styles.sectionTitle}>상품 설명 <span className={styles.required}>*</span></label>
                <textarea
                  className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                  placeholder="상품 상태, 구매 시기, 사용 횟수 등을 자세히 적어주세요"
                  value={description}
                  onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })); }}
                  maxLength={500}
                  rows={6}
                />
                <p className={styles.hint}>{description.length}/500</p>
                {errors.description && <p className={styles.fieldError}>{errors.description}</p>}
              </div>

              <div className={styles.section}>
                <label className={styles.sectionTitle}>배송 정보 <span className={styles.required}>*</span></label>
                <p className={styles.sectionDesc}>택배사와 송장번호를 함께 등록해주세요.</p>
                <div className={styles.shipmentGrid}>
                  <select
                    className={`${styles.input} ${errors.shipment ? styles.inputError : ''}`}
                    value={carrierCode}
                    onChange={e => { setCarrierCode(e.target.value); setErrors(p => ({ ...p, shipment: '' })); }}
                  >
                    <option value="">택배사 선택</option>
                    {CARRIERS.map(carrier => (
                      <option key={carrier.code} value={carrier.code}>{carrier.name}</option>
                    ))}
                  </select>
                  <input
                    className={`${styles.input} ${errors.shipment ? styles.inputError : ''}`}
                    placeholder="송장번호 10~14자리"
                    value={trackingNo}
                    onChange={e => { setTrackingNo(e.target.value.replace(/[^0-9]/g, '').slice(0, 14)); setErrors(p => ({ ...p, shipment: '' })); }}
                    inputMode="numeric"
                  />
                </div>
                {errors.shipment && <p className={styles.fieldError}>{errors.shipment}</p>}
              </div>

              {/* 등록 요약 카드 */}
              <div className={styles.summaryCard}>
                <p className={styles.summaryTitle}>등록 정보 확인</p>
                <div className={styles.summaryGrid}>
                  <span className={styles.summaryLabel}>거래 방식</span>
                  <span className={styles.summaryValue}>경매</span>
                  <span className={styles.summaryLabel}>상품명</span>
                  <span className={styles.summaryValue}>{title}</span>
                  <span className={styles.summaryLabel}>카테고리</span>
                  <span className={styles.summaryValue}>{categorySummary}</span>
                  <span className={styles.summaryLabel}>상태</span>
                  <span className={styles.summaryValue}>{condition}</span>
                  <span className={styles.summaryLabel}>경매시작가</span>
                  <span className={styles.summaryValue}>₩ {auctionStartPrice}</span>
                  <span className={styles.summaryLabel}>즉시낙찰가</span>
                  <span className={styles.summaryValue}>{buyNowPrice ? `₩ ${buyNowPrice}` : '-'}</span>
                  <span className={styles.summaryLabel}>최소호가단위</span>
                  <span className={styles.summaryValue}>₩ {minBidUnit}</span>
                  <span className={styles.summaryLabel}>배송 정보</span>
                  <span className={styles.summaryValue}>{carrierCode && trackingNo ? `${CARRIERS.find(item => item.code === carrierCode)?.name ?? carrierCode} · ${trackingNo}` : '-'}</span>
                </div>
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
                    className={`${styles.input} ${styles.phoneInput} ${phoneFromProfile ? styles.inputReadonly : ''} ${errors.phone ? styles.inputError : ''}`}
                    placeholder="010-0000-0000"
                    value={phone}
                    onChange={e => {
                      if (phoneFromProfile) return;
                      setPhone(e.target.value);
                      setErrors(p => ({ ...p, phone: '', code: '' }));
                      setPhoneVerified(false);
                      setCodeSent(false);
                      setInputCode('');
                      setCodeTimer(0);
                    }}
                    inputMode="tel"
                    readOnly={phoneFromProfile}
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
                      {codeTimer > 0 && <span className={styles.timer}>{formatTimer(codeTimer)}</span>}
                    </div>
                    <button className={styles.sendBtn} onClick={handleVerifyCode} disabled={loading || codeTimer === 0}>확인</button>
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

              {/* 최종 요약 */}
              <div className={styles.summaryCard}>
                <p className={styles.summaryTitle}>등록 정보 확인</p>
                <div className={styles.summaryGrid}>
                  <span className={styles.summaryLabel}>거래 방식</span>
                  <span className={styles.summaryValue}>경매</span>
                  <span className={styles.summaryLabel}>상품명</span>
                  <span className={styles.summaryValue}>{title}</span>
                  <span className={styles.summaryLabel}>카테고리</span>
                  <span className={styles.summaryValue}>{categorySummary}</span>
                  <span className={styles.summaryLabel}>상태</span>
                  <span className={styles.summaryValue}>{condition}</span>
                  <span className={styles.summaryLabel}>가격</span>
                  <span className={styles.summaryValue}>
                    {`₩ ${auctionStartPrice} (시작가)`}
                  </span>
                  <span className={styles.summaryLabel}>배송 정보</span>
                  <span className={styles.summaryValue}>{carrierCode && trackingNo ? `${CARRIERS.find(item => item.code === carrierCode)?.name ?? carrierCode} · ${trackingNo}` : '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* 하단 버튼 */}
          <div className={styles.bottomAction}>
            <button className={styles.prevBtn} onClick={handlePrevStep}>
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
          data={{
            images,
            mainImageIndex,
            title,
            category: categorySummary,
            condition,
            auctionStartPrice,
            buyNowPrice,
            minBidUnit,
            description,
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
      {showLeaveConfirm && (
        <LeaveConfirmModal
          onConfirm={() => { setShowLeaveConfirm(false); onDirtyChange?.(false); onBack(); }}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}
    </>
  );
};

export default SellPage;
