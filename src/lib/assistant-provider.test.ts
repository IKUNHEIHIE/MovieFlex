import { describe, expect, it } from 'vitest';
import { buildAssistantRequestBody, buildOpenAIMessages, extractOpenAIStreamText, extractOpenAIStreamDelta, createReasoningFallbackState, consumeReasoningFallback, createVisibleAssistantDelta, shouldEmitReasoningProgress, isOpenAIStreamFinished } from './assistant-provider';

describe('assistant provider', () => {
  it('builds OpenAI-compatible image messages', () => {
    const messages = buildOpenAIMessages([
      {
        role: 'user',
        content: '这是什么电影？',
        image: {
          dataUrl: 'data:image/jpeg;base64,abc',
          fileName: 'cover.jpg',
          mimeType: 'image/jpeg',
          size: 123,
        },
      },
    ]);

    expect(messages[0].role).toBe('system');
    expect(messages[1]).toEqual({
      role: 'user',
      content: [
        { type: 'text', text: '这是什么电影？' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc' } },
      ],
    });
  });

  it('extracts text from common OpenAI stream payloads', () => {
    expect(extractOpenAIStreamText({ choices: [{ delta: { content: '你好' } }] })).toBe('你好');
    expect(extractOpenAIStreamText({ choices: [{ message: { content: '世界' } }] })).toBe('世界');
    expect(extractOpenAIStreamText({ choices: [{ delta: { content: [{ text: '片段' }] } }] })).toBe('片段');
  });

  it('extracts reasoning separately from visible answer text', () => {
    expect(extractOpenAIStreamDelta({ choices: [{ delta: { reasoning: 'Thinking' } }] })).toEqual({
      reasoning: 'Thinking',
      text: '',
    });
    expect(extractOpenAIStreamDelta({ choices: [{ delta: { content: '好' } }] })).toEqual({
      reasoning: '',
      text: '好',
    });
  });

  it('exposes reasoning as provisional visible text until answer content arrives', () => {
    const first = createVisibleAssistantDelta({ text: '', reasoning: 'Thinking' }, false);
    expect(first).toEqual({ text: 'Thinking', provisional: true });

    const answer = createVisibleAssistantDelta({ text: '推荐《银翼杀手2049》', reasoning: '' }, true);
    expect(answer).toEqual({ text: '推荐《银翼杀手2049》', provisional: false });
  });

  it('streams only the final draft portion from reasoning fallback', () => {
    const state = createReasoningFallbackState();

    expect(consumeReasoningFallback(state, 'Thinking Process: choose movie.')).toBe('');
    expect(consumeReasoningFallback(state, ' Final Draft: 推荐《星际')).toBe(' 推荐《星际');
    expect(consumeReasoningFallback(state, '穿越》。\nCharacter count: 8')).toBe('穿越》。');
    expect(consumeReasoningFallback(state, ' should be ignored')).toBe('');
  });

  it('throttles reasoning progress updates', () => {
    expect(shouldEmitReasoningProgress(0, 0, 20)).toBe(true);
    expect(shouldEmitReasoningProgress(1000, 300, 30)).toBe(false);
    expect(shouldEmitReasoningProgress(1000, 2300, 30)).toBe(true);
    expect(shouldEmitReasoningProgress(1000, 300, 160)).toBe(true);
  });

  it('requests no hidden reasoning when provider supports reasoning_effort', () => {
    expect(buildAssistantRequestBody('sensenova-6.7-flash-lite', [{ role: 'user', content: '好' }])).toMatchObject({
      model: 'sensenova-6.7-flash-lite',
      reasoning_effort: 'none',
      stream: true,
    });
  });

  it('detects stream finish reasons', () => {
    expect(isOpenAIStreamFinished({ choices: [{ finish_reason: 'stop' }] })).toBe(true);
    expect(isOpenAIStreamFinished({ choices: [{ finish_reason: '' }] })).toBe(false);
  });
});
