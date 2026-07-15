'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = searchKeyword.trim();
    if (keyword) router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <header className="siteHeader">
      <div className="container navInner">
        <Link href="/" className="brand" aria-label="MovieFlex 首页">Movie<span>Flex</span></Link>
        <nav className="primaryNav" aria-label="主导航">
          <Link href="/">首页</Link>
          <Link href="/movies?type=1">电影</Link>
          <Link href="/movies?type=10">剧集</Link>
          <Link href="/movies?type=19">综艺</Link>
          <Link href="/movies?type=24">动漫</Link>
        </nav>
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
