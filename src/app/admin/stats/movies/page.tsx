'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AnimatedCard from '@/components/animated/AnimatedCard';
import AnimatedNumber from '@/components/animated/AnimatedNumber';
import ChartContainer from '@/components/animated/ChartContainer';

interface MovieStat {
  id: number;
  title: string;
  viewCount: number;
  favoriteCount: number;
  avgProgress: number;
  typeName: string | null;
}

const COLORS = ['#4f7df3', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function MoviesStatsPage() {
  const [movies, setMovies] = useState<MovieStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('viewCount');
  const [category, setCategory] = useState('');
  const [stats, setStats] = useState({
    totalMovies: 0,
    totalViews: 0,
    totalFavorites: 0,
    avgProgress: 0
  });

  useEffect(() => {
    fetchMovies();
  }, [sort, category]);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (category) params.set('category', category);
      const res = await fetch(`/api/admin/stats/movies?${params}`);
      const data = await res.json();
      if (data.success) {
        setMovies(data.data);
        
        // Calculate stats
        const totalViews = data.data.reduce((sum: number, m: MovieStat) => sum + m.viewCount, 0);
        const totalFavorites = data.data.reduce((sum: number, m: MovieStat) => sum + m.favoriteCount, 0);
        const avgProgress = data.data.reduce((sum: number, m: MovieStat) => sum + m.avgProgress, 0) / data.data.length;
        
        setStats({
          totalMovies: data.data.length,
          totalViews,
          totalFavorites,
          avgProgress
        });
      }
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = movies.slice(0, 10).map((movie, index) => ({
    name: movie.title.length > 10 ? movie.title.substring(0, 10) + '...' : movie.title,
    fullName: movie.title,
    观看数: movie.viewCount,
    收藏数: movie.favoriteCount,
    平均进度: Math.round(movie.avgProgress * 100),
    index
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
          <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{data.fullName}</p>
          <p style={{ fontSize: 13, margin: '4px 0' }}>观看数: {data.观看数.toLocaleString()}</p>
          <p style={{ fontSize: 13, margin: '4px 0' }}>收藏数: {data.收藏数.toLocaleString()}</p>
          <p style={{ fontSize: 13, margin: '4px 0' }}>平均进度: {data.平均进度}%</p>
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
          影片热度排行
        </h1>
      </motion.div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 32 }}>
        <AnimatedCard delay={0.1}>
          <div style={{ padding: 24, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 12, color: 'white' }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>总影片数</p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
              <AnimatedNumber value={stats.totalMovies} />
            </p>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <div style={{ padding: 24, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: 12, color: 'white' }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>总观看次数</p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
              <AnimatedNumber value={stats.totalViews} />
            </p>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <div style={{ padding: 24, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: 12, color: 'white' }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>总收藏数</p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
              <AnimatedNumber value={stats.totalFavorites} />
            </p>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <div style={{ padding: 24, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: 12, color: 'white' }}>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>平均观看进度</p>
            <p style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
              <AnimatedNumber value={Math.round(stats.avgProgress * 100)} format={(v) => `${v}%`} />
            </p>
          </div>
        </AnimatedCard>
      </div>

      {/* Filters */}
      <AnimatedCard delay={0.5}>
        <div style={{ padding: 20, background: 'white', borderRadius: 12, marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
                排序方式
              </label>
              <select 
                value={sort} 
                onChange={(e) => setSort(e.target.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '2px solid #e0e0e0',
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <option value="viewCount">观看次数</option>
                <option value="favoriteCount">收藏数</option>
                <option value="avgProgress">平均进度</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>
                分类筛选
              </label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '2px solid #e0e0e0',
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <option value="">全部分类</option>
                <option value="1">动作片</option>
                <option value="2">喜剧片</option>
                <option value="3">爱情片</option>
              </select>
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Chart */}
      <ChartContainer title="Top 10 影片观看数" loading={loading}>
        <ResponsiveContainer width="100%" height={450}>
          <BarChart data={chartData}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f7df3" stopOpacity={1}/>
                <stop offset="100%" stopColor="#4f7df3" stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" stroke="#999" fontSize={12} />
            <YAxis stroke="#999" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="观看数" 
              radius={[8, 8, 0, 0]}
              animationDuration={1500}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#colorViews)`}
                  style={{ filter: 'drop-shadow(0 4px 8px rgba(79, 125, 243, 0.3))' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
