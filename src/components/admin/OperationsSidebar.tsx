'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import styles from '@/app/admin/admin.module.css';

export function OperationsSidebar() {
  const pathname = usePathname();
  const [catalogExpanded, setCatalogExpanded] = useState(
    pathname.startsWith('/admin/catalog')
  );

  const isCatalogActive = pathname.startsWith('/admin/catalog');

  return (
    <aside className={styles.sidebar}>
      <Link href="/admin" className={styles.logo}>
        Movie<span>Flex</span>
        <small>OPERATIONS</small>
      </Link>
      <nav>
        <Link
          href="/admin"
          className={pathname === '/admin' ? styles.activeLink : ''}
        >
          运营概览
        </Link>

        <div className={styles.menuGroup}>
          <button
            className={styles.menuGroupButton}
            onClick={() => setCatalogExpanded(!catalogExpanded)}
            aria-expanded={catalogExpanded}
            aria-controls="catalog-submenu"
          >
            <span>采集管理</span>
            <span
              className={`${styles.chevron} ${
                catalogExpanded ? styles.chevronExpanded : ''
              }`}
            >
              ›
            </span>
          </button>
          {catalogExpanded && (
            <div id="catalog-submenu" className={styles.submenu}>
              <Link
                href="/admin/catalog/sources"
                className={
                  pathname === '/admin/catalog/sources' ? styles.activeLink : ''
                }
              >
                采集源
              </Link>
              <Link
                href="/admin/catalog/categories"
                className={
                  pathname === '/admin/catalog/categories'
                    ? styles.activeLink
                    : ''
                }
              >
                分类管理
              </Link>
            </div>
          )}
        </div>

        <Link
          href="/admin/movies"
          className={pathname === '/admin/movies' ? styles.activeLink : ''}
        >
          影片库
        </Link>
        <Link
          href="/admin/users"
          className={pathname === '/admin/users' ? styles.activeLink : ''}
        >
          用户管理
        </Link>
        <Link
          href="/admin/themes"
          className={pathname === '/admin/themes' ? styles.activeLink : ''}
        >
          主题管理
        </Link>
        <Link
          href="/admin/dashboard"
          className={pathname === '/admin/dashboard' ? styles.activeLink : ''}
        >
          数据大屏
        </Link>
      </nav>
      <Link href="/" className={styles.back}>
        返回前台
      </Link>
    </aside>
  );
}
