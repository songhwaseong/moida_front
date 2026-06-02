import React, { useState, useRef, useEffect } from 'react';
import { getProduct, updateProduct } from '../../api/products';
import type { MyProduct } from '../../data/myProductStore';
import { useToast } from '../../components/ToastContext';
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

const PRODUCT_CATEGORIES = HOME_CATEGORIES
  .map(category => category.label)
  .filter(label => label !== '전체');
const CONDITIONS: { value: Condition; label: string; desc: string }[] = [
  { value: 'S급', label: 'S급', desc: '미사용/새상품' },
  { value: 'A급', label: 'A급', desc: '거의 새것' },
  { value: 'B급', label: 'B급', desc: '사용감 있음' },
  { value: 'C급', label: 'C급', desc: '하자 있음' },
];
// 판매자가 직접 지정할 수 있는 상태만 노출한다. (경매예정/경매중/낙찰 등은 관리자·시스템이 관리)
// 상품을 수정하면 다시 관리자 승인을 받도록 '승인요청'을 선택할 수 있다.
const STATUS_OPTIONS: MyProduct['status'][] = ['승인요청중', '숨김'];

// 칩에 보여줄 라벨. ('승인요청중' 상태값을 화면에서는 '승인요청'으로 표기)
const STATUS_LABEL: Partial<Record<MyProduct['status'], string>> = {
  '승인요청중': '승인요청',
  '숨김': '숨김',
};

// 화면 상태 라벨 → 백엔드 ProductStatus. 매핑이 없는 상태(경매예정/유찰 등)는 변경하지 않는다(undefined).
const STATUS_TO_API: Partial<Record<MyProduct['status'], 'PENDING' | 'HIDDEN'>> = {
  '승인요청중': 'PENDING',
  '숨김': 'HIDDEN',
};

const formatPrice = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const toNumber = (v: string) => Number(v.replace(/[^0-9]/g, '')) || 0;

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
  // 즉시낙찰가는 선택값. summary 에는 없으므로 상세 로드 후 채운다.
  const [immediatePrice, setImmediatePrice] = useState('');
  const [description, setDescription] = useState(product.description);
  const [location, setLocation] = useState(product.location);
  const [status, setStatus] = useState<MyProduct['status']>(product.status);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // 목록 API(summary)에는 설명/최소 호가단위/즉시낙찰가/전체 이미지가 없어 빈 값으로 들어온다.
  // 상세 API로 보강한 값을 폼과 변경 감지(isDirty)의 기준선으로 함께 사용한다.
  const [baseline, setBaseline] = useState<MyProduct>(product);
  const [baselineImmediatePrice, setBaselineImmediatePrice] = useState('');

  // 진입 시 상세 데이터를 불러와 폼과 기준선을 동시에 채운다. (productId 기준 1회)
  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const detail = await getProduct(product.id);
        if (ignore) return;
        const mainIdx = Math.max(0, detail.images.indexOf(detail.image));
        const full: MyProduct = {
          ...product,
          images: detail.images.length > 0 ? detail.images : product.images,
          mainImageIndex: mainIdx,
          title: detail.name,
          category: detail.category,
          condition: detail.condition,
          auctionStartPrice: formatPrice(String(detail.startPrice ?? detail.price ?? '')),
          minBidUnit: detail.minBidUnit != null ? formatPrice(String(detail.minBidUnit)) : '',
          description: detail.description ?? '',
          location: detail.location,
        };
        const immediate = detail.immediatePrice != null ? formatPrice(String(detail.immediatePrice)) : '';
        setImages(full.images);
        setMainImageIndex(full.mainImageIndex);
        setTitle(full.title);
        setCategory(full.category);
        setCondition(full.condition as Condition);
        setAuctionStartPrice(full.auctionStartPrice);
        setMinBidUnit(full.minBidUnit);
        setImmediatePrice(immediate);
        setDescription(full.description);
        setLocation(full.location);
        setBaseline(full);
        setBaselineImmediatePrice(immediate);
      } catch (error) {
        console.error('Failed to load product detail for edit', error);
      }
    })();
    return () => { ignore = true; };
  }, [product.id]);

  // 기준선(baseline)과 비교해 변경 여부 감지
  const isDirty =
    JSON.stringify(images) !== JSON.stringify(baseline.images) ||
    mainImageIndex !== baseline.mainImageIndex ||
    title !== baseline.title ||
    category !== baseline.category ||
    condition !== baseline.condition ||
    auctionStartPrice !== baseline.auctionStartPrice ||
    minBidUnit !== baseline.minBidUnit ||
    immediatePrice !== baselineImmediatePrice ||
    description !== baseline.description ||
    location !== baseline.location ||
    status !== baseline.status;

  const handleBack = () => {
    if (isDirty) { setShowLeaveConfirm(true); } else { onBack(); }
  };

  React.useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

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
    // 즉시낙찰가는 선택값이지만, 입력했다면 시작가보다 높아야 한다.
    if (immediatePrice.trim() && toNumber(immediatePrice) <= toNumber(auctionStartPrice)) {
      e.immediatePrice = '즉시낙찰가는 시작가보다 높아야 합니다';
    }
    if (!description.trim()) e.description = '상품 설명을 입력해주세요';
    if (!location.trim()) e.location = '거래 희망 지역을 입력해주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { showToast('필수 항목을 확인해주세요', 'warning'); return; }
    setLoading(true);
    try {
      await updateProduct(product.id, {
        name: title,
        description,
        category,
        condition,
        price: toNumber(auctionStartPrice),
        minBidUnit: toNumber(minBidUnit),
        immediatePrice: immediatePrice.trim() ? toNumber(immediatePrice) : null,
        location,
        images,
        mainImageIndex,
        status: STATUS_TO_API[status],
      });
      showToast('상품이 수정됐어요!', 'success');
      onSaved();
    } catch (error) {
      console.error('Failed to update product', error);
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : '';
      showToast(message || '상품 수정에 실패했어요. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setLoading(false);
    }
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
                  onClick={() => setStatus(s)}>{STATUS_LABEL[s] ?? s}</button>
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

          {/* 즉시낙찰가 (선택) */}
          <div className={styles.section}>
            <label className={styles.sectionTitle}>즉시낙찰가</label>
            <p className={styles.sectionDesc}>입력하면 경매 중에도 이 금액으로 즉시 낙찰받을 수 있어요. (선택)</p>
            <div className={styles.priceWrap}>
              <span className={styles.pricePrefix}></span>
              <input className={`${styles.input} ${styles.priceInput} ${errors.immediatePrice ? styles.inputError : ''}`}
                placeholder="예) 1,000,000" value={immediatePrice}
                onChange={e => { setImmediatePrice(formatPrice(e.target.value)); setErrors(p => ({ ...p, immediatePrice: '' })); }}
                inputMode="numeric"/>
            </div>
            {errors.immediatePrice && <p className={styles.fieldError}>{errors.immediatePrice}</p>}
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
        data={{ images, mainImageIndex, title, category, condition, auctionStartPrice, minBidUnit, description, location }}
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
