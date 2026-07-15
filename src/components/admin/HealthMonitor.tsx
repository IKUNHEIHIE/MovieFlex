'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import OutboxRetryButton from './OutboxRetryButton';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import AnimatedNumber from '@/components/animated/AnimatedNumber';
import ChartContainer from '@/components/animated/ChartContainer';
import StatusIndicator from '@/components/animated/StatusIndicator';
import AdminCard from './AdminCard';

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
    >
      <AdminCard hoverable>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <StatusDot status={status} />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>{name}</span>
        </div>
        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', display: 'grid', gap: 4 }}>
          {detail}
        </div>
      </AdminCard>
    </motion.div>
  );
}

function LatencyGauge({ latency, status }: { latency: number; status: Status }) {
  const getColor = () => {
    if (latency < 50) return '#22c55e';
    if (latency < 100) return '#f59e0b';
    return '#ef4444';
  };

  const getPercentage = () => {
    return Math.min((latency / 200) * 100, 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <AdminCard>
        <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto' }}>
          <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="10"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={getColor()}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - getPercentage() / 100) }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <motion.div
              key={latency}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ fontSize: 24, fontWeight: 700, color: getColor() }}
            >
              <AnimatedNumber value={latency} format={(v) => `${v}`} />
            </motion.div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>ms</div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: 'white', textAlign: 'center' }}>
          数据库延迟
        </div>
      </AdminCard>
    </motion.div>
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
  const lastUpdate = new Date(health.timestamp).toLocaleTimeString('en-US', { hour12: false });

  const chartData = history.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    延迟: point.dbLatency,
    待处理事件: point.pendingEvents,
    影片数: point.movieCount,
  }));

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

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 22 }}>
        <LatencyGauge latency={health.database.latency} status={health.database.status} />
        <ChartContainer title="数据库延迟趋势（最近1小时）" loading={false}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f7df3" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#4f7df3" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" stroke="#999" fontSize={12} />
              <YAxis stroke="#999" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                }}
              />
              <Area
                type="monotone"
                dataKey="延迟"
                stroke="#4f7df3"
                strokeWidth={2}
                fill="url(#latencyGradient)"
                dot={{ r: 3, fill: '#4f7df3', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#4f7df3', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
        <ChartContainer title="Kafka 待处理事件趋势" loading={false}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="eventsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" stroke="#999" fontSize={12} />
              <YAxis stroke="#999" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                }}
              />
              <Area
                type="monotone"
                dataKey="待处理事件"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#eventsGradient)"
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="影片库增长趋势" loading={false}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" stroke="#999" fontSize={12} />
              <YAxis stroke="#999" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                }}
              />
              <Line
                type="monotone"
                dataKey="影片数"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
                activeDot={{ r: 7, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 22 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <AdminCard hoverable>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem' }}>影片库</span>
            <strong style={{ display: 'block', marginTop: 8, fontSize: '1.65rem', color: 'white' }}>
              <AnimatedNumber value={health.metrics.movieCount} />
            </strong>
          </AdminCard>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <AdminCard hoverable>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem' }}>最近采集</span>
            <strong style={{ display: 'block', marginTop: 8, fontSize: '1.2rem', color: 'white' }}>
              {health.metrics.latestTask.status ? (
                <>
                  <StatusDot status={health.metrics.latestTask.status === 'SUCCEEDED' ? 'ok' : health.metrics.latestTask.status === 'FAILED' ? 'failed' : 'degraded'} />
                  {health.metrics.latestTask.status}
                </>
              ) : '暂无'}
            </strong>
          </AdminCard>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AdminCard hoverable>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem' }}>推荐批次</span>
            <strong style={{ display: 'block', marginTop: 8, fontSize: '1.2rem', color: 'white' }}>
              {health.metrics.latestRecommendation.batchId || '暂无'}
            </strong>
          </AdminCard>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <AdminCard hoverable>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem' }}>待投递事件</span>
            <strong style={{ display: 'block', marginTop: 8, fontSize: '1.65rem', color: health.metrics.pendingEvents > 0 ? '#f59e0b' : 'white' }}>
              <AnimatedNumber value={health.metrics.pendingEvents} />
            </strong>
          </AdminCard>
        </motion.div>
      </section>

      <section style={{ marginBottom: 22 }}>
        <AdminCard title="Kafka 事件队列">
          <OutboxRetryButton />
        </AdminCard>
      </section>

      <section style={{ marginTop: 2 }}>
        <AdminCard title="最近分析结果">
          {analytics.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr><th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.7)' }}>指标</th><th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.7)' }}>键</th><th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.7)' }}>数值</th><th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.7)' }}>时间窗口</th><th style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.7)' }}>批次</th></tr>
                </thead>
                <tbody>
                  {analytics.map((item) => (
                    <tr key={item.id} style={{ transition: 'background 200ms ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.9)' }}>{item.metricType}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.9)' }}>{item.metricKey}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.9)' }}>{Number(item.metricValue).toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.9)' }}>{item.timeWindow}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.9)' }}>{item.batchId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>尚未写入 Spark 分析结果。Kafka 与 Spark 的运行状态需要由部署侧任务写入后才能显示。</p>
          )}
        </AdminCard>
      </section>
    </>
  );
}
