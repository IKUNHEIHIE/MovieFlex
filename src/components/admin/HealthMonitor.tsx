'use client';

import { useState, useEffect } from 'react';
import styles from '@/app/admin/admin.module.css';
import OutboxRetryButton from './OutboxRetryButton';
import AdminPageHeader from '@/components/shared/AdminPageHeader';

type Status = 'ok' | 'degraded' | 'failed';

interface HealthData {
  database: { status: Status; latency: number };
  kafka: { status: Status; connected: boolean };
  metrics: {
    movieCount: number;
    pendingEvents: number;
    latestTask: { status: string | null; createdAt: string | null };
    latestRecommendation: { batchId: string | null; createdAt: string | null };
  };
  timestamp: string;
}

interface AnalyticsItem {
  id: number;
  metricType: string;
  metricKey: string;
  metricValue: number | { toString(): string };
  timeWindow: string;
  batchId: string;
}

const initialHealth: HealthData = {
  database: { status: 'ok', latency: 0 },
  kafka: { status: 'ok', connected: false },
  metrics: {
    movieCount: 0,
    pendingEvents: 0,
    latestTask: { status: null, createdAt: null },
    latestRecommendation: { batchId: null, createdAt: null },
  },
  timestamp: new Date().toISOString(),
};

function StatusDot({ status }: { status: Status }) {
  const color =
    status === 'ok' ? '#22c55e' :
    status === 'degraded' ? '#f59e0b' :
    '#ef4444';
  return (
    <span style={{
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: '50%',
      backgroundColor: color,
      boxShadow: `0 0 6px ${color}`,
      marginRight: 6,
    }} />
  );
}

function ServiceCard({
  name,
  status,
  detail,
}: {
  name: string;
  status: Status;
  detail: React.ReactNode;
}) {
  return (
    <div style={{
      border: '1px solid var(--line)',
      borderRadius: 12,
      background: 'var(--surface)',
      padding: 20,
      boxShadow: '0 8px 24px rgba(43, 74, 132, .045)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <StatusDot status={status} />
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{name}</span>
      </div>
      <div style={{ color: 'var(--muted)', fontSize: '0.85rem', display: 'grid', gap: 4 }}>
        {detail}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<Status, string> = {
  ok: '正常运行',
  degraded: '降级',
  failed: '连接失败',
};

export default function HealthMonitor({
  analytics,
}: {
  analytics: AnalyticsItem[];
}) {
  const [health, setHealth] = useState<HealthData>(initialHealth);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/internal/health', { cache: 'no-store' });
        const data = await res.json();
        if (active) setHealth(data);
      } catch {
        if (active) setHealth(prev => ({ ...prev, database: { ...prev.database, status: 'failed' }, kafka: { ...prev.kafka, status: 'failed', connected: false } }));
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 1000);
    const tickInterval = setInterval(() => { if (active) setTick(t => t + 1); }, 1000);
    return () => { active = false; clearInterval(interval); clearInterval(tickInterval); };
  }, []);

  const uptime = Math.floor(tick);
  const lastUpdate = new Date(health.timestamp).toLocaleTimeString('en-US', { hour12: false });

  return (
    <>
      <AdminPageHeader
        eyebrow="ANALYTICS"
        title="数据大屏"
        badge={`实时 · 已刷新 ${uptime}s`}
      />

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 22 }}>
        <ServiceCard
          name="数据库 (MySQL)"
          status={health.database.status}
          detail={
            <>
              <span>状态：{STATUS_LABEL[health.database.status]}</span>
              <span>查询延迟：{health.database.latency > 0 ? `${health.database.latency} ms` : '—'}</span>
              <span>更新时间：{lastUpdate}</span>
            </>
          }
        />
        <ServiceCard
          name="消息队列 (Kafka)"
          status={health.kafka.status}
          detail={
            <>
              <span>状态：{STATUS_LABEL[health.kafka.status]}</span>
              <span>生产者连接：{health.kafka.connected ? '已连接' : '未连接'}</span>
              <span>待投递事件：{health.metrics.pendingEvents}</span>
            </>
          }
        />
      </section>

      <section className={styles.metrics} style={{ marginBottom: 22 }}>
        <div><span>影片库</span><strong>{health.metrics.movieCount}</strong></div>
        <div>
          <span>最近采集</span>
          <strong style={{ fontSize: '1.2rem' }}>
            {health.metrics.latestTask.status ? (
              <>
                <StatusDot status={health.metrics.latestTask.status === 'SUCCEEDED' ? 'ok' : health.metrics.latestTask.status === 'FAILED' ? 'failed' : 'degraded'} />
                {health.metrics.latestTask.status}
              </>
            ) : '暂无'}
          </strong>
        </div>
        <div><span>推荐批次</span><strong>{health.metrics.latestRecommendation.batchId || '暂无'}</strong></div>
        <div><span>待投递事件</span><strong style={{ color: health.metrics.pendingEvents > 0 ? '#f59e0b' : undefined }}>{health.metrics.pendingEvents}</strong></div>
      </section>

      <section className={styles.panel} style={{ marginTop: 2 }}>
        <h2>Kafka 事件队列</h2>
        <OutboxRetryButton />
      </section>

      <section className={styles.panel} style={{ marginTop: 22 }}>
        <h2>最近分析结果</h2>
        {analytics.length ? (
          <table className={styles.table}>
            <thead>
              <tr><th>指标</th><th>键</th><th>数值</th><th>时间窗口</th><th>批次</th></tr>
            </thead>
            <tbody>
              {analytics.map((item) => (
                <tr key={item.id}>
                  <td>{item.metricType}</td>
                  <td>{item.metricKey}</td>
                  <td>{Number(item.metricValue).toFixed(2)}</td>
                  <td>{item.timeWindow}</td>
                  <td>{item.batchId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>尚未写入 Spark 分析结果。Kafka 与 Spark 的运行状态需要由部署侧任务写入后才能显示。</p>
        )}
      </section>
    </>
  );
}
