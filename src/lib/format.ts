export function formatMovieScore(score: number | { toString(): string }): string {
  const value = Number(score);
  return value > 0 ? value.toFixed(1) : '8.0';
}
