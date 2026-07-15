export function selectRecommendationRail<T>(
  personalizedMovies: T[],
  popularMovies: T[],
) {
  if (personalizedMovies.length > 0) {
    return { title: '为你推荐', movies: personalizedMovies };
  }

  return { title: '热门推荐', movies: popularMovies };
}

export async function getRecommendationRail(userId: number | undefined) {
  const prisma = (await import('./prisma')).default;

  const popularMovies = await prisma.movie.findMany({
    orderBy: [{ viewCount: 'desc' }, { id: 'asc' }],
    take: 12,
  });

  if (!userId) return selectRecommendationRail([], popularMovies);

  const latestRecommendation = await prisma.recommendation.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { batchId: true },
  });

  if (!latestRecommendation) return getBehaviorRecommendationRail(userId, popularMovies);

  const recommendations = await prisma.recommendation.findMany({
    where: { userId, batchId: latestRecommendation.batchId },
    orderBy: { rankPos: 'asc' },
    take: 12,
    select: { movieId: true },
  });
  const movieIds = recommendations.map(({ movieId }) => movieId);

  if (movieIds.length === 0) return getBehaviorRecommendationRail(userId, popularMovies);

  const movies = await prisma.movie.findMany({ where: { id: { in: movieIds } } });
  const moviesById = new Map(movies.map((movie) => [movie.id, movie]));
  const personalizedMovies = movieIds.flatMap((movieId) => {
    const movie = moviesById.get(movieId);
    return movie ? [movie] : [];
  });

  return selectRecommendationRail(personalizedMovies, popularMovies);
}

async function getBehaviorRecommendationRail(userId: number, popularMovies: Awaited<ReturnType<(typeof import('./prisma'))['default']['movie']['findMany']>>) {
  const prisma = (await import('./prisma')).default;
  const [favorites, history] = await Promise.all([
    prisma.userFavorite.findMany({ where: { userId }, select: { movieId: true, movie: { select: { typeId: true } } } }),
    prisma.watchHistory.findMany({ where: { userId }, take: 40, orderBy: { lastWatchedAt: 'desc' }, select: { movieId: true, movie: { select: { typeId: true } } } }),
  ]);
  const viewedIds = [...new Set([...favorites, ...history].map((item) => item.movieId))];
  const typeCounts = new Map<number, number>();
  for (const item of [...favorites, ...history]) typeCounts.set(item.movie.typeId, (typeCounts.get(item.movie.typeId) ?? 0) + 1);
  const typeIds = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([typeId]) => typeId);
  if (!typeIds.length) return selectRecommendationRail([], popularMovies);
  const movies = await prisma.movie.findMany({ where: { typeId: { in: typeIds }, id: { notIn: viewedIds } }, orderBy: [{ viewCount: 'desc' }, { score: 'desc' }], take: 12 });
  return movies.length ? { title: '根据你的观看与收藏推荐', movies } : selectRecommendationRail([], popularMovies);
}
