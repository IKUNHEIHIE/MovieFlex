'use client';

import '../admin-theme.css';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AnimatedCard from '@/components/animated/AnimatedCard';
import AnimatedNumber from '@/components/animated/AnimatedNumber';
import ChartContainer from '@/components/animated/ChartContainer';

interface CategoryStat {
  id: number;
  name: string;
  movieCount: number;
  totalViews: number;
  totalFavorites: number;
}

const COLORS = ['#4f7df3', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function CategoriesStatsPage() {
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCategories: 0,
    totalMovies: 0,
    totalViews: 0,
    totalFavorites: 0
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
        
        const totalMovies = data.data.reduce((sum: number, c: CategoryStat) => sum + c.movieCount, 0);
        const totalViews = data.data.reduce((sum: number, c: CategoryStat) => sum + c.totalViews, 0);
        const totalFavorites = data.data.reduce((sum: number, c: CategoryStat) => sum + c.totalFavorites, 0);
        
        setStats({
          totalCategories: data.data.length,
          totalMovies,
          totalViews,
          totalFavorites
        });
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = categories.map((cat, index) => ({
    name: cat.name,
    value: cat.totalViews,
    percentage: stats.totalViews > 0 ? ((cat.totalViews / stats.totalViews) * 100).toFixed(1) : 0
  }));

  const barData = categories.map((cat) => ({
    name: cat.name,
    影片数: cat.movieCount,
    观看数: cat.totalViews,
    收藏数: cat.totalFavorites
  }));

  const CustomTooltip = ({ active, payload }: any) => {
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
          <p style={{ fontSize: 13, margin: '4px 0' }}>观看数: {data.value.toLocaleString()}</p>
          <p style={{ fontSize: 13, margin: '4px 0' }}>占比: {data.percentage}%</p>
        </motion.div>
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
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
          <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ fontSize: 13, margin: '4px 0' }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
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
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: '#1a1a2e' }}>
          分类分布统计
        </h1>
      </motion.div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
        <AnimatedCard delay={0.1}>
          <div style={{ padding: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 12, color: 'white' }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>分类总数</p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
              <AnimatedNumber value={stats.totalCategories} />
            </p>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <div style={{ padding: 24, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: 12, color: 'white' }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>影片总数</p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
              <AnimatedNumber value={stats.totalMovies} />
            </p>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <div style={{ padding: 24, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: 12, color: 'white' }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>总观看次数</p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
              <AnimatedNumber value={stats.totalViews} />
            </p>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <div style={{ padding: 24, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: 12, color: 'white' }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>总收藏数</p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
              <AnimatedNumber value={stats.totalFavorites} />
            </p>
          </div>
        </AnimatedCard>
      </div>

      {/* Pie Chart */}
      <div style={{ marginBottom: 32 }}>
        <ChartContainer title="分类观看量占比" loading={loading}>
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
              <Tooltip content={<CustomTooltip />} />
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
      <ChartContainer title="各分类数据对比" loading={loading}>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={barData}>
            <defs>
              <linearGradient id="colorMovies" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f7df3" stopOpacity={1}/>
                <stop offset="100%" stopColor="#4f7df3" stopOpacity={0.6}/>
              </linearGradient>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={1}/>
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.6}/>
              </linearGradient>
              <linearGradient id="colorFavorites" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#999" fontSize={12} />
            <YAxis stroke="#999" fontSize={12} />
            <Tooltip content={<BarTooltip />} />
            <Legend />
            <Bar dataKey="影片数" fill="url(#colorMovies)" radius={[8, 8, 0, 0]} animationDuration={1500} />
            <Bar dataKey="观看数" fill="url(#colorViews)" radius={[8, 8, 0, 0]} animationDuration={1500} />
            <Bar dataKey="收藏数" fill="url(#colorFavorites)" radius={[8, 8, 0, 0]} animationDuration={1500} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
