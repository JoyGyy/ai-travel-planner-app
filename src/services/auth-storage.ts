import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'ai_travel_auth_token';
const USER_INFO_KEY = 'ai_travel_user_info';

export interface StoredUser {
  id: string;
  username: string;
  avatar?: string;
  role?: string;
}

/**
 * 安全凭据与用户信息存储服务
 * 基于 Expo SecureStore 提供硬件加密存储
 */
export const AuthStorage = {
  /** 保存 JWT Token */
  async saveToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    } catch (error) {
      console.warn('SecureStore saveToken error:', error);
    }
  },

  /** 读取 JWT Token */
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    } catch (error) {
      console.warn('SecureStore getToken error:', error);
      return null;
    }
  },

  /** 移除 JWT Token */
  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    } catch (error) {
      console.warn('SecureStore removeToken error:', error);
    }
  },

  /** 保存用户信息快照 */
  async saveUser(user: StoredUser): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
    } catch (error) {
      console.warn('SecureStore saveUser error:', error);
    }
  },

  /** 读取用户信息快照 */
  async getUser(): Promise<StoredUser | null> {
    try {
      const raw = await SecureStore.getItemAsync(USER_INFO_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StoredUser;
    } catch (error) {
      console.warn('SecureStore getUser error:', error);
      return null;
    }
  },

  /** 清空所有认证凭据 */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.removeToken(),
      SecureStore.deleteItemAsync(USER_INFO_KEY).catch(() => {}),
    ]);
  },
};
