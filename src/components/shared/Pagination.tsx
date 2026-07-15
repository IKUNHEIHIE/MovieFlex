'use client';

import Link from 'next/link';
import { useState } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize?: number;
  prevUrl: string;
  nextUrl: string;
}

export default function Pagination({ currentPage, totalPages, pageSize, prevUrl, nextUrl }: PaginationProps) {
  const [jumpPage, setJumpPage] = useState('');
  const pageSizeOptions = [20, 50, 100];

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(jumpPage, 10);
    if (page >= 1 && page <= totalPages) {
      const url = new URL(window.location.href);
      url.searchParams.set('page', String(page));
      window.location.href = url.pathname + url.search;
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    const url = new URL(window.location.href);
    url.searchParams.set('size', String(newSize));
    url.searchParams.set('page', '1');
    window.location.href = url.pathname + url.search;
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '20px',
      flexWrap: 'wrap',
      padding: '20px 0'
    }}>
      {pageSize && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>每页显示:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            style={{
              padding: '8px 12px',
              borderRadius: '20px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size} 条</option>
            ))}
          </select>
        </div>
      )}

      <Link
        href={prevUrl}
        className={`btn btn-secondary ${currentPage === 1 ? 'disabled' : ''}`}
        style={{
          pointerEvents: currentPage === 1 ? 'none' : 'auto',
          padding: '8px 20px',
          borderRadius: '20px',
          opacity: currentPage === 1 ? 0.5 : 1
        }}
      >
        上一页
      </Link>

      <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
        第 {currentPage} / {totalPages} 页
      </span>

      <Link
        href={nextUrl}
        className={`btn btn-secondary ${currentPage === totalPages ? 'disabled' : ''}`}
        style={{
          pointerEvents: currentPage === totalPages ? 'none' : 'auto',
          padding: '8px 20px',
          borderRadius: '20px',
          opacity: currentPage === totalPages ? 0.5 : 1
        }}
      >
        下一页
      </Link>

      <form onSubmit={handleJump} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={jumpPage}
          onChange={(e) => setJumpPage(e.target.value)}
          placeholder="页码"
          style={{
            width: '80px',
            padding: '8px 12px',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            textAlign: 'center'
          }}
        />
        <button
          type="submit"
          className="btn btn-secondary"
          style={{ padding: '8px 16px', borderRadius: '20px' }}
        >
          跳转
        </button>
      </form>
    </div>
  );
}
