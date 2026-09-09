import { apiClient } from '@/services/api-client';
import { AuthStorage } from '@/services/auth-storage';
import { useAuthStore } from '../use-auth-store';

jest.mock('@/services/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
  setOnUnauthorizedHandler: jest.fn(),
}));

describe('useAuthStore', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AuthStorage.clearAll();
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,
    });
  });

  it('initAuth 能从本地存储恢复登录态', async () => {
    await AuthStorage.saveToken('stored-token');
    await AuthStorage.saveUser({ id: 'u1', username: 'tester' });

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      user: { id: 'u1', username: 'tester' },
    });

    await useAuthStore.getState().initAuth();

    expect(useAuthStore.getState().token).toBe('stored-token');
    expect(useAuthStore.getState().user).toEqual({
      id: 'u1',
      username: 'tester',
    });
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  it('login 成功后更新 store 并写入存储', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      token: 'jwt-new-token',
      user: { id: 'u2', username: 'traveler' },
    });

    await useAuthStore.getState().login('traveler', 'Password123');

    expect(useAuthStore.getState().token).toBe('jwt-new-token');
    expect(useAuthStore.getState().user?.username).toBe('traveler');
    expect(await AuthStorage.getToken()).toBe('jwt-new-token');
  });

  it('logout 清空 store 和本地存储', async () => {
    useAuthStore.setState({
      token: 'token-to-delete',
      user: { id: 'u3', username: 'bob' },
    });
    await AuthStorage.saveToken('token-to-delete');

    (apiClient.post as jest.Mock).mockResolvedValueOnce({ success: true });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(await AuthStorage.getToken()).toBeNull();
  });
});
