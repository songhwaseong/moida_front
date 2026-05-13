import React, { useState, useRef, useEffect } from 'react';
import { updateMyProduct } from '../../data/myProductStore';
import type { MyProduct } from '../../data/myProductStore';
import { useToast } from '../../components/Toast';
import styles from '../SellPage.module.css';
import headerStyles from './MySubPage.module.css';
import ProductPreviewModal from '../../components/ProductPreviewModal';
import LeaveConfirmModal from '../../components/LeaveConfirmModal';
import { CATEGORIES as HOME_CATEGORIES } from '../../data/mockData';

interface Props {
  product: MyProduct;
  onBack: () => void;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type Condition = 'S급' | 'A급' | 'B급' | 'C급';
type TradeMethod = '직거래' | '택배' | '둘다';

const PRODUCT_CATEGORIES = HOME_CATEGORIES
  .map(category => category.label)
  .filter(label => label !== '전체');
const CONDITIONS: { value: Condition; label: string; desc: string }[] = [
  { value: 'S급', label: 'S급', desc: '미사용/새상품' },
  { value: 'A급', label: 'A급', desc: '거의 새것' },
  { value: 'B급', label: 'B급', desc: '사용감 있음' },
  { value: 'C급', label: 'C급', desc: '하자 있음' },
];
const TRADE_METHODS: TradeMethod[] = ['직거래', '택배', '둘다'];
const STATUS_OPTIONS: MyProduct['status'][] = ['경매예정', '낙찰', '숨김'];

const formatPrice = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const EditProductPage: React.FC<Props> = ({ product, onBack, onSaved, onDirtyChange }) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [images, setImages] = useState<string[]>(product.images);
  const [mainImageIndex, setMainImageIndex] = useState(product.mainImageIndex);
  const [title, setTitle] = useState(product.title);
  const [category, setCategory] = useState(product.category);
  const [condition, setCondition] = useState<Condition | ''>(product.condition as Condition);
  const [auctionStartPrice, setAuctionStartPrice] = useState(product.auctionStartPrice);
  const [minBidUnit, setMinBidUnit] = useState(product.minBidUnit);
  const [tradeMethod, setTradeMethod] = useState<TradeMethod | ''>(product.tradeMethod as TradeMethod);
  const [description, setDescription] = useState(product.description);
  const [location, setLocation] = useState(product.location);
  const [auctionDate, setAuctionDate] = useState(product.auctionDate);
  const [status, setStatus] = useState<MyProduct['status']>(product.status);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // 원본값과 비교해 변경 여부 감지
  const isDirty =
    JSON.stringify(images) !== JSON.stringify(product.images) ||
    mainImageIndex !== product.mainImageIndex ||
    title !== product.title ||
    category !== product.category ||
    condition !== product.condition ||
    auctionStartPrice !== product.auctionStartPrice ||
    minBidUnit !== product.minBidUnit ||
    tradeMethod !== product.tradeMethod ||
    description !== product.description ||
    location !== product.location ||
    auctionDate !== product.auctionDate ||
    status !== product.status;

  const handleBack = () => {
    if (isDirty) { setShowLeaveConfirm(true); } else { onBack(); }
  };

  React.useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty]);

  // 브라우저 탭 닫기 / 새로고침 감지
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleAddImage = () => { if (images.length < 10) fileInputRef.current?.click(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 10 - images.length;
    files.slice(0, remaining).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setImages(prev => prev.length < 10 ? [...prev, ev.target?.result as string] : prev);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (mainImageIndex >= next.length) setMainImageIndex(Math.max(0, next.length - 1));
      else if (idx < mainImageIndex) setMainImageIndex(mainImageIndex - 1);
      return next;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = '상품명을 입력해주세요';
    if (!category) e.category = '카테고리를 선택해주세요';
    if (!condition) e.condition = '상품 상태를 선택해주세요';
    if (!auctionStartPrice.trim()) e.auctionStartPrice = '경매 시작가를 입력해주세요';
    if (!minBidUnit.trim()) e.minBidUnit = '최소 호가 단위를 입력해주세요';
    if (!tradeMethod) e.tradeMethod = '거래 방식을 선택해주세요';
    if (!description.trim()) e.description = '상품 설명을 입력해주세요';
    if (!location.trim()) e.location = '거래 희망 지역을 입력해주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { showToast('필수 항목을 확인해주세요', 'warning'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    updateMyProduct({
      ...product,
      images,
      mainImageIndex,
      title,
      category,
      condition,
      auctionStartPrice,
      minBidUnit,
      tradeMethod,
      description,
      location,
      auctionDate,
      status,
    });
    setLoading(false);
    showToast('상품이 수정됐어요!', 'success');
    onSaved();
  };

  return (
    <>
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={headerStyles.header}>
        <button className={headerStyles.back} onClick={handleBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className={headerStyles.title}>상품 수정</span>
        <button className={styles.previewBtn} onClick={() => setShowPreview(true)}>미리보기</button>
      </div>

      <div className={styles.formWrap} style={{ paddingBottom: 120 }}>
        <div className={styles.form}>

          {/* 판매 상태 */}
          <div className={styles.section}>
            <label className={styles.sectionTitle}>판매 상태</label>
            <div className={styles.chipRow}>
              {STATUS_OPTIONS.map(s => (
                <button key={s} className={`${styles.chip} ${status === s ? styles.chipActive : ''}`}
                  onClick={() => setStatus(s)}>{s}</button>
              ))}
            </div>
          </div>

          {/* 사진 */}
          <div className={styles.section}>
            <label className={styles.sectionTitle}>사진 <span className={styles.required}>*</span></label>
            <p className={styles.sectionDesc}>최대 10장 · 카메라 아이콘으로 대표사진 설정</p>
            <div className={styles.imageRow}>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange}/>
              <button className={styles.addImageBtn} onClick={handleAddImage} disabled={images.length >= 10}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                <span>{images.length}/10</span>
              </button>
              {images.map((img, i) => (
                <div key={i} className={`${styles.imageThumb} ${i === mainImageIndex ? styles.imageThumbMain : ''}`}>
                  <img src={img} alt="" className={styles.thumbImg}/>
                  <button className={styles.removeImg} onClick={() => removeImage(i)}>✕</button>
                  <button className={`${styles.setMainBtn} ${i === mainImageIndex ? styles.setMainBtnActive : ''}`}
                    onClick={() => setMainImageIndex(i)} title="대표사진">
                    <svg width="10" height="10" fill={i === mainImageIndex ? '#fff' : 'currentColor'} viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </button>
                  {i === mainImageIndex && <span className={styles.mainImgLabel}>대표</span>}
                </div>
              ))}
            </div>
          </div>

          {/* 상품명 */}
          <div className={styles.section}>
            <label className={styles.sectionTitle}>상품명 <span className={styles.required}>*</span></label>
            <input className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
              placeholder="상품명을 입력해주세요" value={title}
              onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }}/>
            {errors.title && <p className={styles.fieldError}>{errors.title}</p>}
          </div>

          {/* 카테고리 */}
          <div className={styles.section}>
            <label className={styles.sectionTitle}>카테고리 <span className={styles.required}>*</span></label>
            <div className={`${styles.chipRow} ${styles.chipWrap}`}>
              {PRODUCT_CATEGORIES.map(c => (
                <button key={c} className={`${styles.chip} ${styles.chipSm} ${category === c ? styles.chipActive : ''}`}
                  onClick={() => { setCategory(c); setErrors(p => ({ ...p, category: '' })); }}>{c}</button>
              ))}
            </div>
            {errors.category && <p className={styles.fieldError}>{errors.category}</p>}
          </div>

          {/* 상태 */}
          <div className={styles.section}>
            <label className={styles.sectionTitle}>상품 상태 <span className={styles.required}>*</span></label>
            <div className={styles.conditionGrid}>
              {CONDITIONS.map(c => (
                <button key={c.value} className={`${styles.conditionBtn} ${condition === c.value ? styles.conditionActive : ''}`}
                  onClick={() => { setCondition(c.value); setErrors(p => ({ ...p, condition: '' })); }}>
                  <span className={styles.condLabel}>{c.label}</span>
                  <span className={styles.condDesc}>{c.desc}</span>
                </button>
              ))}
            </div>
            {errors.condition && <p className={styles.fieldError}>{errors.condition}</p>}
          </div>

          {/* 경매 시작가 */}
          <div className={styles.section}>
            <label className={styles.sectionTitle}>경매 시작가 <span className={styles.required}>*</span></label>
            <div className={styles.priceWrap}>
              <span className={styles.pricePrefix}></span>
              <input className={`${styles.input} ${styles.priceInput} ${errors.auctionStartPrice ? styles.inputError : ''}`}
                placeholder="시작가를 입력해주세요" value={auctionStartPrice}
                onChange={e => { setAuctionStartPrice(formatPrice(e.target.value)); setErrors(p => ({ ...p, auctionStartPrice: '' })); }}
                inputMode="numeric"/>
            </div>
            {errors.auctionStartPrice && <p className={styles.fieldError}>{errors.auctionStartPrice}</p>}
          </div>

          {/* 최소 호가 단위 */}
          <div className={styles.section}>
            <label className={styles.sectionTitle}>최소 호가 단위 <span className={styles.required}>*</span></label>
            <div className={styles.priceWrap}>
              <span className={styles.pricePrefix}></span>
              <input className={`${styles.input} ${styles.priceInput} ${errors.minBidUnit ? styles.inputError : ''}`}
                placeholder="예) 1,000" value={minBidUnit}
                onChange={e => { setMinBidUnit(formatPrice(e.target.value)); setErrors(p => ({ ...p, minBidUnit: '' })); }}
                inputMode="numeric"/>
            </div>
            {errors.minBidUnit && <p className={styles.fieldError}>{errors.minBidUnit}</p>}
          </div>

          {/* 경매 예정일 */}
          <div className={styles.section}>
            <label className={styles.sectionTitle}>경매 예정일</label>
            <input className={styles.input} placeholder="예) 2026.05.10" value={auctionDate}
              onChange={e => setAuctionDate(e.target.value)}/>
          </div>

          {/* 거래 방식 */}
          <div className={styles.section}>
            <label className={styles.sectionTitle}>거래 방식 <span className={styles.required}>*</span></label>
            <div className={styles.chipRow}>
              {TRADE_METHODS.map(m => (
                <button key={m} className={`${styles.chip} ${tradeMethod === m ? styles.chipActive : ''}`}
                  onClick={() => { setTradeMethod(m); setErrors(p => ({ ...p, tradeMethod: '' })); }}>{m}</button>
              ))}
            </div>
            {errors.tradeMethod && <p className={styles.fieldError}>{errors.tradeMethod}</p>}
          </div>

          {/* 상품 설명 */}
          <div className={styles.section}>
            <label className={styles.sectionTitle}>상품 설명 <span className={styles.required}>*</span></label>
            <textarea className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
              placeholder="상품 상태, 구매 시기 등을 자세히 적어주세요" value={description} rows={5}
              onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: '' })); }}/>
            {errors.description && <p className={styles.fieldError}>{errors.description}</p>}
          </div>

          {/* 거래 희망 지역 */}
          <div className={styles.section}>
            <label className={styles.sectionTitle}>거래 희망 지역 <span className={styles.required}>*</span></label>
            <input className={`${styles.input} ${errors.location ? styles.inputError : ''}`}
              placeholder="예) 강남구 역삼동" value={location}
              onChange={e => { setLocation(e.target.value); setErrors(p => ({ ...p, location: '' })); }}/>
            {errors.location && <p className={styles.fieldError}>{errors.location}</p>}
          </div>

        </div>
      </div>

      {/* 저장 버튼 */}
      <div style={{
        position: 'fixed', bottom: 65, left: 0, right: 0,
        padding: '12px 16px',
        background: 'linear-gradient(transparent, #fff 30%)',
        zIndex: 50,
      }}>
        <button
          className={`${styles.nextBtn} ${loading ? styles.loading : ''}`}
          style={{ width: '100%' }}
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '저장 중...' : '수정 완료'}
        </button>
      </div>
    </div>

    {showPreview && (
      <ProductPreviewModal
        data={{ images, mainImageIndex, title, category, condition, auctionStartPrice, minBidUnit, tradeMethod, description, location, auctionDate }}
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

export default EditProductPage;
