export type OverviewTone = 'normal' | 'warning' | 'danger';

export interface AdminOverviewData {
  metrics: {
    movieCount: number;
    todayViews: number;
    todayFavorites: number;
    openIssues: number;
  };
  todayStats: {
    userViews: number;
    guestViews: number;
    uniqueUsers: number;
    latestStatsDate: string | null;
  };
  collection: {
    totalSources: number;
    activeSources: number;
    neverSyncedSources: number;
    latestSourceName: string | null;
    latestSourceSyncAt: string | null;
    latestTask: {
      id: string;
      status: string;
      sourceKey: string;
      mode: string;
      pagesProcessed: number;
      totalPages: number;
      saved: number;
      errorMessage: string | null;
      updatedAt: string;
    } | null;
    failedTasks: number;
    runningTasks: number;
  };
  contentHealth: {
    todayNewMovies: number;
    missingPosterMovies: number;
    missingPlaybackMovies: number;
    uncategorizedMovies: number;
  };
  operations: {
    pendingMappings: number;
    pendingOutboxEvents: number;
    latestRecommendation: {
      batchId: string;
      createdAt: string;
    } | null;
  };
  popularMovies: Array<{
    id: number;
    title: string;
    typeName: string | null;
    viewCount: number;
    favoriteCount: number;
  }>;
}

export function getStartOfToday(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getOpenIssueCount({
  pendingMappings,
  pendingOutboxEvents,
  failedTasks,
  neverSyncedSources,
}: {
  pendingMappings: number;
  pendingOutboxEvents: number;
  failedTasks: number;
  neverSyncedSources: number;
}) {
  return pendingMappings + pendingOutboxEvents + failedTasks + neverSyncedSources;
}

export function getTaskTone(status: string | null): OverviewTone {
  if (status === 'FAILED' || status === 'CANCELLED') return 'danger';
  if (status === 'RUNNING' || status === 'PAUSED' || status === 'QUEUED') return 'warning';
  return 'normal';
}

export function getTaskProgressLabel({
  pagesProcessed,
  totalPages,
}: {
  pagesProcessed: number;
  totalPages: number;
}) {
  if (totalPages <= 0) return '暂无分页进度';
  return `${pagesProcessed} / ${totalPages} 页`;
}

export async function getAdminOverviewData(now = new Date()): Promise<AdminOverviewData> {
  const { default: prisma } = await import('@/lib/prisma');
  const today = getStartOfToday(now);

  const [
    movieCount,
    todayStats,
    totalSources,
    activeSources,
    neverSyncedSources,
    latestSource,
    latestTask,
    failedTasks,
    runningTasks,
    todayNewMovies,
    missingPosterMovies,
    missingPlaybackMovies,
    uncategorizedMovies,
    pendingMappings,
    pendingOutboxEvents,
    latestRecommendation,
    popularMovies,
    latestStats,
  ] = await Promise.all([
    prisma.movie.count(),
    prisma.dailyStats.findFirst({
      where: { dimension: 'global', date: today },
    }),
    prisma.collectSource.count(),
    prisma.collectSource.count({ where: { isActive: true } }),
    prisma.collectSource.count({ where: { lastSync: null } }),
    prisma.collectSource.findFirst({
      orderBy: { lastSync: 'desc' },
      select: { name: true, lastSync: true },
    }),
    prisma.collectTask.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        sourceKey: true,
        mode: true,
        pagesProcessed: true,
        totalPages: true,
        saved: true,
        errorMessage: true,
        updatedAt: true,
      },
    }),
    prisma.collectTask.count({ where: { status: 'FAILED' } }),
    prisma.collectTask.count({ where: { status: 'RUNNING' } }),
    prisma.movie.count({ where: { createdAt: { gte: today } } }),
    prisma.movie.count({ where: { OR: [{ picUrl: null }, { picUrl: '' }] } }),
    prisma.movie.count({
      where: {
        OR: [{ playUrl: null }, { playUrl: '' }, { playFrom: null }, { playFrom: '' }],
      },
    }),
    prisma.movie.count({ where: { OR: [{ typeName: null }, { typeName: '' }] } }),
    prisma.categoryMapping.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.eventOutbox.count({ where: { status: 'PENDING' } }),
    prisma.recommendation.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { batchId: true, createdAt: true },
    }),
    prisma.movie.findMany({
      orderBy: { viewCount: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        typeName: true,
        viewCount: true,
        _count: { select: { favorites: true } },
      },
    }),
    prisma.dailyStats.findFirst({
      where: { dimension: 'global' },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
  ]);

  const openIssues = getOpenIssueCount({
    pendingMappings,
    pendingOutboxEvents,
    failedTasks,
    neverSyncedSources,
  });

  return {
    metrics: {
      movieCount,
      todayViews: todayStats?.totalViews ?? 0,
      todayFavorites: todayStats?.totalFavorites ?? 0,
      openIssues,
    },
    todayStats: {
      userViews: todayStats?.userViews ?? 0,
      guestViews: todayStats?.guestViews ?? 0,
      uniqueUsers: todayStats?.uniqueUsers ?? 0,
      latestStatsDate: latestStats?.date.toISOString() ?? null,
    },
    collection: {
      totalSources,
      activeSources,
      neverSyncedSources,
      latestSourceName: latestSource?.name ?? null,
      latestSourceSyncAt: latestSource?.lastSync?.toISOString() ?? null,
      latestTask: latestTask ? {
        id: latestTask.id,
        status: latestTask.status,
        sourceKey: latestTask.sourceKey,
        mode: latestTask.mode,
        pagesProcessed: latestTask.pagesProcessed,
        totalPages: latestTask.totalPages,
        saved: latestTask.saved,
        errorMessage: latestTask.errorMessage,
        updatedAt: latestTask.updatedAt.toISOString(),
      } : null,
      failedTasks,
      runningTasks,
    },
    contentHealth: {
      todayNewMovies,
      missingPosterMovies,
      missingPlaybackMovies,
      uncategorizedMovies,
    },
    operations: {
      pendingMappings,
      pendingOutboxEvents,
      latestRecommendation: latestRecommendation ? {
        batchId: latestRecommendation.batchId,
        createdAt: latestRecommendation.createdAt.toISOString(),
      } : null,
    },
    popularMovies: popularMovies.map((movie) => ({
      id: movie.id,
      title: movie.title,
      typeName: movie.typeName,
      viewCount: movie.viewCount,
      favoriteCount: movie._count.favorites,
    })),
  };
}
