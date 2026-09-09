import { create } from 'zustand';
import { API_ENDPOINTS } from '@/constants/config';
import { apiClient, setOnUnauthorizedHandler } from '@/services/api-client';
import { AuthStorage, StoredUser } from '@/services/auth-storage';

export interface AuthState {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  /** 初始化静默恢复登录态 */
  initAuth: () => Promise<void>;

  /** 用户登录 */
  login: (username: string, password: string) => Promise<void>;

  /** 新用户注册 */
  register: (username: string, password: string) => Promise<void>;

  /** 退出登录 */
  logout: () => Promise<void>;

  /** 修改密码 */
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;

  /** 更新本地用户资料 */
  setUser: (user: StoredUser | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,

  initAuth: async () => {
    try {
      const [token, user] = await Promise.all([
        AuthStorage.getToken(),
        AuthStorage.getUser(),
      ]);

      if (token) {
        set({ token, user, isInitialized: true });
        // 静默校验/刷新最新用户信息
        try {
          const res = await apiClient.get<{
            success: boolean;
            user: StoredUser;
          }>(API_ENDPOINTS.ME);
          if (res?.user) {
            set({ user: res.user });
            await AuthStorage.saveUser(res.user);
          }
        } catch (err: any) {
          if (err?.status === 401) {
            await get().logout();
          }
        }
      } else {
        set({ isInitialized: true });
      }
    } catch {
      set({ isInitialized: true });
    }
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await apiClient.post<{
        success: boolean;
        token: string;
        user: StoredUser;
      }>(API_ENDPOINTS.LOGIN, { username, password }, { skipAuth: true });

      if (res?.token && res?.user) {
        await Promise.all([
          AuthStorage.saveToken(res.token),
          AuthStorage.saveUser(res.user),
        ]);
        set({ token: res.token, user: res.user });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await apiClient.post<{
        success: boolean;
        token?: string;
        user?: StoredUser;
      }>(API_ENDPOINTS.REGISTER, { username, password }, { skipAuth: true });

      // 如果注册接口直接返回 token
      if (res?.token && res?.user) {
        await Promise.all([
          AuthStorage.saveToken(res.token),
          AuthStorage.saveUser(res.user),
        ]);
        set({ token: res.token, user: res.user });
      } else {
        // 否则自动执行一次登录
        await get().login(username, password);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await apiClient.post(API_ENDPOINTS.LOGOUT).catch(() => {});
    } finally {
      await AuthStorage.clearAll();
      set({ user: null, token: null });
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    set({ isLoading: true });
    try {
      await apiClient.put(API_ENDPOINTS.PASSWORD, {
        currentPassword,
        newPassword,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user: StoredUser | null) => {
    set({ user });
    if (user) {
      AuthStorage.saveUser(user);
    }
  },
}));

// 注册全局 401 拦截器：当 Token 失效时自动清除本地凭据与状态
setOnUnauthorizedHandler(() => {
  useAuthStore
    .getState()
    .logout()
    .catch(() => {});
});
