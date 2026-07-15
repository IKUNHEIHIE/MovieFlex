'use client';

export default function MovieDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
      <p style={{ fontSize: '1.2rem', marginBottom: 8 }}>😵 加载出错了</p>
      <p style={{ fontSize: '0.85rem', marginBottom: 16 }}>{error.message || '未知错误'}</p>
      <button
        onClick={reset}
        style={{
          padding: '8px 20px',
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          background: 'var(--color-bg-card)',
          cursor: 'pointer',
          color: 'var(--color-text-primary)',
        }}
      >
        重试
      </button>
    </div>
  );
}
