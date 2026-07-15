import { NextRequest, NextResponse } from 'next/server';

const systemPrompt = `
你是 MovieFlex 网站里的影视小助手，名字是芙宁娜。

请始终使用自然、友好、简洁的中文回答。
你可以帮助用户：
- 解答 MovieFlex 的使用问题，例如登录、收藏、观看历史和影片浏览。
- 回答一般影视知识问题。
- 提供不包含盗版资源链接的观影建议。

规则：
- 不要虚构 MovieFlex 中不存在的影片、用户数据、播放地址或网站功能。
- 不确定时直接说“我暂时无法确认”。
- 每次回答控制在 150 字以内。
`.trim();

function getAssistantText(chunk: unknown): string {
  if (!chunk || typeof chunk !== 'object') return '';

  const payload = chunk as Record<string, unknown>;
  const nestedPayload = payload.data;
  const source =
    nestedPayload && typeof nestedPayload === 'object'
      ? nestedPayload as Record<string, unknown>
      : payload;
  const choices = source.choices;
  const choice = Array.isArray(choices) ? choices[0] : undefined;

  if (!choice || typeof choice !== 'object') {
    return typeof source.content === 'string' ? source.content : '';
  }

  const value = choice as Record<string, unknown>;
  const delta = value.delta;
  const message = value.message;
  const content =
    (delta && typeof delta === 'object'
      ? (delta as Record<string, unknown>).content
      : undefined) ??
    (message && typeof message === 'object'
      ? (message as Record<string, unknown>).content
      : undefined) ??
    value.text;

  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((part) =>
      part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string'
        ? (part as Record<string, unknown>).text
        : '',
    )
    .join('');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ error: '请输入想问的问题。' }, { status: 400 });
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: '单次提问不能超过 1000 个字符。' }, { status: 400 });
    }

    const apiKey = process.env.SENSENOVA_API_KEY;
    const model = process.env.SENSENOVA_MODEL ?? 'sensenova-6.7-flash-lite';

    if (!apiKey) {
      return NextResponse.json({ error: 'AI 服务尚未配置 API Key。' }, { status: 500 });
    }

    const response = await fetch('https://token.sensenova.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        stream: true,
        // This model emits reasoning before its visible answer; the limit
        // includes both, so 500 can truncate the reply before content arrives.
        max_tokens: 1200,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok || !response.body) {
      const detail = await response.text();
      console.error('SenseNova API error:', response.status, detail);
      return NextResponse.json({ error: 'AI 服务暂时不可用，请稍后再试。' }, { status: 502 });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';
    let receivedText = false;

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
              if (data === '[DONE]') continue;

              try {
                const text = getAssistantText(JSON.parse(data));
                if (!text) continue;
                receivedText = true;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              } catch {
                console.warn('SenseNova returned an invalid SSE event.');
              }
            }

            if (!done) return;

            if (!receivedText) {
              controller.enqueue(encoder.encode('data: {"error":"AI 未返回可显示的回答，请稍后重试。"}\n\n'));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }
        } catch (error) {
          console.error('SenseNova stream error:', error);
          controller.enqueue(encoder.encode('data: {"error":"AI 响应中断，请稍后重试。"}\n\n'));
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
  } catch (error) {
    console.error('Assistant API error:', error);
    return NextResponse.json({ error: '助手暂时无法回答，请稍后再试。' }, { status: 500 });
  }
}
