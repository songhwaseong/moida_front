/**
 * 관리자 페이지 전용 경량 i18n.
 *
 * 의도적으로 외부 라이브러리(react-i18next 등) 없이 React Context + 사전(객체)만 사용한다.
 * 메뉴/제목/버튼 라벨 등 정적 UI 텍스트만 다루며, 사용자 데이터(상품명/카테고리/이메일 등)는 번역하지 않는다.
 *
 * 사용법:
 *   <AdminI18nProvider> ... </AdminI18nProvider>  // AdminPage 루트에 한 번
 *   const t = useT(); t('admin.products.title');
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AdminLang = 'ko' | 'en';

const STORAGE_KEY = 'moida_admin_lang';

/** 한국어 사전. key 는 변경하지 말 것 — 영어 사전도 같은 key 셋을 유지해야 한다. */
const KO: Record<string, string> = {
  // ── 사이드바 섹션
  'admin.section.overview': '대시보드',
  'admin.section.products': '상품',
  'admin.section.auction': '경매',
  'admin.section.reports': '신고/제재',
  'admin.section.members': '회원',
  'admin.section.content': '컨텐츠',
  'admin.section.operations': '운영',
  'admin.section.system': '시스템',

  // ── 사이드바 메뉴
  'admin.menu.dashboard': '대시보드',
  'admin.menu.productManagement': '상품 관리',
  'admin.menu.productInquiries': '상품 문의',
  'admin.menu.auctionManagement': '경매 관리',
  'admin.menu.falseBids': '허위입찰',
  'admin.menu.sanction': '제재 내역',
  'admin.menu.chatLogs': '채팅 로그',
  'admin.menu.memberList': '회원 목록',
  'admin.menu.withdrawn': '탈퇴 회원',
  'admin.menu.notices': '공지사항',
  'admin.menu.categories': '카테고리',
  'admin.menu.settlements': '정산/수수료',
  'admin.menu.wallet': '지갑 요청',
  'admin.menu.inquiriesFaq': '고객문의/FAQ',
  'admin.menu.settings': '설정',

  // ── 공통 헤더
  'admin.header.loggedInAs': '관리자로 로그인 중',
  'admin.header.gotoNormal': '일반 화면',
  'admin.header.logout': '로그아웃',
  'admin.sidebar.access': '접속',

  // ── 상품 관리 페이지
  'admin.products.title': '상품 관리',
  'admin.products.subtitle': '전체 상품을 조회하고 상태를 관리합니다.',
  'admin.products.stats.total': '전체 상품',
  'admin.products.stats.scheduled': '경매예정',
  'admin.products.stats.pending': '승인요청',
  'admin.products.stats.live': '경매중',
  'admin.products.stats.hidden': '숨김',
  'admin.products.unit': '건',
  'admin.products.search.placeholder': '상품명, 상품번호 또는 판매자 검색',
  'admin.products.filter.all': '전체',
  'admin.products.col.no': '상품번호',
  'admin.products.col.product': '상품',
  'admin.products.col.seller': '판매자',
  'admin.products.col.price': '가격',
  'admin.products.col.registeredAt': '등록일',
  'admin.products.col.tracking': '송장번호',
  'admin.products.tracking.empty': '미입력',
  'admin.products.col.manage': '관리',
  'admin.products.col.approve': '승인',
  'admin.products.empty': '검색 결과가 없습니다',
  'admin.products.loading': '상품을 불러오는 중입니다…',
  'admin.products.loadError': '상품 목록을 불러오지 못했습니다.',
  'admin.products.retry': '다시 시도',
  'admin.common.approve': '승인',
  'admin.common.cancel': '취소',
  'admin.common.prev': '이전',
  'admin.common.next': '다음',

  // ── 설정 페이지
  'admin.settings.title': '설정',
  'admin.settings.idle.title': '자동 로그아웃 시간',
  'admin.settings.idle.desc': '지정한 시간 동안 입력이 없으면 자동으로 로그아웃됩니다.',
  'admin.settings.idle.current': '현재 설정: ',
  'admin.settings.idle.suffix': '분 후 자동 로그아웃',
  'admin.settings.lang.title': '언어',
  'admin.settings.lang.desc': '관리자 페이지의 메뉴/제목 표시 언어를 선택합니다.',
  'admin.settings.lang.ko': '한국어',
  'admin.settings.lang.en': 'English',
};

const EN: Record<string, string> = {
  // sidebar sections
  'admin.section.overview': 'Overview',
  'admin.section.products': 'Products',
  'admin.section.auction': 'Auction',
  'admin.section.reports': 'Reports & Sanctions',
  'admin.section.members': 'Members',
  'admin.section.content': 'Content',
  'admin.section.operations': 'Operations',
  'admin.section.system': 'System',

  // sidebar menu
  'admin.menu.dashboard': 'Dashboard',
  'admin.menu.productManagement': 'Product Management',
  'admin.menu.productInquiries': 'Product Inquiries',
  'admin.menu.auctionManagement': 'Auction Management',
  'admin.menu.falseBids': 'False Bids',
  'admin.menu.sanction': 'Sanction History',
  'admin.menu.chatLogs': 'Chat Logs (On Hold)',
  'admin.menu.memberList': 'Member List',
  'admin.menu.withdrawn': 'Withdrawn Members',
  'admin.menu.notices': 'Notices',
  'admin.menu.categories': 'Categories',
  'admin.menu.settlements': 'Settlements & Fees',
  'admin.menu.wallet': 'Wallet Requests',
  'admin.menu.inquiriesFaq': 'Inquiries & FAQ',
  'admin.menu.settings': 'Settings',

  // header
  'admin.header.loggedInAs': 'Signed in as Admin',
  'admin.header.gotoNormal': 'User View',
  'admin.header.logout': 'Logout',
  'admin.sidebar.access': 'Accessed',

  // products page
  'admin.products.title': 'Product Management',
  'admin.products.subtitle': 'Browse all products and manage their status.',
  'admin.products.stats.total': 'Total Products',
  'admin.products.stats.scheduled': 'Scheduled',
  'admin.products.stats.pending': 'Pending',
  'admin.products.stats.live': 'Live',
  'admin.products.stats.hidden': 'Hidden',
  'admin.products.unit': '',
  'admin.products.search.placeholder': 'Search by name, product no., or seller',
  'admin.products.filter.all': 'All',
  'admin.products.col.no': 'Product No.',
  'admin.products.col.product': 'Product',
  'admin.products.col.seller': 'Seller',
  'admin.products.col.price': 'Price',
  'admin.products.col.registeredAt': 'Registered',
  'admin.products.col.tracking': 'Tracking No.',
  'admin.products.tracking.empty': 'N/A',
  'admin.products.col.manage': 'Status',
  'admin.products.col.approve': 'Action',
  'admin.products.empty': 'No matching products.',
  'admin.products.loading': 'Loading products…',
  'admin.products.loadError': 'Failed to load product list.',
  'admin.products.retry': 'Retry',
  'admin.common.approve': 'Approve',
  'admin.common.cancel': 'Cancel',
  'admin.common.prev': 'Prev',
  'admin.common.next': 'Next',

  // settings
  'admin.settings.title': 'Settings',
  'admin.settings.idle.title': 'Auto Logout',
  'admin.settings.idle.desc': 'You will be automatically signed out after the configured idle time.',
  'admin.settings.idle.current': 'Current: ',
  'admin.settings.idle.suffix': ' min until auto logout',
  'admin.settings.lang.title': 'Language',
  'admin.settings.lang.desc': 'Choose the language for admin menus and page titles.',
  'admin.settings.lang.ko': '한국어',
  'admin.settings.lang.en': 'English',
};

const DICT: Record<AdminLang, Record<string, string>> = { ko: KO, en: EN };

interface I18nContextValue {
  lang: AdminLang;
  setLang: (lang: AdminLang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const readInitialLang = (): AdminLang => {
  if (typeof window === 'undefined') return 'ko';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === 'en' ? 'en' : 'ko';
};

export const AdminI18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AdminLang>(readInitialLang);

  const setLang = useCallback((next: AdminLang) => {
    setLangState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore quota errors */ }
  }, []);

  // 다른 탭에서 언어를 바꾼 경우에도 동기화 — 관리자 페이지를 여러 탭에서 켜는 경우를 대비.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'ko' || e.newValue === 'en')) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    lang,
    setLang,
    // 키가 없으면 키 자체를 돌려주어 빠진 번역이 즉시 눈에 띄게 한다.
    t: (key) => DICT[lang][key] ?? key,
  }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- Provider 와 hook 을 한 파일에 두는 게 의도(외부 라이브러리 없이 가벼운 i18n)
export const useAdminI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Provider 가 없을 땐 안전한 기본값(한국어)로 동작하도록 fallback.
    return {
      lang: 'ko',
      setLang: () => { /* noop */ },
      t: (key) => DICT.ko[key] ?? key,
    };
  }
  return ctx;
};

/** 짧게 쓰는 hook: const t = useT(); t('admin.products.title') */
// eslint-disable-next-line react-refresh/only-export-components -- 위와 같은 이유
export const useT = (): ((key: string) => string) => useAdminI18n().t;
