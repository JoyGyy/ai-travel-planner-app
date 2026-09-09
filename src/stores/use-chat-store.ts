import { create } from 'zustand';
import { ChatMessagePayload, ChatStreamService } from '@/services/chat-stream';
import {
  ChatSession,
  ChatSessionMessage,
  ChatSessionService,
} from '@/services/chat-session-service';

export type ChatMessage = ChatSessionMessage;

export interface ChatState {
  currentSessionId: string;
  sessions: ChatSession[];
  messages: ChatMessage[];
  isGenerating: boolean;
  abortController: AbortController | null;
  currentPlan: any | null;

  /** 加载历史会话列表 */
  loadSessions: () => Promise<void>;

  /** 切换到指定历史会话 */
  switchSession: (sessionId: string) => Promise<void>;

  /** 新建规划会话 */
  createNewSession: () => void;

  /** 删除某个会话 */
  deleteSession: (sessionId: string) => Promise<void>;

  /** 发送消息并开启流式响应 */
  sendMessage: (content: string) => Promise<void>;

  /** 中止当前生成 */
  stopGenerating: () => void;

  /** 清空当前会话消息 */
  clearMessages: () => void;

  /** 保存同步当前会话 */
  syncCurrentSession: () => Promise<void>;
}

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    '你好！我是你的专属 AI 旅行手账规划助理。告诉我你想去哪儿、打算玩几天、有什么喜好或预算限制，我将为你量身定制一份结构化手账行程！✨',
  createdAt: Date.now(),
};

const INITIAL_SESSION_ID = 'session_default';

export const useChatStore = create<ChatState>((set, get) => ({
  currentSessionId: INITIAL_SESSION_ID,
  sessions: [],
  messages: [DEFAULT_WELCOME_MESSAGE],
  isGenerating: false,
  abortController: null,
  currentPlan: null,

  loadSessions: async () => {
    try {
      const list = await ChatSessionService.listSessions();
      set({ sessions: list });
    } catch (e) {
      console.warn('loadSessions error:', e);
    }
  },

  switchSession: async (sessionId: string) => {
    get().stopGenerating();
    const target = get().sessions.find((s) => s.id === sessionId);
    if (target) {
      const lastPlanMsg = [...target.messages]
        .reverse()
        .find((m) => !!m.plan);
      set({
        currentSessionId: target.id,
        messages: target.messages.length > 0 ? target.messages : [DEFAULT_WELCOME_MESSAGE],
        currentPlan: lastPlanMsg?.plan || null,
      });
    }
  },

  createNewSession: () => {
    get().stopGenerating();
    const newId = `session_${Date.now()}`;
    set({
      currentSessionId: newId,
      messages: [
        {
          id: `welcome_${Date.now()}`,
          role: 'assistant',
          content:
            '新会话已开启。今天想去哪座城市漫游呢？告诉我你的心愿吧！🌸',
          createdAt: Date.now(),
        },
      ],
      currentPlan: null,
    });
  },

  deleteSession: async (sessionId: string) => {
    await ChatSessionService.deleteSession(sessionId);
    const updated = get().sessions.filter((s) => s.id !== sessionId);
    set({ sessions: updated });

    if (get().currentSessionId === sessionId) {
      if (updated.length > 0) {
        get().switchSession(updated[0].id);
      } else {
        get().createNewSession();
      }
    }
  },

  syncCurrentSession: async () => {
    const { currentSessionId, messages } = get();
    if (messages.length <= 1) return;

    // 提取会话标题（取首个用户发言的前 20 字符）
    const firstUserMsg = messages.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 24)
      : '旅行手账规划';

    const session: ChatSession = {
      id: currentSessionId,
      title,
      messages,
      createdAt: messages[0]?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await ChatSessionService.saveSession(session);
    // 更新内存中的 sessions 列表
    const sessions = get().sessions;
    const idx = sessions.findIndex((s) => s.id === currentSessionId);
    let nextSessions: ChatSession[];
    if (idx !== -1) {
      nextSessions = [...sessions];
      nextSessions[idx] = session;
    } else {
      nextSessions = [session, ...sessions];
    }
    set({ sessions: nextSessions });
  },

  sendMessage: async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || get().isGenerating) return;

    const userMsgId = `user_${Date.now()}`;
    const assistantMsgId = `ai_${Date.now() + 1}`;

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };

    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      thought: '',
      createdAt: Date.now() + 1,
    };

    const nextMessages = [...get().messages, userMessage, assistantMessage];
    const controller = new AbortController();

    set({
      messages: nextMessages,
      isGenerating: true,
      abortController: controller,
    });

    const payloadMessages: ChatMessagePayload[] = nextMessages
      .filter((m) => m.content.trim())
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        parts: [{ type: 'text', text: m.content }],
      }));

    try {
      await ChatStreamService.streamChat(
        payloadMessages,
        {
          onChunk: (chunk: string) => {
            set((state) => {
              const msgs = [...state.messages];
              const targetIdx = msgs.findIndex((m) => m.id === assistantMsgId);
              if (targetIdx !== -1) {
                msgs[targetIdx] = {
                  ...msgs[targetIdx],
                  content: msgs[targetIdx].content + chunk,
                };
              }
              return { messages: msgs };
            });
          },
          onThought: (thought: string) => {
            set((state) => {
              const msgs = [...state.messages];
              const targetIdx = msgs.findIndex((m) => m.id === assistantMsgId);
              if (targetIdx !== -1) {
                msgs[targetIdx] = {
                  ...msgs[targetIdx],
                  thought: (msgs[targetIdx].thought || '') + thought,
                };
              }
              return { messages: msgs };
            });
          },
          onPlan: (plan: any) => {
            set((state) => {
              const msgs = [...state.messages];
              const targetIdx = msgs.findIndex((m) => m.id === assistantMsgId);
              if (targetIdx !== -1) {
                msgs[targetIdx] = {
                  ...msgs[targetIdx],
                  plan,
                };
              }
              return { messages: msgs, currentPlan: plan };
            });
            get().syncCurrentSession().catch(() => {});
          },
          onError: (error: Error) => {
            set((state) => {
              const msgs = [...state.messages];
              const targetIdx = msgs.findIndex((m) => m.id === assistantMsgId);
              if (targetIdx !== -1) {
                let errorNotice = error.message || '网络连接异常，请重试';
                if (
                  errorNotice.includes('未登录') ||
                  errorNotice.includes('401')
                ) {
                  errorNotice =
                    '请先在“我的”页面登录账号，即可畅享 AI 专属旅行规划服务 ✨';
                }
                msgs[targetIdx] = {
                  ...msgs[targetIdx],
                  content:
                    msgs[targetIdx].content ||
                    `⚠️ 对话提示: ${errorNotice}`,
                };
              }
              return { messages: msgs };
            });
            get().syncCurrentSession().catch(() => {});
          },
          onDone: () => {
            set({ isGenerating: false, abortController: null });
            get().syncCurrentSession().catch(() => {});
          },
        },
        controller.signal,
      );
    } catch {
      set({ isGenerating: false, abortController: null });
      get().syncCurrentSession().catch(() => {});
    }
  },

  stopGenerating: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({ isGenerating: false, abortController: null });
    get().syncCurrentSession().catch(() => {});
  },

  clearMessages: () => {
    get().stopGenerating();
    set({
      messages: [
        {
          id: 'welcome_reset',
          role: 'assistant',
          content: '当前会话已重置。今天想去哪座城市漫游呢？告诉我你的心愿吧！🌸',
          createdAt: Date.now(),
        },
      ],
      currentPlan: null,
    });
  },
}));

