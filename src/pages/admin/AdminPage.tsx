import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  getAdminProducts,
  getAdminProduct,
  updateAdminProduct,
  updateAdminProductStatus,
  deleteAdminProduct,
  CONDITION_OPTIONS,
  type AdminProductStatus,
} from '../../api/adminProducts';
import DashboardPage from './DashboardPage';
import NoticePage from './NoticePage';
import BannerPage from './BannerPage';
import SettlementPage from './SettlementPage';
import WalletRequestPage from './WalletRequestPage';
import InquiryPage from './InquiryPage';
import InquiryProductPage from './InquiryProductPage';
import { getAdminInquiries } from '../../api/adminInquiries';
import { useT } from './i18n';
import SanctionPage from './SanctionPage';
import ChatLogPage from './ChatLogPage';
import MemberListPage from './MemberListPage';
import WithdrawnMemberPage from './WithdrawnMemberPage';
import AdminSettingsPage from './AdminSettingsPage';
import AdminLoginLogPage from './AdminLoginLogPage';
import AdminActionLogPage from './AdminActionLogPage';
import AuctionManagePage from './AuctionManagePage';
import type { IdleMinutes } from './adminSettingsOptions';
import TrackingModal from '../../components/TrackingModal';
import { useAdminDialog } from './useAdminDialog';
import { getAdminUiItem, getUserRole } from '../../utils/authStorage';
import styles from './AdminPage.module.css';

// ─── 관리자용 통합 상품 타입 ───────────────────────────────────────────
type TradeStatus = '경매예정' | '승인요청중' | '보완요청' | '낙찰' | '환수요청' | '반송중' | '환수완료' | '숨김';
type AuctionStatus = '경매중' | '낙찰' | '유찰' | '환수요청' | '반송중' | '환수완료' | '숨김';
type ProductStatus = TradeStatus | AuctionStatus;

interface AdminProduct {
  id: string;
  realId?: number;
  productNo: string;
  image: string;
  name: string;
  type: '중고거래' | '경매';
  seller: string;
  category: string;
  condition: string;
  price: number;
  status: ProductStatus;
  registeredAt: string;
  description: string;
  carrierCode: string | null;
  trackingNo: string | null;
  returnRequestReason: string | null;
  returnRequestedAt: string | null;
  reviewRevisionReason: string | null;
  reviewRevisionRequestedAt: string | null;
}

// ─── 사이드바 메뉴 구조 ─────────────────────────────────────────────────
type MenuKey =
  | '대시보드'
  | '상품 관리' | '상품 문의' | '경매 관리'
  | '제재 내역' | '채팅 로그'
  | '회원 목록' | '탈퇴 회원'
  | '공지사항' | '카테고리/배너' | '정산/수수료' | '지갑 요청' | '고객문의/FAQ'
  | '설정' | '접속 기록' | '변경 기록';

const IC = (p: React.SVGProps<SVGSVGElement>) => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" {...p} />
);

const SIDE_ICONS: Record<MenuKey, React.ReactNode> = {
  /* LayoutDashboard */
  '대시보드': <IC><rect x="3" y="3" width="7" height="10" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="17" width="7" height="4" rx="1.5" /></IC>,
  /* ShoppingBag */
  '상품 관리': <IC><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></IC>,
  /* MessageSquare (상품 문의) */
  '상품 문의': <IC><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></IC>,
  /* Gavel (경매 관리) */
  '경매 관리': <IC><path d="M14 14l6 6" /><path d="M4 4l4 4" /><path d="M9 4h5v2l2 2v1l-7 7-1-1v-2l-2-2V9l3-5z" /><path d="M5 19l4-4" /></IC>,
  /* ShieldX */
  '제재 내역': <IC><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="9.5" y1="9.5" x2="14.5" y2="14.5" /><line x1="14.5" y1="9.5" x2="9.5" y2="14.5" /></IC>,
  /* FileText */
  '채팅 로그': <IC><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></IC>,
  /* Users */
  '회원 목록': <IC><circle cx="9" cy="6" r="3.5" /><path d="M1.5 21v-2a5.5 5.5 0 0115 0v2" /><circle cx="18.5" cy="6.5" r="2.5" /><path d="M22.5 21v-1.5a4 4 0 00-3-3.86" /></IC>,
  /* UserMinus */
  '탈퇴 회원': <IC><circle cx="9" cy="7" r="3.5" /><path d="M1.5 21v-2a5.5 5.5 0 0111 0v2" /><line x1="16" y1="12" x2="22" y2="12" /></IC>,
  /* Megaphone */
  '공지사항': <IC><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 010 7.07" /><path d="M19.07 4.93a10 10 0 010 14.14" /></IC>,
  /* PanelLeft / Columns */
  '카테고리/배너': <IC><rect x="2" y="3" width="20" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="2" y1="9" x2="9" y2="9" /><line x1="2" y1="15" x2="9" y2="15" /></IC>,
  /* Receipt */
  '정산/수수료': <IC><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" /><line x1="8" y1="9.5" x2="16" y2="9.5" /><line x1="8" y1="13.5" x2="14" y2="13.5" /></IC>,
  /* Wallet */
  '지갑 요청': <IC><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 10h5v5h-5a2.5 2.5 0 010-5z" /><path d="M3 9h18" /></IC>,
  /* MessageCircleQuestion */
  '고객문의/FAQ': <IC><path d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path d="M9.5 9.5a3 3 0 115 2.5c-.5.5-1.5 1-1.5 2" /><circle cx="12" cy="17" r=".5" fill="currentColor" /></IC>,
  /* SlidersHorizontal */
  '설정': <IC><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="12" x2="3" y2="12" /><line x1="21" y1="18" x2="3" y2="18" /><circle cx="8" cy="6" r="2" fill="#fff" /><circle cx="16" cy="12" r="2" fill="#fff" /><circle cx="8" cy="18" r="2" fill="#fff" /></IC>,
  /* History (접속 기록) */
  '접속 기록': <IC><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><polyline points="3 3 3 8 8 8" /><polyline points="12 7 12 12 15 14" /></IC>,
  /* ClipboardList (변경 기록) */
  '변경 기록': <IC><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M6 4H5a2 2 0 0 0-2 2v16h18V6a2 2 0 0 0-2-2h-1" /><path d="M8 12h8" /><path d="M8 16h5" /></IC>,
};

// 사이드바 구조. menuKey 는 내부 state 식별자(한국어 고정)이고,
// 표시 label 은 모두 i18n 키로 들고 있어 언어 전환 시 화면 텍스트만 바뀐다.
const SIDE_SECTIONS: { sectionKey: string; items: { key: MenuKey; labelKey: string; adminOnly?: boolean }[] }[] = [
  {
    sectionKey: 'admin.section.overview',
    items: [{ key: '대시보드', labelKey: 'admin.menu.dashboard' }],
  },
  {
    sectionKey: 'admin.section.products',
    items: [
      { key: '상품 관리', labelKey: 'admin.menu.productManagement' },
      { key: '상품 문의', labelKey: 'admin.menu.productInquiries' },
    ],
  },
  {
    sectionKey: 'admin.section.auction',
    items: [
      { key: '경매 관리', labelKey: 'admin.menu.auctionManagement' },
    ],
  },
  {
    sectionKey: 'admin.section.reports',
    items: [
      { key: '제재 내역', labelKey: 'admin.menu.sanction' },
      { key: '채팅 로그', labelKey: 'admin.menu.chatLogs' },
    ],
  },
  {
    sectionKey: 'admin.section.members',
    items: [
      { key: '회원 목록', labelKey: 'admin.menu.memberList' },
      { key: '탈퇴 회원', labelKey: 'admin.menu.withdrawn' },
    ],
  },
  {
    sectionKey: 'admin.section.content',
    items: [
      { key: '공지사항', labelKey: 'admin.menu.notices' },
      { key: '카테고리/배너', labelKey: 'admin.menu.categories' },
    ],
  },
  {
    sectionKey: 'admin.section.operations',
    items: [
      { key: '정산/수수료', labelKey: 'admin.menu.settlements' },
      { key: '지갑 요청', labelKey: 'admin.menu.wallet' },
      { key: '고객문의/FAQ', labelKey: 'admin.menu.inquiriesFaq' },
    ],
  },
  {
    sectionKey: 'admin.section.system',
    items: [
      { key: '접속 기록', labelKey: 'admin.menu.loginLogs', adminOnly: true },
      { key: '변경 기록', labelKey: 'admin.menu.actionLogs', adminOnly: true },
      { key: '설정', labelKey: 'admin.menu.settings' },
    ],
  },
];

const CATEGORY_OPTIONS = ['전체', '디지털/가전', '패션/의류', '명품', '시계/주얼리', '신발', '스포츠/레저', '뷰티/미용', '게임/취미', '음향/악기', '한정판'];
const PRODUCT_STATUS_OPTIONS: ProductStatus[] = ['경매예정', '승인요청중', '보완요청', '경매중', '낙찰', '유찰', '환수요청', '반송중', '환수완료', '숨김'];
const MANAGE_STATUS_OPTIONS: ProductStatus[] = ['경매예정', '승인요청중', '보완요청', '경매중', '환수요청', '반송중', '환수완료', '숨김'];


// ─── AdminPage ─────────────────────────────────────────────────────────
interface Props {
  onLogout: () => void;
  onSwitchToNormal: () => void;
  idleMinutes: IdleMinutes;
  onChangeIdleMinutes: (v: IdleMinutes) => void;
}

const AdminPage: React.FC<Props> = ({ onLogout, onSwitchToNormal, idleMinutes, onChangeIdleMinutes }) => {
  const adminDialog = useAdminDialog();
  const t = useT();
  // ADMIN 전용 메뉴(접속 기록) 노출 판별. MANAGER 는 제외.
  const isAdminRole = getUserRole() === 'ADMIN';
  const [activeMenu, setActiveMenu] = useState<MenuKey>('대시보드');
  // 사이드바 "상품 문의" 배지용 미답변 건수. 관리자 로그인 직후/주기적으로 가볍게 갱신한다.
  const [pendingInquiryCount, setPendingInquiryCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const fetchPending = async () => {
      try {
        const list = await getAdminInquiries();
        if (!cancelled) setPendingInquiryCount(list.filter(i => !i.answer).length);
      } catch {
        // 실패 시 배지 미표시 — 본 화면 진입하면 어차피 정확한 수가 다시 계산됨
      }
    };
    fetchPending();
    // 답변 처리 후에도 자연스럽게 갱신되도록 60초마다 폴링한다.
    const id = window.setInterval(fetchPending, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 관리자 상품 목록 API 로드
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await getAdminProducts();
      setProducts(list.map(dto => ({
        id: String(dto.id),
        productNo: dto.productNo,
        image: dto.image ?? '',
        name: dto.name,
        type: dto.type,
        seller: dto.seller,
        category: dto.category,
        condition: dto.condition,
        price: dto.price,
        status: dto.status,
        registeredAt: dto.registeredAt,
        description: dto.description ?? '',
        carrierCode: dto.carrierCode,
        trackingNo: dto.trackingNo,
        returnRequestReason: dto.returnRequestReason,
        returnRequestedAt: dto.returnRequestedAt,
        reviewRevisionReason: dto.reviewRevisionReason,
        reviewRevisionRequestedAt: dto.reviewRevisionRequestedAt,
      })));
    } catch {
      setLoadError('상품 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 1회 페치, 내부에서 로딩/결과 setState는 정상 데이터 페칭 패턴
  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ─── 로그인 시각 ──────────────────────────────────────────────────
  const loginAt = (() => {
    const raw = getAdminUiItem('moida_admin_login_at');
    if (!raw) return '';
    const d = new Date(raw);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  })();

  // 상품관리 필터 상태
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [statFilter, setStatFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // 안내 알림 모달
  const [alertModal, setAlertModal] = useState<string | null>(null);

  // 삭제 확인 모달
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);

  // 승인/취소 확인 모달
  // approve  : PENDING(승인요청중) → SCHEDULED(경매예정)  — 검토 통과
  // start    : SCHEDULED(경매예정) → LIVE(경매중)        — 경매 시작
  // cancel   : LIVE(경매중)        → SCHEDULED(경매예정) — 진행 경매 취소
  // ship     : RETURN_REQUESTED    → RETURN_SHIPPING    — 반송 시작
  // complete : RETURN_SHIPPING     → RETURN_COMPLETED   — 환수 완료
  const [approveTarget, setApproveTarget] = useState<{ product: AdminProduct; action: 'approve' | 'start' | 'cancel' | 'ship' | 'complete' } | null>(null);

  const handleApproveConfirm = async () => {
    if (!approveTarget) return;
    const newStatus: ProductStatus =
      approveTarget.action === 'start' ? '경매중'
      : approveTarget.action === 'ship' ? '반송중'
      : approveTarget.action === 'complete' ? '환수완료'
      : '경매예정';
    handleStatusChange(approveTarget.product.id, newStatus);
    setApproveTarget(null);
  };

  // 송장번호 클릭 시 띄우는 배송조회 모달. 클릭한 행의 carrierCode/trackingNo 만 들고 있으면 충분.
  const [trackingTarget, setTrackingTarget] = useState<{ carrierCode: string | null; trackingNo: string | null } | null>(null);

  // 상품 상세 모달
  const [detailProduct, setDetailProduct] = useState<AdminProduct | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editForm, setEditForm] = useState<Partial<AdminProduct>>({});

  // 상세 모달 이미지 갤러리. 이미지는 base64라 무거우므로 목록이 아닌 상세 API로 따로 불러온다.
  const [detailImages, setDetailImages] = useState<string[]>([]);
  const [detailImageIndex, setDetailImageIndex] = useState(0);

  // 모달이 열리면 해당 상품의 전체 이미지를 조회한다.
  /* eslint-disable react-hooks/set-state-in-effect -- 모달 열림 상태에 동기화된 데이터 페치(정상 패턴) */
  useEffect(() => {
    if (!detailProduct) { setDetailImages([]); setDetailImageIndex(0); return; }
    let cancelled = false;
    // 우선 목록에서 받은 대표 이미지를 보여주고, 상세 응답이 오면 전체로 교체한다.
    setDetailImages(detailProduct.image ? [detailProduct.image] : []);
    setDetailImageIndex(0);
    getAdminProduct(Number(detailProduct.id))
      .then(detail => {
        if (cancelled) return;
        const imgs = detail.images.length > 0
          ? detail.images
          : (detail.image ? [detail.image] : []);
        setDetailImages(imgs);
        setDetailImageIndex(0);
      })
      .catch(() => { /* 실패 시 대표 이미지만 유지 */ });
    return () => { cancelled = true; };
  }, [detailProduct]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 입찰 이력 모달
  const [bidHistoryTarget, setBidHistoryTarget] = useState<AdminProduct | null>(null);

  const BIDDERS = ['운동화마니아', '코딩러버', '사진작가K', '기타리스트', '워치컬렉터', '뷰티러버', '패션킹', '게이머Z', '오디오파일', '홈퍼니싱'];
  const getMockBids = (product: AdminProduct) => {
    const seed = product.price;
    const count = 3 + (seed % 5);
    return Array.from({ length: count }, (_, i) => ({
      rank: i + 1,
      bidder: BIDDERS[(seed + i * 3) % BIDDERS.length],
      amount: product.price - i * Math.round(product.price * 0.03),
      time: `2026.05.${String(3 - Math.floor(i / 3)).padStart(2, '0')} ${String(14 - i).padStart(2, '0')}:${String((seed + i * 7) % 60).padStart(2, '0')}`,
    }));
  };

  // ─── 배지 카운트 (사이드바용) ──────────────────────────────────────
  const getBadge = (key: MenuKey): number | null => {
    if (key === '상품 문의') return pendingInquiryCount > 0 ? pendingInquiryCount : null;
    return null;
  };

  // ─── 검색/드롭다운 필터만 적용 (statFilter 제외) ────────────────
  const baseFiltered = useMemo(() => {
    return products.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.seller.toLowerCase().includes(search.toLowerCase()) && !p.productNo.includes(search)) return false;
      if (categoryFilter !== '전체' && p.category !== categoryFilter) return false;
      if (statusFilter !== '전체' && p.status !== statusFilter) return false;
      return true;
    });
  }, [products, search, categoryFilter, statusFilter]);

  // ─── 상품 통계 (검색 결과 기준) ──────────────────────────────────
  const stats = useMemo(() => ({
    total: baseFiltered.length,
    trade: baseFiltered.filter(p => p.type === '중고거래').length,
    auction: baseFiltered.filter(p => p.type === '경매').length,
    selling: baseFiltered.filter(p => p.status === '경매예정').length,
    approving: baseFiltered.filter(p => p.status === '승인요청중').length,
    revisionRequested: baseFiltered.filter(p => p.status === '보완요청').length,
    inBid: baseFiltered.filter(p => p.status === '경매중').length,
    won: baseFiltered.filter(p => p.status === '낙찰').length,
    failed: baseFiltered.filter(p => p.status === '유찰').length,
    returnRequested: baseFiltered.filter(p => p.status === '환수요청').length,
    returnShipping: baseFiltered.filter(p => p.status === '반송중').length,
    hidden: baseFiltered.filter(p => p.status === '숨김').length,
  }), [baseFiltered]);

  // ─── 필터링된 상품 목록 (statFilter 추가 적용) ───────────────────
  const filtered = useMemo(() => {
    return baseFiltered.filter(p => {
      if (statFilter && p.status !== statFilter) return false;
      return true;
    });
  }, [baseFiltered, statFilter]);

  const handleStatusChange = async (id: string, newStatus: AdminProduct['status']) => {
    const reason = await adminDialog.prompt({
      title: `${newStatus} 처리 사유`,
      message: `${newStatus} 처리 사유를 입력하세요.`,
      confirmLabel: '변경하기',
      variant: newStatus === '숨김' ? 'danger' : 'default',
    });
    if (!reason) return;
    const snapshot = products;
    // 낙관적 업데이트 후 실패 시 롤백
    setProducts(cur => cur.map(p => p.id === id ? { ...p, status: newStatus } : p));
    try {
      await updateAdminProductStatus(Number(id), newStatus as AdminProductStatus, reason);
    } catch {
      setProducts(snapshot);
      setAlertModal('상태 변경에 실패했습니다.\n잠시 후 다시 시도해주세요.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const reason = await adminDialog.prompt({
      title: '상품 삭제 사유',
      message: '상품 삭제 사유를 입력하세요.',
      confirmLabel: '삭제하기',
      variant: 'danger',
    });
    if (!reason) return;
    try {
      await deleteAdminProduct(Number(target.id), reason);
      setProducts(prev => prev.filter(p => p.id !== target.id));
    } catch {
      setAlertModal('상품 삭제에 실패했습니다.\n잠시 후 다시 시도해주세요.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleStatClick = (key: string) => {
    setStatFilter(prev => prev === key ? null : key);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ─── 상품관리 렌더 ───────────────────────────────────────────────
  const renderProducts = () => (
    <>
      <div className={styles.pageTitle}>{t('admin.products.title')}</div>
      <div className={styles.pageSubtitle}>{t('admin.products.subtitle')}</div>

      <div className={styles.statsRow}>
        {[
          { key: null, labelKey: 'admin.products.stats.total', value: stats.total },
          { key: '경매예정', labelKey: 'admin.products.stats.scheduled', value: stats.selling },
          { key: '승인요청중', labelKey: 'admin.products.stats.pending', value: stats.approving },
          { key: '보완요청', label: '보완요청', value: stats.revisionRequested },
          { key: '경매중', labelKey: 'admin.products.stats.live', value: stats.inBid },
          { key: '환수요청', label: '환수요청', value: stats.returnRequested },
          { key: '반송중', label: '반송중', value: stats.returnShipping },
          { key: '숨김', labelKey: 'admin.products.stats.hidden', value: stats.hidden },
        ].map(s => (
          <div
            key={'labelKey' in s ? s.labelKey : s.label}
            className={`${styles.statCard} ${statFilter === s.key ? styles.statCardActive : ''}`}
            onClick={() => {
              if (s.key === null) {
                setStatFilter(null);
              } else {
                handleStatClick(s.key);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.statLabel}>{'label' in s ? s.label : t(s.labelKey)}</div>
            <div className={styles.statValue}>{s.value.toLocaleString()}<span className={styles.statUnit}>{t('admin.products.unit')}</span></div>
          </div>
        ))}
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <input
            className={styles.searchInput}
            placeholder={t('admin.products.search.placeholder')}
            value={search}
            onChange={e => { setSearch(e.target.value); setStatFilter(null); setCurrentPage(1); }}
          />
        </div>
        <select className={styles.filterSelect} value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setStatFilter(null); setCurrentPage(1); }}>
          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c === '전체' ? t('admin.products.filter.all') : c}</option>)}
        </select>
        <select className={styles.filterSelect} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setStatFilter(null); setCurrentPage(1); }}>
          {['전체', ...PRODUCT_STATUS_OPTIONS].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⏳</div>
            <div className={styles.emptyText}>{t('admin.products.loading')}</div>
          </div>
        ) : loadError ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>⚠️</div>
            <div className={styles.emptyText}>{t('admin.products.loadError')}</div>
            <button
              onClick={() => loadProducts()}
              style={{ marginTop: 12, padding: '6px 16px', borderRadius: 6, border: '1px solid #E0E0E0', background: '#fff', cursor: 'pointer', fontSize: 13 }}
            >{t('admin.products.retry')}</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📦</div>
            <div className={styles.emptyText}>{t('admin.products.empty')}</div>
          </div>
        ) : (
          <table className={styles.table} style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 100 }} />
              <col style={{ width: 240 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 100 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>{t('admin.products.col.no')}</th>
                <th style={{ textAlign: 'center' }}>{t('admin.products.col.product')}</th>
                <th>{t('admin.products.col.seller')}</th>
                <th>{t('admin.products.col.price')}</th>
                <th>{t('admin.products.col.registeredAt')}</th>
                <th>{t('admin.products.col.tracking')}</th>
                <th>{t('admin.products.col.manage')}</th>
                <th>{t('admin.products.col.approve')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => (
                <tr key={p.id}>
                  <td style={{ fontSize: 12, color: '#8B8FA8', fontFamily: 'monospace', textAlign: 'center' }}>{p.productNo}</td>
                  <td style={{ textAlign: 'left' }}>
                    <div className={styles.productCell}>
                      <img src={p.image} alt={p.name} className={styles.productThumb} />
                      <div>
                        <div className={styles.productName} style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setDetailProduct(p)}>{p.name}</div>
                        <div className={styles.productCategory}>{p.category}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.seller}</td>
                  <td>{p.price.toLocaleString()}</td>
                  <td>{p.registeredAt}</td>
                  <td>
                    {p.trackingNo ? (
                      <button
                        type="button"
                        onClick={() => setTrackingTarget({ carrierCode: p.carrierCode, trackingNo: p.trackingNo })}
                        style={{
                          background: 'transparent', border: 'none', padding: 0,
                          color: '#1E64FF', textDecoration: 'underline', cursor: 'pointer',
                          fontFamily: 'monospace', fontSize: 12,
                        }}
                        title="배송 조회"
                      >
                        {p.trackingNo}
                      </button>
                    ) : (
                      <span style={{ color: '#B0B3C0', fontSize: 12 }}>{t('admin.products.tracking.empty')}</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionCell}>
                      <select
                        className={styles.statusSelect}
                        value={p.status}
                        onChange={e => {
                          if (e.target.value === '경매중') {
                            setAlertModal('경매중 변경은\n승인 버튼을 통해서만 가능합니다.');
                            return;
                          }
                          handleStatusChange(p.id, e.target.value as ProductStatus);
                        }}
                      >
                        <>
                          {MANAGE_STATUS_OPTIONS.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </>
                      </select>
                    </div>
                  </td>
                  <td>
                    {p.status === '승인요청중' && (
                      <button
                        className={styles.approveBtn}
                        onClick={() => setApproveTarget({ product: p, action: 'approve' })}
                      >
                        승인
                      </button>
                    )}
                    {p.status === '경매예정' && (
                      <button
                        className={styles.startBtn}
                        onClick={() => setApproveTarget({ product: p, action: 'start' })}
                      >
                        승인
                      </button>
                    )}
                    {p.status === '경매중' && (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setApproveTarget({ product: p, action: 'cancel' })}
                      >
                        취소
                      </button>
                    )}
                    {p.status === '환수요청' && (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setApproveTarget({ product: p, action: 'ship' })}
                      >
                        반송처리
                      </button>
                    )}
                    {p.status === '반송중' && (
                      <button
                        className={styles.approveBtn}
                        onClick={() => setApproveTarget({ product: p, action: 'complete' })}
                      >
                        완료
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 20 }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #E0E0E0', background: currentPage === 1 ? '#F5F5F5' : '#fff', color: currentPage === 1 ? '#ccc' : '#333', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: 13 }}
          >{t('admin.common.prev')}</button>
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
          >{t('admin.common.next')}</button>
        </div>
      )}

      {/* 송장번호 클릭 시 배송 조회 모달 — conditional mount 로 매번 fresh state 로 시작. */}
      {trackingTarget && (
        <TrackingModal
          carrierCode={trackingTarget.carrierCode}
          trackingNo={trackingTarget.trackingNo}
          onClose={() => setTrackingTarget(null)}
        />
      )}
    </>
  );

  // ─── 메뉴별 컨텐츠 렌더 ─────────────────────────────────────────
  const renderContent = () => {
    switch (activeMenu) {
      case '대시보드': return <DashboardPage totalProducts={products.length} />;
      case '상품 관리': return renderProducts();
      case '상품 문의': return <InquiryProductPage />;
      case '경매 관리': return <AuctionManagePage />;
      case '제재 내역': return <SanctionPage />;
      case '채팅 로그': return <ChatLogPage />;
      case '회원 목록': return <MemberListPage />;
      case '탈퇴 회원': return <WithdrawnMemberPage />;
      case '공지사항': return <NoticePage />;
      case '카테고리/배너': return <BannerPage />;
      case '정산/수수료': return <SettlementPage />;
      case '지갑 요청': return <WalletRequestPage />;
      case '고객문의/FAQ': return <InquiryPage />;
      case '설정': return (
        <AdminSettingsPage
          idleMinutes={idleMinutes}
          onChangeIdleMinutes={onChangeIdleMinutes}
        />
      );
      case '접속 기록': return isAdminRole ? <AdminLoginLogPage /> : null;
      case '변경 기록': return isAdminRole ? <AdminActionLogPage /> : null;
      default: return null;
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
      {/* 상단 헤더 */}
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={styles.headerLogo}>MO<span>IDA</span></span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.headerAdmin}>{t('admin.header.loggedInAs')}</span>
          <button className={styles.normalBtn} onClick={onSwitchToNormal} title={t('admin.header.gotoNormal')} aria-label={t('admin.header.gotoNormal')}>
            <svg className={styles.normalIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 11.5 12 4l9 7.5" />
              <path d="M5.5 10.5V20h13v-9.5" />
              <path d="M9.5 20v-5.5h5V20" />
            </svg>
          </button>
          <button className={styles.logoutBtn} onClick={onLogout}>{t('admin.header.logout')}</button>
        </div>
      </header>

      <div className={styles.body}>
        {/* 사이드바 */}
        <nav className={styles.sidebar}>
          <div className={styles.sidebarMenu}>
            {SIDE_SECTIONS.map(section => {
              // adminOnly 항목은 ADMIN 에게만 노출. 필터 후 비면 섹션 자체를 숨긴다.
              const visibleItems = section.items.filter(m => !m.adminOnly || isAdminRole);
              if (visibleItems.length === 0) return null;
              return (
              <div key={section.sectionKey}>
                <div className={styles.sideSection}>{t(section.sectionKey)}</div>
                {visibleItems.map(m => {
                  const badge = getBadge(m.key);
                  return (
                    <button
                      key={m.key}
                      className={`${styles.sideItem} ${activeMenu === m.key ? styles.sideItemActive : ''}`}
                      onClick={() => setActiveMenu(m.key)}
                    >
                      <span className={styles.sideIcon}>{SIDE_ICONS[m.key]}</span>
                      {t(m.labelKey)}
                      {badge !== null && badge > 0 && (
                        <span className={styles.sideBadge}>{badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              );
            })}
          </div>
          <div className={styles.sidebarFooter}>
            <div className={styles.adminStatus}>
              <span className={styles.adminStatusLabel}>{t('admin.sidebar.access')}</span>
              <span className={styles.headerClock}>{loginAt || '-'}</span>
            </div>
          </div>
        </nav>

        {/* 메인 컨텐츠 */}
        <main className={styles.main}>
          {renderContent()}
        </main>
      </div>

      {/* 상품 상세 모달 */}
      {detailProduct && (
        <div className={styles.detailOverlay} onClick={() => { setDetailProduct(null); setIsEditingDetail(false); }}>
          <div className={styles.detailSheet} onClick={e => e.stopPropagation()}>
            {/* 헤더 */}
            <div className={styles.detailHeader}>
              <span className={styles.detailHeaderTitle}>{isEditingDetail ? '상품 수정' : '상품 상세'}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isEditingDetail ? (
                  <>
                    <button className={styles.detailEditSaveBtn} onClick={async () => {
                      const id = Number(detailProduct.id);
                      try {
                        const payload: Record<string, unknown> = {};
                        if (editForm.name !== undefined && editForm.name !== detailProduct.name) payload.name = editForm.name;
                        if (editForm.description !== undefined && editForm.description !== detailProduct.description) payload.description = editForm.description;
                        if (editForm.category !== undefined && editForm.category !== detailProduct.category) payload.category = editForm.category;
                        if (editForm.condition !== undefined && editForm.condition !== detailProduct.condition) payload.condition = editForm.condition;
                        if (editForm.price !== undefined && editForm.price !== detailProduct.price) payload.price = editForm.price;
                        if (Object.keys(payload).length > 0) {
                          await updateAdminProduct(id, payload);
                        }
                        if (editForm.status && editForm.status !== detailProduct.status) {
                          const reason = await adminDialog.prompt({
                            title: `${editForm.status} 처리 사유`,
                            message: `${editForm.status} 처리 사유를 입력하세요.`,
                            confirmLabel: '변경하기',
                            variant: editForm.status === '숨김' ? 'danger' : 'default',
                          });
                          if (!reason) return;
                          await updateAdminProductStatus(id, editForm.status as AdminProductStatus, reason);
                        }
                      } catch {
                        setAlertModal('상품 수정에 실패했습니다.\n잠시 후 다시 시도해주세요.');
                        return;
                      }
                      setProducts(prev => prev.map(p => p.id === detailProduct.id ? { ...p, ...editForm } : p));
                      setDetailProduct(prev => prev ? { ...prev, ...editForm } : null);
                      setIsEditingDetail(false);
                    }}>저장</button>
                    <button className={styles.detailEditCancelBtn} onClick={() => setIsEditingDetail(false)}>취소</button>
                  </>
                ) : (
                  <button className={styles.detailEditBtn} onClick={() => { setEditForm({ name: detailProduct.name, price: detailProduct.price, category: detailProduct.category, condition: detailProduct.condition, status: detailProduct.status, description: detailProduct.description }); setIsEditingDetail(true); }}>
                    수정
                  </button>
                )}
                <button className={styles.detailCloseBtn} onClick={() => { setDetailProduct(null); setIsEditingDetail(false); }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className={styles.detailScroll}>
              {/* 이미지 갤러리 (등록된 모든 이미지) */}
              <div style={{ position: 'relative' }}>
                <img
                  src={detailImages[detailImageIndex] ?? detailProduct.image}
                  alt={detailProduct.name}
                  className={styles.detailImg}
                />
                {detailImages.length > 1 && (
                  <span style={{ position: 'absolute', right: 12, bottom: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, padding: '3px 8px', borderRadius: 12 }}>
                    {detailImageIndex + 1} / {detailImages.length}
                  </span>
                )}
              </div>
              {detailImages.length > 1 && (
                <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0', overflowX: 'auto' }}>
                  {detailImages.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`${detailProduct.name} ${i + 1}`}
                      onClick={() => setDetailImageIndex(i)}
                      style={{
                        width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0, cursor: 'pointer',
                        border: i === detailImageIndex ? '2px solid #E24B4A' : '2px solid transparent',
                        opacity: i === detailImageIndex ? 1 : 0.6,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* 판매자 */}
              {/* 판매자 */}
              <div className={styles.detailSection}>
                <div className={styles.detailSellerRow}>
                  <div className={styles.detailSellerAvatar}>😊</div>
                  <div className={styles.detailSellerInfo}>
                    <p className={styles.detailSellerName}>{detailProduct.seller}</p>
                    <div className={styles.detailSellerMeta}>
                      <span className={styles.detailSellerSub}>🗓 {detailProduct.registeredAt}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.detailDivider} />

              {/* 상품 정보 */}
              <div className={styles.detailSection}>
                <div className={styles.detailTagRow}>
                  <span className={styles.detailCategoryTag}>{editForm.category ?? detailProduct.category}</span>
                </div>
              </div>

              <div className={styles.detailDivider} />

              {/* 상품 설명 */}
              <div className={styles.detailSection}>
                <p className={styles.detailSectionTitle}>상품 설명</p>
                {isEditingDetail ? (
                  <textarea
                    className={styles.detailEditInput}
                    style={{ width: '100%', minHeight: 100, resize: 'vertical', lineHeight: 1.6 }}
                    value={editForm.description ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="상품 설명"
                  />
                ) : (
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {detailProduct.description?.trim() ? detailProduct.description : '등록된 설명이 없습니다.'}
                  </p>
                )}
              </div>

              <div className={styles.detailDivider}/>

              {/* 거래 정보 */}
              <div className={styles.detailSection}>
                <p className={styles.detailSectionTitle}>거래 정보</p>
                <div className={styles.detailInfoGrid}>
                  <div className={styles.detailInfoItem}>
                    <span className={styles.detailInfoLabel}>카테고리</span>
                    {isEditingDetail ? (
                      <select className={styles.detailEditSelect} value={editForm.category ?? ''} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                        {CATEGORY_OPTIONS.filter(c => c !== '전체').map(c => <option key={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span className={styles.detailInfoValue}>{detailProduct.category}</span>
                    )}
                  </div>
                  <div className={styles.detailInfoItem}>
                    <span className={styles.detailInfoLabel}>판매자</span>
                    <span className={styles.detailInfoValue}>{detailProduct.seller}</span>
                  </div>
                  <div className={styles.detailInfoItem}>
                    <span className={styles.detailInfoLabel}>가격</span>
                    {isEditingDetail ? (
                      <input className={styles.detailEditSelect} type="number" value={editForm.price ?? ''} onChange={e => setEditForm(f => ({ ...f, price: Number(e.target.value) }))} />
                    ) : (
                      <span className={styles.detailInfoValue}> {detailProduct.price.toLocaleString()}</span>
                    )}
                  </div>
                  <div className={styles.detailInfoItem}>
                    <span className={styles.detailInfoLabel}>제품상태</span>
                    {isEditingDetail ? (
                      <select className={styles.detailEditSelect} value={editForm.condition ?? ''} onChange={e => setEditForm(f => ({ ...f, condition: e.target.value }))}>
                        {CONDITION_OPTIONS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    ) : (
                      <span className={styles.detailInfoValue}>{detailProduct.condition}</span>
                    )}
                  </div>
                  <div className={styles.detailInfoItem}>
                    <span className={styles.detailInfoLabel}>상태</span>
                    {isEditingDetail ? (
                      <select className={styles.detailEditSelect} value={editForm.status ?? ''} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as ProductStatus }))}>
                        {MANAGE_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={styles.detailInfoValue}>{detailProduct.status}</span>
                    )}
                  </div>
                  <div className={styles.detailInfoItem}>
                    <span className={styles.detailInfoLabel}>등록일</span>
                    <span className={styles.detailInfoValue}>{detailProduct.registeredAt}</span>
                  </div>
                </div>

                {(detailProduct.returnRequestReason || detailProduct.returnRequestedAt || detailProduct.status === '환수요청' || detailProduct.status === '반송중' || detailProduct.status === '환수완료') && (
                  <>
                    <div className={styles.detailDivider}/>
                    <p className={styles.detailSectionTitle}>환수 요청 정보</p>
                    <div className={styles.detailInfoGrid}>
                      <div className={styles.detailInfoItem}>
                        <span className={styles.detailInfoLabel}>요청일</span>
                        <span className={styles.detailInfoValue}>{detailProduct.returnRequestedAt ?? '-'}</span>
                      </div>
                      <div className={styles.detailInfoItem}>
                        <span className={styles.detailInfoLabel}>진행 상태</span>
                        <span className={styles.detailInfoValue}>{detailProduct.status}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <span className={styles.detailInfoLabel}>요청 사유</span>
                      <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
                        {detailProduct.returnRequestReason?.trim() || '-'}
                      </p>
                    </div>
                  </>
                )}

                {(detailProduct.reviewRevisionReason || detailProduct.reviewRevisionRequestedAt || detailProduct.status === '보완요청') && (
                  <>
                    <div className={styles.detailDivider}/>
                    <p className={styles.detailSectionTitle}>보완 요청 정보</p>
                    <div className={styles.detailInfoGrid}>
                      <div className={styles.detailInfoItem}>
                        <span className={styles.detailInfoLabel}>요청일</span>
                        <span className={styles.detailInfoValue}>{detailProduct.reviewRevisionRequestedAt ?? '-'}</span>
                      </div>
                      <div className={styles.detailInfoItem}>
                        <span className={styles.detailInfoLabel}>진행 상태</span>
                        <span className={styles.detailInfoValue}>{detailProduct.status}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <span className={styles.detailInfoLabel}>보완 사유</span>
                      <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
                        {detailProduct.reviewRevisionReason?.trim() || '-'}
                      </p>
                    </div>
                  </>
                )}

                <div style={{ height: 32 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 입찰 이력 모달 */}
        {bidHistoryTarget && (
          <div className={styles.detailOverlay} onClick={() => setBidHistoryTarget(null)}>
            <div className={styles.detailSheet} onClick={e => e.stopPropagation()}>
              <div className={styles.detailHeader}>
                <span className={styles.detailHeaderTitle}>입찰 이력</span>
                <button className={styles.detailCloseBtn} onClick={() => setBidHistoryTarget(null)}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className={styles.detailScroll}>
                <div className={styles.detailSection}>
                  <p className={styles.detailName} style={{ fontSize: 15 }}>{bidHistoryTarget.name}</p>
                  <p className={styles.detailMeta}>경매 시작가 {bidHistoryTarget.price.toLocaleString()}</p>
                </div>
                <div className={styles.detailDivider} />
                <div className={styles.detailSection}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E8E8E8' }}>
                        <th style={{ padding: '8px 6px', textAlign: 'center', color: '#8B8FA8', fontWeight: 600, width: 40 }}>순위</th>
                        <th style={{ padding: '8px 6px', textAlign: 'left', color: '#8B8FA8', fontWeight: 600 }}>입찰자</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right', color: '#8B8FA8', fontWeight: 600 }}>입찰가</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right', color: '#8B8FA8', fontWeight: 600 }}>입찰 시각</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getMockBids(bidHistoryTarget).map(bid => (
                        <tr key={bid.rank} style={{ borderBottom: '1px solid #F3F3F3' }}>
                          <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, color: bid.rank === 1 ? '#E24B4A' : '#8B8FA8' }}>
                            {bid.rank === 1 ? '🥇' : bid.rank}
                          </td>
                          <td style={{ padding: '10px 6px', fontWeight: bid.rank === 1 ? 600 : 400 }}>{bid.bidder}</td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: bid.rank === 1 ? '#E24B4A' : '#333' }}>
                            {bid.amount.toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 6px', textAlign: 'right', color: '#8B8FA8' }}>{bid.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ height: 24 }} />
              </div>
            </div>
          </div>
        )}

        {/* 안내 알림 모달 */}
        {alertModal && (
          <div className={styles.modalOverlay} onClick={() => setAlertModal(null)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalIcon}>⚠️</div>
              <div className={styles.modalTitle}>변경 불가</div>
              <div className={styles.modalDesc}>
                {alertModal.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
              </div>
              <div className={styles.modalBtns}>
                <button className={styles.modalApproveBtn} onClick={() => setAlertModal(null)}>확인</button>
              </div>
            </div>
          </div>
        )}

      {/* 승인/취소 확인 모달 */}
      {approveTarget && (() => {
        const isCancel = approveTarget.action === 'cancel';
        const isReturnAction = approveTarget.action === 'ship' || approveTarget.action === 'complete';
        const icon = isCancel ? '⛔' : isReturnAction ? '↩' : '✅';
        const title = isCancel ? '경매를 취소하시겠어요?'
          : approveTarget.action === 'ship' ? '반송 처리하시겠어요?'
          : approveTarget.action === 'complete' ? '환수 완료 처리할까요?'
          : '경매를 승인하시겠어요?';
        const desc = approveTarget.action === 'approve'
          ? '승인 시 상태가 경매예정으로 변경됩니다.'
          : approveTarget.action === 'start'
            ? '승인 시 상태가 경매중으로 변경됩니다.'
            : approveTarget.action === 'ship'
              ? '처리 시 상태가 반송중으로 변경됩니다.'
              : approveTarget.action === 'complete'
                ? '처리 시 상태가 환수완료로 변경됩니다.'
                : '취소 시 상태가 경매예정으로 되돌아갑니다.';
        const confirmLabel = isCancel ? '취소하기'
          : approveTarget.action === 'ship' ? '반송처리'
          : approveTarget.action === 'complete' ? '완료처리'
          : '승인하기';
        return (
          <div className={styles.modalOverlay} onClick={() => setApproveTarget(null)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalIcon}>{icon}</div>
              <div className={styles.modalTitle}>{title}</div>
              <div className={styles.modalDesc}>
                '{approveTarget.product.name}'<br />
                {desc}
              </div>
              <div className={styles.modalBtns}>
                <button className={styles.modalCancelBtn} onClick={() => setApproveTarget(null)}>닫기</button>
                <button
                  className={isCancel ? styles.modalDeleteBtn : styles.modalApproveBtn}
                  onClick={handleApproveConfirm}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

        {deleteTarget && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalIcon}>🗑️</div>
              <div className={styles.modalTitle}>상품을 삭제하시겠어요?</div>
              <div className={styles.modalDesc}>
                '{deleteTarget.name}'<br />
                삭제된 상품은 복구할 수 없습니다.
              </div>
              <div className={styles.modalBtns}>
                <button className={styles.modalCancelBtn} onClick={() => setDeleteTarget(null)}>취소</button>
                <button className={styles.modalDeleteBtn} onClick={handleDelete}>삭제하기</button>
              </div>
            </div>
          </div>
        )}
        {adminDialog.element}
      </div>
    </div>
  );
};

export default AdminPage;
