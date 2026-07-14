import Link from 'next/link';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const revalidate = 0; // 开启动态计算渲染

interface MoviesPageProps {
  searchParams: Promise<{
    type?: string;
    area?: string;
    year?: string;
    lang?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function MoviesPage({ searchParams }: MoviesPageProps) {
  // 处理 Next.js 的 async searchParams
  const params = await searchParams;
  const integer = (value: string | undefined, minimum = 1) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : undefined;
  };
  const typeId = integer(params.type);
  const area = params.area || undefined;
  const year = integer(params.year, 1800);
  const lang = params.lang || undefined;
  const sort = ['latest', 'score', 'views'].includes(params.sort || '') ? params.sort! : 'latest';
  const page = integer(params.page) || 1;
  const pageSize = 18;

  // 1. 获取所有分类列表用于渲染分类导航栏
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  // 2. 动态从数据库中获取已有的年份列表、产地列表、语言列表以生成筛选菜单
  const rawAreas = await prisma.movie.groupBy({
    by: ['area'],
    where: { area: { not: null } },
  });
  const areas = rawAreas.map((a: { area: string | null }) => a.area).filter(Boolean) as string[];

  const rawLanguages = await prisma.movie.groupBy({
    by: ['language'],
    where: { language: { not: null } },
  });
  const languages = rawLanguages.map((l: { language: string | null }) => l.language).filter(Boolean) as string[];

  // 3. 构建 Prisma 查询的 where 条件
  const where: Prisma.MovieWhereInput = {};
  if (typeId) {
    where.typeId = typeId;
  }
  if (area) {
    where.area = area;
  }
  if (year) {
    where.year = year;
  }
  if (lang) {
    where.language = lang;
  }

  // 4. 计算总数
  const totalCount = await prisma.movie.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  // 5. 排序规则定义
  let orderBy: Prisma.MovieOrderByWithRelationInput = { sourceTime: 'desc' };
  if (sort === 'score') {
    orderBy = { score: 'desc' };
  } else if (sort === 'views') {
    orderBy = { viewCount: 'desc' };
  }

  // 6. 分页查询数据
  const movies = await prisma.movie.findMany({
    where,
    orderBy,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
  });

  // 生成新的 Query 参数辅助函数
  const getQueryUrl = (newParams: Record<string, string | number | undefined | null>) => {
    const nextParams = new URLSearchParams();
    if (typeId) nextParams.set('type', String(typeId));
    if (area) nextParams.set('area', area);
    if (year) nextParams.set('year', String(year));
    if (lang) nextParams.set('lang', lang);
    if (sort !== 'latest') nextParams.set('sort', sort);
    if (page !== 1) nextParams.set('page', String(page));

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    // 任何非分页维度的修改，均自动将页码重置为 1
    if (!newParams.page && newParams.page !== null) {
      nextParams.delete('page');
    }

    const queryStr = nextParams.toString();
    return `/movies${queryStr ? '?' + queryStr : ''}`;
  };

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* 筛选面板 */}
      <section className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '20px', color: 'var(--color-text-primary)' }}>
          影片库筛选
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 分类筛选 */}
          <div className="filter-row">
            <span className="filter-label">分类:</span>
            <div className="filter-items">
              <Link href={getQueryUrl({ type: null })} className={`filter-item ${!typeId ? 'active' : ''}`}>全部</Link>
              {categories.map((cat: { id: number; name: string }) => (
                <Link
                  href={getQueryUrl({ type: cat.id })}
                  key={cat.id}
                  className={`filter-item ${typeId === cat.id ? 'active' : ''}`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* 地区筛选 */}
          {areas.length > 0 && (
            <div className="filter-row">
              <span className="filter-label">地区:</span>
              <div className="filter-items">
                <Link href={getQueryUrl({ area: null })} className={`filter-item ${!area ? 'active' : ''}`}>全部</Link>
                {areas.map((a: string) => (
                  <Link
                    href={getQueryUrl({ area: a })}
                    key={a}
                    className={`filter-item ${area === a ? 'active' : ''}`}
                  >
                    {a}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 语言筛选 */}
          {languages.length > 0 && (
            <div className="filter-row">
              <span className="filter-label">语言:</span>
              <div className="filter-items">
                <Link href={getQueryUrl({ lang: null })} className={`filter-item ${!lang ? 'active' : ''}`}>全部</Link>
                {languages.map((l: string) => (
                  <Link
                    href={getQueryUrl({ lang: l })}
                    key={l}
                    className={`filter-item ${lang === l ? 'active' : ''}`}
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 排序筛选 */}
          <div className="filter-row" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '4px' }}>
            <span className="filter-label">排序:</span>
            <div className="filter-items">
              <Link href={getQueryUrl({ sort: 'latest' })} className={`filter-item ${sort === 'latest' ? 'active' : ''}`}>最新发布</Link>
              <Link href={getQueryUrl({ sort: 'score' })} className={`filter-item ${sort === 'score' ? 'active' : ''}`}>评分最高</Link>
              <Link href={getQueryUrl({ sort: 'views' })} className={`filter-item ${sort === 'views' ? 'active' : ''}`}>热度最高</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 结果网格 */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            为您找到 <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{totalCount}</span> 部相关影视
          </div>
        </div>

        {movies.length === 0 ? (
          <div className="glass" style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            没有找到符合筛选条件的影片，请尝试调整筛选条件。
          </div>
        ) : (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}>
              {movies.map((movie) => (
                <Link href={`/movie/${movie.id}`} key={movie.id} className="movie-card-link">
                  <div className="glass" style={{
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    transition: 'transform var(--transition-medium), box-shadow var(--transition-medium)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{ position: 'relative', aspectRatio: '2/3', background: '#222' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={movie.picUrl || ''} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(4px)',
                        color: 'var(--color-accent)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        ⭐ {Number(movie.score) > 0 ? Number(movie.score).toFixed(1) : '8.0'}
                      </div>
                      {movie.remarks && (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          bottom: 0,
                          width: '100%',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                          color: '#fff',
                          padding: '6px 10px',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {movie.remarks}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '12px' }}>
                      <h3 style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {movie.title}
                      </h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        <span>{movie.typeName}</span>
                        <span>{movie.year || ''}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 分页控制 */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                <Link
                  href={getQueryUrl({ page: currentPage > 1 ? currentPage - 1 : null })}
                  className={`btn btn-secondary ${currentPage === 1 ? 'disabled' : ''}`}
                  style={{ pointerEvents: currentPage === 1 ? 'none' : 'auto', padding: '8px 20px', borderRadius: '20px' }}
                >
                  上一页
                </Link>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  第 {currentPage} / {totalPages} 页
                </span>
                <Link
                  href={getQueryUrl({ page: currentPage < totalPages ? currentPage + 1 : null })}
                  className={`btn btn-secondary ${currentPage === totalPages ? 'disabled' : ''}`}
                  style={{ pointerEvents: currentPage === totalPages ? 'none' : 'auto', padding: '8px 20px', borderRadius: '20px' }}
                >
                  下一页
                </Link>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
