import Link from 'next/link';
import prisma from '@/lib/prisma';
import styles from './admin.module.css';

export default async function AdminOverviewPage() {
  const [sources, activeSources, movies, latestSource] = await Promise.all([
    prisma.collectSource.count(),
    prisma.collectSource.count({ where: { isActive: true } }),
    prisma.movie.count(),
    prisma.collectSource.findFirst({ orderBy: { lastSync: 'desc' }, select: { name: true, lastSync: true } }),
  ]);

  return <>
    <header className={styles.header}><div><p>OPERATIONS</p><h1>运营概览</h1></div><span>管理员专用</span></header>
    <section className={styles.metrics}>
      <div><span>采集源总数</span><strong>{sources}</strong></div><div><span>启用采集源</span><strong>{activeSources}</strong></div><div><span>影片总数</span><strong>{movies}</strong></div><div><span>最近同步</span><strong>{latestSource?.lastSync ? new Date(latestSource.lastSync).toLocaleDateString() : '暂无'}</strong></div>
    </section>
    <section className={styles.panel} style={{ marginTop: 22 }}><h2>内容采集</h2><p>管理 AppleCMS 采集源，执行增量或全量同步，并查看分类映射告警。</p><Link href="/admin/sources" className={styles.button}>进入采集源管理</Link></section>
  </>;
}
