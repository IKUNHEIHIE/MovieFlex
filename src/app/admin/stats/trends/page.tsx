'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import AnimatedCard from '@/components/animated/AnimatedCard';
import AnimatedNumber from '@/components/animated/AnimatedNumber';
import ChartContainer from '@/components/animated/ChartContainer';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import AdminChartTooltip from '@/components/admin/AdminChartTooltip';
import styles from '../../admin.module.css';

interface TrendData {
  date: string;
  totalViews: number;
  userViews: number;
  guestViews: number;
  totalFavorites: number;
  uniqueUsers: number;
  conversionRate: number;
}

interface Summary {
  avgDailyViews: number;
  avgDailyFavorites: number;
  avgDAU: number;
  totalDays: number;
}

export default function TrendsStatsPage() {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchTrends();
  }, [days]);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats/trends?days=${days}`);
      const data = await res.json();
      if (data.success) {
        setTrends(data.data.trends);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = trends.map((trend) => ({
    date: trend.date.substring(5),
    fullDate: trend.date,
    观看量: trend.totalViews,
    用户观看: trend.userViews,
    游客观看: trend.guestViews,
    收藏数: trend.totalFavorites,
    活跃用户: trend.uniqueUsers,
    收藏转化率: trend.totalViews > 0 ? Number(((trend.totalFavorites / trend.totalViews) * 100).toFixed(2)) : 0,
  }));

  const peakDay = [...trends].sort((a, b) => b.totalViews - a.totalViews)[0];
  const bestConversionDay = [...trends].sort((a, b) => {
    const bRate = b.totalViews > 0 ? b.totalFavorites / b.totalViews : 0;
    const aRate = a.totalViews > 0 ? a.totalFavorites / a.totalViews : 0;
    return bRate - aRate;
  })[0];
  const maxViews = Math.max(1, ...trends.map((trend) => trend.totalViews));
  const heatmapData = trends.map((trend) => ({
    date: trend.date.substring(5),
    views: trend.totalViews,
    intensity: Math.max(0.08, trend.totalViews / maxViews),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <AdminChartTooltip
          title={label}
          items={payload.map((entry: any) => ({
            label: entry.name,
            value: entry.value?.toLocaleString(),
            color: entry.color,
          }))}
        />
      );
    }
    return null;
  };

  return (
    <div className={styles.pageStack}>
      <AdminPageHeader eyebrow="ANALYTICS" title="时间趋势分析" badge={summary ? `${summary.totalDays} 天` : '加载中'} />
          <section className={styles.panel}>
            <div className={styles.toolbar}>
              <h2>统计周期</h2>
              <div className={styles.toolbarActions}>
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={days === d ? styles.button : styles.buttonSecondary}
                  >
                    最近 {d} 天
                  </button>
                ))}
              </div>
            </div>
          </section>

      {/* Stats Cards */}
      {summary && (
        <div className={styles.metricGrid}>
          <AnimatedCard delay={0.1}>
              <div className={styles.metricCard}>
                <span>日均观看量</span>
                <strong>
                  <AnimatedNumber value={summary.avgDailyViews} />
                </strong>
              </div>
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
              <div className={styles.metricCard}>
                <span>日均收藏量</span>
                <strong>
                  <AnimatedNumber value={summary.avgDailyFavorites} />
                </strong>
              </div>
          </AnimatedCard>

          <AnimatedCard delay={0.3}>
              <div className={styles.metricCard}>
                <span>日均活跃用户</span>
                <strong>
                  <AnimatedNumber value={summary.avgDAU} />
                </strong>
              </div>
          </AnimatedCard>

          <AnimatedCard delay={0.4}>
              <div className={styles.metricCard}>
                <span>统计天数</span>
                <strong>
                  <AnimatedNumber value={summary.totalDays} />
                </strong>
              </div>
          </AnimatedCard>
        </div>
      )}

      <section className={styles.showcaseGrid}>
        <ChartContainer title="用户/游客观看趋势" loading={loading}>
          <div className={styles.heroChart}>
            <ResponsiveContainer width="100%" height={460}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f7df3" stopOpacity={0.55}/><stop offset="100%" stopColor="#4f7df3" stopOpacity={0.04}/></linearGradient>
                  <linearGradient id="userViewsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.55}/><stop offset="100%" stopColor="#22c55e" stopOpacity={0.04}/></linearGradient>
                  <linearGradient id="guestViewsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.48}/><stop offset="100%" stopColor="#f59e0b" stopOpacity={0.04}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
                <XAxis dataKey="date" stroke="#8290a8" fontSize={12} tick={{ fill: '#8290a8' }} axisLine={{ stroke: '#e5eaf3' }} />
                <YAxis stroke="#8290a8" fontSize={12} tick={{ fill: '#8290a8' }} axisLine={{ stroke: '#e5eaf3' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" dataKey="观看量" stroke="#4f7df3" strokeWidth={3} fill="url(#viewsGradient)" dot={{ r: 3, fill: '#4f7df3', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#4f7df3', stroke: '#fff', strokeWidth: 2 }} animationDuration={2000} />
                <Area type="monotone" dataKey="用户观看" stackId="views" stroke="#22c55e" strokeWidth={2} fill="url(#userViewsGradient)" dot={false} animationDuration={2000} animationBegin={160} />
                <Area type="monotone" dataKey="游客观看" stackId="views" stroke="#f59e0b" strokeWidth={2} fill="url(#guestViewsGradient)" dot={false} animationDuration={2000} animationBegin={320} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>

        <div className={styles.stack}>
          <section className={styles.insightGrid}>
            <article className={styles.insightCard}>
              <span>趋势洞察</span>
              <strong>{peakDay ? peakDay.date.substring(5) : '暂无'}</strong>
              <p>峰值观看 {peakDay ? peakDay.totalViews.toLocaleString() : 0}，适合讲运营活动效果。</p>
            </article>
            <article className={styles.insightCard}>
              <span>最佳转化</span>
              <strong>{bestConversionDay ? bestConversionDay.date.substring(5) : '暂无'}</strong>
              <p>收藏转化 {bestConversionDay && bestConversionDay.totalViews > 0 ? `${((bestConversionDay.totalFavorites / bestConversionDay.totalViews) * 100).toFixed(1)}%` : '0%'}</p>
            </article>
          </section>

          <section className={styles.chartPanel}>
            <h2>活跃日历热力图</h2>
            <p className={styles.chartNarrative}>颜色越深代表当天观看越集中，适合展示采集后的持续运营数据。</p>
            <div className={styles.heatmapGrid}>
              {heatmapData.map((day) => (
                <div key={day.date} className={styles.heatmapCell} title={`${day.date}: ${day.views} 次观看`} style={{ background: `rgba(79,125,243,${day.intensity})` }} />
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className={styles.miniChartGrid}>
        <ChartContainer title="收藏转化率趋势" loading={loading}>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
              <XAxis dataKey="date" stroke="#8290a8" fontSize={12} tick={{ fill: '#8290a8' }} axisLine={{ stroke: '#e5eaf3' }} />
              <YAxis stroke="#8290a8" fontSize={12} tick={{ fill: '#8290a8' }} axisLine={{ stroke: '#e5eaf3' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="收藏转化率" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} animationDuration={2000} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="收藏量与活跃用户趋势" loading={loading}>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
              <XAxis dataKey="date" stroke="#8290a8" fontSize={12} tick={{ fill: '#8290a8' }} axisLine={{ stroke: '#e5eaf3' }} />
              <YAxis stroke="#8290a8" fontSize={12} tick={{ fill: '#8290a8' }} axisLine={{ stroke: '#e5eaf3' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="收藏数" stroke="#f5576c" strokeWidth={3} dot={{ r: 4, fill: '#f5576c', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#f5576c', stroke: '#fff', strokeWidth: 2 }} animationDuration={2000} />
              <Line type="monotone" dataKey="活跃用户" stroke="#43e97b" strokeWidth={3} dot={{ r: 4, fill: '#43e97b', strokeWidth: 0 }} activeDot={{ r: 7, fill: '#43e97b', stroke: '#fff', strokeWidth: 2 }} animationDuration={2000} animationBegin={300} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </section>
    </div>
  );
}
