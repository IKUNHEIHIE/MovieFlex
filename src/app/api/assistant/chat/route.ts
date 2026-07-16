import { NextRequest } from 'next/server';
import { isAuthorizationFailure, requireUser } from '@/lib/auth/authorization';
import { appendMessage, assertConversationOwner, createConversation, createConversationTitle } from '@/lib/assistant-store';
import { consumeReasoningFallback, createReasoningFallbackState, createVisibleAssistantDelta, extractOpenAIStreamDelta, isOpenAIStreamFinished, requestAssistantStream, shouldEmitReasoningProgress } from '@/lib/assistant-provider';
import { getAiProviderSettings } from '@/lib/system-settings';

type IncomingAssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
  image?: {
    dataUrl: string;
    fileName: string;
    mimeType: string;
    size: number;
  };
};

function parseMessages(messages: unknown): IncomingAssistantMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const role = record.role === 'assistant' ? 'assistant' : 'user';
      const content = typeof record.content === 'string' ? record.content.trim() : '';
      const image = record.image;
      if (image && typeof image === 'object') {
        const imageRecord = image as Record<string, unknown>;
        return {
          role,
          content,
          image: {
            dataUrl: typeof imageRecord.dataUrl === 'string' ? imageRecord.dataUrl : '',
            fileName: typeof imageRecord.fileName === 'string' ? imageRecord.fileName : '',
            mimeType: typeof imageRecord.mimeType === 'string' ? imageRecord.mimeType : '',
            size: typeof imageRecord.size === 'number' ? imageRecord.size : 0,
          },
        };
      }
      return { role, content };
    })
    .filter((item): item is IncomingAssistantMessage => Boolean(item));
}

function makeSse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const messages = parseMessages(body.messages);
  const conversationIdInput = typeof body.conversationId === 'number' ? body.conversationId : null;

  const auth = await requireUser();
  const isGuest = isAuthorizationFailure(auth);
  const provider = await getAiProviderSettings();

  if (!provider) {
    return Response.json({ error: 'AI 服务尚未配置。' }, { status: 500 });
  }

  if (!messages.length) {
    return Response.json({ error: '请输入消息。' }, { status: 400 });
  }

  if (isGuest) {
    const assistantResponse = await requestAssistantStream(provider, messages);
    if (!assistantResponse.ok || !assistantResponse.body) {
      return Response.json({ error: 'AI 服务暂时不可用，请稍后再试。' }, { status: 502 });
    }

    return streamAssistantResponse(assistantResponse.body);
  }

  const userId = auth.userId;
  const latestUserMessage = messages.findLast((message) => message.role === 'user');
  if (!latestUserMessage) {
    return Response.json({ error: '请输入用户消息。' }, { status: 400 });
  }

  if (conversationIdInput) {
    const owned = await assertConversationOwner(conversationIdInput, userId);
    if (!owned) return Response.json({ error: '会话不存在' }, { status: 404 });
  }

  const conversationId = conversationIdInput ?? (await createConversation(userId, createConversationTitle(latestUserMessage.content)));

  const conversationMessages = messages.flatMap((message) => [
    {
      role: message.role,
      content: message.content,
      image: message.image,
    },
  ]);

  const assistantResponse = await requestAssistantStream(provider, conversationMessages);
  if (!assistantResponse.ok || !assistantResponse.body) {
    return Response.json({ error: 'AI 服务暂时不可用，请稍后再试。' }, { status: 502 });
  }

  return streamAssistantResponse(assistantResponse.body, async (assistantText) => {
    await appendMessage({
      conversationId,
      role: 'user',
      content: latestUserMessage.content,
      imageFileName: latestUserMessage.image?.fileName,
      imageMimeType: latestUserMessage.image?.mimeType,
      imageSize: latestUserMessage.image?.size,
    });
    await appendMessage({
      conversationId,
      role: 'assistant',
      content: assistantText,
    });
    return { conversationId };
  });
}

function streamAssistantResponse(
  body: ReadableStream<Uint8Array>,
  onComplete?: (assistantText: string) => Promise<Record<string, unknown> | void>,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  let assistantText = '';
  let provisionalText = '';
  const fallbackState = createReasoningFallbackState();
  let reasoningChars = 0;
  let lastProgressAt = 0;
  let upstreamFinished = false;

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split(/\r?\n/);
          buffer = done ? '' : (lines.pop() ?? '');

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (data === '[DONE]') {
              upstreamFinished = true;
              break;
            }

            try {
              const payload = JSON.parse(data);
              const delta = extractOpenAIStreamDelta(payload);
              const visible = createVisibleAssistantDelta(delta, assistantText.length > 0);
              if (!visible) {
                if (isOpenAIStreamFinished(payload)) upstreamFinished = true;
                continue;
              }
              if (visible.provisional) {
                reasoningChars += visible.text.length;
                const fallbackText = consumeReasoningFallback(fallbackState, visible.text);
                if (!fallbackText) {
                  const now = Date.now();
                  if (shouldEmitReasoningProgress(lastProgressAt, now, reasoningChars)) {
                    lastProgressAt = now;
                    controller.enqueue(encoder.encode(makeSse({ reasoning: '模型正在推理中，请稍等...' })));
                  }
                  continue;
                }
                provisionalText += fallbackText;
                controller.enqueue(encoder.encode(makeSse({ text: fallbackText, provisional: true })));
              } else {
                assistantText += visible.text;
                controller.enqueue(encoder.encode(makeSse({ text: visible.text, replaceProvisional: provisionalText.length > 0 })));
              }
              if (isOpenAIStreamFinished(payload)) upstreamFinished = true;
            } catch {
              continue;
            }
          }

          if (!done && !upstreamFinished) return;
          const finalText = assistantText.trim() || provisionalText.trim();
          if (!finalText) {
            controller.enqueue(encoder.encode(makeSse({ error: 'AI 未返回可显示的回答，请稍后重试。' })));
          } else {
            const completionData = await onComplete?.(finalText);
            if (completionData) controller.enqueue(encoder.encode(makeSse(completionData)));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }
      } catch {
        controller.enqueue(encoder.encode(makeSse({ error: 'AI 响应中断，请稍后重试。' })));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
