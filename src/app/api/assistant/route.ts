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

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Assistant API error:', error);
    return NextResponse.json({ error: '助手暂时无法回答，请稍后再试。' }, { status: 500 });
  }
}
