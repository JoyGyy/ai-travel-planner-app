import { ChatStreamService } from '@/services/chat-stream';
import { useChatStore } from '../use-chat-store';

jest.mock('@/services/chat-stream', () => ({
  ChatStreamService: {
    streamChat: jest.fn(),
  },
}));

describe('useChatStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatStore.getState().clearMessages();
  });

  it('sendMessage 能够发起流式生成并更新消息队列', async () => {
    (ChatStreamService.streamChat as jest.Mock).mockImplementationOnce(
      async (_payload, callbacks) => {
        callbacks.onChunk('你好！这是生成的行程。');
        callbacks.onDone();
      }
    );

    await useChatStore.getState().sendMessage('杭州3天游');

    const messages = useChatStore.getState().messages;
    expect(messages.length).toBe(3); // 默认欢迎语 + 用户消息 + AI助手消息
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toBe('杭州3天游');
    expect(messages[2].role).toBe('assistant');
    expect(messages[2].content).toBe('你好！这是生成的行程。');
    expect(useChatStore.getState().isGenerating).toBe(false);
  });

  it('stopGenerating 能够中止生成任务', () => {
    const abortSpy = jest.fn();
    useChatStore.setState({
      isGenerating: true,
      abortController: { abort: abortSpy } as any,
    });

    useChatStore.getState().stopGenerating();

    expect(abortSpy).toHaveBeenCalled();
    expect(useChatStore.getState().isGenerating).toBe(false);
    expect(useChatStore.getState().abortController).toBeNull();
  });
});

