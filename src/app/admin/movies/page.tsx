import Link from 'next/link';
import prisma from '@/lib/prisma';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import Pagination from '@/components/shared/Pagination';
import { validateInteger, validateString } from '@/lib/validation';
import styles from '../admin.module.css';

export default async function AdminMoviesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; size?: string }> }) {
  const params = await searchParams;
  const query = validateString(params.q, { maxLength: 100 }) || '';
  const page = validateInteger(params.page, { min: 1, max: 10000 }) || 1;
  
  const requestedSize = validateInteger(params.size, { min: 1, max: 100 }) || 20;
  const pageSizeOptions = [20, 50, 100];
  const pageSize = pageSizeOptions.find(size => size >= requestedSize) || 20;

  const where = query ? { title: { contains: query } } : undefined;
  const totalCount = await prisma.movie.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  const movies = await prisma.movie.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
  });

  const getQueryUrl = (newParams: Record<string, string | number | undefined | null>) => {
    const nextParams = new URLSearchParams();
    if (query) nextParams.set('q', query);
    if (pageSize !== 20) nextParams.set('size', String(pageSize));
    if (page !== 1) nextParams.set('page', String(page));

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    const queryStr = nextParams.toString();
    return `/admin/movies${queryStr ? '?' + queryStr : ''}`;
  };

  return <>
    <AdminPageHeader eyebrow="CATALOG" title="影片库" badge={`${totalCount} 条`} />
    <section className={styles.panel}>
      <div className={styles.toolbar}>
        <form action="/admin/movies" className={styles.searchForm}>
          <input 
            name="q" 
            defaultValue={query} 
            placeholder="搜索影片名称" 
            className={styles.input}
          />
          {pageSize !== 20 && <input type="hidden" name="size" value={pageSize} />}
          <button className={styles.buttonSecondary} type="submit">搜索</button>
        </form>
        <Link href="/admin/movies/new" className={styles.linkButton}>新增影片</Link>
      </div>
      <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>名称</th>
                <th>来源</th>
                <th>分类</th>
                <th>播放源</th>
                <th>热度</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {movies.map((movie) => (
                <tr key={movie.id}>
                  <td>
                    <Link href={`/movie/${movie.id}`}>{movie.title}</Link>
                  </td>
                  <td>{movie.sourceKey}</td>
                  <td>{movie.typeName || '未分类'}</td>
                  <td>{movie.playFrom || '无'}</td>
                  <td>{movie.viewCount}</td>
                  <td>
                    <Link href={`/admin/movies/${movie.id}`} className={styles.linkButtonSecondary}>编辑</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        prevUrl={getQueryUrl({ page: currentPage > 1 ? currentPage - 1 : null })}
        nextUrl={getQueryUrl({ page: currentPage < totalPages ? currentPage + 1 : null })}
      />
    </section>
  </>;
}
