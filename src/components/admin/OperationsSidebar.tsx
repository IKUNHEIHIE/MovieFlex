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
  const [statsExpanded, setStatsExpanded] = useState(
    pathname.startsWith('/admin/stats')
  );

  const isCatalogActive = pathname.startsWith('/admin/catalog');
  const isStatsActive = pathname.startsWith('/admin/stats');

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

        <div className={styles.menuGroup}>
          <button
            className={styles.menuGroupButton}
            onClick={() => setStatsExpanded(!statsExpanded)}
            aria-expanded={statsExpanded}
            aria-controls="stats-submenu"
          >
            <span>数据统计</span>
            <span
              className={`${styles.chevron} ${
                statsExpanded ? styles.chevronExpanded : ''
              }`}
            >
              ›
            </span>
          </button>
          {statsExpanded && (
            <div id="stats-submenu" className={styles.submenu}>
              <Link
                href="/admin/stats/movies"
                className={
                  pathname === '/admin/stats/movies' ? styles.activeLink : ''
                }
              >
                影片热度
              </Link>
              <Link
                href="/admin/stats/categories"
                className={
                  pathname === '/admin/stats/categories' ? styles.activeLink : ''
                }
              >
                分类分布
              </Link>
              <Link
                href="/admin/stats/users"
                className={
                  pathname === '/admin/stats/users' ? styles.activeLink : ''
                }
              >
                用户行为
              </Link>
              <Link
                href="/admin/stats/trends"
                className={
                  pathname === '/admin/stats/trends' ? styles.activeLink : ''
                }
              >
                时间趋势
              </Link>
            </div>
          )}
        </div>

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
