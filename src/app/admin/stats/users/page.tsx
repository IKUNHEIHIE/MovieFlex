'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis } from 'recharts';
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

  const funnelData = [
    { label: '总用户', value: stats.totalUsers },
    { label: '有观看', value: users.filter((user) => user.watchCount > 0).length },
    { label: '多次观看', value: users.filter((user) => user.watchCount >= 2).length },
    { label: '有收藏', value: users.filter((user) => user.favoriteCount > 0).length },
    { label: '高活跃', value: stats.highActive },
  ];
  const depthData = [
    { name: '0-25%', 人数: users.filter((user) => user.avgProgress < 0.25).length },
    { name: '25-50%', 人数: users.filter((user) => user.avgProgress >= 0.25 && user.avgProgress < 0.5).length },
    { name: '50-75%', 人数: users.filter((user) => user.avgProgress >= 0.5 && user.avgProgress < 0.75).length },
    { name: '75-100%', 人数: users.filter((user) => user.avgProgress >= 0.75).length },
  ];
  const userValueRank = users.map((user) => ({
    ...user,
    score: user.watchCount + user.favoriteCount * 3 + user.uniqueMovies * 2,
  })).sort((a, b) => b.score - a.score).slice(0, 5);
  const scatterData = users.slice(0, 30).map((user) => ({
    name: user.username,
    x: user.watchCount,
    y: user.favoriteCount,
    z: Math.max(16, user.uniqueMovies * 20),
    activity: user.activityLevel,
    progress: Math.round(user.avgProgress * 100),
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

  const ScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <AdminChartTooltip
          title={data.name}
          items={[
            { label: '观看次数', value: data.x },
            { label: '收藏数', value: data.y },
            { label: '观看深度', value: `${data.progress}%` },
            { label: '活跃度', value: data.activity === 'high' ? '高' : data.activity === 'medium' ? '中' : '低' },
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

      <section className={styles.showcaseGrid}>
        <section className={styles.chartPanel}>
          <h2>活跃漏斗</h2>
          <p className={styles.chartNarrative}>从注册用户到高活跃用户，展示平台是否真正产生持续观看行为。</p>
          <div className={styles.funnelList}>
            {funnelData.map((item, index) => (
              <div key={item.label} className={styles.funnelItem} style={{ marginRight: `${index * 7}%` }}>
                <div>
                  <strong>{item.label}</strong>
                  <span>占总用户 {stats.totalUsers > 0 ? ((item.value / stats.totalUsers) * 100).toFixed(1) : '0.0'}%</span>
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.stack}>
          <ChartContainer title="用户活跃度分布" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  {COLORS.map((color, index) => (
                    <linearGradient key={index} id={`user-gradient-${index}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={color} stopOpacity={1}/><stop offset="100%" stopColor={color} stopOpacity={0.7}/></linearGradient>
                  ))}
                </defs>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={54} outerRadius={108} paddingAngle={2} dataKey="value" animationDuration={1500} animationEasing="ease-out">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={`url(#user-gradient-${index % COLORS.length})`} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          <section className={styles.chartPanel}>
            <h2>用户价值排行</h2>
            <div className={styles.rankList}>
              {userValueRank.map((user) => (
                <div key={user.id} className={styles.rankItem}>
                  <div><strong>{user.username}</strong><span>{user.watchCount} 次观看 · {user.favoriteCount} 次收藏 · {user.uniqueMovies} 部影片</span></div>
                  <strong>{user.score}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className={styles.miniChartGrid}>
        <ChartContainer title="观看深度分布" loading={loading}>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={depthData}>
              <defs><linearGradient id="depthColor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f7df3"/><stop offset="100%" stopColor="#9ec5ff"/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" />
              <XAxis dataKey="name" stroke="#8290a8" />
              <YAxis stroke="#8290a8" />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="人数" fill="url(#depthColor)" radius={[10, 10, 0, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="行为散点图" loading={loading}>
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" />
              <XAxis type="number" dataKey="x" name="观看次数" stroke="#8290a8" />
              <YAxis type="number" dataKey="y" name="收藏数" stroke="#8290a8" />
              <ZAxis type="number" dataKey="z" range={[80, 420]} />
              <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={scatterData} fill="#f59e0b" fillOpacity={0.72} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
      </section>

      <ChartContainer title="Top 20 用户观看量" loading={loading}>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" />
            <XAxis dataKey="name" stroke="#8290a8" fontSize={12} />
            <YAxis stroke="#8290a8" fontSize={12} />
            <Tooltip content={<BarTooltip />} />
            <Legend />
            <Bar dataKey="观看次数" fill="#4f7df3" radius={[8, 8, 0, 0]} animationDuration={1500} />
            <Bar dataKey="收藏数" fill="#f59e0b" radius={[8, 8, 0, 0]} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
