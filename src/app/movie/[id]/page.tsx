import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import VideoPlayer from '@/components/video/VideoPlayer';
import { buildResolverUrl, DEFAULT_PLAYERS, parsePlayGroups, playersFromSourceConfig, selectPlayback } from '@/lib/playback/playback';
import FavoriteButton from '@/components/user/FavoriteButton';
import MovieInfo from '@/components/shared/MovieInfo';
import RecommendationList from '@/components/shared/RecommendationList';
import EpisodeSelector from '@/components/shared/EpisodeSelector';
import { getRecommendationMovies } from '@/lib/recommendations';
import { getValidSessionUserId } from '@/lib/auth/session-user';

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

  const movie = await prisma.movie.findUnique({ where: { id: movieId } });

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
  const sessionUserId = await getValidSessionUserId();
  const isLoggedIn = typeof sessionUserId === 'number';
  const existingFavorite = isLoggedIn ? await prisma.userFavorite.findUnique({ where: { uk_user_movie: { userId: sessionUserId, movieId: movie.id } }, select: { id: true } }) : null;

  if (isLoggedIn) {
    recommendations = await getRecommendationMovies(sessionUserId, 6);
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
      {activeEpisode ? (
        <section style={{ marginBottom: '30px' }}>
          <div className="movie-watch-heading" style={{ marginBottom: '12px' }}>
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

      <div className="detail-layout">
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
