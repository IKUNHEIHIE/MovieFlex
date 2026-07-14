import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';
import HistoryDeleteButton from '@/components/user/HistoryDeleteButton';

export default async function HistoryPage() {
  const session = await auth();
  const userId = Number(session?.user?.id); const entries = await prisma.watchHistory.findMany({ where: { userId }, include: { movie: true }, orderBy: { lastWatchedAt: 'desc' } });
  return <main className="container" style={{ paddingTop: 36 }}><h1>观看历史</h1>{entries.length ? <ul>{entries.map((entry) => <li key={entry.id}><Link href={`/movie/${entry.movieId}?ep=${encodeURIComponent(entry.episode || '0')}`}>{entry.movie.title}</Link> · {Number(entry.progress).toFixed(0)}% <HistoryDeleteButton id={entry.id} /></li>)}</ul> : <p>还没有观看记录。</p>}</main>;
}
