export type AuthStorageMode = 'local' | 'session';

export const AUTH_STORAGE_KEYS = [
  'accessToken',
  'refreshToken',
  'moida_logged_in',
  'moida_user_name',
  'moida_user_role',
] as const;

export const ADMIN_UI_STORAGE_KEYS = [
  'moida_admin_view',
  'moida_admin_login_at',
  'moida_admin_idle_warned',
] as const;

type AuthStorageKey = typeof AUTH_STORAGE_KEYS[number];
type AdminUiStorageKey = typeof ADMIN_UI_STORAGE_KEYS[number];

const storageFor = (mode: AuthStorageMode): Storage => (
  mode === 'session' ? sessionStorage : localStorage
);

const otherStorageFor = (mode: AuthStorageMode): Storage => (
  mode === 'session' ? localStorage : sessionStorage
);

const removeFromBoth = (key: string) => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
};

const writeToMode = (key: string, value: string, mode: AuthStorageMode) => {
  storageFor(mode).setItem(key, value);
  otherStorageFor(mode).removeItem(key);
};

export const isAdminRole = (role?: string | null): boolean => role === 'ADMIN' || role === 'MANAGER';

const hasSessionAuthItem = (): boolean => (
  AUTH_STORAGE_KEYS.some(key => sessionStorage.getItem(key) !== null)
);

const hasLegacyPersistentAdminAuth = (): boolean => (
  !hasSessionAuthItem() && isAdminRole(localStorage.getItem('moida_user_role'))
);

const getStoredItem = (key: AuthStorageKey): string | null => (
  hasLegacyPersistentAdminAuth()
    ? sessionStorage.getItem(key)
    : sessionStorage.getItem(key) ?? localStorage.getItem(key)
);

const getStoredAdminUiItem = (key: AdminUiStorageKey): string | null => (
  sessionStorage.getItem(key) ?? localStorage.getItem(key)
);

export const getAccessToken = (): string | null => getStoredItem('accessToken');

export const getRefreshToken = (): string | null => getStoredItem('refreshToken');

export const getUserRole = (): string | null => getStoredItem('moida_user_role');

export const getLoggedInUserName = (): string => getStoredItem('moida_user_name') ?? '';

export const hasAuthSession = (): boolean => (
  getStoredItem('moida_logged_in') === 'true' && Boolean(getAccessToken())
);

export const hasAdminAuthSession = (): boolean => hasAuthSession() && isAdminRole(getUserRole());

export const getCurrentAuthStorageMode = (): AuthStorageMode => {
  return hasSessionAuthItem() ? 'session' : 'local';
};

export const saveAuthSession = (
  session: {
    accessToken?: string | null;
    refreshToken?: string | null;
    name?: string | null;
    role?: string | null;
    loggedIn?: boolean;
  },
  mode: AuthStorageMode,
) => {
  AUTH_STORAGE_KEYS.forEach(removeFromBoth);
  ADMIN_UI_STORAGE_KEYS.forEach(removeFromBoth);

  if (session.accessToken) writeToMode('accessToken', session.accessToken, mode);
  if (session.refreshToken) writeToMode('refreshToken', session.refreshToken, mode);
  if (session.loggedIn !== false) writeToMode('moida_logged_in', 'true', mode);
  if (session.name) writeToMode('moida_user_name', session.name, mode);
  if (session.role) writeToMode('moida_user_role', session.role, mode);
};

export const updateStoredTokens = (accessToken: string, refreshToken?: string | null) => {
  const mode = getCurrentAuthStorageMode();
  writeToMode('accessToken', accessToken, mode);
  if (refreshToken) writeToMode('refreshToken', refreshToken, mode);
};

export const setStoredLoginUser = (name: string, mode: AuthStorageMode = 'local') => {
  writeToMode('moida_logged_in', 'true', mode);
  writeToMode('moida_user_name', name, mode);
};

export const clearAuthSession = () => {
  AUTH_STORAGE_KEYS.forEach(removeFromBoth);
  ADMIN_UI_STORAGE_KEYS.forEach(removeFromBoth);
};

export const getAdminUiItem = (key: AdminUiStorageKey): string | null => (
  getStoredAdminUiItem(key)
);

export const setAdminUiItem = (key: AdminUiStorageKey, value: string) => {
  sessionStorage.setItem(key, value);
  localStorage.removeItem(key);
};

export const removeAdminUiItem = (key: AdminUiStorageKey) => {
  removeFromBoth(key);
};
