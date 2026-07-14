import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import VideoPlayer from '@/components/video/VideoPlayer';
import { buildResolverUrl, DEFAULT_PLAYERS, parsePlayGroups, selectPlayback } from '@/lib/playback';
import FavoriteButton from '@/components/user/FavoriteButton';

export const revalidate = 0; // 动态实时计算

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

  // 1. 查询电影详情
  let movie;
  try {
    movie = await prisma.movie.findUnique({ where: { id: movieId } });
  } catch (error) {
    // 如果 update 失败可能是 ID 不存在，回退到普通查询以触发 notFound
    movie = await prisma.movie.findUnique({ where: { id: movieId } });
  }

  if (!movie) return notFound();

  // 2. 解析播放列表
  const playback = selectPlayback(parsePlayGroups(movie.playFrom, movie.playUrl), DEFAULT_PLAYERS, {
    source: requestedSource,
    ep: requestedEpisode,
  });
  const activeSource = playback.groups.find((group) => group.source === playback.selection?.source);
  const activeEpisode = playback.selection;

  // 3. 混合推荐逻辑 (千人千面推荐 + 高分同类目备用推荐)
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

  // 如果没有推荐（游客或无推荐记录），自动降级为同类型评分最高的热门推荐
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
      {/* 1. 播放器版块 */}
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

      {/* 2. 详情与选集区 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '30px'
      }} className="detail-layout">
        {/* 左侧：选集面板 & 影片介绍 */}
        <div>
          {/* 选集面板 */}
           {playback.groups.length > 0 && (
            <section className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>选集播放</h2>
                {/* 如果有多个播放源，渲染播放源切换 tab */}
                 {playback.groups.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                     {playback.groups.map((source) => (
                       <Link
                         href={`/movie/${movie.id}?source=${source.source}&ep=0`}
                         key={source.code}
                         className={`source-tab ${activeSource?.source === source.source ? 'active' : ''}`}
                       >
                         {source.player?.name || source.code}{source.available ? '' : `（${source.reason}）`}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* 剧集列表 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '12px'
              }}>
                 {activeSource?.episodes.map((ep) => (
                   <Link
                     href={`/movie/${movie.id}?source=${activeSource.source}&ep=${ep.ep}`}
                     key={`${ep.ep}-${ep.name}`}
                     className={`episode-btn ${activeEpisode?.ep === ep.ep ? 'active' : ''}`}
                  >
                    {ep.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 影片介绍 */}
          <section className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              影片详情介绍
            </h2>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }} className="intro-meta">
              {movie.picUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={movie.picUrl}
                  alt={movie.title}
                  style={{ width: '140px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                <div><strong>导演：</strong>{movie.director || '未知'}</div>
                <div><strong>主演：</strong>{movie.actors || '未知'}</div>
                <div><strong>地区：</strong>{movie.area || '未知'}</div>
                <div><strong>语言：</strong>{movie.language || '未知'}</div>
                <div><strong>年份：</strong>{movie.year || '未知'}</div>
                <div><strong>更新时间：</strong>{movie.sourceTime ? new Date(movie.sourceTime).toLocaleString() : '未知'}</div>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>剧情简介</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                {movie.description || '暂无介绍。'}
              </p>
            </div>
          </section>
        </div>

        {/* 右侧：推荐列表 */}
        <div>
          <section className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⭐ 为您推荐
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recommendations.map((rec) => (
                <Link href={`/movie/${rec.id}`} key={rec.id} style={{ display: 'flex', gap: '12px', textDecoration: 'none', color: 'inherit' }} className="rec-item">
                  <div style={{ width: '70px', aspectRatio: '2/3', borderRadius: '4px', overflow: 'hidden', background: '#222', flexShrink: 0 }}>
                    {rec.picUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={rec.picUrl} alt={rec.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rec.title}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      评分：<span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>⭐ {Number(rec.score) > 0 ? Number(rec.score).toFixed(1) : '8.0'}</span>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {rec.typeName}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
