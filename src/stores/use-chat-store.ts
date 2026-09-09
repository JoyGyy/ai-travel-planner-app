import { create } from 'zustand';
import { ChatMessagePayload, ChatStreamService } from '@/services/chat-stream';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thought?: string;
  plan?: any;
  createdAt: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  abortController: AbortController | null;
  currentPlan: any | null;

  /** 发送消息并开启流式响应 */
  sendMessage: (content: string) => Promise<void>;

  /** 中止当前生成 */
  stopGenerating: () => void;

  /** 清空对话会话 */
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '你好！我是你的专属 AI 旅行手账规划助理。告诉我你想去哪儿、打算玩几天、有什么喜好或预算限制，我将为你量身定制一份结构化手账行程！✨',
      createdAt: Date.now(),
    },
  ],
  isGenerating: false,
  abortController: null,
  currentPlan: null,

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
          },
          onDone: () => {
            set({ isGenerating: false, abortController: null });
          },
        },
        controller.signal,
      );
    } catch {
      set({ isGenerating: false, abortController: null });
    }
  },

  stopGenerating: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({ isGenerating: false, abortController: null });
  },

  clearMessages: () => {
    get().stopGenerating();
    set({
      messages: [
        {
          id: 'welcome_reset',
          role: 'assistant',
          content: '新会话已开启。今天想去哪座城市漫游呢？告诉我你的心愿吧！🌸',
          createdAt: Date.now(),
        },
      ],
      currentPlan: null,
    });
  },
}));
