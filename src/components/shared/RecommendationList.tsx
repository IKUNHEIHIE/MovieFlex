import Link from 'next/link';

interface RecommendationListProps {
  recommendations: Array<{
    id: number;
    title: string;
    picUrl: string | null;
    score: { toString(): string } | number;
    typeName: string | null;
  }>;
}

export default function RecommendationList({ recommendations }: RecommendationListProps) {
  return (
    <section className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        ⭐ 为您推荐
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {recommendations.map((rec) => (
          <Link href={`/movie/${rec.id}`} key={rec.id} style={{ display: 'flex', gap: '12px', textDecoration: 'none', color: 'inherit' }} className="rec-item">
            <div style={{ width: '70px', aspectRatio: '2/3', borderRadius: '4px', overflow: 'hidden', background: '#222', flexShrink: 0 }}>
              {rec.picUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={rec.picUrl} alt={rec.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {rec.title}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                评分：<span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>⭐ {Number(rec.score) > 0 ? Number(rec.score).toFixed(1) : '8.0'}</span>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {rec.typeName}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
