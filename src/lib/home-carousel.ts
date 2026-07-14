export type PopularMovie = { id: number; viewCount: number };

export function selectPopularCarouselMovies<T extends PopularMovie>(movies: T[], limit = 4): T[] {
  return [...movies]
    .sort((left, right) => right.viewCount - left.viewCount || left.id - right.id)
    .slice(0, limit);
}

export function clampCarouselIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0));
}
