import ProfileSettings from '@/components/user/ProfileSettings';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session-user';

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user?.username || !user.email) redirect('/login');

  return <main className="container" style={{ paddingTop: 36, paddingBottom: 60 }}><section className="glass" style={{ padding: 28, borderRadius: 12 }}><h1>账号管理</h1><p>更新账号信息或修改登录密码。</p></section><section style={{ marginTop: 20 }}><ProfileSettings username={user.username} email={user.email} /></section></main>;
}
