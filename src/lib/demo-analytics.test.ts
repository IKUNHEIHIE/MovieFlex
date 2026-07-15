import { describe, expect, it } from 'vitest';
import { buildDailyDemoStats } from './demo-analytics';

describe('buildDailyDemoStats', () => {
  it('aggregates demo watches and favorites into movie, category, and global dimensions', () => {
    const stats = buildDailyDemoStats({
      watches: [{ userId: 1, movieId: 10, typeId: 3, progress: 80, watchedAt: new Date('2026-07-10T12:00:00Z') }],
      favorites: [{ movieId: 10, typeId: 3, createdAt: new Date('2026-07-10T13:00:00Z') }],
    });
    expect(stats).toEqual(expect.arrayContaining([
      expect.objectContaining({ date: '2026-07-10', dimension: 'movie', dimensionId: 10, totalViews: 1, userViews: 1, totalFavorites: 1, avgProgress: 0.8 }),
      expect.objectContaining({ date: '2026-07-10', dimension: 'category', dimensionId: 3, totalViews: 1, totalFavorites: 1 }),
      expect.objectContaining({ date: '2026-07-10', dimension: 'global', dimensionId: null, totalViews: 1, userViews: 1, totalFavorites: 1, uniqueUsers: 1 }),
    ]));
  });
});
