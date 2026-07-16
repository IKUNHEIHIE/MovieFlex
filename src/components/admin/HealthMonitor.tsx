'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import OutboxRetryButton from './OutboxRetryButton';
import AnimatedNumber from '@/components/animated/AnimatedNumber';
import styles from '@/app/admin/admin.module.css';

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

interface HistoryPoint {
  timestamp: string;
  dbLatency: number;
  pendingEvents: number;
  movieCount: number;
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
    <motion.span
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.8, 1, 0.8]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}`,
        marginRight: 6,
      }}
    />
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
  const [history, setHistory] = useState<HistoryPoint[]>([]);

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

    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/admin/health/history', { cache: 'no-store' });
        const data = await res.json();
        if (active && data.success) setHistory(data.data);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      }
    };

    fetchHealth();
    fetchHistory();
    const interval = setInterval(fetchHealth, 5000);
    const historyInterval = setInterval(fetchHistory, 5000);
    const tickInterval = setInterval(() => { if (active) setTick(t => t + 1); }, 1000);
    return () => { 
      active = false; 
      clearInterval(interval); 
      clearInterval(historyInterval);
      clearInterval(tickInterval); 
    };
  }, []);

  const uptime = Math.floor(tick);
  const latencyScanKey = `latency-scan-${uptime}`;
  const lastUpdate = new Date(health.timestamp).toLocaleTimeString('en-US', { hour12: false });
  const statusRank = { ok: 0, degraded: 1, failed: 2 } satisfies Record<Status, number>;
  const systemStatus: Status = statusRank[health.database.status] > statusRank[health.kafka.status] ? health.database.status : health.kafka.status;
  const statusText = systemStatus === 'ok' ? 'ONLINE' : systemStatus === 'degraded' ? 'DEGRADED' : 'ALERT';

  const chartData = history.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    延迟: point.dbLatency,
    待处理事件: point.pendingEvents,
    影片数: point.movieCount,
  }));
  const maxMovies = Math.max(1, ...history.map((point) => point.movieCount), health.metrics.movieCount);
  const dbLatencyScore = Math.min(100, Math.max(0, (1 - health.database.latency / 200) * 100));
  const kafkaScore = health.kafka.connected ? (health.metrics.pendingEvents > 0 ? 70 : 100) : 0;
  const healthScore = Math.round(dbLatencyScore * 0.5 + kafkaScore * 0.5);
  const heatmapData = (history.length ? history : [{ ...health, timestamp: health.timestamp, dbLatency: health.database.latency, pendingEvents: health.metrics.pendingEvents, movieCount: health.metrics.movieCount } as HistoryPoint]).slice(-30).map((point) => ({
    label: new Date(point.timestamp).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    value: point.movieCount,
    intensity: Math.max(0.12, point.movieCount / maxMovies),
  }));
  const alerts = [
    { label: '数据库状态', value: STATUS_LABEL[health.database.status], tone: health.database.status },
    { label: 'Kafka 连接', value: health.kafka.connected ? '已连接' : '未连接', tone: health.kafka.connected ? 'ok' : 'failed' as Status },
    { label: '待投递事件', value: `${health.metrics.pendingEvents}`, tone: health.metrics.pendingEvents > 0 ? 'degraded' as Status : 'ok' as Status },
    { label: '最近采集任务', value: health.metrics.latestTask.status || '暂无任务', tone: health.metrics.latestTask.status === 'FAILED' ? 'failed' as Status : health.metrics.latestTask.status ? 'ok' as Status : 'degraded' as Status },
  ];
  const nodes = [
    { label: '采集源', detail: health.metrics.latestTask.status || '等待任务', status: health.metrics.latestTask.status === 'FAILED' ? 'failed' as Status : 'ok' as Status },
    { label: '影片库', detail: `${health.metrics.movieCount.toLocaleString()} 部`, status: 'ok' as Status },
    { label: '播放事件', detail: '实时写入', status: 'ok' as Status },
    { label: 'Kafka 队列', detail: `${health.metrics.pendingEvents} 待投递`, status: health.metrics.pendingEvents > 0 ? 'degraded' as Status : health.kafka.status },
    { label: '统计推荐', detail: health.metrics.latestRecommendation.batchId || '等待批次', status: health.metrics.latestRecommendation.batchId ? 'ok' as Status : 'degraded' as Status },
  ];

  return (
    <div className={`${styles.commandCenter} ${styles.commandCenterLight}`}>
      <div className={styles.screenGlow} />
      <header className={styles.commandHero}>
        <div>
          <p>全链路数据监控</p>
          <h1>MovieFlex 实时运营指挥中心</h1>
          <span>采集 · 播放 · Kafka · 统计推荐链路实时巡航</span>
        </div>
        <div className={styles.commandStatus}>
          <strong>{statusText}</strong>
          <span>刷新 {uptime}s · {lastUpdate}</span>
        </div>
      </header>

      <section className={styles.commandMetricGrid}>
        <article><span>数据库延迟</span><strong><AnimatedNumber value={health.database.latency} format={(value) => `${value}ms`} /></strong><p>{STATUS_LABEL[health.database.status]}</p></article>
        <article><span>影片库规模</span><strong><AnimatedNumber value={health.metrics.movieCount} /></strong><p>内容资产实时增长</p></article>
        <article><span>Kafka 待投递</span><strong><AnimatedNumber value={health.metrics.pendingEvents} /></strong><p>{health.kafka.connected ? '生产者在线' : '生产者离线'}</p></article>
        <article><span>推荐批次</span><strong>{health.metrics.latestRecommendation.batchId || '待生成'}</strong><p>统计推荐链路</p></article>
      </section>

      <section className={styles.commandGrid}>
        <section className={styles.commandPanelLarge}>
          <h2>链路拓扑</h2>
          <div className={styles.opsTimeline}>
            {nodes.map((node, index) => (
              <div key={node.label} className={styles.signalNode} data-tone={node.status}>
                <StatusDot status={node.status} />
                <strong>{node.label}</strong>
                <span>{node.detail}</span>
                {index < nodes.length - 1 && <i aria-hidden="true" />}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.alertTower}>
          <h2>告警中心</h2>
          {alerts.map((alert) => (
            <div key={alert.label} data-tone={alert.tone}>
              <span>{alert.label}</span>
              <strong>{alert.value}</strong>
            </div>
          ))}
          <OutboxRetryButton />
        </section>
      </section>

      <section className={styles.commandGridThree}>
        <section className={styles.commandPanel}>
          <h2>系统健康雷达</h2>
          <div className={styles.healthRadar}>
            {[
              ['DB', health.database.status],
              ['Kafka', health.kafka.status],
              ['采集', alerts[3].tone],
              ['队列', alerts[2].tone],
              ['推荐', health.metrics.latestRecommendation.batchId ? 'ok' : 'degraded'],
            ].map(([label, tone]) => <span key={label} data-tone={tone}>{label}</span>)}
          </div>
        </section>

        <section className={styles.commandPanel}>
          <h2>综合健康度仪表盘</h2>
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              <defs><linearGradient id="healthGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#4f7df3"/><stop offset="100%" stopColor="#8ab0ff"/></linearGradient></defs>
              <circle cx="65" cy="65" r={54} fill="none" stroke="#e5eaf3" strokeWidth={14}/><path d={`M65,${65-54} ${(() => { const pct = healthScore; const rad = (pct / 100) * 2 * Math.PI - Math.PI / 2; return `A54,54 0 ${pct > 50 ? 1 : 0},1 ${65 + 54 * Math.cos(rad)},${65 + 54 * Math.sin(rad)}`; })()}`} fill="none" stroke="url(#healthGrad)" strokeWidth={14} strokeLinecap="round"/>
              <text x="65" y="58" textAnchor="middle" dominantBaseline="central" fill="#1b2433" fontSize="26" fontWeight="800">{healthScore}%</text>
              <text x="65" y="76" textAnchor="middle" dominantBaseline="central" fill="#4f7df3" fontSize="8.5">{STATUS_LABEL[systemStatus]}</text>
            </svg>
          </div>
        </section>

        <section className={styles.commandPanel}>
          <h2>活跃日历热力图</h2>
          <div className={styles.commandHeatmap}>
            {heatmapData.map((point) => <span key={point.label} title={`${point.label}: ${point.value}`} style={{ opacity: point.intensity }} />)}
          </div>
        </section>

        <section className={styles.commandPanel}>
          <h2>最近分析结果</h2>
          <div className={styles.commandList}>
            {analytics.slice(0, 5).map((item) => <div key={item.id}><span>{item.metricType}</span><strong>{Number(item.metricValue).toFixed(2)}</strong></div>)}
            {analytics.length === 0 && <p>等待 Spark 分析结果写入。</p>}
          </div>
        </section>
      </section>

      <section className={styles.commandGridThree}>
        <section className={styles.commandPanel}>
          <h2>数据库延迟趋势 <span>实时采样</span></h2>
          <div className={styles.commandLatencyChart}>
            <div className={styles.commandChartScan} key={latencyScanKey} aria-hidden="true" />
            <ResponsiveContainer width="100%" height={240}><AreaChart data={chartData}><defs><linearGradient id="commandLatency" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f7df3" stopOpacity={0.46}/><stop offset="100%" stopColor="#4f7df3" stopOpacity={0.04}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(79,125,243,.16)" /><XAxis dataKey="time" stroke="#8290a8" fontSize={11} /><YAxis stroke="#8290a8" fontSize={11} /><Tooltip contentStyle={{ background: '#fff', border: '1px solid #d7e2f2', borderRadius: 10, color: '#1b2433', boxShadow: '0 12px 28px rgba(79,125,243,.14)' }} /><Area key={latencyScanKey} type="monotone" dataKey="延迟" stroke="#4f7df3" fill="url(#commandLatency)" strokeWidth={2.5} animationDuration={820} /></AreaChart></ResponsiveContainer>
          </div>
        </section>
        <section className={styles.commandPanel}>
          <h2>Kafka 堆积趋势</h2>
          <ResponsiveContainer width="100%" height={240}><AreaChart data={chartData}><defs><linearGradient id="commandEvents" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.76}/><stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(79,125,243,.16)" /><XAxis dataKey="time" stroke="#8290a8" fontSize={11} /><YAxis stroke="#8290a8" fontSize={11} /><Tooltip contentStyle={{ background: '#fff', border: '1px solid #f7d99b', borderRadius: 10, color: '#1b2433', boxShadow: '0 12px 28px rgba(245,158,11,.12)' }} /><Area type="monotone" dataKey="待处理事件" stroke="#f59e0b" fill="url(#commandEvents)" strokeWidth={2} /></AreaChart></ResponsiveContainer>
        </section>
        <section className={styles.commandPanel}>
          <h2>内容库增长趋势</h2>
          <ResponsiveContainer width="100%" height={240}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(79,125,243,.16)" /><XAxis dataKey="time" stroke="#8290a8" fontSize={11} /><YAxis stroke="#8290a8" fontSize={11} /><Tooltip contentStyle={{ background: '#fff', border: '1px solid #bbebcc', borderRadius: 10, color: '#1b2433', boxShadow: '0 12px 28px rgba(34,197,94,.12)' }} /><Line type="monotone" dataKey="影片数" stroke="#22c55e" strokeWidth={3} dot={{ r: 3, fill: '#22c55e' }} /></LineChart></ResponsiveContainer>
        </section>
      </section>
    </div>
  );
}
