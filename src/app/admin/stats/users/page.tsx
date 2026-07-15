'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AnimatedCard from '@/components/animated/AnimatedCard';
import AnimatedNumber from '@/components/animated/AnimatedNumber';
import ChartContainer from '@/components/animated/ChartContainer';

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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '12px 16px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            color: 'white'
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{data.name}</p>
          <p style={{ fontSize: 13, margin: '4px 0' }}>人数: {data.value}</p>
          <p style={{ fontSize: 13, margin: '4px 0' }}>占比: {((data.value / stats.totalUsers) * 100).toFixed(1)}%</p>
        </motion.div>
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '12px 16px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            color: 'white'
          }}
        >
          <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{data.fullName}</p>
          <p style={{ fontSize: 13, margin: '4px 0' }}>观看次数: {data.观看次数}</p>
          <p style={{ fontSize: 13, margin: '4px 0' }}>收藏数: {data.收藏数}</p>
          <p style={{ fontSize: 13, margin: '4px 0' }}>活跃度: {data.活跃度 === 'high' ? '高' : data.活跃度 === 'medium' ? '中' : '低'}</p>
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
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: '#1a1a2e' }}>
          用户行为统计
        </h1>
      </motion.div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
        <AnimatedCard delay={0.1}>
          <div style={{ padding: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 12, color: 'white' }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>用户总数</p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
              <AnimatedNumber value={stats.totalUsers} />
            </p>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <div style={{ padding: 24, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: 12, color: 'white' }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>高活跃用户</p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
              <AnimatedNumber value={stats.highActive} />
            </p>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <div style={{ padding: 24, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: 12, color: 'white' }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>中活跃用户</p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
              <AnimatedNumber value={stats.mediumActive} />
            </p>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <div style={{ padding: 24, background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)', borderRadius: 12, color: 'white' }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>低活跃用户</p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
              <AnimatedNumber value={stats.lowActive} />
            </p>
          </div>
        </AnimatedCard>
      </div>

      {/* Pie Chart */}
      <div style={{ marginBottom: 32 }}>
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
