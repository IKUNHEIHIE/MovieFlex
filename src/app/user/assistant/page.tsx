import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session-user';

export default async function UserAssistantPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const userId = Number(user.id);
  const params = await searchParams;
  const selectedId = Number(params.conversation);
  const conversations = await prisma.aiConversation.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  const activeId = Number.isSafeInteger(selectedId) && selectedId > 0 ? selectedId : conversations[0]?.id;
  const active = activeId ? await prisma.aiConversation.findFirst({ where: { id: activeId, userId }, include: { messages: { orderBy: { createdAt: 'asc' } } } }) : null;

  return (
    <main className="container" style={{ paddingTop: 36, paddingBottom: 60 }}>
      <section className="glass" style={{ padding: 28, borderRadius: 12, marginBottom: 20 }}>
        <h1>AI 助手记录</h1>
        <p style={{ color: 'var(--muted)' }}>登录用户的多会话记录会保存在这里。游客对话仅保存在浏览器本地。</p>
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) minmax(0, 1fr)', gap: 20 }}>
        <aside className="glass" style={{ padding: 18, borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>会话</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {conversations.map((conversation) => (
              <Link key={conversation.id} href={`/user/assistant?conversation=${conversation.id}`} style={{ padding: 12, borderRadius: 10, textDecoration: 'none', color: 'inherit', background: conversation.id === active?.id ? 'rgba(79,125,243,.16)' : 'rgba(255,255,255,.48)' }}>
                <strong>{conversation.title}</strong>
                <p style={{ margin: '4px 0', color: 'var(--muted)', fontSize: '.86rem' }}>{conversation.messages[0]?.content || '暂无消息'}</p>
              </Link>
            ))}
            {conversations.length === 0 && <p style={{ color: 'var(--muted)' }}>暂无会话。</p>}
          </div>
        </aside>
        <section className="glass" style={{ padding: 22, borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>{active?.title ?? '选择一个会话'}</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {active?.messages.map((message) => (
              <article key={message.id} style={{ justifySelf: message.role === 'user' ? 'end' : 'start', maxWidth: '82%', padding: 14, borderRadius: 14, background: message.role === 'user' ? 'rgba(79,125,243,.18)' : 'rgba(255,255,255,.62)' }}>
                <strong>{message.role === 'user' ? '我' : '芙宁娜'}</strong>
                <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                {message.hasImage && <small>包含图片：{message.imageFileName} · {message.imageMimeType}</small>}
              </article>
            ))}
            {!active && <p style={{ color: 'var(--muted)' }}>还没有 AI 对话。点击右下角芙宁娜开始提问吧。</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
