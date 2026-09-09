import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '@/constants/config';
import { apiClient } from './api-client';
import { AuthStorage } from './auth-storage';

export interface ChatSessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thought?: string;
  plan?: any;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  city?: string;
  messages: ChatSessionMessage[];
  createdAt: number;
  updatedAt: number;
}

const LOCAL_SESSIONS_KEY = '@chat_sessions_cache';

export const ChatSessionService = {
  /**
   * 获取所有会话列表
   */
  async listSessions(): Promise<ChatSession[]> {
    let localSessions: ChatSession[] = [];
    try {
      const raw = await AsyncStorage.getItem(LOCAL_SESSIONS_KEY);
      if (raw) {
        localSessions = JSON.parse(raw);
      }
    } catch {
      localSessions = [];
    }

    const token = await AuthStorage.getToken();
    if (!token) {
      return localSessions;
    }

    // 在线拉取云端会话
    try {
      const res = await apiClient.get<{
        success: boolean;
        sessions: ChatSession[];
      }>(API_ENDPOINTS.TRAVEL_SESSIONS);

      if (Array.isArray(res?.sessions)) {
        // 合并云端与本地会话（以云端为主，本地未上传的做补充）
        const map = new Map<string, ChatSession>();
        localSessions.forEach((s) => map.set(s.id, s));
        res.sessions.forEach((s) => map.set(s.id, s));

        const merged = Array.from(map.values()).sort(
          (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
        );
        await AsyncStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch {
      // 离线或网络异常回退到本地
    }

    return localSessions;
  },

  /**
   * 保存或更新单条会话
   */
  async saveSession(session: ChatSession): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_SESSIONS_KEY);
      const list: ChatSession[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((s) => s.id === session.id);

      if (idx !== -1) {
        list[idx] = session;
      } else {
        list.unshift(session);
      }

      await AsyncStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('saveSession local error:', e);
    }

    const token = await AuthStorage.getToken();
    if (token) {
      try {
        await apiClient.post(API_ENDPOINTS.TRAVEL_SESSIONS, {
          id: session.id,
          title: session.title,
          city: session.city,
          messages: session.messages,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        });
      } catch (e) {
        console.warn('saveSession cloud error:', e);
      }
    }
  },

  /**
   * 删除指定会话
   */
  async deleteSession(id: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_SESSIONS_KEY);
      if (raw) {
        const list: ChatSession[] = JSON.parse(raw);
        const filtered = list.filter((s) => s.id !== id);
        await AsyncStorage.setItem(
          LOCAL_SESSIONS_KEY,
          JSON.stringify(filtered),
        );
      }
    } catch (e) {
      console.warn('deleteSession local error:', e);
    }

    const token = await AuthStorage.getToken();
    if (token) {
      try {
        await apiClient.delete(API_ENDPOINTS.TRAVEL_SESSION_DETAIL(id));
      } catch (e) {
        console.warn('deleteSession cloud error:', e);
      }
    }
  },
};
