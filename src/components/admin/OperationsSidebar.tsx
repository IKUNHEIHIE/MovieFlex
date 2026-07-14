import Link from 'next/link';
import styles from '@/app/admin/admin.module.css';

export function OperationsSidebar() {
  return <aside className={styles.sidebar}>
    <Link href="/admin" className={styles.logo}>Movie<span>Flex</span><small>OPERATIONS</small></Link>
    <nav>
      <Link href="/admin">运营概览</Link>
      <Link href="/admin/sources">采集源</Link>
      <Link href="/admin/mappings">分类映射</Link>
      <Link href="/admin/movies">影片库</Link>
      <Link href="/admin/users">用户管理</Link>
      <Link href="/admin/themes">主题管理</Link>
      <Link href="/admin/dashboard">数据大屏</Link>
    </nav>
    <Link href="/" className={styles.back}>返回前台</Link>
  </aside>;
}
