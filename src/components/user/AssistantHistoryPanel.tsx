import Link from 'next/link';

type Conversation = {
  id: number;
  title: string;
  updatedAt: Date;
  messages?: { content: string; role: string; hasImage: boolean }[];
};

export default function AssistantHistoryPanel({ conversations }: { conversations: Conversation[] }) {
  return (
    <section className="glass" aria-label="AI 助手记录摘要" style={{ padding: 16, borderRadius: 12, marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>AI 助手记录</h2>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '.82rem' }}>最近的助手对话摘要。</p>
        </div>
        <Link className="btn" href="/user/assistant">全部记录</Link>
      </div>
      {conversations.length === 0 ? (
        <p style={{ color: 'var(--muted)', margin: '10px 0 0', fontSize: '.82rem' }}>暂无 AI 对话记录，可从右下角助手开始。</p>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {conversations.map((conversation) => {
            const lastMessage = conversation.messages?.[0];
            return (
              <Link key={conversation.id} href={`/user/assistant?conversation=${conversation.id}`} style={{ display: 'grid', gap: 4, padding: '9px 10px', border: '1px solid rgba(120,160,220,.2)', borderRadius: 10, textDecoration: 'none', color: 'inherit' }}>
                <strong style={{ fontSize: '.9rem' }}>{conversation.title}</strong>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '.8rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{lastMessage?.content || '暂无消息'}</p>
                <small style={{ color: 'var(--muted)', fontSize: '.72rem' }}>{conversation.updatedAt.toLocaleString('zh-CN')}</small>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
