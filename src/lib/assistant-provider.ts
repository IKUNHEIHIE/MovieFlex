import type { AssistantChatMessage } from './assistant-types';
import type { AiProviderSettings } from './system-settings';

export type OpenAIChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type OpenAIChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIChatContentPart[];
};

export const ASSISTANT_SYSTEM_PROMPT = `
你是 MovieFlex 网站里的影视 AI 助手，名字是观影小助手。

请始终使用自然、友好、简洁的中文回答。
你可以帮助用户：
- 根据类型、年份、地区、演员、心情和观看历史给出电影推荐。
- 根据用户上传的电影封皮判断可能的电影，并说明不确定性。
- 解答 MovieFlex 的使用问题，例如登录、收藏、观看历史和影片浏览。
- 回答一般影视知识问题。

规则：
- 不要提供盗版资源链接。
- 不要虚构 MovieFlex 中不存在的播放地址、用户数据或后台功能。
- 对封皮识别保持谨慎，不确定时给出候选和判断依据。
- 直接输出最终回答，不要展示分析过程、思考过程或英文推理。
- 每次回答优先控制在 300 字以内。
`.trim();

export function buildOpenAIMessages(messages: AssistantChatMessage[]): OpenAIChatMessage[] {
  return [
    { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
    ...messages.map((message): OpenAIChatMessage => {
      if (message.image) {
        return {
          role: message.role,
          content: [
            { type: 'text', text: message.content || '请识别这张电影封皮，并推荐相似影片。' },
            { type: 'image_url', image_url: { url: message.image.dataUrl } },
          ],
        };
      }

      return { role: message.role, content: message.content };
    }),
  ];
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const record = part as Record<string, unknown>;
      if (typeof record.text === 'string') return record.text;
      if (record.type === 'text' && typeof record.content === 'string') return record.content;
      return '';
    })
    .join('');
}

export function extractOpenAIStreamText(payload: unknown): string {
  return extractOpenAIStreamDelta(payload).text;
}

export function extractOpenAIStreamDelta(payload: unknown): { text: string; reasoning: string } {
  if (!payload || typeof payload !== 'object') return { text: '', reasoning: '' };

  const record = payload as Record<string, unknown>;
  const choices = record.choices;
  const choice = Array.isArray(choices) ? choices[0] : undefined;
  if (!choice || typeof choice !== 'object') return { text: extractTextContent(record.content), reasoning: '' };

  const choiceRecord = choice as Record<string, unknown>;
  const delta = choiceRecord.delta;
  const message = choiceRecord.message;
  const content =
    (delta && typeof delta === 'object' ? (delta as Record<string, unknown>).content : undefined) ??
    (message && typeof message === 'object' ? (message as Record<string, unknown>).content : undefined) ??
    choiceRecord.text;
  const reasoning =
    delta && typeof delta === 'object'
      ? (delta as Record<string, unknown>).reasoning ?? (delta as Record<string, unknown>).reasoning_content
      : undefined;

  return { text: extractTextContent(content), reasoning: extractTextContent(reasoning) };
}

export function isOpenAIStreamFinished(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const choices = (payload as Record<string, unknown>).choices;
  const choice = Array.isArray(choices) ? choices[0] : undefined;
  if (!choice || typeof choice !== 'object') return false;
  const finishReason = (choice as Record<string, unknown>).finish_reason;
  return typeof finishReason === 'string' && finishReason.length > 0;
}

export function createVisibleAssistantDelta(
  delta: { text: string; reasoning: string },
  hasVisibleAnswer: boolean,
): { text: string; provisional: boolean } | null {
  if (delta.text) return { text: delta.text, provisional: false };
  if (!hasVisibleAnswer && delta.reasoning) return { text: delta.reasoning, provisional: true };
  return null;
}

export type ReasoningFallbackState = {
  buffer: string;
  active: boolean;
  stopped: boolean;
};

export function createReasoningFallbackState(): ReasoningFallbackState {
  return { buffer: '', active: false, stopped: false };
}

export function consumeReasoningFallback(state: ReasoningFallbackState, chunk: string): string {
  if (!chunk || state.stopped) return '';
  state.buffer += chunk;

  if (!state.active) {
    const markerMatch = state.buffer.match(/(?:Final Draft|Final Answer|最终答案|最终回复|答案)\s*[:：]/i);
    if (!markerMatch || markerMatch.index === undefined) {
      state.buffer = state.buffer.slice(-80);
      return '';
    }
    state.active = true;
    state.buffer = state.buffer.slice(markerMatch.index + markerMatch[0].length);
  }

  const stopMatch = state.buffer.match(/\n\s*(?:Character count|Count characters|Final Check|Refine|\d+\.|\*\s)/i);
  const output = stopMatch && stopMatch.index !== undefined
    ? state.buffer.slice(0, stopMatch.index)
    : state.buffer;
  state.buffer = '';
  if (stopMatch) state.stopped = true;
  return output;
}

export function shouldEmitReasoningProgress(lastEmittedAt: number, now: number, reasoningChars: number): boolean {
  return reasoningChars > 0 && (lastEmittedAt === 0 || now - lastEmittedAt >= 1000 || reasoningChars % 160 === 0);
}

export function buildAssistantRequestBody(modelId: string, messages: AssistantChatMessage[]) {
  return {
    model: modelId,
    messages: buildOpenAIMessages(messages),
    stream: true,
    max_tokens: 1200,
    temperature: 0.7,
    // SenseNova reasoning models otherwise stream hidden reasoning for a long
    // time before any visible content. OpenAI-compatible providers that do not
    // recognize this field should ignore it or return a normal validation error.
    reasoning_effort: 'none',
  };
}

export async function requestAssistantStream(settings: AiProviderSettings, messages: AssistantChatMessage[]) {
  return fetch(settings.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(buildAssistantRequestBody(settings.modelId, messages)),
    signal: AbortSignal.timeout(120_000),
  });
}
