import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import Navbar from '@/components/layout/Navbar';
import MouseTrail from '@/components/mouse-trail/MouseTrail';
import Snowfall from '@/components/layout/Snowfall';
import FurinaMascot from '@/components/mascot/FurinaMascot';
import ParticleBackground from '@/components/effects/ParticleBackground';
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
      <body><SessionProvider><Navbar /><MouseTrail /><Snowfall /><ParticleBackground /><FurinaMascot />
        <main style={{ minHeight: 'calc(100vh - var(--nav-height))' }}>{children}</main>
      </SessionProvider></body>
    </html>
  );
}
