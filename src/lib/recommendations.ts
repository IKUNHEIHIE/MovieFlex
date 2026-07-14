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

  if (!latestRecommendation) return selectRecommendationRail([], popularMovies);

  const recommendations = await prisma.recommendation.findMany({
    where: { userId, batchId: latestRecommendation.batchId },
    orderBy: { rankPos: 'asc' },
    take: 12,
    select: { movieId: true },
  });
  const movieIds = recommendations.map(({ movieId }) => movieId);

  if (movieIds.length === 0) return selectRecommendationRail([], popularMovies);

  const movies = await prisma.movie.findMany({ where: { id: { in: movieIds } } });
  const moviesById = new Map(movies.map((movie) => [movie.id, movie]));
  const personalizedMovies = movieIds.flatMap((movieId) => {
    const movie = moviesById.get(movieId);
    return movie ? [movie] : [];
  });

  return selectRecommendationRail(personalizedMovies, popularMovies);
}
