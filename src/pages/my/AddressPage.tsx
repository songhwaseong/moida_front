import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createAddress,
  deleteAddress as deleteAddressApi,
  getAddresses,
  setDefaultAddress,
  updateAddress,
  type AddressRequest,
} from '../../api/addresses';
import type { Address } from '../../types';
import styles from './MySubPage.module.css';
import modalStyles from './AddressModal.module.css';

interface DaumPostcodeData {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
}

interface DaumPostcode {
  embed: (element: HTMLElement) => void;
}

interface DaumPostcodeConstructor {
  new (options: {
    oncomplete: (data: DaumPostcodeData) => void;
    width: string;
    height: string;
  }): DaumPostcode;
}

declare global {
  interface Window {
    daum?: {
      Postcode: DaumPostcodeConstructor;
    };
  }
}

const EMPTY: Address = {
  id: 0,
  name: '',
  zonecode: '',
  address: '',
  detail: '',
  phone: '',
  isDefault: false,
};

interface Props { onBack: () => void; }

const PHONE_PATTERN = /^01[016789]-?\d{3,4}-?\d{4}$/;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  }
  return fallback;
};

const toRequest = (address: Address): AddressRequest => ({
  name: address.name.trim(),
  zonecode: address.zonecode.trim(),
  address: address.address.trim(),
  detail: address.detail.trim(),
  phone: address.phone.trim(),
  isDefault: address.isDefault,
});

const AddressPage: React.FC<Props> = ({ onBack }) => {
  const [list, setList] = useState<Address[]>([]);
  const [modal, setModal] = useState<Address | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showPostcode, setShowPostcode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const postcodeRef = useRef<HTMLDivElement>(null);

  // 저장/삭제/기본 배송지 변경 후 서버 상태를 다시 읽어 화면을 맞춘다.
  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setList(await getAddresses());
    } catch (err) {
      setError(getErrorMessage(err, '주소 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // 최초 진입 시 주소 목록을 읽고, 언마운트 이후 응답은 무시한다.
    const fetchInitialAddresses = async () => {
      try {
        const addresses = await getAddresses();
        if (!active) return;
        setList(addresses);
        setError('');
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err, '주소 목록을 불러오지 못했습니다.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchInitialAddresses();

    return () => {
      active = false;
    };
  }, []);

  const openAdd = () => {
    setIsNew(true);
    setModal({ ...EMPTY, id: Date.now(), isDefault: list.length === 0 });
    setModalError('');
  };
  const openEdit = (a: Address) => {
    setIsNew(false);
    setModal({ ...a });
    setModalError('');
  };
  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setModalError('');
    setShowPostcode(false);
  };

  // 카카오 우편번호 iframe 삽입
  useEffect(() => {
    if (!showPostcode || !postcodeRef.current) return;

    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.onload = () => {
      if (!postcodeRef.current) return;
      if (!window.daum?.Postcode) return;
      new window.daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          setModal(p => p && ({
            ...p,
            zonecode: data.zonecode,
            address: data.roadAddress || data.jibunAddress,
          }));
          setShowPostcode(false);
        },
        width: '100%',
        height: '100%',
      }).embed(postcodeRef.current);
    };
    if (window.daum?.Postcode) {
      script.onload?.(new Event('load'));
    } else {
      document.head.appendChild(script);
    }
  }, [showPostcode]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('주소를 삭제할까요?')) return;
    setSaving(true);
    setError('');
    try {
      await deleteAddressApi(id);
      await loadAddresses();
    } catch (err) {
      setError(getErrorMessage(err, '주소를 삭제하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    setSaving(true);
    setError('');
    try {
      await setDefaultAddress(id);
      await loadAddresses();
    } catch (err) {
      setError(getErrorMessage(err, '기본 배송지를 변경하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!modal) return;
    const request = toRequest(modal);
    // 서버 검증 전에 화면에서 먼저 필수 입력과 형식을 안내한다.
    if (!request.name || !request.zonecode || !request.address || !request.phone) {
      setModalError('이름, 주소, 전화번호를 모두 입력해주세요.');
      return;
    }
    if (!/^\d{5}$/.test(request.zonecode)) {
      setModalError('우편번호는 숫자 5자리여야 합니다.');
      return;
    }
    if (!PHONE_PATTERN.test(request.phone)) {
      setModalError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    setSaving(true);
    setModalError('');
    try {
      if (isNew) {
        await createAddress(request);
      } else {
        await updateAddress(modal.id, request);
      }
      setModal(null);
      setModalError('');
      setShowPostcode(false);
      await loadAddresses();
    } catch (err) {
      setModalError(getErrorMessage(err, '주소를 저장하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className={styles.title}>내 주소 관리</span>
        <div style={{width:32}}/>
      </div>

      <div className={styles.list}>
        {loading && (
          <div className={styles.empty}>
            <p className={styles.emptyText}>주소 목록을 불러오는 중...</p>
          </div>
        )}

        {!loading && error && (
          <div className={styles.empty}>
            <p className={styles.emptyText}>{error}</p>
            <button className={styles.csBtnOutline} onClick={() => void loadAddresses()}>다시 시도</button>
          </div>
        )}

        {!loading && !error && list.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyText}>등록된 주소가 없습니다</p>
            <p className={styles.emptySubText}>자주 쓰는 배송지를 추가해두세요</p>
          </div>
        )}

        {!loading && !error && list.map(a => (
          <div key={a.id} className={styles.addrItem}>
            <div className={styles.addrHeader}>
              <p className={styles.addrName}>📍 {a.name}</p>
              {a.isDefault && <span className={styles.defaultBadge}>기본 배송지</span>}
            </div>
            {a.zonecode && <p className={styles.addrZonecode}>[{a.zonecode}]</p>}
            <p className={styles.addrText}>{a.address}<br/>{a.detail}</p>
            <p className={styles.addrPhone}>{a.phone}</p>
            <div className={styles.addrBtns}>
              <button className={styles.addrBtn} onClick={() => openEdit(a)} disabled={saving}>수정</button>
              <button className={styles.addrBtn} onClick={() => void handleDelete(a.id)} disabled={saving}>삭제</button>
              {!a.isDefault && (
                <button className={styles.addrBtn} onClick={() => void handleSetDefault(a.id)} disabled={saving}>
                  기본 배송지 설정
                </button>
              )}
            </div>
          </div>
        ))}

        {!loading && !error && (
          <button className={styles.addBtn} onClick={openAdd} disabled={saving}>+ 새 주소 추가</button>
        )}
      </div>

      {modal && (
        <div className={modalStyles.overlay} onClick={closeModal}>
          <div className={modalStyles.modal} onClick={e => e.stopPropagation()}>
            <div className={modalStyles.modalHeader}>
              <h2 className={modalStyles.modalTitle}>{isNew ? '새 주소 추가' : '주소 수정'}</h2>
              <button className={modalStyles.closeBtn} onClick={closeModal} disabled={saving}>✕</button>
            </div>

            <div className={modalStyles.fields}>
              {showPostcode && (
                <div className={modalStyles.postcodeWrap}>
                  <div className={modalStyles.postcodeHeader}>
                    <span>주소 검색</span>
                    <button className={modalStyles.postcodeClose} onClick={() => setShowPostcode(false)}>✕ 닫기</button>
                  </div>
                  <div ref={postcodeRef} className={modalStyles.postcodeFrame} />
                </div>
              )}

              {modalError && <p className={modalStyles.errorText}>{modalError}</p>}

              <div className={modalStyles.field}>
                <label className={modalStyles.label}>이름 (예: 집, 회사)</label>
                <input
                  className={modalStyles.input}
                  placeholder="배송지 이름"
                  value={modal.name}
                  disabled={saving}
                  onChange={e => setModal(p => p && ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className={modalStyles.field}>
                <label className={modalStyles.label}>주소</label>
                <div className={modalStyles.addressSearchRow}>
                  <input
                    className={`${modalStyles.input} ${modalStyles.inputReadonly}`}
                    placeholder="아래 버튼으로 주소를 검색하세요"
                    value={modal.zonecode ? `[${modal.zonecode}] ${modal.address}` : modal.address}
                    readOnly
                    disabled={saving}
                    onClick={() => setShowPostcode(true)}
                  />
                  <button className={modalStyles.searchBtn} onClick={() => setShowPostcode(true)} disabled={saving}>
                    검색
                  </button>
                </div>
              </div>

              <div className={modalStyles.field}>
                <label className={modalStyles.label}>상세 주소</label>
                <input
                  className={modalStyles.input}
                  placeholder="동/호수, 층 등"
                  value={modal.detail}
                  disabled={saving}
                  onChange={e => setModal(p => p && ({ ...p, detail: e.target.value }))}
                />
              </div>

              <div className={modalStyles.field}>
                <label className={modalStyles.label}>전화번호</label>
                <input
                  className={modalStyles.input}
                  placeholder="010-0000-0000"
                  value={modal.phone}
                  disabled={saving}
                  onChange={e => setModal(p => p && ({ ...p, phone: e.target.value }))}
                />
              </div>

              <label className={modalStyles.checkRow}>
                <input
                  type="checkbox"
                  checked={modal.isDefault}
                  disabled={saving || list.length === 0}
                  onChange={e => setModal(p => p && ({ ...p, isDefault: e.target.checked }))}
                />
                <span>기본 배송지로 설정</span>
              </label>
            </div>

            <div className={modalStyles.actions}>
              <button className={modalStyles.cancelBtn} onClick={closeModal} disabled={saving}>취소</button>
              <button className={modalStyles.saveBtn} onClick={() => void handleSave()} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressPage;
