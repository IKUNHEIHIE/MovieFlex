import Link from 'next/link';
import prisma from '@/lib/prisma';
import MovieCard from '@/components/shared/MovieCard';

export const revalidate = 0;

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

const POPULAR_SEARCH_TAGS = ['斗破苍穹', '凡人修仙传', '一人之下', '庆余年', '狂飙', '流浪地球', '三体', '动漫'];

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q?.trim().slice(0, 100) || '';

  let movies: any[] = [];
  let fallbackMovies: any[] = [];

  if (query) {
    movies = await prisma.movie.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { director: { contains: query } },
          { actors: { contains: query } },
        ],
      },
      orderBy: [{ viewCount: 'desc' }, { sourceTime: 'desc' }],
      take: 60,
    });

    if (movies.length === 0) {
      fallbackMovies = await prisma.movie.findMany({
        orderBy: [{ viewCount: 'desc' }, { score: 'desc' }],
        take: 12,
      });
    }
  } else {
    fallbackMovies = await prisma.movie.findMany({
      orderBy: [{ viewCount: 'desc' }, { sourceTime: 'desc' }],
      take: 24,
    });
  }

  return (
    <main className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
      {/* 搜索控制台卡片 */}
      <section
        className="glass"
        style={{
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '32px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            marginBottom: '16px',
            color: 'var(--color-text-primary)',
          }}
        >
          🔍 影片搜索
        </h1>

        {/* 搜索表单 */}
        <form
          action="/search"
          method="GET"
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            maxWidth: '680px',
            marginBottom: '20px',
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="请输入影片名称、导演或主演..."
              className="input"
              style={{
                height: '46px',
                padding: '0 16px',
                fontSize: '0.95rem',
                borderRadius: 'var(--radius-md)',
              }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              height: '46px',
              padding: '0 24px',
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-md)',
              whiteSpace: 'nowrap',
            }}
          >
            搜索
          </button>
        </form>

        {/* 热门搜索标签 */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            热门搜索：
          </span>
          {POPULAR_SEARCH_TAGS.map((tag) => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              style={{
                fontSize: '0.8rem',
                padding: '4px 10px',
                borderRadius: '999px',
                background: query === tag ? 'var(--color-primary)' : 'rgba(0,0,0,0.05)',
                color: query === tag ? '#fff' : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tag}
            </Link>
          ))}
        </div>
      </section>

      {/* 搜索结果区域 */}
      <section>
        {query ? (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                “<span style={{ color: 'var(--color-primary)' }}>{query}</span>” 的搜索结果
              </h2>
              <span style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
                共找到 <b style={{ color: 'var(--color-primary)' }}>{movies.length}</b> 部影片
              </span>
            </div>

            {movies.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                  gap: '24px',
                  marginBottom: '40px',
                }}
              >
                {movies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            ) : (
              <div>
                <div
                  className="glass"
                  style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '40px',
                  }}
                >
                  <p style={{ fontSize: '1.05rem', marginBottom: '8px' }}>
                    ⚠️ 未找到与 “<b>{query}</b>” 相关的影片。
                  </p>
                  <p style={{ fontSize: '0.85rem' }}>
                    请尝试缩短搜索词、使用繁简转换或输入演员名称，或浏览以下推荐内容。
                  </p>
                </div>

                {fallbackMovies.length > 0 && (
                  <div>
                    <h3
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        marginBottom: '18px',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      🌟 为您推荐的热门影视
                    </h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                        gap: '24px',
                      }}
                    >
                      {fallbackMovies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                🔥 热门精选影片
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                输入关键词进行全库精准搜索，或直接发现高热度好剧
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                gap: '24px',
                marginBottom: '40px',
              }}
            >
              {fallbackMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

