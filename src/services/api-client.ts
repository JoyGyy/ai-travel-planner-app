import { API_BASE_URL } from '@/constants/config';
import { AuthStorage } from './auth-storage';

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

export const apiClient = {
  /**
   * 通用网络请求核心方法
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, skipAuth = false, headers = {}, ...restOptions } = options;

    // 构建完整 URL
    let url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    // 组装请求头
    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    };

    // 自动附加 Bearer Token
    if (!skipAuth) {
      const token = await AuthStorage.getToken();
      if (token) {
        finalHeaders.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...restOptions,
      headers: finalHeaders,
    });

    // 处理无内容响应
    if (response.status === 204) {
      return {} as T;
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        json?.message ||
        (response.status === 401
          ? '请先登录'
          : response.status === 403
            ? '权限不足'
            : response.status === 429
              ? '今日使用次数已达上限，请明天再试'
              : '服务器开小差了，请稍后重试');
      throw new ApiError(response.status, errorMessage, json);
    }

    return json as T;
  },

  /** GET 请求快捷方法 */
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: Omit<RequestOptions, 'params' | 'method'>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      params,
      ...options,
    });
  },

  /** POST 请求快捷方法 */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'body' | 'method'>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    });
  },

  /** DELETE 请求快捷方法 */
  async delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  },
};
