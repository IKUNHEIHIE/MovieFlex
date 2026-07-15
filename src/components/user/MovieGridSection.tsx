import MovieCard from '@/components/shared/MovieCard';

interface MovieGridSectionProps {
  title: string;
  movies: Array<{
    id: number;
    title: string;
    picUrl: string | null;
    score: number | { toString(): string };
    remarks: string | null;
    typeName: string | null;
    year: number | null;
  }>;
  emptyMessage: string;
}

export default function MovieGridSection({ title, movies, emptyMessage }: MovieGridSectionProps) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2>{title}</h2>
      {movies.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
          {movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}
        </div>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </section>
  );
}
