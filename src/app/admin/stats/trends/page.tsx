'use client';

import { useEffect, useState } from 'react';
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

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>时间趋势分析</h1>

      <div className={styles.filters}>
        <div>
          <label>时间范围：</label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>最近 7 天</option>
            <option value={30}>最近 30 天</option>
            <option value={90}>最近 90 天</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : (
        <>
          {summary && (
            <div className={styles.metrics}>
              <div>
                <span>日均观看</span>
                <strong>{summary.avgDailyViews}</strong>
              </div>
              <div>
                <span>日均收藏</span>
                <strong>{summary.avgDailyFavorites}</strong>
              </div>
              <div>
                <span>日均活跃用户</span>
                <strong>{summary.avgDAU}</strong>
              </div>
              <div>
                <span>统计天数</span>
                <strong>{summary.totalDays}</strong>
              </div>
            </div>
          )}

          <table className={styles.table}>
            <thead>
              <tr>
                <th>日期</th>
                <th>总观看</th>
                <th>用户观看</th>
                <th>游客观看</th>
                <th>活跃用户</th>
                <th>收藏数</th>
                <th>转化率</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((trend) => (
                <tr key={trend.date}>
                  <td>{trend.date}</td>
                  <td>{trend.totalViews}</td>
                  <td>{trend.userViews}</td>
                  <td>{trend.guestViews}</td>
                  <td>{trend.uniqueUsers}</td>
                  <td>{trend.totalFavorites}</td>
                  <td>{trend.conversionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
