import prisma from '@/lib/prisma';
import styles from '../admin.module.css';
import OutboxRetryButton from '@/components/admin/OutboxRetryButton';

export default async function AdminDashboardPage() {
  const [analytics, latestRecommendation, latestTask, movieCount, pendingEvents] = await Promise.all([
    prisma.analyticsResult.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
    prisma.recommendation.findFirst({ orderBy: { createdAt: 'desc' }, select: { batchId: true, createdAt: true } }),
    prisma.collectTask.findFirst({ orderBy: { createdAt: 'desc' }, select: { status: true, createdAt: true } }),
    prisma.movie.count(),
    prisma.eventOutbox.count({ where: { status: 'PENDING' } }),
  ]);
  return <><header className={styles.header}><div><p>ANALYTICS</p><h1>数据大屏</h1></div><span>真实数据库状态</span></header><section className={styles.metrics}><div><span>影片库</span><strong>{movieCount}</strong></div><div><span>最近采集</span><strong>{latestTask?.status || '暂无'}</strong></div><div><span>推荐批次</span><strong>{latestRecommendation?.batchId || '暂无'}</strong></div><div><span>待投递事件</span><strong>{pendingEvents}</strong></div></section><section className={styles.panel} style={{ marginTop: 22 }}><h2>Kafka 事件队列</h2><OutboxRetryButton /></section><section className={styles.panel} style={{ marginTop: 22 }}><h2>最近分析结果</h2>{analytics.length ? <table className={styles.table}><thead><tr><th>指标</th><th>键</th><th>数值</th><th>时间窗口</th><th>批次</th></tr></thead><tbody>{analytics.map((item) => <tr key={item.id}><td>{item.metricType}</td><td>{item.metricKey}</td><td>{Number(item.metricValue).toFixed(2)}</td><td>{item.timeWindow}</td><td>{item.batchId}</td></tr>)}</tbody></table> : <p>尚未写入 Spark 分析结果。Kafka 与 Spark 的运行状态需要由部署侧任务写入后才能显示。</p>}</section></>;
}
