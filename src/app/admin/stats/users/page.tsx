'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AnimatedCard from '@/components/animated/AnimatedCard';
import AnimatedNumber from '@/components/animated/AnimatedNumber';
import ChartContainer from '@/components/animated/ChartContainer';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import AdminChartTooltip from '@/components/admin/AdminChartTooltip';
import styles from '../../admin.module.css';

interface UserStat {
  id: number;
  username: string;
  watchCount: number;
  uniqueMovies: number;
  favoriteCount: number;
  avgProgress: number;
  activityLevel: string;
}

const COLORS = ['#ef4444', '#f59e0b', '#94a3b8'];

export default function UsersStatsPage() {
  const [users, setUsers] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    highActive: 0,
    mediumActive: 0,
    lowActive: 0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        
        const highActive = data.data.filter((u: UserStat) => u.activityLevel === 'high').length;
        const mediumActive = data.data.filter((u: UserStat) => u.activityLevel === 'medium').length;
        const lowActive = data.data.filter((u: UserStat) => u.activityLevel === 'low').length;
        
        setStats({
          totalUsers: data.data.length,
          highActive,
          mediumActive,
          lowActive
        });
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: '高活跃', value: stats.highActive },
    { name: '中活跃', value: stats.mediumActive },
    { name: '低活跃', value: stats.lowActive }
  ];

  const barData = users.slice(0, 20).map((user) => ({
    name: user.username.length > 8 ? user.username.substring(0, 8) + '...' : user.username,
    fullName: user.username,
    观看次数: user.watchCount,
    收藏数: user.favoriteCount,
    活跃度: user.activityLevel
  }));

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <AdminChartTooltip
          title={data.name}
          items={[
            { label: '人数', value: data.value },
            { label: '占比', value: `${((data.value / stats.totalUsers) * 100).toFixed(1)}%` },
          ]}
        />
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <AdminChartTooltip
          title={data.fullName}
          items={[
            { label: '观看次数', value: data.观看次数 },
            { label: '收藏数', value: data.收藏数 },
            { label: '活跃度', value: data.活跃度 === 'high' ? '高' : data.活跃度 === 'medium' ? '中' : '低' },
          ]}
        />
      );
    }
    return null;
  };

  return (
    <div className={styles.pageStack}>
      <AdminPageHeader eyebrow="ANALYTICS" title="用户行为统计" badge={`${stats.totalUsers} 位用户`} />

      {/* Stats Cards */}
      <div className={styles.metricGrid}>
        <AnimatedCard delay={0.1}>
          <div className={styles.metricCard}>
            <span>用户总数</span>
            <strong>
              <AnimatedNumber value={stats.totalUsers} />
            </strong>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <div className={styles.metricCard}>
            <span>高活跃用户</span>
            <strong>
              <AnimatedNumber value={stats.highActive} />
            </strong>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <div className={styles.metricCard}>
            <span>中活跃用户</span>
            <strong>
              <AnimatedNumber value={stats.mediumActive} />
            </strong>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <div className={styles.metricCard}>
            <span>低活跃用户</span>
            <strong>
              <AnimatedNumber value={stats.lowActive} />
            </strong>
          </div>
        </AnimatedCard>
      </div>

      {/* Pie Chart */}
      <div className={styles.chartBlock}>
        <ChartContainer title="用户活跃度分布" loading={loading}>
          <ResponsiveContainer width="100%" height={450}>
            <PieChart>
              <defs>
                {COLORS.map((color, index) => (
                  <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1}/>
                    <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={160}
                paddingAngle={2}
                dataKey="value"
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#gradient-${index % COLORS.length})`}
                    style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                formatter={(value: string) => <span style={{ color: '#1a1a2e', fontSize: 13 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Bar Chart */}
      <ChartContainer title="Top 20 用户观看量" loading={loading}>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={barData}>
            <defs>
              <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6}/>
              </linearGradient>
              <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6}/>
              </linearGradient>
              <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={1}/>
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#999" fontSize={12} />
            <YAxis stroke="#999" fontSize={12} />
            <Tooltip content={<BarTooltip />} />
            <Legend />
            <Bar dataKey="观看次数" radius={[8, 8, 0, 0]} animationDuration={1500}>
              {barData.map((entry, index) => {
                const color = entry.活跃度 === 'high' ? 'url(#colorHigh)' : entry.活跃度 === 'medium' ? 'url(#colorMedium)' : 'url(#colorLow)';
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
            <Bar dataKey="收藏数" fill="url(#colorMedium)" radius={[8, 8, 0, 0]} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
