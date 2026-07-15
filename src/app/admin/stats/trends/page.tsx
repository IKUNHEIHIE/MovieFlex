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
    观看量: trend.totalViews,
    用户观看: trend.userViews,
    游客观看: trend.guestViews,
    收藏数: trend.totalFavorites,
    活跃用户: trend.uniqueUsers,
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

      {/* Views Trend Chart */}
      <div className={styles.chartBlock}>
        <section className={styles.chartPanel}>
          <ChartContainer title="观看量趋势" loading={loading}>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#667eea" stopOpacity={0.8}/>
                    <stop offset="50%" stopColor="#667eea" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#667eea" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="userViewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="guestViewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#8290a8" 
                  fontSize={12} 
                  tick={{ fill: '#8290a8' }}
                  axisLine={{ stroke: '#e5eaf3' }}
                />
                <YAxis 
                  stroke="#8290a8" 
                  fontSize={12} 
                  tick={{ fill: '#8290a8' }}
                  axisLine={{ stroke: '#e5eaf3' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />
                <Area
                  type="monotone"
                  dataKey="观看量"
                  stroke="#667eea"
                  strokeWidth={3}
                  fill="url(#viewsGradient)"
                  dot={{ r: 4, fill: '#667eea', strokeWidth: 0 }}
                  activeDot={{ r: 7, fill: '#667eea', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={2000}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="用户观看"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#userViewsGradient)"
                  dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={2000}
                  animationBegin={200}
                />
                <Area
                  type="monotone"
                  dataKey="游客观看"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#guestViewsGradient)"
                  dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={2000}
                  animationBegin={400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </section>
      </div>

      {/* Favorites & Users Trend */}
      <section className={styles.chartPanel}>
        <ChartContainer title="收藏量与活跃用户趋势" loading={loading}>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#8290a8" 
                fontSize={12} 
                tick={{ fill: '#8290a8' }}
                axisLine={{ stroke: '#e5eaf3' }}
              />
              <YAxis 
                stroke="#8290a8" 
                fontSize={12} 
                tick={{ fill: '#8290a8' }}
                axisLine={{ stroke: '#e5eaf3' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              <Line
                type="monotone"
                dataKey="收藏数"
                stroke="#f5576c"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f5576c', strokeWidth: 0 }}
                activeDot={{ r: 7, fill: '#f5576c', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={2000}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="活跃用户"
                stroke="#43e97b"
                strokeWidth={3}
                dot={{ r: 4, fill: '#43e97b', strokeWidth: 0 }}
                activeDot={{ r: 7, fill: '#43e97b', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={2000}
                animationBegin={300}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </section>
    </div>
  );
}
