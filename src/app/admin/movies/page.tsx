import Link from 'next/link';
import prisma from '@/lib/prisma';
import styles from '../admin.module.css';

export default async function AdminMoviesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim().slice(0, 100) || '';
  const movies = await prisma.movie.findMany({ where: query ? { title: { contains: query } } : undefined, orderBy: { updatedAt: 'desc' }, take: 100 });
  return <><header className={styles.header}><div><p>CATALOG</p><h1>影片库</h1></div><span>{movies.length} 条</span></header><section className={styles.panel}><form action="/admin/movies"><input name="q" defaultValue={query} placeholder="搜索影片名称" /><button className={styles.button}>搜索</button></form><table className={styles.table}><thead><tr><th>名称</th><th>来源</th><th>分类</th><th>播放源</th><th>热度</th></tr></thead><tbody>{movies.map((movie) => <tr key={movie.id}><td><Link href={`/movie/${movie.id}`}>{movie.title}</Link></td><td>{movie.sourceKey}</td><td>{movie.typeName || '未分类'}</td><td>{movie.playFrom || '无'}</td><td>{movie.viewCount}</td></tr>)}</tbody></table></section></>;
}
