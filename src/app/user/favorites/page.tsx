import Link from 'next/link';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function FavoritesPage() {
  const session = await auth();
  const userId = Number(session?.user?.id); const favorites = await prisma.userFavorite.findMany({ where: { userId }, include: { movie: true }, orderBy: { createdAt: 'desc' } });
  return <main className="container" style={{ paddingTop: 36 }}><h1>我的收藏</h1>{favorites.length ? <ul>{favorites.map(({ movie }) => <li key={movie.id}><Link href={`/movie/${movie.id}`}>{movie.title}</Link></li>)}</ul> : <p>还没有收藏影片。</p>}</main>;
}
