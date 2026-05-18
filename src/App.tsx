import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import CategoryRow from './components/CategoryRow';
import type { MyProduct } from './data/myProductStore';
import type { MainTab, NavTab, AuctionItem, Product, Category } from './types';
import { CATEGORIES } from './data/mockData';
import PCLayout from './components/PCLayout';
import { ToastProvider } from './components/Toast';
import LeaveConfirmModal from './components/LeaveConfirmModal';
import AlertModal from './components/AlertModal';
import styles from './App.module.css';
import './styles/global.css';

const HomePage = lazy(() => import('./pages/HomePage'));
const TradePage = lazy(() => import('./pages/TradePage'));
const AuctionListPage = lazy(() => import('./pages/AuctionListPage'));
const PopularPage = lazy(() => import('./pages/PopularPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const AuctionDetailPage = lazy(() => import('./pages/AuctionDetailPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const NotificationPage = lazy(() => import('./pages/NotificationPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const MyPage = lazy(() => import('./pages/MyPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const FindAccountPage = lazy(() => import('./pages/FindAccountPage'));
const SellPage = lazy(() => import('./pages/SellPage'));
const SellerProfilePage = lazy(() => import('./pages/SellerProfilePage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const SalesHistoryPage = lazy(() => import('./pages/my/SalesHistoryPage'));
const MyProductsPage = lazy(() => import('./pages/my/MyProductsPage'));
const EditProductPage = lazy(() => import('./pages/my/EditProductPage'));
const PurchaseHistoryPage = lazy(() => import('./pages/my/PurchaseHistoryPage'));
const BidHistoryPage = lazy(() => import('./pages/my/BidHistoryPage'));
const ReceivedReviewsPage = lazy(() => import('./pages/my/ReceivedReviewsPage'));
const AddressPage = lazy(() => import('./pages/my/AddressPage'));
const NotificationSettingsPage = lazy(() => import('./pages/my/NotificationSettingsPage'));
const FaqPage = lazy(() => import('./pages/my/FaqPage'));
const CustomerServicePage = lazy(() => import('./pages/my/CustomerServicePage'));
const TermsPage = lazy(() => import('./pages/my/TermsPage'));
const EditProfilePage = lazy(() => import('./pages/my/EditProfilePage'));
const MyWalletPage = lazy(() => import('./pages/my/MyWalletPage'));
const TrackingPage = lazy(() => import('./pages/my/TrackingPage'));
const GuidePage = lazy(() => import('./pages/my/GuidePage'));
const MyInquiryPage = lazy(() => import('./pages/my/MyInquiryPage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));

type AuthScreen = 'login' | 'signup' | 'find-id' | 'find-pw' | null;

// 화면 상태를 하나의 타입으로 관리
type Screen =
  | { type: 'home' }
  | { type: 'auctionDetail'; id: number }
  | { type: 'productDetail'; id: number }
  | { type: 'sellerProfile'; seller: SellerInfo }
  | { type: 'sellPage' }
  | { type: 'navSearch' }
  | { type: 'navNotification' }
  | { type: 'navChat' }
  | { type: 'navMy' }
  | { type: 'myMenu'; menu: MyMenuKey }
  | { type: 'editProfile' };

interface SellerInfo { name: string; temp: number; sales: number; location: string; }
type MyMenuKey =
  | '판매 내역' | '구매 내역' | '입찰 내역' | '관심 목록' | '배송 조회'
  | '내 계좌' | '받은 후기' | '내 주소 관리' | '알림 설정'
  | '자주 묻는 질문' | '고객센터' | '이용약관' | '이용 가이드' | '내 등록 상품'
  | '내 문의';

interface AppHistoryView {
  screen: Screen;
  mainTab: MainTab;
  navTab: NavTab;
  selectedCategory: string | null;
  searchQuery: string;
  termsInitialTab: string;
  authScreen: AuthScreen;
  isGuest: boolean;
  editingProduct: MyProduct | null;
  adminViewMode: 'admin' | 'normal';
}

interface AppHistoryState {
  source: 'moida-app';
  view: AppHistoryView;
}

const isAppHistoryState = (state: unknown): state is AppHistoryState => {
  return typeof state === 'object' && state !== null && (state as AppHistoryState).source === 'moida-app';
};

const getHistoryViewKey = (view: AppHistoryView) => JSON.stringify(view);

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('bazar_is_admin') === 'true');
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('bazar_logged_in') === 'true');
  const [loggedInUserName, setLoggedInUserName] = useState(() => localStorage.getItem('bazar_user_name') || '');
  const [authScreen, setAuthScreen] = useState<AuthScreen>(() =>
    localStorage.getItem('bazar_logged_in') === 'true' ? null : 'login'
  );
  const [isGuest, setIsGuest] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertConfirmCb, setAlertConfirmCb] = useState<(() => void) | null>(null);
  const [alertCancelCb, setAlertCancelCb] = useState<(() => void) | null>(null);
  const hasInitializedHistoryRef = useRef(false);
  const isRestoringHistoryRef = useRef(false);
  const lastHistoryViewKeyRef = useRef('');

  const showAlert = (msg: string, onConfirm?: () => void, onCancel?: () => void) => {
    setAlertMsg(msg);
    setAlertConfirmCb(() => onConfirm ?? null);
    setAlertCancelCb(() => onCancel ?? null);
  };
  const closeAlert = (confirmed: boolean) => {
    const cb = confirmed ? alertConfirmCb : alertCancelCb;
    setAlertMsg(null);
    setAlertConfirmCb(null);
    setAlertCancelCb(null);
    cb?.();
  };
  const [screen, setScreen] = useState<Screen>({ type: 'home' });
  const [termsInitialTab, setTermsInitialTab] = useState('이용약관');
  const [editingProduct, setEditingProduct] = useState<MyProduct | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('홈');
  const [navTab, setNavTab] = useState<NavTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 폼 이탈 확인 상태
  const [formDirty, setFormDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<null | (() => void)>(null);
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'normal'>(
    () => (localStorage.getItem('bazar_admin_view') as 'admin' | 'normal') ?? 'admin'
  );

  // 현재 폼 화면인지 여부
  const isFormScreen = screen.type === 'sellPage' || editingProduct !== null;
  const formDirtyRef = useRef(formDirty);
  const isFormScreenRef = useRef(isFormScreen);
  const currentHistoryViewRef = useRef<AppHistoryView | null>(null);

  const restoreHistoryView = (view: AppHistoryView, clearDirty = true) => {
    isRestoringHistoryRef.current = true;
    setScreen(view.screen);
    setMainTab(view.mainTab);
    setNavTab(view.navTab);
    setSelectedCategory(view.selectedCategory);
    setSearchQuery(view.searchQuery);
    setTermsInitialTab(view.termsInitialTab);
    setAuthScreen(view.authScreen);
    setIsGuest(view.isGuest);
    setEditingProduct(view.editingProduct);
    setAdminViewMode(view.adminViewMode);
    if (clearDirty) setFormDirty(false);
    setPendingNav(null);
  };

  useEffect(() => {
    formDirtyRef.current = formDirty;
    isFormScreenRef.current = isFormScreen;
    currentHistoryViewRef.current = {
      screen,
      mainTab,
      navTab,
      selectedCategory,
      searchQuery,
      termsInitialTab,
      authScreen,
      isGuest,
      editingProduct,
      adminViewMode,
    };
  }, [screen, mainTab, navTab, selectedCategory, searchQuery, termsInitialTab, authScreen, isGuest, editingProduct, adminViewMode, formDirty, isFormScreen]);

  // 탭/네비 클릭 시 dirty면 컨펌, 아니면 바로 이동
  const guardedNav = (action: () => void) => {
    if (isFormScreen && formDirty) {
      setPendingNav(() => action);
    } else {
      action();
    }
  };

  const loginAsAdmin = () => {
    localStorage.setItem('bazar_is_admin', 'true');
    localStorage.setItem('bazar_admin_view', 'admin');
    localStorage.setItem('bazar_admin_login_at', new Date().toISOString());
    setIsAdmin(true);
    setAdminViewMode('admin');
    setIsGuest(false);
    setAuthScreen(null);
  };
  const logoutAdmin = () => {
    localStorage.removeItem('bazar_is_admin');
    localStorage.removeItem('bazar_admin_idle_warned');
    localStorage.removeItem('bazar_admin_view');
    localStorage.removeItem('bazar_admin_login_at');
    setIsAdmin(false);
    setAdminViewMode('admin');
    setAuthScreen('login');
  };
  const switchToNormal = () => { localStorage.setItem('bazar_admin_view', 'normal'); setAdminViewMode('normal'); };
  const switchToAdmin = () => { localStorage.setItem('bazar_admin_view', 'admin'); setAdminViewMode('admin'); };
  const login = (name?: string) => {
    const userName = name || '사용자';
    localStorage.setItem('bazar_logged_in', 'true');
    localStorage.setItem('bazar_user_name', userName);
    setIsLoggedIn(true);
    setLoggedInUserName(userName);
    setIsGuest(false); setAuthScreen(null); setScreen({ type: 'home' }); setNavTab('home');
  };
  const logout = () => {
    localStorage.removeItem('bazar_logged_in');
    localStorage.removeItem('bazar_user_name');
    localStorage.removeItem('accessToken');
    setIsLoggedIn(false);
    setLoggedInUserName('');
    setIsGuest(false); setAuthScreen('login');
  };

  // 로그인 필요 기능 접근 시 알럿
  const requireLogin = (action: () => void) => {
    if (!isLoggedIn && !isAdmin) {
      showAlert(
        '로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠어요?',
        () => { setIsGuest(false); setAuthScreen('login'); },
        () => { }
      );
      return;
    }
    action();
  };

  // 앱 화면 상태를 브라우저 history와 동기화
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!isAppHistoryState(event.state)) return;

      const { view } = event.state;
      if (isFormScreenRef.current && formDirtyRef.current) {
        const currentView = currentHistoryViewRef.current;
        if (currentView) {
          const currentState: AppHistoryState = { source: 'moida-app', view: currentView };
          window.history.pushState(currentState, '');
          lastHistoryViewKeyRef.current = getHistoryViewKey(currentView);
        }
        setPendingNav(() => () => {
          window.history.replaceState({ source: 'moida-app', view }, '');
          restoreHistoryView(view);
        });
        return;
      }

      restoreHistoryView(view);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const state: AppHistoryState = {
      source: 'moida-app',
      view: {
        screen,
        mainTab,
        navTab,
        selectedCategory,
        searchQuery,
        termsInitialTab,
        authScreen,
        isGuest,
        editingProduct,
        adminViewMode,
      },
    };

    if (!hasInitializedHistoryRef.current) {
      window.history.replaceState(state, '');
      lastHistoryViewKeyRef.current = getHistoryViewKey(state.view);
      hasInitializedHistoryRef.current = true;
      return;
    }

    if (isRestoringHistoryRef.current) {
      lastHistoryViewKeyRef.current = getHistoryViewKey(state.view);
      isRestoringHistoryRef.current = false;
      return;
    }

    const nextHistoryViewKey = getHistoryViewKey(state.view);
    if (lastHistoryViewKeyRef.current === nextHistoryViewKey) {
      return;
    }

    window.history.pushState(state, '');
    lastHistoryViewKeyRef.current = nextHistoryViewKey;
  }, [screen, mainTab, navTab, selectedCategory, searchQuery, termsInitialTab, authScreen, isGuest, editingProduct, adminViewMode]);

  // 관리자 화면
  if (isAdmin && adminViewMode === 'admin') {
    return (
      <ToastProvider>
        <AdminPage onLogout={logoutAdmin} onSwitchToNormal={switchToNormal} />
      </ToastProvider>
    );
  }

  // 로그인 전
  if (!isLoggedIn && !isGuest && !isAdmin) {
    if (authScreen === 'signup') {
      return <ToastProvider><SignupPage onSignup={login} onGoLogin={() => setAuthScreen('login')} /></ToastProvider>;
    }
    if (authScreen === 'find-id' || authScreen === 'find-pw') {
      return <ToastProvider><FindAccountPage initialTab={authScreen === 'find-pw' ? 'pw' : 'id'} onBack={() => setAuthScreen('login')} /></ToastProvider>;
    }
    return (
      <ToastProvider>
        <LoginPage
          onLogin={login}
          onAdmin={loginAsAdmin}
          onGoSignup={() => setAuthScreen('signup')}
          onFindAccount={(tab) => setAuthScreen(tab === 'pw' ? 'find-pw' : 'find-id')}
          onGuest={() => { setIsGuest(true); setScreen({ type: 'home' }); setNavTab('home'); }}
        />
      </ToastProvider>
    );
  }

  const goBack = () => {
    setFormDirty(false);
    window.history.back();
  };
  const PROTECTED_TABS: NavTab[] = ['notification', 'chat', 'my'];
  const goNav = (tab: NavTab) => {
    const action = () => {
      // 비로그인 상태에서 보호된 탭 접근 차단
      if (!isLoggedIn && !isAdmin && PROTECTED_TABS.includes(tab)) {
        requireLogin(() => { });
        return;
      }
      setNavTab(tab);
      setFormDirty(false);
      setEditingProduct(null);
      if (tab === 'home') { setScreen({ type: 'home' }); return; }
      const navMap: Record<string, Screen> = {
        search: { type: 'navSearch' },
        notification: { type: 'navNotification' },
        chat: { type: 'navChat' },
        my: { type: 'navMy' },
      };
      setScreen(navMap[tab] ?? { type: 'home' });
    };
    guardedNav(action);
  };
  const PROTECTED_MAIN_TABS: MainTab[] = ['관심목록'];
  const handleMainTabChange = (tab: MainTab) => {
    if (!isLoggedIn && !isAdmin && PROTECTED_MAIN_TABS.includes(tab)) {
      requireLogin(() => { });
      return;
    }
    guardedNav(() => {
      setMainTab(tab);
      setScreen({ type: 'home' });
      setNavTab('home');
      setFormDirty(false);
      setEditingProduct(null);
      setSelectedCategory(null);
    });
  };
  const handleCategorySelect = (cat: Category) => {
    if (cat.label === '전체') { setSelectedCategory(null); return; }
    setSelectedCategory(p => p === cat.label ? null : cat.label);
  };
  const handleAuctionClick = (item: AuctionItem) => setScreen({ type: 'auctionDetail', id: item.id });
  const handleProductClick = (product: Product) => setScreen({ type: 'productDetail', id: product.id });
  const handleSearch = (query: string) => {
    guardedNav(() => { setSearchQuery(query); setNavTab('search'); setScreen({ type: 'navSearch' }); setFormDirty(false); setEditingProduct(null); });
  };

  // ── 화면 라우팅 ──
  // 홈 (기본)
  const showSharedCategoryRow = mainTab !== '홈';

  const renderMainPage = () => {
    switch (mainTab) {
      case '홈': return <HomePage onAuctionClick={handleAuctionClick} onProductClick={handleProductClick} onMoreAuction={() => handleMainTabChange('경매')} onMoreTrade={() => handleMainTabChange('중고거래')} selectedCategory={selectedCategory} onCategorySelect={handleCategorySelect} />;
      case '중고거래': return <TradePage onProductClick={handleProductClick} selectedCategory={selectedCategory} />;
      case '경매': return <AuctionListPage onItemClick={handleAuctionClick} onProductClick={handleProductClick} selectedCategory={selectedCategory} />;
      case '인기': return <PopularPage selectedCategory={selectedCategory} onProductClick={handleProductClick} onAuctionClick={handleAuctionClick} />;
      case '관심목록': return <WishlistPage onProductClick={handleProductClick} onAuctionClick={handleAuctionClick} />;
      default: return null;
    }
  };

  const renderNavPage = () => {
    if (screen.type === 'sellPage') return (
      <SellPage
        onBack={goBack}
        onDirtyChange={setFormDirty}
        onSubmit={(productId: number) => {
          setFormDirty(false);
          setScreen({ type: 'productDetail', id: productId }); // ← 등록 후 상세 페이지로
        }}
      />
    );
    if (screen.type === 'sellerProfile') return <SellerProfilePage seller={screen.seller} onBack={goBack} onProductClick={handleProductClick} />;
    if (screen.type === 'auctionDetail') return <AuctionDetailPage itemId={screen.id} onBack={goBack} isLoggedIn={isLoggedIn || isAdmin} onRequireLogin={() => requireLogin(() => { })} onSellerClick={(seller) => setScreen({ type: 'sellerProfile', seller })} />;
    if (screen.type === 'productDetail') return (
      <ProductDetailPage
        productId={screen.id}
        onBack={goBack}
        onSellerClick={(seller) => setScreen({ type: 'sellerProfile', seller })}
        onAuctionClick={() => setScreen({ type: 'auctionDetail', id: Math.min(screen.id, 4) })}
        onChatClick={() => goNav('chat')}
      />
    );
    if (screen.type === 'editProfile') return <EditProfilePage onBack={goBack} />;
    if (screen.type === 'myMenu') {
      const backToMy = goBack;
      const menuMap: Record<MyMenuKey, React.ReactNode> = {
        '판매 내역': <SalesHistoryPage onBack={backToMy} />,
        '내 등록 상품': <MyProductsPage onBack={backToMy} onEdit={(p) => setEditingProduct(p)} />,
        '배송 조회': <TrackingPage onBack={backToMy} />,
        '구매 내역': <PurchaseHistoryPage onBack={backToMy} />,
        '입찰 내역': <BidHistoryPage onBack={backToMy} />,
        '관심 목록': <WishlistPage onProductClick={handleProductClick} onAuctionClick={handleAuctionClick} onBack={backToMy} />,
        '내 문의': <MyInquiryPage onBack={backToMy} onProductClick={(id) => setScreen({ type: 'productDetail', id })} onAuctionClick={(id) => setScreen({ type: 'auctionDetail', id })} />,
        '내 계좌': <MyWalletPage onBack={backToMy} />,
        '받은 후기': <ReceivedReviewsPage onBack={backToMy} />,
        '내 주소 관리': <AddressPage onBack={backToMy} />,
        '알림 설정': <NotificationSettingsPage onBack={backToMy} />,
        '자주 묻는 질문': <FaqPage onBack={backToMy} />,
        '고객센터': <CustomerServicePage onBack={backToMy} />,
        '이용약관': <TermsPage onBack={backToMy} initialTab={termsInitialTab} />,
        '이용 가이드': <GuidePage onBack={backToMy} />,
      };
      return editingProduct
        ? <EditProductPage product={editingProduct} onBack={goBack} onSaved={() => { setEditingProduct(null); setFormDirty(false); }} onDirtyChange={setFormDirty} />
        : menuMap[screen.menu];
    }
    if (screen.type === 'navSearch') return <SearchPage onProductClick={handleProductClick} onAuctionClick={handleAuctionClick} initialQuery={searchQuery} onQueryClear={() => setSearchQuery('')} />;
    if (screen.type === 'navNotification') return <NotificationPage />;
    if (screen.type === 'navChat') return <ChatPage />;
    if (screen.type === 'navMy') return <MyPage onLogout={logout} onMenuClick={(menu) => setScreen({ type: 'myMenu', menu: menu as MyMenuKey })} onEditProfile={() => setScreen({ type: 'editProfile' })} />;
    return null;
  };

  const isHomePage = screen.type === 'home';

  return (
    <>
      <PCLayout
        mainTab={mainTab}
        navTab={navTab}
        onMainTabChange={handleMainTabChange}
        onNavTabChange={goNav}
        onSellClick={() => requireLogin(() => setScreen({ type: 'sellPage' }))}
        onSearch={handleSearch}
        notificationCount={3}
        isLoggedIn={isLoggedIn || isAdmin}
        loggedInUserName={isAdmin ? '관리자' : loggedInUserName}
        onAuthClick={isAdmin ? logoutAdmin : (isLoggedIn ? logout : () => { setIsGuest(false); setAuthScreen('login'); })}
        isAdmin={isAdmin}
        onSwitchToAdmin={switchToAdmin}
        onTermsClick={() => { setTermsInitialTab('이용약관'); setNavTab('my'); setScreen({ type: 'myMenu', menu: '이용약관' }); }}
        onPrivacyClick={() => { setTermsInitialTab('개인정보처리방침'); setNavTab('my'); setScreen({ type: 'myMenu', menu: '이용약관' }); }}
      >
        {isHomePage ? (
          <>
            {showSharedCategoryRow && (
              <CategoryRow categories={CATEGORIES} selectedLabel={selectedCategory} onSelect={handleCategorySelect} />
            )}
            {showSharedCategoryRow && selectedCategory && (
              <div className={styles.categoryBannerSection}>
                <div className={styles.categoryBanner}>
                  <span className={styles.categoryBannerText}>
                    <strong>{selectedCategory}</strong> 카테고리 필터 중
                  </span>
                  <button className={styles.categoryBannerClear} onClick={() => setSelectedCategory(null)}>
                    전체보기
                  </button>
                </div>
              </div>
            )}
            {renderMainPage()}
          </>
        ) : (
          renderNavPage()
        )}
      </PCLayout>
      {pendingNav && (
        <LeaveConfirmModal
          onConfirm={() => { const action = pendingNav; setPendingNav(null); setFormDirty(false); action(); }}
          onCancel={() => setPendingNav(null)}
        />
      )}
      {alertMsg && (
        <AlertModal
          message={alertMsg}
          confirmLabel="로그인하기"
          cancelLabel="취소"
          onConfirm={() => closeAlert(true)}
          onCancel={alertCancelCb !== null ? () => closeAlert(false) : undefined}
        />
      )}
    </>
  );
};

export default function Root() {
  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </ToastProvider>
  );
}
