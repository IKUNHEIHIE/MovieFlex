'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AnimatedCard from '@/components/animated/AnimatedCard';
import AnimatedNumber from '@/components/animated/AnimatedNumber';
import ChartContainer from '@/components/animated/ChartContainer';
import AdminPageHeader from '@/components/shared/AdminPageHeader';
import AdminChartTooltip from '@/components/admin/AdminChartTooltip';
import styles from '../../admin.module.css';

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

  const pieData = categories.map((cat) => ({
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

  const supplyAverage = categories.length > 0 ? stats.totalMovies / categories.length : 0;
  const demandAverage = categories.length > 0 ? stats.totalViews / categories.length : 0;
  const categoryInsights = categories.map((cat) => {
    const conversion = cat.totalViews > 0 ? (cat.totalFavorites / cat.totalViews) * 100 : 0;
    const highSupply = cat.movieCount >= supplyAverage;
    const highDemand = cat.totalViews >= demandAverage;
    const quadrant = highSupply && highDemand ? '明星品类' : !highSupply && highDemand ? '潜力缺口' : highSupply ? '库存承压' : '长尾补充';
    return { ...cat, conversion, quadrant };
  });
  const conversionRank = [...categoryInsights].sort((a, b) => b.conversion - a.conversion).slice(0, 5);
  const topDemand = [...categoryInsights].sort((a, b) => b.totalViews - a.totalViews)[0];
  const highPotential = categoryInsights.find((cat) => cat.quadrant === '潜力缺口') ?? topDemand;
  const opportunityGroups = ['明星品类', '潜力缺口', '库存承压', '长尾补充'].map((label) => ({
    label,
    items: categoryInsights.filter((cat) => cat.quadrant === label).slice(0, 3),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <AdminChartTooltip
          title={data.name}
          items={[
            { label: '观看数', value: data.value.toLocaleString() },
            { label: '占比', value: `${data.percentage}%` },
          ]}
        />
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <AdminChartTooltip
          title={label}
          items={payload.map((entry: any) => ({
            label: entry.name,
            value: entry.value.toLocaleString(),
            color: entry.color,
          }))}
        />
      );
    }
    return null;
  };

  return (
    <div className={styles.pageStack}>
      <AdminPageHeader eyebrow="ANALYTICS" title="分类分布统计" badge={`${stats.totalCategories} 类`} />

      {/* Stats Cards */}
      <div className={styles.metricGrid}>
        <AnimatedCard delay={0.1}>
          <div className={styles.metricCard}>
            <span>分类总数</span>
            <strong>
              <AnimatedNumber value={stats.totalCategories} />
            </strong>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <div className={styles.metricCard}>
            <span>影片总数</span>
            <strong>
              <AnimatedNumber value={stats.totalMovies} />
            </strong>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <div className={styles.metricCard}>
            <span>总观看次数</span>
            <strong>
              <AnimatedNumber value={stats.totalViews} />
            </strong>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <div className={styles.metricCard}>
            <span>总收藏数</span>
            <strong>
              <AnimatedNumber value={stats.totalFavorites} />
            </strong>
          </div>
        </AnimatedCard>
      </div>

      <section className={styles.showcaseGrid}>
        <ChartContainer title="分类观看量占比" loading={loading}>
          <div className={styles.heroChart}>
            <ResponsiveContainer width="100%" height={460}>
              <PieChart>
                <defs>
                  {COLORS.map((color, index) => (
                    <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={1}/>
                      <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                    </linearGradient>
                  ))}
                </defs>
                <Pie data={pieData} cx="45%" cy="50%" innerRadius={84} outerRadius={162} paddingAngle={2} dataKey="value" animationDuration={1500} animationEasing="ease-out">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#gradient-${index % COLORS.length})`} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend layout="vertical" verticalAlign="middle" align="right" formatter={(value: string) => <span style={{ color: '#1a1a2e', fontSize: 13 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>

        <div className={styles.stack}>
          <section className={styles.insightGrid}>
            <article className={styles.insightCard}>
              <span>主力分类</span>
              <strong>{topDemand?.name ?? '暂无数据'}</strong>
              <p>观看量 {topDemand ? topDemand.totalViews.toLocaleString() : 0}，适合首页重点曝光。</p>
            </article>
            <article className={styles.insightCard}>
              <span>高潜分类</span>
              <strong>{highPotential?.name ?? '暂无数据'}</strong>
              <p>{highPotential?.quadrant ?? '暂无'}，代表供给与需求的运营机会。</p>
            </article>
          </section>

          <section className={styles.chartPanel}>
            <h2>分类机会矩阵</h2>
            <p className={styles.chartNarrative}>按内容供给和观看需求切分，帮助快速讲清内容库结构。</p>
            <div className={styles.opportunityMatrix}>
              {opportunityGroups.map((group) => (
                <article key={group.label} className={styles.insightCard}>
                  <span>{group.label}</span>
                  <strong>{group.items.length} 类</strong>
                  <p>{group.items.map((item) => item.name).join(' / ') || '暂无分类'}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className={styles.miniChartGrid}>
        <ChartContainer title="供需对比" loading={loading}>
          <ResponsiveContainer width="100%" height={410}>
            <BarChart data={barData}>
              <defs>
                <linearGradient id="colorMovies" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f7df3" stopOpacity={1}/><stop offset="100%" stopColor="#4f7df3" stopOpacity={0.6}/></linearGradient>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={1}/><stop offset="100%" stopColor="#22c55e" stopOpacity={0.6}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" />
              <XAxis dataKey="name" stroke="#8290a8" fontSize={12} />
              <YAxis stroke="#8290a8" fontSize={12} />
              <Tooltip content={<BarTooltip />} />
              <Legend />
              <Bar dataKey="影片数" fill="url(#colorMovies)" radius={[8, 8, 0, 0]} animationDuration={1500} />
              <Bar dataKey="观看数" fill="url(#colorViews)" radius={[8, 8, 0, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <section className={styles.chartPanel}>
          <h2>收藏转化排行</h2>
          <p className={styles.chartNarrative}>收藏转化可以说明哪些分类更容易让用户产生“想看/再看”的意愿。</p>
          <div className={styles.rankList}>
            {conversionRank.map((cat) => (
              <div key={cat.id} className={styles.rankItem}>
                <div>
                  <strong>{cat.name}</strong>
                  <span>{cat.totalFavorites.toLocaleString()} 收藏 / {cat.totalViews.toLocaleString()} 观看</span>
                </div>
                <strong>{cat.conversion.toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
