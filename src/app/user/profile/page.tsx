import { auth } from '@/lib/auth';

export default async function ProfilePage() {
  const session = await auth(); const user = session!.user as { username?: string; email?: string; role?: string };
  return <main className="container" style={{ paddingTop: 36 }}><section className="glass" style={{ padding: 28, borderRadius: 'var(--radius-md)' }}><h1>个人中心</h1><p>用户名：{user.username || '未设置'}</p><p>邮箱：{user.email}</p><p>角色：{user.role === 'ADMIN' ? '管理员' : '用户'}</p></section></main>;
}
