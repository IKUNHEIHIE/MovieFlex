import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth/auth';
import VideoPlayer from '@/components/video/VideoPlayer';
import { buildResolverUrl, DEFAULT_PLAYERS, parsePlayGroups, playersFromSourceConfig, selectPlayback } from '@/lib/playback/playback';
import FavoriteButton from '@/components/user/FavoriteButton';
import MovieInfo from '@/components/shared/MovieInfo';
import RecommendationList from '@/components/shared/RecommendationList';
import EpisodeSelector from '@/components/shared/EpisodeSelector';

export const revalidate = 0;

interface MovieDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    source?: string;
    ep?: string;
  }>;
}

export default async function MovieDetailPage({ params, searchParams }: MovieDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const movieId = parseInt(resolvedParams.id);
  const requestedSource = resolvedSearchParams.source ? parseInt(resolvedSearchParams.source) : undefined;
  const requestedEpisode = resolvedSearchParams.ep ? parseInt(resolvedSearchParams.ep) : undefined;

  if (isNaN(movieId)) return notFound();

  let movie;
  try {
    movie = await prisma.movie.findUnique({ where: { id: movieId } });
  } catch (error) {
    console.error('数据库查询失败:', error);
    movie = null;
  }

  if (!movie) return notFound();

  const source = await prisma.collectSource.findUnique({
    where: { sourceKey: movie.sourceKey },
    select: { playerConfigs: true },
  });
  const sourcePlayers = playersFromSourceConfig(source?.playerConfigs);
  const players = [...sourcePlayers, ...DEFAULT_PLAYERS.filter((player) => !sourcePlayers.some((sourcePlayer) => sourcePlayer.code === player.code))];
  const playback = selectPlayback(parsePlayGroups(movie.playFrom, movie.playUrl), players, {
    source: requestedSource,
    ep: requestedEpisode,
  });
  const activeSource = playback.groups.find((group) => group.source === playback.selection?.source);
  const activeEpisode = playback.selection;

  let recommendations: { id: number; title: string; picUrl: string | null; score: { toString(): string } | number; typeName: string | null }[] = [];
  const session = await auth();
  const sessionUserId = Number(session?.user?.id);
  const isLoggedIn = Number.isSafeInteger(sessionUserId) && sessionUserId > 0;
  const existingFavorite = isLoggedIn ? await prisma.userFavorite.findUnique({ where: { uk_user_movie: { userId: sessionUserId, movieId: movie.id } }, select: { id: true } }) : null;

  if (isLoggedIn) {
    const userId = sessionUserId;
    const latestBatch = await prisma.recommendation.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { batchId: true } });
    const recList = latestBatch ? await prisma.recommendation.findMany({
      where: { userId, batchId: latestBatch.batchId },
      orderBy: { rankPos: 'asc' },
      take: 6,
    }) : [];

    if (recList.length > 0) {
      const recMovieIds = recList.map((r: { movieId: number }) => r.movieId);
      const recommendationMovies = await prisma.movie.findMany({
        where: { id: { in: recMovieIds } },
      });
      const byId = new Map(recommendationMovies.map((item) => [item.id, item]));
      recommendations = recMovieIds.flatMap((id) => { const item = byId.get(id); return item ? [item] : []; });
    }
  }

  if (recommendations.length === 0) {
    recommendations = await prisma.movie.findMany({
      where: {
        typeId: movie.typeId,
        id: { not: movie.id },
      },
      orderBy: { score: 'desc' },
      take: 6,
    });
  }

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* 影片头部信息 */}
      <div style={{ padding: '24px 0 20px', borderBottom: '1px solid var(--color-border)', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>{movie.title}</h1>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          <span>⭐ {Number(movie.score) > 0 ? Number(movie.score).toFixed(1) : '暂无评分'}</span>
          {movie.typeName && <span>📂 {movie.typeName}</span>}
          {movie.area && <span>🌍 {movie.area}</span>}
          {movie.language && <span>🗣 {movie.language}</span>}
          {movie.year && <span>📅 {movie.year}</span>}
          {movie.director && <span>🎬 {movie.director}</span>}
        </div>
      </div>

      {activeEpisode ? (
        <section style={{ marginBottom: '30px' }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              正在播放：
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              {movie.title} — {activeEpisode.name}
            </span>
            {isLoggedIn && <FavoriteButton movieId={movie.id} initialFavorite={Boolean(existingFavorite)} />}
          </div>
          <VideoPlayer
            key={`${activeEpisode.player.mode}-${activeEpisode.url}`}
            url={activeEpisode.player.mode === 'IFRAME_RESOLVER' ? buildResolverUrl(activeEpisode.player.resolverUrl, activeEpisode.url) || activeEpisode.url : activeEpisode.url}
            movieId={movie.id}
            episodeName={activeEpisode.name}
            mode={activeEpisode.player.mode}
          />
        </section>
      ) : (
        <div className="glass" style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '30px' }}>
          ⚠️ 暂无可播放的视频源。
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '30px'
      }} className="detail-layout">
        <div>
          <EpisodeSelector
            movieId={movie.id}
            groups={playback.groups}
            activeSource={activeSource}
            activeEpisode={activeEpisode}
          />
          <MovieInfo movie={movie} />
        </div>

        <div>
          <RecommendationList recommendations={recommendations} />
        </div>
      </div>
    </div>
  );
}
