import AdminPageHeader from '@/components/shared/AdminPageHeader';
import MovieEditForm from '@/components/admin/MovieEditForm';
import prisma from '@/lib/prisma';
import styles from '../../admin.module.css';

export default async function NewMoviePage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true },
  });

  return <>
    <AdminPageHeader eyebrow="CATALOG" title="新增影片" badge="手动入库" />
    <section className={styles.panel}>
      <MovieEditForm categories={categories} />
    </section>
  </>;
}
