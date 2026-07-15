'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import AnimatedCard from '@/components/animated/AnimatedCard';
import AnimatedNumber from '@/components/animated/AnimatedNumber';
import ChartContainer from '@/components/animated/ChartContainer';

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
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(102, 126, 234, 0.2)',
            padding: '16px 20px',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: 10, fontSize: 14, color: '#1a1a2e' }}>
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: entry.color }} />
              <span style={{ fontSize: 13, color: '#666', flex: 1 }}>{entry.name}:</span>
              <strong style={{ fontSize: 13, color: '#1a1a2e' }}>{entry.value?.toLocaleString()}</strong>
            </div>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
            时间趋势分析
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {[7, 30, 90].map((d) => (
              <motion.button
                key={d}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDays(d)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: days === d
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'white',
                  color: days === d ? 'white' : '#666',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: days === d
                    ? '0 4px 15px rgba(102, 126, 234, 0.4)'
                    : '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                最近 {d} 天
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
          <AnimatedCard delay={0.1}>
            <div style={{ padding: 24, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: 12, color: 'white' }}>
              <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>日均观看量</p>
              <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
                <AnimatedNumber value={summary.avgDailyViews} />
              </p>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
            <div style={{ padding: 24, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: 12, color: 'white' }}>
              <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>日均收藏量</p>
              <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
                <AnimatedNumber value={summary.avgDailyFavorites} />
              </p>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.3}>
            <div style={{ padding: 24, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: 12, color: 'white' }}>
              <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>日均活跃用户</p>
              <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
                <AnimatedNumber value={summary.avgDAU} />
              </p>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.4}>
            <div style={{ padding: 24, background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', borderRadius: 12, color: 'white' }}>
              <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>统计天数</p>
              <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
                <AnimatedNumber value={summary.totalDays} />
              </p>
            </div>
          </AnimatedCard>
        </div>
      )}

      {/* Views Trend Chart */}
      <div style={{ marginBottom: 32 }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#999" 
                fontSize={12} 
                tick={{ fill: '#999' }}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <YAxis 
                stroke="#999" 
                fontSize={12} 
                tick={{ fill: '#999' }}
                axisLine={{ stroke: '#e0e0e0' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              <motion.g>
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
              </motion.g>
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
      </div>

      {/* Favorites & Users Trend */}
      <ChartContainer title="收藏量与活跃用户趋势" loading={loading}>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#999" 
              fontSize={12} 
              tick={{ fill: '#999' }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              stroke="#999" 
              fontSize={12} 
              tick={{ fill: '#999' }}
              axisLine={{ stroke: '#e0e0e0' }}
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
    </div>
  );
}
