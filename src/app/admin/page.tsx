import Link from 'next/link';
import styles from './admin.module.css';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import {
  getAdminOverviewData,
  getTaskProgressLabel,
  getTaskTone,
  type OverviewTone,
} from './overview-data';

function formatDateTime(value: string | null) {
  if (!value) return '暂无';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function toneClass(tone: OverviewTone) {
  if (tone === 'danger') return `${styles.statusPill} ${styles.statusDanger}`;
  if (tone === 'warning') return `${styles.statusPill} ${styles.statusWarning}`;
  return styles.statusPill;
}

function taskStatusLabel(status: string | null) {
  const labels: Record<string, string> = {
    QUEUED: '排队中',
    RUNNING: '运行中',
    PAUSED: '已暂停',
    SUCCEEDED: '已完成',
    FAILED: '失败',
    CANCELLED: '已取消',
  };
  return status ? labels[status] || status : '暂无任务';
}

export default async function AdminOverviewPage() {
  const data = await getAdminOverviewData();
  const latestTaskTone = getTaskTone(data.collection.latestTask?.status ?? null);

  const todoItems = [
    {
      title: '分类映射待审核',
      detail: '采集源分类需要确认归属',
      count: data.operations.pendingMappings,
      href: '/admin/catalog/categories',
    },
    {
      title: 'Kafka 待投递事件',
      detail: '事件堆积会影响统计与推荐',
      count: data.operations.pendingOutboxEvents,
      href: '/admin/dashboard',
    },
    {
      title: '失败采集任务',
      detail: '需要检查采集源或任务日志',
      count: data.collection.failedTasks,
      href: '/admin/catalog/sources',
    },
    {
      title: '未同步采集源',
      detail: '新增源尚未完成首次同步',
      count: data.collection.neverSyncedSources,
      href: '/admin/catalog/sources',
    },
  ];

  return <div className={styles.pageStack}>
    <AdminPageHeader eyebrow="OPERATIONS" title="运营概览" badge="今日运营状态" />

    <section className={styles.metrics}>
      <div><span>影片总数</span><strong>{data.metrics.movieCount.toLocaleString()}</strong></div>
      <div><span>今日观看</span><strong>{data.metrics.todayViews.toLocaleString()}</strong></div>
      <div><span>今日收藏</span><strong>{data.metrics.todayFavorites.toLocaleString()}</strong></div>
      <div><span>待处理事项</span><strong>{data.metrics.openIssues.toLocaleString()}</strong></div>
    </section>

    <section className={styles.overviewGrid}>
      <div className={styles.panel}>
        <h2>今日待处理</h2>
        <div className={styles.todoList}>
          {todoItems.map((item) => {
            const tone: OverviewTone = item.count > 0 ? 'warning' : 'normal';
            return <div className={styles.todoItem} key={item.title}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
              <div className={styles.toolbarActions}>
                <span className={toneClass(tone)}>{item.count}</span>
                <Link href={item.href} className={styles.linkButtonSecondary}>处理</Link>
              </div>
            </div>;
          })}
        </div>
      </div>

      <div className={styles.panel}>
        <h2>系统健康</h2>
        <div className={styles.todoList}>
          <div className={styles.todoItem}>
            <div><strong>今日活跃用户</strong><span>来自 DailyStats 全局维度</span></div>
            <span className={styles.statusPill}>{data.todayStats.uniqueUsers.toLocaleString()}</span>
          </div>
          <div className={styles.todoItem}>
            <div><strong>用户 / 游客观看</strong><span>今日观看来源拆分</span></div>
            <span className={styles.statusPill}>{data.todayStats.userViews} / {data.todayStats.guestViews}</span>
          </div>
          <div className={styles.todoItem}>
            <div><strong>最新推荐批次</strong><span>{data.operations.latestRecommendation?.batchId || '暂无推荐批次'}</span></div>
            <span className={styles.statusPill}>{formatDateTime(data.operations.latestRecommendation?.createdAt ?? null)}</span>
          </div>
          <div className={styles.todoItem}>
            <div><strong>最新统计日期</strong><span>今日无统计时用于判断消费者状态</span></div>
            <span className={toneClass(data.todayStats.latestStatsDate ? 'normal' : 'warning')}>{formatDateTime(data.todayStats.latestStatsDate)}</span>
          </div>
        </div>
      </div>
    </section>

    <section className={styles.overviewTwoColumn}>
      <div className={styles.panel}>
        <h2>采集状态</h2>
        <div className={styles.metrics}>
          <div><span>采集源</span><strong>{data.collection.totalSources}</strong></div>
          <div><span>启用源</span><strong>{data.collection.activeSources}</strong></div>
          <div><span>运行任务</span><strong>{data.collection.runningTasks}</strong></div>
          <div><span>失败任务</span><strong>{data.collection.failedTasks}</strong></div>
        </div>
        <p className={styles.message}>最近同步：{data.collection.latestSourceName || '暂无'} · {formatDateTime(data.collection.latestSourceSyncAt)}</p>
        <div className={styles.todoItem}>
          <div>
            <strong>最新采集任务</strong>
            <span>{data.collection.latestTask ? `${data.collection.latestTask.sourceKey} · ${getTaskProgressLabel(data.collection.latestTask)}` : '暂无任务'}</span>
          </div>
          <span className={toneClass(latestTaskTone)}>{taskStatusLabel(data.collection.latestTask?.status ?? null)}</span>
        </div>
        <div className={`${styles.toolbarActions} ${styles.panelActions}`}>
          <Link href="/admin/catalog/sources" className={styles.linkButton}>进入采集源管理</Link>
          <Link href="/admin/catalog/categories" className={styles.linkButtonSecondary}>处理分类映射</Link>
        </div>
      </div>

      <div className={styles.panel}>
        <h2>内容库健康</h2>
        <div className={styles.metrics}>
          <div><span>今日新增</span><strong>{data.contentHealth.todayNewMovies}</strong></div>
          <div><span>缺少海报</span><strong>{data.contentHealth.missingPosterMovies}</strong></div>
          <div><span>无播放源</span><strong>{data.contentHealth.missingPlaybackMovies}</strong></div>
          <div><span>未分类</span><strong>{data.contentHealth.uncategorizedMovies}</strong></div>
        </div>
        <p className={styles.message}>这些指标用于发现内容质量问题。第一版先进入影片库统一处理，不做复杂过滤跳转。</p>
        <Link href="/admin/movies" className={styles.linkButton}>进入影片库</Link>
      </div>
    </section>

    <section className={styles.overviewGrid}>
      <div className={styles.panel}>
        <h2>热门影片</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>影片</th><th>分类</th><th>观看</th><th>收藏</th><th>操作</th></tr></thead>
            <tbody>
              {data.popularMovies.map((movie) => (
                <tr key={movie.id}>
                  <td>{movie.title}</td>
                  <td>{movie.typeName || '未分类'}</td>
                  <td>{movie.viewCount.toLocaleString()}</td>
                  <td>{movie.favoriteCount.toLocaleString()}</td>
                  <td><Link href={`/admin/movies/${movie.id}`} className={styles.linkButtonSecondary}>编辑</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.panel}>
        <h2>快捷操作</h2>
        <div className={styles.quickActions}>
          <Link href="/admin/movies/new" className={styles.linkButton}>新增影片</Link>
          <Link href="/admin/catalog/sources" className={styles.linkButtonSecondary}>采集源管理</Link>
          <Link href="/admin/catalog/categories" className={styles.linkButtonSecondary}>分类管理</Link>
          <Link href="/admin/users" className={styles.linkButtonSecondary}>用户管理</Link>
          <Link href="/admin/stats/trends" className={styles.linkButtonSecondary}>时间趋势</Link>
          <Link href="/admin/dashboard" className={styles.linkButtonSecondary}>数据大屏</Link>
        </div>
      </div>
    </section>
  </div>;
}
