import { apiClient, ApiError } from '../api-client';
import { AuthStorage } from '../auth-storage';

// 模拟全局 fetch
const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

describe('apiClient', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AuthStorage.clearAll();
  });

  it('成功发送 GET 请求并返回解析后的 JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: ['北京', '上海'] }),
    });

    const result = await apiClient.get<{ success: boolean; data: string[] }>('/api/cities');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual(['北京', '上海']);
    const [callUrl, callOptions] = mockFetch.mock.calls[0];
    expect(callUrl).toContain('/api/cities');
    expect(callOptions.method).toBe('GET');
  });

  it('如果已登录，请求头自动携带 Bearer Token', async () => {
    await AuthStorage.saveToken('jwt-bearer-xyz');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiClient.post('/api/test', { name: 'test' });

    const [, callOptions] = mockFetch.mock.calls[0];
    expect(callOptions.headers.Authorization).toBe('Bearer jwt-bearer-xyz');
    expect(callOptions.headers['Content-Type']).toBe('application/json');
  });

  it('skipAuth 为 true 时不携带 Bearer Token', async () => {
    await AuthStorage.saveToken('jwt-bearer-xyz');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiClient.get('/api/public', undefined, { skipAuth: true });

    const [, callOptions] = mockFetch.mock.calls[0];
    expect(callOptions.headers.Authorization).toBeUndefined();
  });

  it('服务端返回 401 时抛出特定 ApiError', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: '未登录' }),
    });

    let error: ApiError | null = null;
    try {
      await apiClient.get('/api/protected');
    } catch (err) {
      error = err as ApiError;
    }

    expect(error).toBeInstanceOf(ApiError);
    expect(error?.status).toBe(401);
    expect(error?.message).toBe('未登录');
  });

  it('拼接 Query Params 参数', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ list: [] }),
    });

    await apiClient.get('/api/attractions', { city: '杭州', limit: 10 });

    const [callUrl] = mockFetch.mock.calls[0];
    expect(callUrl).toContain('city=%E6%9D%AD%E5%B7%9E');
    expect(callUrl).toContain('limit=10');
  });
});
