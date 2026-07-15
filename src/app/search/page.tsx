import MovieCard from '@/components/shared/MovieCard';
import prisma from '@/lib/prisma';

export const revalidate = 0;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim().slice(0, 100) || '';
  const movies = query
    ? await prisma.movie.findMany({ where: { title: { contains: query } }, orderBy: { sourceTime: 'desc' }, take: 60 })
    : [];

  return (
    <main className="container" style={{ paddingTop: 36, paddingBottom: 60 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>搜索影片</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
        {query ? `“${query}” 的搜索结果` : '请输入影片名称搜索。'}
      </p>

      {movies.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 16,
        }}>
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      ) : query ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          background: 'var(--color-bg-card)',
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>😕 没有找到匹配影片</p>
          <p>试试其他关键词</p>
        </div>
      ) : null}
    </main>
  );
}
