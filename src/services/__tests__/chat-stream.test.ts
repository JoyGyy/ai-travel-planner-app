import { ChatStreamService } from '../chat-stream';

describe('ChatStreamService', () => {
  it('parseSSEBuffer 能解析 JSON chunk 与 thought', () => {
    const onChunk = jest.fn();
    const onThought = jest.fn();
    const onPlan = jest.fn();

    const sample = [
      'data: {"type":"thought","content":"正在分析西湖景点..."}',
      'data: {"type":"chunk","content":"你好！为你推荐西湖3日游："}',
      'data: {"type":"plan","content":{"title":"西湖手账游","days":3}}',
      'data: [DONE]',
    ].join('\n') + '\n';

    const remaining = ChatStreamService.parseSSEBuffer(sample, {
      onChunk,
      onThought,
      onPlan,
    });

    expect(remaining).toBe('');
    expect(onThought).toHaveBeenCalledWith('正在分析西湖景点...');
    expect(onChunk).toHaveBeenCalledWith('你好！为你推荐西湖3日游：');
    expect(onPlan).toHaveBeenCalledWith({ title: '西湖手账游', days: 3 });
  });

  it('parseSSEBuffer 能保留最后一行未闭合的 buffer', () => {
    const onChunk = jest.fn();
    const incomplete = 'data: {"type":"chunk","content":"第一段文字"}\ndata: {"type":"chun';

    const remaining = ChatStreamService.parseSSEBuffer(incomplete, { onChunk });

    expect(onChunk).toHaveBeenCalledWith('第一段文字');
    expect(remaining).toBe('data: {"type":"chun');
  });

  it('parseSSEBuffer 能直接兼容非 JSON 纯文本流', () => {
    const onChunk = jest.fn();
    const rawTextStream = 'data: 这是纯文本回答的第一句\ndata: 这是第二句\n';

    ChatStreamService.parseSSEBuffer(rawTextStream, { onChunk });

    expect(onChunk).toHaveBeenCalledWith('这是纯文本回答的第一句');
    expect(onChunk).toHaveBeenCalledWith('这是第二句');
  });
});
