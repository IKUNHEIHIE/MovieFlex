'use client';

import { useEffect, useState } from 'react';
import styles from '../../admin.module.css';

interface CategoryStat {
  id: number;
  name: string;
  movieCount: number;
  totalViews: number;
  totalFavorites: number;
}

export default function CategoriesStatsPage() {
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);

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
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>分类分布统计</h1>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>分类名称</th>
              <th>影片数量</th>
              <th>总观看次数</th>
              <th>总收藏数</th>
              <th>平均观看</th>
              <th>收藏率</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const avgViews = cat.movieCount > 0 ? cat.totalViews / cat.movieCount : 0;
              const favoriteRate = cat.totalViews > 0 ? (cat.totalFavorites / cat.totalViews) * 100 : 0;
              return (
                <tr key={cat.id}>
                  <td>{cat.name}</td>
                  <td>{cat.movieCount}</td>
                  <td>{cat.totalViews}</td>
                  <td>{cat.totalFavorites}</td>
                  <td>{avgViews.toFixed(1)}</td>
                  <td>{favoriteRate.toFixed(2)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
