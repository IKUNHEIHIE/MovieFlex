type Watch = { userId: number; movieId: number; typeId: number; progress: number; watchedAt: Date };
type Favorite = { movieId: number; typeId: number; createdAt: Date };
export type DailyDemoStat = { date: string; dimension: 'movie' | 'category' | 'global'; dimensionId: number | null; totalViews: number; userViews: number; totalFavorites: number; uniqueUsers: number; avgProgress: number };

export function buildDailyDemoStats({ watches, favorites }: { watches: Watch[]; favorites: Favorite[] }): DailyDemoStat[] {
  const records = new Map<string, DailyDemoStat & { users: Set<number>; progressTotal: number; progressCount: number }>();
  const ensure = (date: string, dimension: DailyDemoStat['dimension'], dimensionId: number | null) => {
    const key = `${date}:${dimension}:${dimensionId ?? 'all'}`;
    if (!records.has(key)) records.set(key, { date, dimension, dimensionId, totalViews: 0, userViews: 0, totalFavorites: 0, uniqueUsers: 0, avgProgress: 0, users: new Set(), progressTotal: 0, progressCount: 0 });
    return records.get(key)!;
  };
  for (const watch of watches) {
    const date = watch.watchedAt.toISOString().slice(0, 10);
    for (const [dimension, dimensionId] of [['movie', watch.movieId], ['category', watch.typeId], ['global', null]] as const) {
      const record = ensure(date, dimension, dimensionId); record.totalViews += 1; record.userViews += 1; record.users.add(watch.userId); record.progressTotal += watch.progress / 100; record.progressCount += 1;
    }
  }
  for (const favorite of favorites) {
    const date = favorite.createdAt.toISOString().slice(0, 10);
    for (const [dimension, dimensionId] of [['movie', favorite.movieId], ['category', favorite.typeId], ['global', null]] as const) ensure(date, dimension, dimensionId).totalFavorites += 1;
  }
  return [...records.values()].map(({ users, progressTotal, progressCount, ...record }) => ({ ...record, uniqueUsers: users.size, avgProgress: progressCount ? progressTotal / progressCount : 0 }));
}
