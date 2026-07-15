import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar';
import MouseTrail from '@/components/mouse-trail/MouseTrail';
import Snowfall from '@/components/layout/Snowfall';
import FurinaMascot from '@/components/mascot/FurinaMascot';
import ParticleBackground from '@/components/effects/ParticleBackground';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { Suspense } from 'react';
import { getActiveThemeKey } from '@/lib/theme-registry';

export const metadata: Metadata = {
  title: 'MovieFlex — 影视在线观看平台',
  description: '海量影视资源，智能推荐，大数据分析驱动的在线影视平台',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const activeTheme = await getActiveThemeKey().catch(() => 'ice-blue');
  return (
    <html lang="zh-CN" data-theme={activeTheme}>
      <head><link rel="stylesheet" href={`/themes/${activeTheme}/style.css`} /></head>
      <body><SessionProvider><ErrorBoundary><Suspense fallback={null}><Navbar /></Suspense></ErrorBoundary><MouseTrail /><ErrorBoundary><Snowfall /></ErrorBoundary><ParticleBackground /><ErrorBoundary><FurinaMascot /></ErrorBoundary>
        <main style={{ minHeight: 'calc(100vh - var(--nav-height))', position: 'relative', zIndex: 1 }}><ErrorBoundary><Suspense fallback={<div style={{textAlign:'center',padding:'60px',color:'var(--color-text-muted)'}}>加载中…</div>}>{children}</Suspense></ErrorBoundary></main>
      </SessionProvider></body>
    </html>
  );
}
