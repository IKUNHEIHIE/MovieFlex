'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

type NavbarSettings = {
  siteName: string;
  siteLogoUrl: string;
};

const navItems = [
  { label: '首页', href: '/', match: { pathname: '/' } },
  { label: '电影', href: '/movies?type=1', match: { pathname: '/movies', type: '1' } },
  { label: '剧集', href: '/movies?type=10', match: { pathname: '/movies', type: '10' } },
  { label: '综艺', href: '/movies?type=19', match: { pathname: '/movies', type: '19' } },
  { label: '动漫', href: '/movies?type=24', match: { pathname: '/movies', type: '24' } },
];

export default function Navbar({ settings = { siteName: 'MovieFlex', siteLogoUrl: '' } }: { settings?: NavbarSettings }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get('type');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const isItemActive = (item: typeof navItems[number]) => {
    if (item.match.pathname !== pathname) return false;
    return 'type' in item.match ? currentType === item.match.type : true;
  };

  useEffect(() => {
    if (!pendingHref) return;
    const pendingItem = navItems.find((item) => item.href === pendingHref);
    if (pendingItem && isItemActive(pendingItem)) setPendingHref(null);
  }, [pathname, currentType, pendingHref]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = searchKeyword.trim();
    if (keyword) router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <header className="siteHeader">
      <div className="container navInner">
        <Link href="/" className="brand" aria-label={`${settings.siteName} 首页`}>
          {settings.siteLogoUrl ? <img className="brandLogo" src={settings.siteLogoUrl} alt={settings.siteName} /> : <>Movie<span>Flex</span></>}
        </Link>
        <nav className="primaryNav" aria-label="主导航">
          {navItems.map((item) => {
            const isActive = isItemActive(item);
            const isPending = pendingHref === item.href && !isActive;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`navLink ${isActive ? 'navLinkActive' : ''} ${isPending ? 'navLinkPending' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setPendingHref(isActive ? null : item.href)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {pendingHref && <span className="navProgress" aria-hidden="true" />}
        <div className="navActions">
          <form onSubmit={handleSearch} className="navSearch">
            <input type="search" value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="搜索影片" aria-label="搜索影片" />
            <button type="submit" aria-label="搜索">⌕</button>
          </form>
          {status === 'loading' ? <span className="navLoading">加载中</span> : session?.user ? (
            <div className="userMenu">
              <button className="accountButton" onClick={() => setShowDropdown((open) => !open)} aria-expanded={showDropdown}>我的 <span aria-hidden="true">⌄</span></button>
              {showDropdown && <div className="accountDropdown">
                <Link href="/user/profile" onClick={() => setShowDropdown(false)}>个人中心</Link>
                <Link href="/user/account" onClick={() => setShowDropdown(false)}>账号管理</Link>
                {(session.user as { role?: string }).role === 'ADMIN' && <Link href="/admin" onClick={() => setShowDropdown(false)}>管理后台</Link>}
                <button onClick={() => signOut({ callbackUrl: '/' })}>退出登录</button>
              </div>}
            </div>
          ) : <Link href="/login" className="loginLink">登录</Link>}
        </div>
      </div>
    </header>
  );
}
