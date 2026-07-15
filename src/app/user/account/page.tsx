import { auth } from '@/lib/auth/auth';
import ProfileSettings from '@/components/user/ProfileSettings';

export default async function AccountPage() {
  const session = await auth();
  const user = session!.user as { username?: string; email?: string };

  return <main className="container" style={{ paddingTop: 36, paddingBottom: 60 }}><section className="glass" style={{ padding: 28, borderRadius: 12 }}><h1>账号管理</h1><p>更新账号信息或修改登录密码。</p></section><section style={{ marginTop: 20 }}><ProfileSettings username={user.username || ''} email={user.email || ''} /></section></main>;
}
