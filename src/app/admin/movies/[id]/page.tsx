import { notFound } from 'next/navigation';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import MovieEditForm from '@/components/admin/MovieEditForm';
import prisma from '@/lib/prisma';
import styles from '../../admin.module.css';

export default async function EditMoviePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();

  const [movie, categories] = await Promise.all([
    prisma.movie.findUnique({ where: { id } }),
    prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
    }),
  ]);

  if (!movie) notFound();

  return <>
    <AdminPageHeader eyebrow="CATALOG" title="编辑影片" badge={movie.title} />
    <section className={styles.panel}>
      <MovieEditForm movie={movie} categories={categories} />
    </section>
  </>;
}
