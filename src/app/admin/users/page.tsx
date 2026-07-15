import prisma from '@/lib/prisma';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import UserManager from '@/components/admin/UserManager';

export const revalidate = 0;

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { _count: { select: { favorites: true, watchHistory: true } } } });
  const totalCount = await prisma.user.count();
  return (
    <>
      <AdminPageHeader eyebrow="USERS" title="用户管理" badge={`${totalCount} 位用户`} />
      <UserManager initialUsers={users.map(({ id, username, email, role, _count, createdAt }) => ({ id, username, email, role, favoritesCount: _count.favorites, watchHistoryCount: _count.watchHistory, createdAt: createdAt.toISOString() }))} totalCount={totalCount} />
    </>
  );
}
