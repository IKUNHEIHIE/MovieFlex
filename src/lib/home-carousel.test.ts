import { describe, expect, it } from 'vitest';
import { clampCarouselIndex, selectPopularCarouselMovies } from './home-carousel';

describe('selectPopularCarouselMovies', () => {
  it('ranks by views descending then id ascending without mutating input', () => {
    const movies = [
      { id: 9, viewCount: 30 },
      { id: 4, viewCount: 80 },
      { id: 2, viewCount: 80 },
      { id: 7, viewCount: 10 },
      { id: 1, viewCount: 60 },
    ];
    const originalOrder = movies.map((movie) => movie.id);

    expect(selectPopularCarouselMovies(movies).map((movie) => movie.id)).toEqual([2, 4, 1, 9]);
    expect(movies.map((movie) => movie.id)).toEqual(originalOrder);
  });

  it('uses every available movie when fewer than the requested limit exist', () => {
    expect(selectPopularCarouselMovies([{ id: 3, viewCount: 1 }, { id: 1, viewCount: 2 }], 4)
      .map((movie) => movie.id)).toEqual([1, 3]);
  });

  it('keeps the active slide index inside a shrinking movie list', () => {
    expect(clampCarouselIndex(3, 2)).toBe(1);
    expect(clampCarouselIndex(-1, 4)).toBe(0);
    expect(clampCarouselIndex(0, 0)).toBe(0);
  });
});
