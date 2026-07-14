import prisma from '@/lib/prisma';
import styles from '../admin.module.css';
import RoleButton from '@/components/admin/RoleButton';
import AdminPageHeader from '@/components/shared/AdminPageHeader';

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { _count: { select: { favorites: true, watchHistory: true } } } });
  return <>
    <AdminPageHeader eyebrow="USERS" title="用户管理" badge={`${users.length} 位用户`} />
    <section className={styles.panel}><table className={styles.table}><thead><tr><th>用户名</th><th>邮箱</th><th>角色</th><th>收藏</th><th>观看记录</th><th>注册时间</th><th>操作</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.username}</td><td>{user.email}</td><td>{user.role === 'ADMIN' ? '管理员' : '用户'}</td><td>{user._count.favorites}</td><td>{user._count.watchHistory}</td><td>{user.createdAt.toLocaleDateString()}</td><td><RoleButton id={user.id} role={user.role} /></td></tr>)}</tbody></table></section>
  </>;
}
