import '../admin-theme.css';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import Pagination from '@/components/shared/Pagination';
import { validateInteger, validateString } from '@/lib/validation';
import AdminButton from '@/components/admin/AdminButton';

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
    <section style={{ 
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: '20px' }}>
        <form action="/admin/movies" style={{ display: 'flex', gap: 12 }}>
          <input 
            name="q" 
            defaultValue={query} 
            placeholder="搜索影片名称" 
            style={{ 
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              minWidth: '250px',
            }}
          />
          {pageSize !== 20 && <input type="hidden" name="size" value={pageSize} />}
          <AdminButton variant="secondary" type="submit">搜索</AdminButton>
        </form>
        <Link href="/admin/movies/new">
          <AdminButton variant="primary">新增影片</AdminButton>
        </Link>
      </div>
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}>
            <thead>
              <tr>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>名称</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>来源</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>分类</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>播放源</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>热度</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {movies.map((movie, index) => (
                <tr 
                  key={movie.id}
                  style={{
                    borderBottom: index < movies.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                    transition: 'background 200ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    <Link href={`/movie/${movie.id}`} style={{ color: '#5267cf', textDecoration: 'none' }}>{movie.title}</Link>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.9)' }}>{movie.sourceKey}</td>
                  <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.9)' }}>{movie.typeName || '未分类'}</td>
                  <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.9)' }}>{movie.playFrom || '无'}</td>
                  <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.9)' }}>{movie.viewCount}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <Link href={`/admin/movies/${movie.id}`}>
                      <AdminButton variant="secondary" size="sm">编辑</AdminButton>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
