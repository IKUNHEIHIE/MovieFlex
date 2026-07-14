import { describe, expect, it } from 'vitest';
import { selectRecommendationRail } from './recommendations';

describe('selectRecommendationRail', () => {
  it('uses personalized movies when the latest recommendation batch has results', () => {
    const movies = [{ id: 2, title: '个性化影片' }];

    expect(selectRecommendationRail(movies, [{ id: 1, title: '热门影片' }])).toEqual({
      title: '为你推荐',
      movies,
    });
  });

  it('falls back to popular movies when no recommendation exists', () => {
    const popularMovies = [{ id: 1, title: '热门影片' }];

    expect(selectRecommendationRail([], popularMovies)).toEqual({
      title: '热门推荐',
      movies: popularMovies,
    });
  });
});
