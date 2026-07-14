import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import prisma from '@/lib/prisma';
import { getRecommendationRail } from '@/lib/recommendations';
import PopularCarousel from '@/components/home/PopularCarousel';
import styles from './page.module.css';

export const revalidate = 0;

type Movie = { id: number; title: string; picUrl: string | null; score: { toString(): string } | number; typeName: string | null; year: number | null; remarks: string | null; description: string | null; };
function scoreLabel(score: Movie['score']) { const value = Number(score); return value > 0 ? value.toFixed(1) : '8.0'; }

function MovieRail({ title, href, movies }: { title: string; href: string; movies: Movie[] }) {
  if (!movies.length) return null;
  return <section className={styles.railSection}>
    <div className={styles.sectionHeading}><div><p className={styles.sectionLabel}>片单</p><h2>{title}</h2></div><Link href={href} className={styles.moreLink}>查看全部 <span aria-hidden="true">→</span></Link></div>
    <div className={styles.movieRail}>{movies.map((movie) => <Link href={`/movie/${movie.id}`} key={movie.id} className={styles.movieCard}>
      <div className={styles.poster}>{movie.picUrl ? <img src={movie.picUrl} alt={movie.title} loading="lazy" /> : <div className={styles.posterFallback}>MOVIEFLEX</div>}<span className={styles.score}>评分 {scoreLabel(movie.score)}</span>{movie.remarks && <span className={styles.remarks}>{movie.remarks}</span>}</div>
      <div className={styles.movieMeta}><h3>{movie.title}</h3><p>{movie.typeName || '精选影片'}{movie.year ? ` · ${movie.year}` : ''}</p></div>
    </Link>)}</div>
  </section>;
}

export default async function Home() {
  const session = await auth();
  const sessionUser = session?.user as { id?: number } | undefined;
  const userId = typeof sessionUser?.id === 'number' && sessionUser.id > 0 ? sessionUser.id : undefined;
  const [recommendationRail, latestMovies, popularMovieRows, animeMovies, showMovies] = await Promise.all([
    getRecommendationRail(userId),
    prisma.movie.findMany({ orderBy: { sourceTime: 'desc' }, take: 12 }),
    prisma.movie.findMany({ select: { id: true, title: true, picUrl: true, score: true, typeName: true, year: true, remarks: true, description: true }, orderBy: [{ viewCount: 'desc' }, { id: 'asc' }], take: 4 }),
    prisma.movie.findMany({ where: { typeName: { contains: '动漫' } }, orderBy: { sourceTime: 'desc' }, take: 8 }),
    prisma.movie.findMany({ where: { typeName: { contains: '综艺' } }, orderBy: { sourceTime: 'desc' }, take: 8 }),
  ]);
  const popularMovies = popularMovieRows.map((movie) => ({ ...movie, score: Number(movie.score) }));
  return <div className={styles.home}><div className="container">
    <PopularCarousel movies={popularMovies} />
    <MovieRail title={recommendationRail.title} href="/movies" movies={recommendationRail.movies} />
    <MovieRail title="刚刚入场" href="/movies" movies={latestMovies} />
    <div className={styles.dualRails}><MovieRail title="动画放映厅" href="/movies?type=5" movies={animeMovies} /><MovieRail title="综艺现场" href="/movies?type=7" movies={showMovies} /></div>
  </div></div>;
}
