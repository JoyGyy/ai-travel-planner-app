/**
 * App 全局运行环境与 API 配置
 */

// 优先从环境变量读取，开发环境默认指向本地 Next.js 服务端口
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  // 认证
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  ME: '/api/auth/me',
  LOGOUT: '/api/auth/logout',
  PROFILE: '/api/auth/profile',

  // AI 旅行规划
  TRAVEL_CHAT: '/api/travel/chat',
  TRAVEL_SESSIONS: '/api/travel/chat/sessions',
  TRAVEL_SHARE: '/api/travel/share',
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
