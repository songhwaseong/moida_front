export type AuthStorageMode = 'local' | 'session';

export const AUTH_STORAGE_KEYS = [
  'moida_logged_in',
  'moida_user_name',
  'moida_user_role',
] as const;

export const ADMIN_UI_STORAGE_KEYS = [
  'moida_admin_view',
  'moida_admin_login_at',
  'moida_admin_idle_warned',
] as const;

const LEGACY_TOKEN_KEYS = ['accessToken', 'refreshToken'] as const;

type AuthStorageKey = typeof AUTH_STORAGE_KEYS[number];
type AdminUiStorageKey = typeof ADMIN_UI_STORAGE_KEYS[number];

let accessTokenMemory: string | null = null;

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

LEGACY_TOKEN_KEYS.forEach(removeFromBoth);

export const isAdminRole = (role?: string | null): boolean => role === 'ADMIN' || role === 'MANAGER';

const hasSessionAuthItem = (): boolean => (
  AUTH_STORAGE_KEYS.some(key => sessionStorage.getItem(key) !== null)
);

const getStoredItem = (key: AuthStorageKey): string | null => (
  sessionStorage.getItem(key) ?? localStorage.getItem(key)
);

const getStoredAdminUiItem = (key: AdminUiStorageKey): string | null => (
  sessionStorage.getItem(key) ?? localStorage.getItem(key)
);

export const getAccessToken = (): string | null => accessTokenMemory;

export const setAccessToken = (accessToken: string | null) => {
  accessTokenMemory = accessToken;
};

export const getUserRole = (): string | null => getStoredItem('moida_user_role');

export const getLoggedInUserName = (): string => getStoredItem('moida_user_name') ?? '';

export const hasPersistedAuthHint = (): boolean => getStoredItem('moida_logged_in') === 'true';

export const hasAuthSession = (): boolean => hasPersistedAuthHint() && Boolean(accessTokenMemory);

export const hasAdminAuthSession = (): boolean => hasAuthSession() && isAdminRole(getUserRole());

export const getCurrentAuthStorageMode = (): AuthStorageMode => (
  hasSessionAuthItem() ? 'session' : 'local'
);

export const saveAuthSession = (
  session: {
    accessToken?: string | null;
    name?: string | null;
    role?: string | null;
    loggedIn?: boolean;
  },
  mode: AuthStorageMode,
) => {
  AUTH_STORAGE_KEYS.forEach(removeFromBoth);
  ADMIN_UI_STORAGE_KEYS.forEach(removeFromBoth);
  LEGACY_TOKEN_KEYS.forEach(removeFromBoth);

  accessTokenMemory = session.accessToken ?? null;
  if (session.loggedIn !== false) writeToMode('moida_logged_in', 'true', mode);
  if (session.name) writeToMode('moida_user_name', session.name, mode);
  if (session.role) writeToMode('moida_user_role', session.role, mode);
};

export const updateStoredTokens = (accessToken: string) => {
  accessTokenMemory = accessToken;
  LEGACY_TOKEN_KEYS.forEach(removeFromBoth);
};

export const setStoredLoginUser = (name: string, mode: AuthStorageMode = 'local') => {
  writeToMode('moida_logged_in', 'true', mode);
  writeToMode('moida_user_name', name, mode);
};

export const clearAuthSession = () => {
  accessTokenMemory = null;
  AUTH_STORAGE_KEYS.forEach(removeFromBoth);
  ADMIN_UI_STORAGE_KEYS.forEach(removeFromBoth);
  LEGACY_TOKEN_KEYS.forEach(removeFromBoth);
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
