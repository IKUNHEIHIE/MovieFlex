'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f0eb' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center', color: '#5a554a' }}>
          <p style={{ fontSize: '1.4rem', marginBottom: 8 }}>😵 出了点问题</p>
          <p style={{ fontSize: '0.85rem', marginBottom: 20, color: '#999' }}>
            {error.message || '页面加载失败了，请重试'}
          </p>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              border: '1px solid #ccc',
              borderRadius: 6,
              background: '#fff',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
