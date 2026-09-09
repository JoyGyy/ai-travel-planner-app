import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api-client';
import { AuthStorage } from '../auth-storage';
import { ChatSession, ChatSessionService } from '../chat-session-service';

jest.mock('../api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../auth-storage', () => ({
  AuthStorage: {
    getToken: jest.fn(),
  },
}));

const mockSession: ChatSession = {
  id: 'sess_1',
  title: '杭州3日游规划',
  city: '杭州',
  messages: [
    {
      id: 'm1',
      role: 'user',
      content: '去杭州玩3天',
      createdAt: 1000,
    },
  ],
  createdAt: 1000,
  updatedAt: 1000,
};

describe('ChatSessionService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('listSessions 未登录时从本地 AsyncStorage 读取', async () => {
    (AuthStorage.getToken as jest.Mock).mockResolvedValueOnce(null);
    await AsyncStorage.setItem(
      '@chat_sessions_cache',
      JSON.stringify([mockSession]),
    );

    const sessions = await ChatSessionService.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('sess_1');
  });

  it('listSessions 登录时合并云端会话并缓存本地', async () => {
    (AuthStorage.getToken as jest.Mock).mockResolvedValueOnce('mock_token');
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      sessions: [
        {
          ...mockSession,
          id: 'sess_cloud',
          title: '成都美食游',
          updatedAt: 2000,
        },
      ],
    });

    const sessions = await ChatSessionService.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('sess_cloud');

    // 验证写入了本地缓存
    const cached = await AsyncStorage.getItem('@chat_sessions_cache');
    expect(cached).toContain('sess_cloud');
  });

  it('saveSession 成功保存到本地并在登录时同步至云端', async () => {
    (AuthStorage.getToken as jest.Mock).mockResolvedValueOnce('mock_token');
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ success: true });

    await ChatSessionService.saveSession(mockSession);

    const cached = await AsyncStorage.getItem('@chat_sessions_cache');
    expect(cached).toContain('sess_1');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/travel/chat/sessions',
      expect.objectContaining({ id: 'sess_1', title: '杭州3日游规划' }),
    );
  });

  it('deleteSession 成功从本地和云端删除', async () => {
    await AsyncStorage.setItem(
      '@chat_sessions_cache',
      JSON.stringify([mockSession]),
    );
    (AuthStorage.getToken as jest.Mock).mockResolvedValueOnce('mock_token');
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({ success: true });

    await ChatSessionService.deleteSession('sess_1');

    const cached = await AsyncStorage.getItem('@chat_sessions_cache');
    expect(JSON.parse(cached || '[]')).toHaveLength(0);
    expect(apiClient.delete).toHaveBeenCalledWith(
      '/api/travel/chat/sessions/sess_1',
    );
  });
});
