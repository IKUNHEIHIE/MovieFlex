export type LocalAssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
  hasImage?: boolean;
  imageFileName?: string;
  imageMimeType?: string;
  imageSize?: number;
};

export type LocalAssistantConversation = {
  messages: LocalAssistantMessage[];
  updatedAt: number;
};

export const GUEST_ASSISTANT_STORAGE_KEY = 'movieflex-ai-assistant-guest-conversation';

export function parseLocalAssistantConversation(value: string | null): LocalAssistantConversation {
  if (!value) return { messages: [], updatedAt: Date.now() };

  try {
    const parsed = JSON.parse(value) as Partial<LocalAssistantConversation>;
    const messages: LocalAssistantMessage[] = Array.isArray(parsed.messages)
      ? parsed.messages
          .flatMap((message) => {
            if (!message || typeof message !== 'object') return null;
            const record = message as Record<string, unknown>;
            const role = record.role === 'assistant' ? 'assistant' : 'user';
            const content = typeof record.content === 'string' ? record.content : '';
            const item: LocalAssistantMessage = {
              role,
              content,
              hasImage: Boolean(record.hasImage),
              imageFileName: typeof record.imageFileName === 'string' ? record.imageFileName : undefined,
              imageMimeType: typeof record.imageMimeType === 'string' ? record.imageMimeType : undefined,
              imageSize: typeof record.imageSize === 'number' ? record.imageSize : undefined,
            };
            return item;
          })
          .filter((message): message is LocalAssistantMessage => Boolean(message))
      : [];

    return {
      messages,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return { messages: [], updatedAt: Date.now() };
  }
}

export function serializeLocalAssistantConversation(messages: LocalAssistantMessage[]): string {
  return JSON.stringify({ messages, updatedAt: Date.now() });
}
