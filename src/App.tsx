import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import CategoryRow from './components/CategoryRow';
import type { MyProduct } from './data/myProductStore';
import type { MainTab, NavTab, AuctionItem, Product, Category } from './types';
import { CATEGORIES } from './data/mockData';
import { getUnreadNotificationCount } from './api/notifications';
import PCLayout from './components/PCLayout';
import { ToastProvider } from './components/Toast';
import NotificationSocketBridge from './components/NotificationSocketBridge';
import { disconnectNotificationSocket } from './components/notificationSocket';
import LeaveConfirmModal from './components/LeaveConfirmModal';
import AlertModal from './components/AlertModal';
import styles from './App.module.css';
import './styles/global.css';

const HomePage = lazy(() => import('./pages/HomePage'));
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
const SocialSignupInfoPage = lazy(() => import('./pages/SocialSignupInfoPage'));
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
const ChangePasswordPage = lazy(() => import('./pages/my/ChangePasswordPage'));
const MyWalletPage = lazy(() => import('./pages/my/MyWalletPage'));
const TrackingPage = lazy(() => import('./pages/my/TrackingPage'));
const GuidePage = lazy(() => import('./pages/my/GuidePage'));
const MyInquiryPage = lazy(() => import('./pages/my/MyInquiryPage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
import { AdminI18nProvider } from './pages/admin/i18n';

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
  | { type: 'editProfile' }
  | { type: 'changePassword' };

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

const getInitialScreen = (): Screen => {
  const path = window.location.pathname;

  const detailMatch = path.match(/^\/(products?|auctions?)\/(\d+)\/?$/);
  if (detailMatch) {
    const id = Number(detailMatch[2]);
    if (Number.isFinite(id)) {
      return detailMatch[1].startsWith('auction')
        ? { type: 'auctionDetail', id }
        : { type: 'productDetail', id };
    }
  }

  if (path === '/my') return { type: 'navMy' };
  if (path === '/my/edit-profile') return { type: 'editProfile' };
  if (path === '/my/change-password') return { type: 'changePassword' };
  if (path === '/chat') return { type: 'navChat' };
  if (path === '/notifications') return { type: 'navNotification' };
  if (path === '/search') return { type: 'navSearch' };
  if (path.startsWith('/my/')) {
    const menu = decodeURIComponent(path.slice(4)) as MyMenuKey;
    return { type: 'myMenu', menu };
  }

  return { type: 'home' };
};

const getInitialMainTab = (): MainTab => {
  const path = window.location.pathname;
  if (path === '/auction') return '경매';
  if (path === '/popular') return '인기';
  if (path === '/wishlist') return '관심목록';
  return '홈';
};

const getInitialAuthScreen = (): AuthScreen => {
  const loggedIn = localStorage.getItem('moida_logged_in') === 'true' && !!localStorage.getItem('accessToken');
  if (loggedIn) return null;
  const path = window.location.pathname;
  if (path === '/signup') return 'signup';
  if (path === '/find-id') return 'find-id';
  if (path === '/find-pw') return 'find-pw';
  return 'login';
};

/**
 * 관리자 세션 유효성 판정.
 *
 * 과거에는 `moida_is_admin` 플래그 하나만 보고 isAdmin 을 결정했는데, 다음 문제가 있었다:
 *   1) JWT 가 만료되어도 플래그가 살아있어 URL 이 /admin 으로 푸시되고
 *      → 모든 admin API 가 401 → axios 가 / 로 리다이렉트 → 또 isAdmin=true → 무한 루프
 *   2) 일반 사용자가 콘솔에서 플래그 한 줄 (`localStorage.setItem('moida_is_admin','true')`)
 *      만으로 admin UI 컴포넌트를 렌더링시킬 수 있어 메뉴/대시보드 구조가 노출됨
 *      (API 자체는 백엔드 hasAnyRole 가드로 보호되지만 UI 정보 누설)
 *
 * 그래서 토큰 + 로그인 플래그 + 역할(role) 세 가지 모두 충족할 때만 admin 으로 인정한다.
 * 토큰이 죽으면 자동으로 isAdmin=false 가 되어 위 두 문제가 모두 사라진다.
 */
const hasAdminSession = (): boolean => {
  const hasToken = !!localStorage.getItem('accessToken');
  const isLoggedIn = localStorage.getItem('moida_logged_in') === 'true';
  const role = localStorage.getItem('moida_user_role');
  return hasToken && isLoggedIn && (role === 'ADMIN' || role === 'MANAGER');
};

const getHistoryPath = (view: AppHistoryView, isAdmin = false) => {
  // 관리자 모드(관리자로 로그인 + admin 뷰)면 다른 화면 상태와 무관하게 /admin 으로 고정.
  // 그렇지 않으면 authScreen이 'login'으로 남아 URL이 /login으로 잘못 찍힌다.
  if (isAdmin && view.adminViewMode === 'admin') return '/admin';

  // 비로그인 auth 화면은 screen보다 우선해서 처리
  // (isGuest=true인 소셜 로그인 콜백 중에는 건너뜀)
  if (!view.isGuest) {
    if (view.authScreen === 'signup') return '/signup';
    if (view.authScreen === 'find-id') return '/find-id';
    if (view.authScreen === 'find-pw') return '/find-pw';
    if (view.authScreen === 'login') return '/login';
  }
  if (view.screen.type === 'productDetail') return `/products/${view.screen.id}`;
  if (view.screen.type === 'auctionDetail') return `/auctions/${view.screen.id}`;
  if (view.screen.type === 'navMy') return '/my';
  if (view.screen.type === 'editProfile') return '/my/edit-profile';
  if (view.screen.type === 'changePassword') return '/my/change-password';
  if (view.screen.type === 'navChat') return '/chat';
  if (view.screen.type === 'navNotification') return '/notifications';
  if (view.screen.type === 'navSearch') return '/search';
  if (view.screen.type === 'myMenu') return `/my/${encodeURIComponent(view.screen.menu)}`;
  if (view.screen.type === 'home') {
    if (view.mainTab === '경매') return '/auction';
    if (view.mainTab === '인기') return '/popular';
    if (view.mainTab === '관심목록') return '/wishlist';
    return '/';
  }
  return '/';
};

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(() => hasAdminSession());
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    localStorage.getItem('moida_logged_in') === 'true' && !!localStorage.getItem('accessToken')
  );
  const [loggedInUserName, setLoggedInUserName] = useState(() => localStorage.getItem('moida_user_name') || '');
  const [authScreen, setAuthScreen] = useState<AuthScreen>(() => getInitialAuthScreen());
  const [isGuest, setIsGuest] = useState(() => {
    // 소셜 로그인 콜백 URL이면 임시 guest 모드로 시작 → LoginPage 안 보임
    const path = window.location.pathname;
    const code = new URLSearchParams(window.location.search).get('code');
    return !!(code && (
      path === '/member/kauth' ||
      path === '/member/nauth' ||
      path === '/member/gauth'
    ));
  });
  const [socialSignupStep, setSocialSignupStep] = useState<null | 'info' | 'form'>(null);
  const [socialSignupName, setSocialSignupName] = useState('');
  const [isSocialProcessing, setIsSocialProcessing] = useState(() => {
    const path = window.location.pathname;
    const code = new URLSearchParams(window.location.search).get('code');
    return !!(code && (
      path === '/member/kauth' ||
      path === '/member/nauth' ||
      path === '/member/gauth'
    ));
  });
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertConfirmCb, setAlertConfirmCb] = useState<(() => void) | null>(null);
  const [alertCancelCb, setAlertCancelCb] = useState<(() => void) | null>(null);
  const hasInitializedHistoryRef = useRef(false);
  const isRestoringHistoryRef = useRef(false);
  const lastHistoryPathRef = useRef('');

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
  const [screen, setScreen] = useState<Screen>(() => getInitialScreen());
  const [termsInitialTab, setTermsInitialTab] = useState('이용약관');
  const [editingProduct, setEditingProduct] = useState<MyProduct | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>(() => getInitialMainTab());
  const [navTab, setNavTab] = useState<NavTab>(() => {
    const screen = getInitialScreen();
    if (screen.type === 'navMy' || screen.type === 'editProfile' || screen.type === 'myMenu' || screen.type === 'changePassword') return 'my';
    if (screen.type === 'navChat') return 'chat';
    if (screen.type === 'navNotification') return 'notification';
    if (screen.type === 'navSearch') return 'search';
    return 'home';
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);

  // 폼 이탈 확인 상태
  const [formDirty, setFormDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<null | (() => void)>(null);
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'normal'>(
    () => (localStorage.getItem('moida_admin_view') as 'admin' | 'normal') ?? 'admin'
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

  // 알림 탭에서 읽음 상태가 바뀐 뒤 상단 badge를 다시 맞춥니다.
  const refreshNotificationCount = useCallback(async () => {
    const hasToken = Boolean(localStorage.getItem('accessToken'));
    if ((!isLoggedIn && !isAdmin) || !hasToken) {
      return;
    }

    try {
      const count = await getUnreadNotificationCount();
      setNotificationCount(count);
    } catch (error) {
      console.error('Failed to load unread notification count', error);
      setNotificationCount(0);
    }
  }, [isLoggedIn, isAdmin]);

  useEffect(() => {
    // 로그인 세션이 준비된 경우에만 unread count를 초기 조회합니다.
    const hasToken = Boolean(localStorage.getItem('accessToken'));
    if ((!isLoggedIn && !isAdmin) || !hasToken) return;

    let ignore = false;

    const loadNotificationCount = async () => {
      try {
        const count = await getUnreadNotificationCount();
        if (!ignore) setNotificationCount(count);
      } catch (error) {
        console.error('Failed to load unread notification count', error);
        if (!ignore) setNotificationCount(0);
      }
    };

    void loadNotificationCount();

    return () => { ignore = true; };
  }, [isLoggedIn, isAdmin]);

  const loginAsAdmin = () => {
    // isAdmin 판정이 hasAdminSession() (= token + logged_in + role) 기반이므로
    // 별도 admin 플래그는 더 이상 저장하지 않는다.
    // moida_logged_in 은 LoginPage 의 admin 분기에서 세팅하지 않으므로 여기서 보강한다.
    localStorage.setItem('moida_logged_in', 'true');
    // admin/normal 뷰 토글 선택과 idle 타이머 기준 시각은 인증과 무관한 UI 상태라서 그대로 유지한다.
    localStorage.setItem('moida_admin_view', 'admin');
    localStorage.setItem('moida_admin_login_at', new Date().toISOString());
    setIsAdmin(true);
    setAdminViewMode('admin');
    setIsGuest(false);
    setAuthScreen(null);
  };
  const logoutAdmin = () => {
    // STOMP 알림 소켓을 토큰 제거 전에 명시적으로 끊는다.
    // - 토큰이 살아 있는 동안 정상적인 DISCONNECT 프레임을 보내고,
    // - reconnectDelay 로 자동 재연결이 트리거되지 않도록 deactivate() 를 직접 호출.
    // void 처리: 동기 흐름을 막지 않기 위함이며, 끊김은 어차피 fire-and-forget 으로 충분.
    void disconnectNotificationSocket();
    // moida_is_admin 은 더 이상 사용하지 않는다 (hasAdminSession 기반 판정으로 전환).
    localStorage.removeItem('moida_admin_idle_warned');
    localStorage.removeItem('moida_admin_view');
    localStorage.removeItem('moida_admin_login_at');
    localStorage.removeItem('moida_logged_in');
    localStorage.removeItem('moida_user_name');
    localStorage.removeItem('moida_user_role');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAdmin(false);
    setAdminViewMode('admin');
    setNotificationCount(0);
    setAuthScreen('login');
  };
  const switchToNormal = () => { localStorage.setItem('moida_admin_view', 'normal'); setAdminViewMode('normal'); };
  const switchToAdmin = () => { localStorage.setItem('moida_admin_view', 'admin'); setAdminViewMode('admin'); };
  const login = (name?: string) => {
    const userName = name || '사용자';
    localStorage.setItem('moida_logged_in', 'true');
    localStorage.setItem('moida_user_name', userName);
    setIsLoggedIn(true);
    setLoggedInUserName(userName);
    setIsGuest(false); setAuthScreen(null); setScreen({ type: 'home' }); setNavTab('home');
  };

  // 소셜 로그인 콜백 처리 - 앱 시작 시 URL 확인
  useEffect(() => {
    const path = window.location.pathname;
    const code = new URLSearchParams(window.location.search).get('code');
    const state = new URLSearchParams(window.location.search).get('state');

    if (!code) return; // 일반 접속이면 무시

    const handleSocialCallback = async () => {
      try {
        let endpoint = '';
        let body: Record<string, string> = { code };

        if (path === '/member/kauth') {
          endpoint = '/api/auth/kakaoLogin';
        } else if (path === '/member/nauth') {
          endpoint = '/api/auth/naverLogin';
          body = { code, state: state || '' };
        } else if (path === '/member/gauth') {
          endpoint = '/api/auth/googleLogin';
        } else {
          return; // 소셜 콜백 URL이 아니면 무시
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        console.log('소셜 로그인 응답:', data.data);
        const { accessToken, refreshToken, name, role, newUser: isNewUser } = data.data;

        localStorage.setItem('accessToken', accessToken);
        // refreshToken 도 함께 보관 — access 만료 시 axios 인터셉터의 자동 갱신에 사용.
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('moida_user_role', role);
        // URL 정리 후 홈으로
        window.history.replaceState({}, '', '/');

        if (isNewUser) {
          setSocialSignupName(name);
          setSocialSignupStep('info');
          setIsGuest(false);
          setIsSocialProcessing(false);
        } else {
          localStorage.setItem('moida_user_name', name);
          localStorage.setItem('moida_logged_in', 'true');
          setIsSocialProcessing(false);
          login(name); // 기존 login 함수 호출
        }
      } catch (e) {
        console.error('소셜 로그인 실패', e);
        setIsSocialProcessing(false);
      }
    };

    handleSocialCallback();
  }, []); // 앱 최초 마운트 시 한 번만 실행

  const logout = () => {
    // STOMP 알림 소켓을 토큰 제거 전에 명시적으로 끊는다.
    // 자세한 이유는 logoutAdmin 의 같은 호출 참고.
    void disconnectNotificationSocket();
    localStorage.removeItem('moida_logged_in');
    localStorage.removeItem('moida_user_name');
    localStorage.removeItem('moida_user_role');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsLoggedIn(false);
    setLoggedInUserName('');
    setNotificationCount(0);
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
          window.history.pushState(currentState, '', getHistoryPath(currentView));
          lastHistoryPathRef.current = getHistoryPath(currentView);
        }
        setPendingNav(() => () => {
          window.history.replaceState({ source: 'moida-app', view }, '', getHistoryPath(view));
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
    const view: AppHistoryView = {
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
    const state: AppHistoryState = { source: 'moida-app', view };
    const path = getHistoryPath(view, isAdmin);

    // 최초 진입 시에는 replaceState로 현재 URL에 상태만 붙여 둔다.
    if (!hasInitializedHistoryRef.current) {
      window.history.replaceState(state, '', path);
      lastHistoryPathRef.current = path;
      hasInitializedHistoryRef.current = true;
      return;
    }

    // 브라우저 뒤로/앞으로 버튼으로 복원 중에는 pushState를 추가하지 않는다.
    if (isRestoringHistoryRef.current) {
      lastHistoryPathRef.current = path;
      isRestoringHistoryRef.current = false;
      return;
    }

    // URL이 바뀌면 pushState, 같은 URL이면 replaceState(상태만 갱신, 항목 추가 없음).
    if (lastHistoryPathRef.current !== path) {
      window.history.pushState(state, '', path);
      lastHistoryPathRef.current = path;
    } else {
      window.history.replaceState(state, '', path);
    }
  }, [screen, mainTab, navTab, selectedCategory, searchQuery, termsInitialTab, authScreen, isGuest, editingProduct, adminViewMode, isAdmin]);
  if (isSocialProcessing) return null;
  if (socialSignupStep === 'info') {
    return (
      <ToastProvider>
        <SocialSignupInfoPage
          name={socialSignupName}
          onNext={() => setSocialSignupStep('form')}
        />
      </ToastProvider>
    );
  }
  // 소셜 로그인 값에 따라 화면인 바뀐다.
  if (socialSignupStep === 'form') {
    return (
      <ToastProvider>
        <SignupPage
          onSignup={() => { }}
          onGoLogin={() => { }}
          socialMode={true}
          socialName={socialSignupName}
          onComplete={() => {
            localStorage.setItem('moida_user_name', socialSignupName);
            localStorage.setItem('moida_logged_in', 'true');
            setSocialSignupStep(null);
            login(socialSignupName);
          }}
        />
      </ToastProvider>
    );
  }
  // 관리자 화면
  if (isAdmin && adminViewMode === 'admin') {
    return (
      <ToastProvider>
        <AdminI18nProvider>
          <AdminPage onLogout={logoutAdmin} onSwitchToNormal={switchToNormal} />
        </AdminI18nProvider>
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
      case '홈': return <HomePage onAuctionClick={handleAuctionClick} onProductClick={handleProductClick} onMoreAuction={() => handleMainTabChange('경매')} selectedCategory={selectedCategory} onCategorySelect={handleCategorySelect} />;
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
        isLoggedIn={isLoggedIn || isAdmin}
        onRequireLogin={() => requireLogin(() => { })}
      />
    );
    if (screen.type === 'editProfile') return <EditProfilePage onBack={goBack} onChangePassword={() => setScreen({ type: 'changePassword' })} />;
    if (screen.type === 'changePassword') return <ChangePasswordPage onBack={goBack} />;
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
    if (screen.type === 'navNotification') return <NotificationPage onUnreadCountChange={refreshNotificationCount} />;
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
        notificationCount={notificationCount}
        isLoggedIn={isLoggedIn || isAdmin}
        loggedInUserName={isAdmin ? '관리자' : loggedInUserName}
        onAuthClick={isAdmin ? logoutAdmin : (isLoggedIn ? logout : () => { setIsGuest(false); setAuthScreen('login'); })}
        isAdmin={isAdmin}
        onSwitchToAdmin={switchToAdmin}
        onTermsClick={() => { setTermsInitialTab('이용약관'); setNavTab('my'); setScreen({ type: 'myMenu', menu: '이용약관' }); }}
        onPrivacyClick={() => { setTermsInitialTab('개인정보처리방침'); setNavTab('my'); setScreen({ type: 'myMenu', menu: '이용약관' }); }}
        onMyHomeClick={() => goNav('my')}
        onMyMenuClick={(menu) => { setNavTab('my'); setScreen({ type: 'myMenu', menu: menu as MyMenuKey }); }}
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
      {/* 실시간 알림 STOMP 구독. DOM 출력 없이 토스트 + unread 카운트 갱신만 담당. */}
      <NotificationSocketBridge
        isAuthenticated={isLoggedIn || isAdmin}
        onIncoming={() => { void refreshNotificationCount(); }}
      />
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
