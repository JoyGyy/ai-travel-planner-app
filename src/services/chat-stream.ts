import { API_BASE_URL, API_ENDPOINTS } from '@/constants/config';
import { AuthStorage } from './auth-storage';

export interface ChatStreamCallbacks {
  onChunk: (chunk: string) => void;
  onThought?: (thought: string) => void;
  onPlan?: (plan: any) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

export interface ChatMessagePart {
  type: 'text';
  text: string;
}

export interface ChatMessagePayload {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: ChatMessagePart[];
}

/**
 * AI 旅行规划 SSE 流式客户端
 */
export const ChatStreamService = {
  /**
   * 发起流式对话并实时解析 SSE 数据
   */
  async streamChat(
    messages: ChatMessagePayload[],
    callbacks: ChatStreamCallbacks,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    const url = `${API_BASE_URL.replace(/\/$/, '')}${API_ENDPOINTS.TRAVEL_CHAT}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json',
    };

    const token = await AuthStorage.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages, stream: true }),
        signal: abortSignal,
      });
    } catch (err: any) {
      if (abortSignal?.aborted) {
        callbacks.onDone?.();
        return;
      }
      callbacks.onError?.(err);
      return;
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson?.message || `服务器响应错误 (${response.status})`;
      callbacks.onError?.(new Error(msg));
      return;
    }

    // 处理流式 ReadableStream
    if (
      response.body &&
      typeof (response.body as any).getReader === 'function'
    ) {
      const reader = (response.body as any).getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          if (abortSignal?.aborted) {
            await reader.cancel().catch(() => {});
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          buffer = this.parseSSEBuffer(buffer, callbacks);
        }
      } catch (err: any) {
        if (!abortSignal?.aborted) {
          callbacks.onError?.(err);
        }
      } finally {
        callbacks.onDone?.();
      }
    } else {
      // 降级：如果环境不支持 ReadableStream（非标准 fetch），读取全文本按行解析
      const fullText = await response.text();
      this.parseSSEBuffer(fullText, callbacks);
      callbacks.onDone?.();
    }
  },

  /**
   * 按行解析 SSE 格式缓冲块
   */
  parseSSEBuffer(buffer: string, callbacks: ChatStreamCallbacks): string {
    const hasTrailingNewline = buffer.endsWith('\n');
    const lines = buffer.split('\n');
    // 若以换行结尾，所有行均已完整闭合；否则暂存末尾未完成的片段
    const remaining = hasTrailingNewline ? '' : lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data:')) {
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(dataStr);
          // 适配 Vercel AI SDK 7 的 text-delta 与 reasoning-delta 事件，同时兼容旧格式
          if (
            parsed.type === 'reasoning-delta' &&
            typeof parsed.delta === 'string'
          ) {
            callbacks.onThought?.(parsed.delta);
          } else if (parsed.type === 'thought') {
            const thought = parsed.delta || parsed.content;
            if (thought) callbacks.onThought?.(thought);
          } else if (
            parsed.type === 'text-delta' &&
            typeof parsed.delta === 'string'
          ) {
            callbacks.onChunk(parsed.delta);
          } else if (parsed.type === 'chunk') {
            const chunk = parsed.delta || parsed.content;
            if (chunk) callbacks.onChunk(chunk);
          } else if (parsed.type === 'plan' && parsed.content) {
            callbacks.onPlan?.(parsed.content);
          } else if (parsed.content) {
            callbacks.onChunk(parsed.content);
          } else if (typeof parsed === 'string') {
            callbacks.onChunk(parsed);
          }
        } catch {
          // 如果不是 JSON，直接作为纯文本 chunk 输出
          callbacks.onChunk(dataStr);
        }
      }
    }

    return remaining;
  },
};
