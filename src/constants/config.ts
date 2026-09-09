/**
 * App 全局运行环境与 API 配置
 */

import Constants from 'expo-constants';

/**
 * 获取 API 基础地址：
 * 1. 优先从环境变量 EXPO_PUBLIC_API_URL 读取（例如生产环境或本地配置）
 * 2. 开发环境下自动提取 Metro Bundler 的主机局域网 IP（解决手机连电脑开发时 localhost 指向手机自身的问题）
 * 3. 兜底回退为 http://localhost:3000
 */
export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3000`;
    }
  }

  return 'http://localhost:3000';
}

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  // 认证
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  ME: '/api/auth/me',
  LOGOUT: '/api/auth/logout',
  PROFILE: '/api/auth/profile',
  PASSWORD: '/api/auth/password',

  // AI 旅行规划
  TRAVEL_CHAT: '/api/travel/chat',
  TRAVEL_SESSIONS: '/api/travel/chat/sessions',
  TRAVEL_SESSION_DETAIL: (id: string) => `/api/travel/chat/sessions/${id}`,
  TRAVEL_SHARE: '/api/travel/share',
  TRAVEL_SHARE_DETAIL: (id: string) => `/api/travel/share/${id}`,
  TRAVEL_RECOMMEND: '/api/travel/recommend',

  // 景点与城市
  CITIES: '/api/cities',
  ATTRACTIONS: '/api/attractions',
  ATTRACTION_DETAIL: (id: string) => `/api/attractions/${id}`,
  ATTRACTION_FAVORITE: (id: string) => `/api/attractions/${id}/favorite`,
  FAVORITES: '/api/attractions/favorites',

  // 天气
  WEATHER: '/api/weather',

  // 社区 (二期)
  COMMUNITY_POSTS: '/api/community/posts',
} as const;
