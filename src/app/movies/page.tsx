import Link from 'next/link';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import MovieCard from '@/components/shared/MovieCard';
import Pagination from '@/components/shared/Pagination';
import FilterRow from '@/components/shared/FilterRow';
import { validateInteger, validateString, validateEnum } from '@/lib/validation';

export const revalidate = 0;

interface MoviesPageProps {
  searchParams: Promise<{
    type?: string;
    area?: string;
    year?: string;
    lang?: string;
    sort?: string;
    page?: string;
    size?: string;
  }>;
}

export default async function MoviesPage({ searchParams }: MoviesPageProps) {
  const params = await searchParams;

  // 使用验证函数解析和验证参数
  const typeId = validateInteger(params.type, { min: 1, max: 10000 });
  const area = validateString(params.area, { maxLength: 100 });
  const year = validateInteger(params.year, { min: 1800, max: 2100 });
  const lang = validateString(params.lang, { maxLength: 50 });
  const sort = validateEnum(params.sort, ['latest', 'score', 'views'] as const) || 'latest';
  const page = validateInteger(params.page, { min: 1, max: 10000 }) || 1;

  // 解析 pageSize 参数，支持 20/50/100，默认为 20
  const requestedSize = validateInteger(params.size, { min: 1, max: 100 }) || 20;
  const pageSizeOptions = [20, 50, 100];
  const pageSize = pageSizeOptions.find(size => size >= requestedSize) || 20;

  const [categories, rawAreas, rawLanguages] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.movieArea.groupBy({ by: ['area'], orderBy: { _count: { area: 'desc' } } }),
    prisma.movieLanguage.groupBy({ by: ['language'], orderBy: { _count: { language: 'desc' } } }),
  ]);

  const clean = (arr: { [k: string]: string | null }[], key: string, n: number, selected?: string): string[] => {
    const values = arr.map(a => a[key]).filter((v): v is string => Boolean(v));
    const set = new Set<string>();
    if (selected) set.add(selected);
    for (const v of values) { if (set.size >= n) break; set.add(v); }
    return [...set];
  };
  const areas = clean(rawAreas, 'area', 15, area);
  const languages = clean(rawLanguages, 'language', 15, lang);

  const where: Prisma.MovieWhereInput = {};
  if (typeId) {
    // 检查是否是父分类，如果是则包含所有子分类
    const parentCategory = categories.find(c => c.id === typeId);
    const children = categories.filter(c => c.parentId === typeId);
    if (children.length > 0) {
      // 是父分类，查询父分类和所有子分类
      where.typeId = { in: [typeId, ...children.map(c => c.id)] };
    } else {
      // 是子分类，精确匹配
      where.typeId = typeId;
    }
  }
  if (area) where.areas = { some: { area } };
  if (year) where.year = year;
  if (lang) where.languages = { some: { language: lang } };

  const totalCount = await prisma.movie.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  let orderBy: Prisma.MovieOrderByWithRelationInput = { sourceTime: 'desc' };
  if (sort === 'score') orderBy = { score: 'desc' };
  else if (sort === 'views') orderBy = { viewCount: 'desc' };

  const movies = await prisma.movie.findMany({
    where,
    orderBy,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
  });

  const getQueryUrl = (newParams: Record<string, string | number | undefined | null>) => {
    const nextParams = new URLSearchParams();
    if (typeId) nextParams.set('type', String(typeId));
    if (area) nextParams.set('area', area);
    if (year) nextParams.set('year', String(year));
    if (lang) nextParams.set('lang', lang);
    if (sort !== 'latest') nextParams.set('sort', sort);
    if (pageSize !== 20) nextParams.set('size', String(pageSize));

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    if (!('page' in newParams)) {
      nextParams.delete('page');
    }

    const queryStr = nextParams.toString();
    return `/movies${queryStr ? '?' + queryStr : ''}`;
  };
  const listingMotionKey = [typeId || 'all', area || 'all', year || 'all', lang || 'all', sort, currentPage, pageSize].join('-');

  // 构建分类树：父分类及其子分类
  const parentCategories = categories.filter(c => !c.parentId);
  const getChildCategories = (parentId: number) => categories.filter(c => c.parentId === parentId);

  // 当前选中的父分类及其子分类
  const selectedParent = typeId ? parentCategories.find(c => c.id === typeId) : null;
  const displayCategories = selectedParent
    ? [selectedParent, ...getChildCategories(selectedParent.id)]
    : parentCategories;

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      <div key={listingMotionKey} className="movieListingShell">
      <section className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '20px', color: 'var(--color-text-primary)' }}>
          影片库筛选
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FilterRow
            label="分类"
            items={displayCategories.map((cat) => ({ id: cat.id, name: cat.name }))}
            activeId={typeId}
            getQueryUrl={getQueryUrl}
            paramName="type"
          />

          {areas.length > 0 && (
            <FilterRow
              label="地区"
              items={areas.map((a) => ({ id: a, name: a }))}
              activeId={area}
              getQueryUrl={getQueryUrl}
              paramName="area"
            />
          )}

          {languages.length > 0 && (
            <FilterRow
              label="语言"
              items={languages.map((l) => ({ id: l, name: l }))}
              activeId={lang}
              getQueryUrl={getQueryUrl}
              paramName="lang"
            />
          )}

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
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              prevUrl={getQueryUrl({ page: currentPage > 1 ? currentPage - 1 : null })}
              nextUrl={getQueryUrl({ page: currentPage < totalPages ? currentPage + 1 : null })}
            />
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
