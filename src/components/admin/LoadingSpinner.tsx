'use client';

export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { width: 20, height: 20, borderWidth: 2 },
    md: { width: 32, height: 32, borderWidth: 3 },
    lg: { width: 48, height: 48, borderWidth: 4 },
  };

  const { width, height, borderWidth } = sizes[size];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
      }}
    >
      <div
        style={{
          width,
          height,
          border: `${borderWidth}px solid rgba(82, 103, 207, 0.2)`,
          borderTopColor: '#5267cf',
          borderRadius: '50%',
          animation: 'spin 600ms linear infinite',
        }}
      />
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
