'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';
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
    收藏转化: movie.viewCount > 0 ? movie.favoriteCount / movie.viewCount : 0,
    热度值: Math.round(movie.viewCount * 0.6 + movie.favoriteCount * 3 + movie.avgProgress * 100),
    index
  }));

  const bubbleData = movies.slice(0, 10).map((movie) => ({
    name: movie.title,
    x: movie.viewCount,
    y: movie.favoriteCount,
    z: Math.max(16, Math.round(movie.avgProgress * 140)),
    progress: Math.round(movie.avgProgress * 100),
    conversion: movie.viewCount > 0 ? ((movie.favoriteCount / movie.viewCount) * 100) : 0,
  }));

  const radarData = movies.slice(0, 5).map((movie) => ({
    subject: movie.title.length > 8 ? `${movie.title.slice(0, 8)}...` : movie.title,
    观看: Math.min(100, Math.round(movie.viewCount / Math.max(1, stats.totalViews) * 100)),
    收藏: Math.min(100, Math.round(movie.favoriteCount * 10)),
    进度: Math.round(movie.avgProgress * 100),
  }));

  const topViewed = [...movies].sort((a, b) => b.viewCount - a.viewCount)[0];
  const topFavorited = [...movies].sort((a, b) => b.favoriteCount - a.favoriteCount)[0];
  const bestProgress = [...movies].sort((a, b) => b.avgProgress - a.avgProgress)[0];
  const bestConversion = [...movies].filter((movie) => movie.viewCount > 0).sort((a, b) => (b.favoriteCount / b.viewCount) - (a.favoriteCount / a.viewCount))[0];

  const TopTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <AdminChartTooltip
          title={data.fullName}
          items={[
            { label: '观看数', value: data.观看数.toLocaleString() },
            { label: '收藏数', value: data.收藏数.toLocaleString() },
            { label: '平均进度', value: `${data.平均进度}%` },
            { label: '收藏转化', value: `${(data.收藏转化 * 100).toFixed(1)}%` },
          ]}
        />
      );
    }
    return null;
  };

  const BubbleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <AdminChartTooltip
          title={data.name}
          items={[
            { label: '观看数', value: data.x.toLocaleString() },
            { label: '收藏数', value: data.y.toLocaleString() },
            { label: '平均进度', value: `${data.progress}%` },
            { label: '收藏转化', value: `${data.conversion.toFixed(1)}%` },
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

      <section className={styles.showcaseGrid}>
        <ChartContainer title="Top 10 影片观看数" loading={loading}>
          <div className={styles.heroChart}>
            <ResponsiveContainer width="100%" height={460}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 12, right: 18 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4f7df3" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#8eb8ff" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" horizontal={false} />
                <XAxis type="number" stroke="#8290a8" fontSize={12} tick={{ fill: '#8290a8' }} axisLine={{ stroke: '#e5eaf3' }} />
                <YAxis type="category" dataKey="name" stroke="#8290a8" width={110} fontSize={12} tick={{ fill: '#8290a8' }} axisLine={{ stroke: '#e5eaf3' }} />
                <Tooltip content={<TopTooltip />} />
                <Bar dataKey="观看数" radius={[0, 12, 12, 0]} animationDuration={1500} animationEasing="ease-out">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#colorViews)`} style={{ filter: 'drop-shadow(0 4px 8px rgba(79, 125, 243, 0.3))' }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>

        <div className={styles.stack}>
          <section className={styles.insightGrid}>
            <article className={styles.insightCard}>
              <span>爆款洞察</span>
              <strong>{topViewed ? topViewed.title : '暂无数据'}</strong>
              <p>最高观看数：{topViewed ? topViewed.viewCount.toLocaleString() : 0}</p>
            </article>
            <article className={styles.insightCard}>
              <span>收藏最高</span>
              <strong>{topFavorited ? topFavorited.title : '暂无数据'}</strong>
              <p>最高收藏数：{topFavorited ? topFavorited.favoriteCount.toLocaleString() : 0}</p>
            </article>
            <article className={styles.insightCard}>
              <span>完播最佳</span>
              <strong>{bestProgress ? bestProgress.title : '暂无数据'}</strong>
              <p>平均进度：{bestProgress ? `${Math.round(bestProgress.avgProgress * 100)}%` : '0%'}</p>
            </article>
            <article className={styles.insightCard}>
              <span>转化最佳</span>
              <strong>{bestConversion ? bestConversion.title : '暂无数据'}</strong>
              <p>收藏转化：{bestConversion ? `${((bestConversion.favoriteCount / Math.max(1, bestConversion.viewCount)) * 100).toFixed(1)}%` : '0%'}</p>
            </article>
          </section>

          <ChartContainer title="综合热度雷达" loading={loading}>
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e8edf7" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#62708a', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#8290a8', fontSize: 10 }} />
                <Legend />
                <Radar dataKey="观看" stroke="#4f7df3" fill="#4f7df3" fillOpacity={0.26} />
                <Radar dataKey="收藏" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.22} />
                <Radar dataKey="进度" stroke="#22c55e" fill="#22c55e" fillOpacity={0.18} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </section>

      <section className={styles.miniChartGrid}>
        <ChartContainer title="观看收藏气泡图" loading={loading}>
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" />
              <XAxis type="number" dataKey="x" name="观看数" stroke="#8290a8" tick={{ fill: '#8290a8' }} axisLine={{ stroke: '#e5eaf3' }} />
              <YAxis type="number" dataKey="y" name="收藏数" stroke="#8290a8" tick={{ fill: '#8290a8' }} axisLine={{ stroke: '#e5eaf3' }} />
              <ZAxis type="number" dataKey="z" range={[90, 500]} />
              <Tooltip content={<BubbleTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={bubbleData} fill="#4f7df3" fillOpacity={0.72} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>

        <section className={styles.chartPanel}>
          <h2>热度榜单</h2>
          <p className={styles.chartNarrative}>把观看、收藏和完播进度合并成一条更适合演示的热度叙事。</p>
          <div className={styles.rankList}>
            {chartData.slice(0, 5).map((item) => (
              <div key={item.fullName} className={styles.rankItem}>
                <div>
                  <strong>{item.fullName}</strong>
                  <span>{item.观看数.toLocaleString()} 次观看 · {item.收藏数.toLocaleString()} 次收藏</span>
                </div>
                <strong>{item.热度值}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
