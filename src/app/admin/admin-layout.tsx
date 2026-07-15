'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Navigation items for admin area
  const navItems = [
    { href: '/admin/dashboard', label: '仪表板' },
    { href: '/admin/movies', label: '影片管理' },
    { href: '/admin/users', label: '用户管理' },
    { href: '/admin/catalog', label: '目录管理' },
    { href: '/admin/sources', label: '采集源' },
    { href: '/admin/mappings', label: '分类映射' },
    { href: '/admin/stats/categories', label: '统计分析' },
    { href: '/admin/themes', label: '主题设置' },
  ];

  useEffect(() => {
    // Simulate loading state on route change
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="shell" style={{ 
      display: 'grid', 
      gridTemplateColumns: sidebarOpen ? '240px 1fr' : '68px 1fr',
      minHeight: 'calc(100vh - var(--nav-height))',
      background: 'linear-gradient(135deg, #0f1a2e 0%, #162035 100%)',
    }}>
      {/* Sidebar */}
      <aside style={{ 
        background: '#0f1a2e',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '24px 12px',
        transition: 'all 300ms ease',
      }}>
        <div style={{ marginBottom: '32px' }}>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: sidebarOpen ? '12px 16px' : '12px',
                borderRadius: '8px',
                color: pathname === item.href ? 'white' : 'rgba(255, 255, 255, 0.7)',
                background: pathname === item.href 
                  ? 'linear-gradient(135deg, #5267cf 0%, #6b7de2 100%)'
                  : 'transparent',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: pathname === item.href ? 600 : 400,
                transition: 'all 250ms ease',
                position: 'relative',
                overflow: 'hidden',
                whiteSpace: sidebarOpen ? 'nowrap' : 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (pathname !== item.href) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (pathname !== item.href) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {sidebarOpen ? item.label : item.href.split('/').pop()?.charAt(0).toUpperCase()}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main style={{ 
        minWidth: 0, 
        padding: '32px 40px',
        position: 'relative',
      }}>
        {/* Loading overlay */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 26, 46, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            animation: 'fadeIn 200ms ease',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(82, 103, 207, 0.2)',
              borderTopColor: '#5267cf',
              borderRadius: '50%',
              animation: 'spin 600ms linear infinite',
            }} />
          </div>
        )}

        {/* Page content with fade-in */}
        <div style={{
          opacity: isLoading ? 0 : 1,
          transform: isLoading ? 'translateY(10px)' : 'translateY(0)',
          transition: 'all 300ms ease',
        }}>
          {children}
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
