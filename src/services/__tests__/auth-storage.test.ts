import { AuthStorage, StoredUser } from '../auth-storage';

describe('AuthStorage', () => {
  beforeEach(async () => {
    await AuthStorage.clearAll();
  });

  it('能正确存储、读取与移除 Token', async () => {
    expect(await AuthStorage.getToken()).toBeNull();

    await AuthStorage.saveToken('test-jwt-token-123');
    expect(await AuthStorage.getToken()).toBe('test-jwt-token-123');

    await AuthStorage.removeToken();
    expect(await AuthStorage.getToken()).toBeNull();
  });

  it('能正确存储与读取用户信息', async () => {
    const user: StoredUser = {
      id: 'user-001',
      username: 'traveler',
      role: 'user',
    };

    await AuthStorage.saveUser(user);
    const loaded = await AuthStorage.getUser();
    expect(loaded).toEqual(user);
  });

  it('clearAll 清除所有凭据', async () => {
    await AuthStorage.saveToken('token-abc');
    await AuthStorage.saveUser({ id: '1', username: 'alice' });

    await AuthStorage.clearAll();
    expect(await AuthStorage.getToken()).toBeNull();
    expect(await AuthStorage.getUser()).toBeNull();
  });
});

