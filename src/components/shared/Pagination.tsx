import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  getQueryUrl: (params: Record<string, string | number | undefined | null>) => string;
}

export default function Pagination({ currentPage, totalPages, getQueryUrl }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
      <Link
        href={getQueryUrl({ page: currentPage > 1 ? currentPage - 1 : null })}
        className={`btn btn-secondary ${currentPage === 1 ? 'disabled' : ''}`}
        style={{ pointerEvents: currentPage === 1 ? 'none' : 'auto', padding: '8px 20px', borderRadius: '20px' }}
      >
        上一页
      </Link>
      <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
        第 {currentPage} / {totalPages} 页
      </span>
      <Link
        href={getQueryUrl({ page: currentPage < totalPages ? currentPage + 1 : null })}
        className={`btn btn-secondary ${currentPage === totalPages ? 'disabled' : ''}`}
        style={{ pointerEvents: currentPage === totalPages ? 'none' : 'auto', padding: '8px 20px', borderRadius: '20px' }}
      >
        下一页
      </Link>
    </div>
  );
}
