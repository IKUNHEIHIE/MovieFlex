interface MovieInfoProps {
  movie: {
    picUrl: string | null;
    title: string;
    director: string | null;
    actors: string | null;
    area: string | null;
    language: string | null;
    year: number | null;
    sourceTime: Date | string | null;
    description: string | null;
  };
}

export default function MovieInfo({ movie }: MovieInfoProps) {
  return (
    <section className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
        影片详情介绍
      </h2>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }} className="intro-meta">
        {movie.picUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={movie.picUrl}
            alt={movie.title}
            style={{ width: '140px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
          <div><strong>导演：</strong>{movie.director || '未知'}</div>
          <div><strong>主演：</strong>{movie.actors || '未知'}</div>
          <div><strong>地区：</strong>{movie.area || '未知'}</div>
          <div><strong>语言：</strong>{movie.language || '未知'}</div>
          <div><strong>年份：</strong>{movie.year || '未知'}</div>
          <div><strong>更新时间：</strong>{movie.sourceTime ? new Date(movie.sourceTime).toLocaleString() : '未知'}</div>
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>剧情简介</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
          {movie.description || '暂无介绍。'}
        </p>
      </div>
    </section>
  );
}
