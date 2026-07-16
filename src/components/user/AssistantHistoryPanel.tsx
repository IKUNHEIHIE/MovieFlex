import Link from 'next/link';

type Conversation = {
  id: number;
  title: string;
  updatedAt: Date;
  messages?: { content: string; role: string; hasImage: boolean }[];
};

export default function AssistantHistoryPanel({ conversations }: { conversations: Conversation[] }) {
  return (
    <section className="glass" style={{ padding: 24, borderRadius: 12, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <h2 style={{ marginTop: 0 }}>AI 助手记录</h2>
          <p style={{ color: 'var(--muted)', marginTop: 4 }}>查看你和芙宁娜的电影推荐、封皮识别和观影咨询。</p>
        </div>
        <Link className="btn" href="/user/assistant">全部记录</Link>
      </div>
      {conversations.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>还没有 AI 对话。点击右下角芙宁娜开始提问吧。</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {conversations.map((conversation) => {
            const lastMessage = conversation.messages?.[0];
            return (
              <Link key={conversation.id} href={`/user/assistant?conversation=${conversation.id}`} style={{ display: 'block', padding: 14, border: '1px solid rgba(120,160,220,.28)', borderRadius: 12, textDecoration: 'none', color: 'inherit' }}>
                <strong>{conversation.title}</strong>
                <p style={{ margin: '6px 0', color: 'var(--muted)' }}>{lastMessage?.content || '暂无消息'}</p>
                <small>{conversation.updatedAt.toLocaleString('zh-CN')}</small>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
