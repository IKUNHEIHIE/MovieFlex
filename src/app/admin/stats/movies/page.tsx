'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AnimatedCard from '@/components/animated/AnimatedCard';
import AnimatedNumber from '@/components/animated/AnimatedNumber';
import ChartContainer from '@/components/animated/ChartContainer';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import AdminChartTooltip from '@/components/admin/AdminChartTooltip';
import styles from '../../admin.module.css';

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
        <AdminChartTooltip
          title={data.fullName}
          items={[
            { label: '观看数', value: data.观看数.toLocaleString() },
            { label: '收藏数', value: data.收藏数.toLocaleString() },
            { label: '平均进度', value: `${data.平均进度}%` },
          ]}
        />
      );
    }
    return null;
  };

  return (
    <div className={styles.pageStack}>
      <AdminPageHeader eyebrow="ANALYTICS" title="影片热度排行" badge={`${stats.totalMovies} 部`} />

      {/* Stats Cards */}
      <div className={styles.metricGrid}>
        <AnimatedCard delay={0.1}>
          <div className={styles.metricCard}>
            <span>总影片数</span>
            <strong>
              <AnimatedNumber value={stats.totalMovies} />
            </strong>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <div className={styles.metricCard}>
            <span>总观看次数</span>
            <strong>
              <AnimatedNumber value={stats.totalViews} />
            </strong>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <div className={styles.metricCard}>
            <span>总收藏数</span>
            <strong>
              <AnimatedNumber value={stats.totalFavorites} />
            </strong>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <div className={styles.metricCard}>
            <span>平均观看进度</span>
            <strong>
              <AnimatedNumber value={Math.round(stats.avgProgress * 100)} format={(v) => `${v}%`} />
            </strong>
          </div>
        </AnimatedCard>
      </div>

      {/* Filters */}
      <AnimatedCard delay={0.5}>
        <section className={styles.panel}>
          <div className={styles.toolbarActions}>
            <div className={styles.field}>
              <label>
                排序方式
              </label>
              <select 
                value={sort} 
                onChange={(e) => setSort(e.target.value)}
                className={styles.select}
              >
                <option value="viewCount">观看次数</option>
                <option value="favoriteCount">收藏数</option>
                <option value="avgProgress">平均进度</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>
                分类筛选
              </label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className={styles.select}
              >
                <option value="">全部分类</option>
                <option value="1">动作片</option>
                <option value="2">喜剧片</option>
                <option value="3">爱情片</option>
              </select>
            </div>
          </div>
        </section>
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
