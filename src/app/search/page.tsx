import Link from 'next/link';
import prisma from '@/lib/prisma';

export const revalidate = 0;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim().slice(0, 100) || '';
  const movies = query ? await prisma.movie.findMany({ where: { title: { contains: query } }, orderBy: { sourceTime: 'desc' }, take: 60 }) : [];
  return <main className="container" style={{ paddingTop: 36 }}><h1>搜索影片</h1><p>{query ? `“${query}” 的搜索结果` : '请输入影片名称搜索。'}</p>{movies.length ? <ul>{movies.map((movie) => <li key={movie.id}><Link href={`/movie/${movie.id}`}>{movie.title}</Link></li>)}</ul> : query ? <p>没有找到匹配影片。</p> : null}</main>;
}
