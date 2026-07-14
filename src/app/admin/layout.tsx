import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { OperationsSidebar } from '@/components/admin/OperationsSidebar';
import styles from './admin.module.css';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=%2Fadmin');
  if ((session.user as { role?: string }).role !== 'ADMIN') redirect('/user/profile?notice=admin-only');

  return <div className={styles.shell}>
    <OperationsSidebar />
    <main className={styles.main}>
      <div className={styles.ribbon}><strong>MovieFlex Operations</strong><span>采集与内容运营</span></div>
      {children}
    </main>
  </div>;
}
