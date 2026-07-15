import 'dotenv/config';
import prisma from '../src/lib/prisma';
import { buildDailyDemoStats } from '../src/lib/demo-analytics';

async function main() {
  const users = await prisma.user.findMany({ where: { username: { startsWith: 'demo_' } }, select: { id: true } });
  const ids = users.map((user) => user.id);
  const [watches, favorites] = await Promise.all([
    prisma.watchHistory.findMany({ where: { userId: { in: ids } }, select: { userId: true, movieId: true, progress: true, lastWatchedAt: true, movie: { select: { typeId: true } } } }),
    prisma.userFavorite.findMany({ where: { userId: { in: ids } }, select: { id: true, movieId: true, createdAt: true, movie: { select: { typeId: true } } } }),
  ]);
  const normalizedFavorites = favorites.map((favorite) => ({ movieId: favorite.movieId, typeId: favorite.movie.typeId, createdAt: favorite.createdAt.getTime() > Date.now() - 86_400_000 ? new Date(Date.now() - (favorite.id % 30) * 86_400_000) : favorite.createdAt }));
  const stats = buildDailyDemoStats({ watches: watches.map((watch) => ({ userId: watch.userId, movieId: watch.movieId, typeId: watch.movie.typeId, progress: Number(watch.progress), watchedAt: watch.lastWatchedAt })), favorites: normalizedFavorites });
  await prisma.dailyStats.deleteMany({});
  for (const stat of stats) {
    const data = { totalViews: stat.totalViews, userViews: stat.userViews, guestViews: 0, uniqueUsers: stat.uniqueUsers, totalFavorites: stat.totalFavorites, avgProgress: stat.avgProgress };
    if (stat.dimensionId === null) {
      const existing = await prisma.dailyStats.findFirst({ where: { date: new Date(stat.date), dimension: stat.dimension, dimensionId: null } });
      if (existing) await prisma.dailyStats.update({ where: { id: existing.id }, data });
      else await prisma.dailyStats.create({ data: { date: new Date(stat.date), dimension: stat.dimension, dimensionId: null, ...data } });
    } else {
      await prisma.dailyStats.upsert({ where: { uk_dimension_date: { date: new Date(stat.date), dimension: stat.dimension, dimensionId: stat.dimensionId } }, create: { date: new Date(stat.date), dimension: stat.dimension, dimensionId: stat.dimensionId, ...data }, update: data });
    }
  }
  await prisma.movie.updateMany({ where: { id: { in: watches.map((watch) => watch.movieId) } }, data: { viewCount: 0 } });
  for (const [movieId, count] of Object.entries(watches.reduce<Record<number, number>>((totals, watch) => ({ ...totals, [watch.movieId]: (totals[watch.movieId] ?? 0) + 1 }), {}))) await prisma.movie.update({ where: { id: Number(movieId) }, data: { viewCount: count } });
  console.log(`Rebuilt ${stats.length} demo analytics records from ${watches.length} watches and ${favorites.length} favorites.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
