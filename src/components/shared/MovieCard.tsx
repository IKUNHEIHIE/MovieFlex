import Link from 'next/link';

interface MovieCardProps {
  movie: {
    id: number;
    title: string;
    picUrl: string | null;
    score: { toString(): string } | number;
    remarks: string | null;
    typeName: string | null;
    year: number | null;
  };
}

export default function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link href={`/movie/${movie.id}`} className="movie-card-link">
      <div className="glass" style={{
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        transition: 'transform var(--transition-medium), box-shadow var(--transition-medium)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ position: 'relative', aspectRatio: '2/3', background: '#222' }}>
          {movie.picUrl ? (
            <img src={movie.picUrl} alt={movie.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '0.75rem', fontWeight: 700 }}>MOVIEFLEX</div>
          )}
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            color: 'var(--color-accent)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 'bold'
          }}>
            ⭐ {Number(movie.score) > 0 ? Number(movie.score).toFixed(1) : '8.0'}
          </div>
          {movie.remarks && (
            <div style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: '100%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              color: '#fff',
              padding: '6px 10px',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {movie.remarks}
            </div>
          )}
        </div>
        <div style={{ padding: '12px' }}>
          <h3 style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {movie.title}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span>{movie.typeName}</span>
            <span>{movie.year || ''}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
